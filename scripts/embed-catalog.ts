import { pool } from '../src/server/db';
import { getSemanticEmbedding, formatVectorForPg } from '../src/server/embeddings';

async function embedCatalog() {
  console.log('================================================================');
  console.log('     THREAD pgvector Fashion Catalog Embedding Pipeline         ');
  console.log('================================================================');

  const client = await pool.connect();
  try {
    // 1. Ensure pgvector extension and column
    console.log('\n1. Ensuring vector extension and embedding column in PostgreSQL...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(768);');

    // 2. Fetch products needing embeddings
    const res = await client.query(`
      SELECT 
        id, brand_name, name, category, aesthetic, description,
        materials, silhouettes, occasions, colors
      FROM products
      WHERE embedding IS NULL
      ORDER BY id;
    `);

    const productsToEmbed = res.rows;
    console.log(`Found ${productsToEmbed.length} garments needing pgvector embeddings.`);

    if (productsToEmbed.length === 0) {
      console.log('All garments already have vector embeddings!');
    } else {
      console.log('Generating 768-dimensional semantic embeddings...');
      const batchSize = 50;
      let processed = 0;

      for (let i = 0; i < productsToEmbed.length; i += batchSize) {
        const chunk = productsToEmbed.slice(i, i + batchSize);
        await Promise.all(
          chunk.map(async p => {
            const compositeText = [
              `${p.brand_name} ${p.name}`,
              `Category: ${p.category}`,
              `Aesthetic: ${p.aesthetic}`,
              p.silhouettes?.length ? `Silhouettes: ${p.silhouettes.join(', ')}` : '',
              p.materials?.length ? `Fabrics: ${p.materials.join(', ')}` : '',
              p.occasions?.length ? `Occasions: ${p.occasions.join(', ')}` : '',
              p.colors?.length ? `Palette: ${p.colors.join(', ')}` : '',
              p.description || '',
            ].filter(Boolean).join('. ');

            const embedding = await getSemanticEmbedding(compositeText);
            const vectorLiteral = formatVectorForPg(embedding);

            await client.query(
              'UPDATE products SET embedding = $1::vector WHERE id = $2',
              [vectorLiteral, p.id]
            );
          })
        );

        processed += chunk.length;
        process.stdout.write(`  Processed ${processed}/${productsToEmbed.length} garments (${Math.round((processed / productsToEmbed.length) * 100)}%)\r`);
      }
      console.log(`\n✓ Successfully embedded ${processed} garments into PostgreSQL.`);
    }

    // 3. Create or rebuild HNSW index for ultra-fast cosine similarity
    console.log('\n2. Building/Verifying HNSW cosine vector index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_embedding 
      ON products USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);
    console.log('✓ HNSW vector index active.');

    // 4. Test Semantic Cosine Similarity Queries
    console.log('\n3. Testing live pgvector cosine distance queries (<=>):');
    const testQueries = [
      'quiet luxury summer evening',
      'architectural black dress',
      'pointed kitten heel leather boots',
      'coastal grandmother linen relaxed',
      'tailored wool oversized blazer'
    ];

    for (const tq of testQueries) {
      console.log(`\n--- Query: "${tq}" ---`);
      const qVec = await getSemanticEmbedding(tq);
      const qVecLiteral = formatVectorForPg(qVec);

      const simRes = await client.query(`
        SELECT 
          name, brand_name, category, price,
          ROUND((1 - (embedding <=> $1::vector))::numeric, 4) as cosine_similarity
        FROM products
        WHERE in_stock = true
        ORDER BY embedding <=> $1::vector ASC
        LIMIT 3;
      `, [qVecLiteral]);

      for (const row of simRes.rows) {
        console.log(`  [${(row.cosine_similarity * 100).toFixed(1)}% Sim] ${row.name} (${row.brand_name}) - $${row.price} [${row.category}]`);
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

embedCatalog().catch(err => {
  console.error('Embedding failed:', err);
  process.exit(1);
});
