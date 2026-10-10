import pg from 'pg';
import dotenv from 'dotenv';
import { Brand, Product, SearchIntent, UserPreferences } from '../types';
import { formatVectorForPg } from './embeddings';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://thread:thread_secret@localhost:5433/thread';

export const pool = new Pool({
  connectionString,
  // 5 seconds connection timeout
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Initializes tables, extensions (pgvector), and indexes
 */
export async function initDb(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Enable pgvector extension
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    } catch (e) {
      console.warn('Notice: vector extension creation:', e);
    }

    // 2. Brands table
    await client.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier TEXT NOT NULL,
        price_range TEXT NOT NULL,
        aesthetic_summary TEXT NOT NULL,
        aesthetic_keywords TEXT[] NOT NULL DEFAULT '{}',
        origin TEXT NOT NULL,
        website TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Brand affinities table (graph edges)
    await client.query(`
      CREATE TABLE IF NOT EXISTS brand_affinities (
        source_brand_id TEXT REFERENCES brands(id) ON DELETE CASCADE,
        target_brand_id TEXT REFERENCES brands(id) ON DELETE CASCADE,
        similarity_note TEXT,
        affinity_score NUMERIC(4, 2) DEFAULT 1.0,
        PRIMARY KEY (source_brand_id, target_brand_id)
      );
    `);

    // 4. Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        brand_id TEXT REFERENCES brands(id) ON DELETE CASCADE,
        brand_name TEXT NOT NULL,
        name TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        original_price NUMERIC(10, 2),
        currency TEXT NOT NULL DEFAULT 'USD',
        category TEXT NOT NULL,
        colors TEXT[] NOT NULL DEFAULT '{}',
        materials TEXT[] NOT NULL DEFAULT '{}',
        occasions TEXT[] NOT NULL DEFAULT '{}',
        silhouettes TEXT[] NOT NULL DEFAULT '{}',
        image_url TEXT NOT NULL,
        fallback_image_url TEXT,
        product_url TEXT NOT NULL,
        sizes TEXT[] NOT NULL DEFAULT '{}',
        in_stock BOOLEAN NOT NULL DEFAULT true,
        aesthetic TEXT NOT NULL,
        description TEXT NOT NULL,
        retailer_highlight TEXT,
        composition TEXT,
        care TEXT,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 5. User preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        favorite_brand_ids TEXT[] NOT NULL DEFAULT '{}',
        sizes TEXT[] NOT NULL DEFAULT '{}',
        currency TEXT NOT NULL DEFAULT 'USD',
        shipping_country TEXT NOT NULL DEFAULT 'US',
        min_budget NUMERIC(10, 2),
        max_budget NUMERIC(10, 2),
        style_aesthetics TEXT[] NOT NULL DEFAULT '{}',
        excluded_brands TEXT[] NOT NULL DEFAULT '{}',
        excluded_materials TEXT[] NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 6. User wishlists table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default_user',
        product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      );
    `);

    // 7. Product feedback logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_feedback (
        id BIGSERIAL PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default_user',
        product_id TEXT NOT NULL,
        feedback_type TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 8. Performance indexes & pgvector
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(768);
      CREATE INDEX IF NOT EXISTS idx_products_embedding ON products USING hnsw (embedding vector_cosine_ops);
      CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
      CREATE INDEX IF NOT EXISTS idx_products_instock ON products(in_stock);
      CREATE INDEX IF NOT EXISTS idx_products_materials ON products USING GIN(materials);
      CREATE INDEX IF NOT EXISTS idx_products_silhouettes ON products USING GIN(silhouettes);
      CREATE INDEX IF NOT EXISTS idx_products_occasions ON products USING GIN(occasions);
      CREATE INDEX IF NOT EXISTS idx_products_colors ON products USING GIN(colors);
    `);

    await client.query('COMMIT');
    console.log('✓ PostgreSQL schema and indexes initialized successfully.');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to initialize PostgreSQL schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Check database connectivity
 */
export async function checkDbHealth(): Promise<{ connected: boolean; productCount: number; brandCount: number }> {
  try {
    const brandRes = await pool.query('SELECT COUNT(*)::int as count FROM brands');
    const productRes = await pool.query('SELECT COUNT(*)::int as count FROM products');
    return {
      connected: true,
      brandCount: brandRes.rows[0]?.count || 0,
      productCount: productRes.rows[0]?.count || 0,
    };
  } catch (e) {
    return {
      connected: false,
      productCount: 0,
      brandCount: 0,
    };
  }
}

/**
 * Fetch all brands with their similarity notes and similar brand IDs
 */
export async function getDbBrands(): Promise<Brand[]> {
  const brandsRes = await pool.query(`
    SELECT 
      b.id,
      b.name,
      b.tier,
      b.price_range as "priceRange",
      b.aesthetic_summary as "aestheticSummary",
      b.aesthetic_keywords as "aestheticKeywords",
      b.origin,
      b.website
    FROM brands b
    ORDER BY b.name ASC;
  `);

  const affinitiesRes = await pool.query(`
    SELECT source_brand_id, target_brand_id, similarity_note
    FROM brand_affinities;
  `);

  const affinityMap = new Map<string, { similarBrandIds: string[]; similarityNotes: Record<string, string> }>();

  for (const row of affinitiesRes.rows) {
    const src = row.source_brand_id;
    if (!affinityMap.has(src)) {
      affinityMap.set(src, { similarBrandIds: [], similarityNotes: {} });
    }
    const entry = affinityMap.get(src)!;
    entry.similarBrandIds.push(row.target_brand_id);
    if (row.similarity_note) {
      entry.similarityNotes[row.target_brand_id] = row.similarity_note;
    }
  }

  return brandsRes.rows.map((b: any) => {
    const affinities = affinityMap.get(b.id) || { similarBrandIds: [], similarityNotes: {} };
    return {
      id: b.id,
      name: b.name,
      tier: b.tier,
      priceRange: b.priceRange,
      aestheticSummary: b.aestheticSummary,
      aestheticKeywords: b.aestheticKeywords,
      origin: b.origin,
      website: b.website,
      similarBrandIds: affinities.similarBrandIds,
      similarityNotes: affinities.similarityNotes,
    };
  });
}

/**
 * Fetch all products from PostgreSQL mapped to Product interface
 */
export async function getDbProducts(limit = 500): Promise<Product[]> {
  const res = await pool.query(`
    SELECT 
      id,
      brand_name as "brand",
      brand_id as "brandId",
      name,
      price::float as price,
      original_price::float as "originalPrice",
      currency,
      category,
      colors,
      materials,
      occasions as "occasion",
      silhouettes,
      image_url as "imageUrl",
      fallback_image_url as "fallbackImageUrl",
      product_url as "productUrl",
      sizes,
      in_stock as "inStock",
      aesthetic,
      description,
      retailer_highlight as "retailerHighlight",
      composition,
      care
    FROM products
    ORDER BY created_at DESC
    LIMIT $1;
  `, [limit]);

  return res.rows;
}

export interface DbSemanticSearchOptions {
  queryEmbedding?: number[];
  rawQuery?: string;
  limit?: number;
}

/**
 * Execute fast constraint-filtered and pgvector-ranked search in PostgreSQL
 */
export async function queryDbCandidates(
  intent: SearchIntent,
  preferences?: UserPreferences,
  semantic?: DbSemanticSearchOptions
): Promise<{ candidates: (Product & { semanticScore?: number })[]; totalEvaluated: number }> {
  // Count total products in catalog for metrics
  const totalCountRes = await pool.query('SELECT COUNT(*)::int as count FROM products');
  const totalEvaluated = totalCountRes.rows[0]?.count || 0;

  const conditions: string[] = ['in_stock = true'];
  const values: any[] = [];
  let paramIdx = 1;

  // 1. Category constraint
  if (intent.category) {
    conditions.push(`category = $${paramIdx++}`);
    values.push(intent.category);
  }

  // 2. Max price ceiling
  if (intent.maxPrice !== null && intent.maxPrice !== undefined) {
    conditions.push(`price <= $${paramIdx++}`);
    values.push(intent.maxPrice);
  }

  // 3. Min price floor
  if (intent.minPrice !== null && intent.minPrice !== undefined) {
    conditions.push(`price >= $${paramIdx++}`);
    values.push(intent.minPrice);
  }

  // 4. Excluded brands
  const excludedBrands = preferences?.excludedBrands || [];
  if (excludedBrands.length > 0) {
    conditions.push(`NOT (LOWER(brand_id) = ANY($${paramIdx++}))`);
    values.push(excludedBrands.map(b => b.toLowerCase()));
  }

  // 5. Excluded materials
  const excludedMaterials = preferences?.excludedMaterials || [];
  if (excludedMaterials.length > 0) {
    conditions.push(`NOT (materials && $${paramIdx++})`);
    values.push(excludedMaterials.map(m => m.toLowerCase()));
  }

  // 6. Target colors
  if (intent.targetColors && intent.targetColors.length > 0) {
    conditions.push(`(colors && $${paramIdx++})`);
    values.push(intent.targetColors.map(c => c.toLowerCase()));
  }

  let selectColumns = `
    id,
    brand_name as "brand",
    brand_id as "brandId",
    name,
    price::float as price,
    original_price::float as "originalPrice",
    currency,
    category,
    colors,
    materials,
    occasions as "occasion",
    silhouettes,
    image_url as "imageUrl",
    fallback_image_url as "fallbackImageUrl",
    product_url as "productUrl",
    sizes,
    in_stock as "inStock",
    aesthetic,
    description,
    retailer_highlight as "retailerHighlight",
    composition,
    care
  `;

  let orderByClause = 'ORDER BY in_stock DESC, created_at DESC';
  const queryLimit = semantic?.limit || 36;

  // 7. pgvector Cosine Distance Ordering & Semantic Score
  if (semantic?.queryEmbedding && semantic.queryEmbedding.length > 0) {
    const vectorLiteral = formatVectorForPg(semantic.queryEmbedding);
    const vectorParamIdx = paramIdx++;
    values.push(vectorLiteral);

    selectColumns += `,
      ROUND((1 - (embedding <=> $${vectorParamIdx}::vector))::numeric, 4)::float as "semanticScore"
    `;

    // When searching without an explicit category constraint, require a minimum semantic floor
    if (!intent.category) {
      conditions.push(`(embedding IS NOT NULL AND (1 - (embedding <=> $${vectorParamIdx}::vector)) >= 0.35)`);
    }

    orderByClause = `ORDER BY CASE WHEN embedding IS NOT NULL THEN (embedding <=> $${vectorParamIdx}::vector) ELSE 1.0 END ASC`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      ${selectColumns}
    FROM products
    ${whereClause}
    ${orderByClause}
    LIMIT ${queryLimit};
  `;

  const res = await pool.query(sql, values);
  return { candidates: res.rows, totalEvaluated };
}

/**
 * Upsert a brand entity (without affinities)
 */
export async function upsertDbBrand(brand: Brand): Promise<void> {
  await pool.query(`
    INSERT INTO brands (id, name, tier, price_range, aesthetic_summary, aesthetic_keywords, origin, website, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      tier = EXCLUDED.tier,
      price_range = EXCLUDED.price_range,
      aesthetic_summary = EXCLUDED.aesthetic_summary,
      aesthetic_keywords = EXCLUDED.aesthetic_keywords,
      origin = EXCLUDED.origin,
      website = EXCLUDED.website,
      updated_at = NOW();
  `, [
    brand.id,
    brand.name,
    brand.tier,
    brand.priceRange,
    brand.aestheticSummary,
    brand.aestheticKeywords,
    brand.origin,
    brand.website
  ]);
}

/**
 * Upsert brand affinity edges after all brands have been inserted
 */
export async function upsertDbBrandAffinities(brand: Brand): Promise<void> {
  if (!brand.similarBrandIds || brand.similarBrandIds.length === 0) return;

  for (const targetId of brand.similarBrandIds) {
    const note = brand.similarityNotes?.[targetId] || null;
    try {
      await pool.query(`
        INSERT INTO brand_affinities (source_brand_id, target_brand_id, similarity_note)
        VALUES ($1, $2, $3)
        ON CONFLICT (source_brand_id, target_brand_id) DO UPDATE SET
          similarity_note = EXCLUDED.similarity_note;
      `, [brand.id, targetId, note]);
    } catch (e) {
      // If target brand not in DB yet or external, skip silently
      console.warn(`Could not link affinity ${brand.id} -> ${targetId}:`, (e as any).message);
    }
  }
}

/**
 * Upsert a product
 */
export async function upsertDbProduct(p: Product, rawData?: any): Promise<void> {
  await pool.query(`
    INSERT INTO products (
      id, brand_id, brand_name, name, price, original_price, currency,
      category, colors, materials, occasions, silhouettes,
      image_url, fallback_image_url, product_url, sizes, in_stock,
      aesthetic, description, retailer_highlight, composition, care, raw_data, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      brand_id = EXCLUDED.brand_id,
      brand_name = EXCLUDED.brand_name,
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      original_price = EXCLUDED.original_price,
      currency = EXCLUDED.currency,
      category = EXCLUDED.category,
      colors = EXCLUDED.colors,
      materials = EXCLUDED.materials,
      occasions = EXCLUDED.occasions,
      silhouettes = EXCLUDED.silhouettes,
      image_url = EXCLUDED.image_url,
      fallback_image_url = EXCLUDED.fallback_image_url,
      product_url = EXCLUDED.product_url,
      sizes = EXCLUDED.sizes,
      in_stock = EXCLUDED.in_stock,
      aesthetic = EXCLUDED.aesthetic,
      description = EXCLUDED.description,
      retailer_highlight = EXCLUDED.retailer_highlight,
      composition = EXCLUDED.composition,
      care = EXCLUDED.care,
      raw_data = COALESCE(EXCLUDED.raw_data, products.raw_data),
      updated_at = NOW();
  `, [
    p.id,
    p.brandId,
    p.brand,
    p.name,
    p.price,
    p.originalPrice || null,
    p.currency || 'USD',
    p.category,
    p.colors || [],
    (p.materials || []).map(m => m.toLowerCase()),
    p.occasion || [],
    p.silhouettes || [],
    p.imageUrl,
    p.fallbackImageUrl || null,
    p.productUrl,
    p.sizes || [],
    p.inStock ?? true,
    p.aesthetic || '',
    p.description || '',
    p.retailerHighlight || '',
    p.composition || '',
    p.care || '',
    rawData ? JSON.stringify(rawData) : null,
  ]);
}
