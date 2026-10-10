import { pool, upsertDbBrand, upsertDbProduct, upsertDbBrandAffinities } from '../src/server/db';
import { Product, Brand } from '../src/types';
import { BRANDS } from '../src/data/brands';

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at: string;
  tags: string[] | string;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    compare_at_price: string | null;
    available: boolean;
  }>;
  images: Array<{
    id: number;
    src: string;
  }>;
}

interface TargetStore {
  brandId: string;
  brandName: string;
  domain: string;
  fetchLimit: number;
  defaultAesthetic: string;
}

const TARGET_STORES: TargetStore[] = [
  {
    brandId: 'source_unknown',
    brandName: 'Source Unknown',
    domain: 'thesourceunknown.com',
    fetchLimit: 120,
    defaultAesthetic: 'Architectural minimalism, structured wrap silhouettes, sculptural tailoring, and modern outerwear.',
  },
  {
    brandId: 'dissh',
    brandName: 'Dissh',
    domain: 'dissh.com',
    fetchLimit: 130,
    defaultAesthetic: 'Effortless Australian neutrals, refined linen tailoring, ribbed knit dresses, and sun-drenched minimalism.',
  },
  {
    brandId: 'staud',
    brandName: 'Staud',
    domain: 'staud.clothing',
    fetchLimit: 130,
    defaultAesthetic: 'Modern vintage romanticism, sculptural shoulder bags, vibrant tailoring, and playful celebratory silhouettes.',
  },
  {
    brandId: 'paloma_wool',
    brandName: 'Paloma Wool',
    domain: 'palomawool.com',
    fetchLimit: 140,
    defaultAesthetic: 'Barcelona artistic cool, tactile experimental knitwear, trompe-l’œil prints, and expressive asymmetry.',
  },
  {
    brandId: 'anine_bing',
    brandName: 'Anine Bing',
    domain: 'aninebing.com',
    fetchLimit: 130,
    defaultAesthetic: 'Scandinavian simplicity fused with American rock-n-roll edge: sharp double-breasted blazers, sleek leather boots, and effortless silk slips.',
  },
  {
    brandId: 'cult_gaia',
    brandName: 'Cult Gaia',
    domain: 'cultgaia.com',
    fetchLimit: 130,
    defaultAesthetic: 'Sculptural objet d’art dressing, architectural footwear, cut-out evening gowns, and memorable occasionwear.',
  },
  {
    brandId: 'doen',
    brandName: 'Dôen',
    domain: 'shopdoen.com',
    fetchLimit: 120,
    defaultAesthetic: 'California nostalgia, ethereal heirloom silks, hand-embroidered cottons, and romantic vintage silhouettes.',
  },
  {
    brandId: 'sir_the_label',
    brandName: 'SIR the Label',
    domain: 'sirthelabel.com',
    fetchLimit: 120,
    defaultAesthetic: 'Minimalist Australian resort tailoring, clean backless slip dresses, crisp linen separates, and understated summer luxury.',
  },
  {
    brandId: 'matteau',
    brandName: 'Matteau',
    domain: 'matteau-store.com',
    fetchLimit: 100,
    defaultAesthetic: 'Discreet, timeless Australian resortwear: fluid silk crepe column dresses, organic cotton poplin, and sun-soaked minimalism.',
  },
  {
    brandId: 'faithfull',
    brandName: 'Faithfull the Brand',
    domain: 'faithfullthebrand.com',
    fetchLimit: 120,
    defaultAesthetic: 'Sun-drenched getaway style, vintage-inspired hand-printed linens, breezy sundresses, and romantic vacation flair.',
  },
];

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCategory(title: string, productType: string, tags: string[]): Product['category'] {
  const combined = `${title} ${productType} ${tags.join(' ')}`.toLowerCase();

  // 1. Footwear & Shoes
  if (combined.includes('boot') || combined.includes('shoe') || combined.includes('heel') ||
      combined.includes('sandal') || combined.includes('mule') || combined.includes('loafer') ||
      combined.includes('slide') || combined.includes('wedge') || combined.includes('footwear')) {
    return 'shoes';
  }

  // 2. Bags & Leather Goods
  if (combined.includes('bag') || combined.includes('tote') || combined.includes('purse') ||
      combined.includes('crossbody') || combined.includes('clutch') || combined.includes('shoulder bag') ||
      combined.includes('satchel') || combined.includes('hobo')) {
    return 'bag';
  }

  // 3. Coats & Outerwear
  if (combined.includes('coat') || combined.includes('jacket') || combined.includes('trench') ||
      combined.includes('blazer') || combined.includes('parka') || combined.includes('bomber') ||
      combined.includes('outerwear') || combined.includes('anorak')) {
    return 'coat';
  }

  // 4. Knitwear
  if (combined.includes('sweater') || combined.includes('cardigan') || combined.includes('knit') ||
      combined.includes('pullover') || combined.includes('jumper') || combined.includes('turtleneck') ||
      combined.includes('crewneck') || combined.includes('cashmere sweater')) {
    return 'knitwear';
  }

  // 5. Skirts
  if (combined.includes('skirt') || combined.includes('slip skirt') || combined.includes('mini skirt') ||
      combined.includes('maxi skirt') || combined.includes('midi skirt')) {
    return 'skirt';
  }

  // 6. Trousers & Pants
  if (combined.includes('trouser') || combined.includes('pant') || combined.includes('jean') ||
      combined.includes('denim') || combined.includes('slack') || combined.includes('wide-leg pant') ||
      combined.includes('culotte')) {
    return 'trousers';
  }

  // 7. Dresses
  if (combined.includes('dress') || combined.includes('slip') || combined.includes('gown') ||
      combined.includes('maxi') || combined.includes('midi') || combined.includes('kaftan') ||
      combined.includes('sundress') || combined.includes('jumpsuit') || combined.includes('romper')) {
    return 'dress';
  }

  // 8. Tops
  return 'top';
}

function extractColors(text: string): string[] {
  const colors: string[] = [];
  const colorKeywords = [
    'black', 'white', 'ivory', 'cream', 'ecru', 'beige', 'camel', 'taupe', 'brown',
    'espresso', 'chocolate', 'navy', 'blue', 'charcoal', 'grey', 'gray', 'rust',
    'olive', 'khaki', 'sage', 'green', 'burgundy', 'wine', 'red', 'sand', 'tan',
    'terracotta', 'caramel', 'butter', 'lemon', 'lilac', 'lavender', 'blush', 'pink'
  ];

  const lower = text.toLowerCase();
  for (const c of colorKeywords) {
    const regex = new RegExp(`\\b${c}\\b`, 'i');
    if (regex.test(lower)) {
      colors.push(c);
    }
  }

  return colors.length > 0 ? Array.from(new Set(colors)) : ['neutral'];
}

function extractMaterials(text: string): string[] {
  const materials: string[] = [];
  const materialKeywords = [
    'silk', 'linen', 'wool', 'cashmere', 'cotton', 'viscose', 'crepe', 'leather',
    'suede', 'satin', 'triacetate', 'lyocell', 'tencel', 'modal', 'poplin',
    'chiffon', 'georgette', 'mohair', 'alpaca', 'raffia', 'organza', 'corduroy',
    'velvet', 'gabardine', 'denim', 'canvas', 'polyester', 'nylon', 'spandex'
  ];

  const lower = text.toLowerCase();
  for (const m of materialKeywords) {
    const regex = new RegExp(`\\b${m}\\b`, 'i');
    if (regex.test(lower)) {
      materials.push(m);
    }
  }

  return materials.length > 0 ? Array.from(new Set(materials)) : ['natural blend'];
}

function extractSilhouettes(text: string, category: string): string[] {
  const silhouettes: string[] = [];
  const silhouetteKeywords = [
    'asymmetric', 'bias-cut', 'pleated', 'wide-leg', 'sculptural', 'oversized',
    'tailored', 'relaxed', 'slip', 'wrap', 'column', 'midi', 'maxi', 'mini',
    'high-waist', 'straight-leg', 'cropped', 'double-breasted', 'single-breasted',
    'scarf-collar', 'scarf-lapel', 'one-shoulder', 'sleeveless', 'backless',
    'cutout', 'halter', 'low-heel', 'kitten-heel', 'pointed-toe', 'square-toe',
    'structured', 'draped', 'gathered', 'fluted'
  ];

  const lower = text.toLowerCase();
  for (const s of silhouetteKeywords) {
    if (lower.includes(s.replace('-', ' ')) || lower.includes(s)) {
      silhouettes.push(s);
    }
  }

  if (category === 'dress' && !silhouettes.includes('midi') && !silhouettes.includes('maxi') && !silhouettes.includes('mini')) {
    silhouettes.push('fluid');
  }

  return silhouettes.length > 0 ? Array.from(new Set(silhouettes)) : ['tailored'];
}

function extractOccasions(text: string, category: string): string[] {
  const occasions: string[] = [];
  const occasionKeywords = [
    'wedding', 'cocktail', 'evening', 'dinner', 'work', 'office', 'vacation',
    'resort', 'everyday', 'casual', 'celebration', 'gala', 'date night'
  ];

  const lower = text.toLowerCase();
  for (const o of occasionKeywords) {
    if (lower.includes(o)) {
      occasions.push(o);
    }
  }

  if (occasions.length === 0) {
    if (category === 'dress') occasions.push('dinner', 'evening', 'celebration');
    else if (category === 'trousers') occasions.push('work', 'office', 'everyday');
    else if (category === 'coat') occasions.push('everyday', 'work', 'evening');
    else if (category === 'bag') occasions.push('everyday', 'evening', 'work');
    else if (category === 'shoes') occasions.push('evening', 'everyday', 'dinner');
    else occasions.push('everyday');
  }

  return Array.from(new Set(occasions));
}

async function fetchStoreCatalog(store: TargetStore): Promise<ShopifyProduct[]> {
  const url = `https://${store.domain}/products.json?limit=${store.fetchLimit}`;
  console.log(`\nFetching up to ${store.fetchLimit} products from ${store.brandName} (${store.domain})...`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`Failed to fetch from ${store.domain}: Status ${res.status}`);
      return [];
    }

    const data = await res.json() as { products: ShopifyProduct[] };
    return data.products || [];
  } catch (err: any) {
    console.warn(`Error fetching ${store.domain}:`, err.message);
    return [];
  }
}

async function runDeepIngestion() {
  console.log('================================================================');
  console.log('       THREAD Deep Brand Catalog Ingestion Pipeline             ');
  console.log('================================================================');

  // 1. Seed or update all 24 curated brands and their affinity graph
  console.log(`\n1. Synchronizing ${BRANDS.length} curated fashion houses & affinity network in PostgreSQL...`);
  for (const brand of BRANDS) {
    await upsertDbBrand(brand);
  }
  for (const brand of BRANDS) {
    await upsertDbBrandAffinities(brand);
  }
  console.log(`✓ All ${BRANDS.length} brands & affinity edges synchronized.`);

  let totalIngested = 0;
  const brandStats: Record<string, number> = {};

  // 2. Ingest products across all target contemporary stores
  for (const store of TARGET_STORES) {
    const shopifyProducts = await fetchStoreCatalog(store);
    let storeIngested = 0;

    for (const sp of shopifyProducts) {
      // Filter out products without images
      if (!sp.images || sp.images.length === 0) continue;

      // Filter out gift cards, lookbook looks, test items
      const titleLower = sp.title.toLowerCase();
      if (titleLower.includes('gift card') || titleLower.includes('e-gift') || titleLower.includes('digital voucher')) continue;
      if (titleLower.startsWith('aw') && titleLower.includes('look')) continue;

      // Extract price
      const primaryVariant = sp.variants && sp.variants.length > 0 ? sp.variants[0] : null;
      if (!primaryVariant) continue;

      const priceNum = parseFloat(primaryVariant.price);
      if (isNaN(priceNum) || priceNum <= 10) continue; // Skip zero/test pricing

      const origPriceNum = primaryVariant?.compare_at_price ? parseFloat(primaryVariant.compare_at_price) : undefined;

      const rawDescription = stripHtml(sp.body_html || '');
      const rawTags = Array.isArray(sp.tags) ? sp.tags : (typeof sp.tags === 'string' ? (sp.tags as string).split(',').map(t => t.trim()) : []);
      const searchableText = `${sp.title} ${sp.product_type} ${rawTags.join(' ')} ${rawDescription}`;

      const category = extractCategory(sp.title, sp.product_type || '', rawTags);
      const colors = extractColors(searchableText);
      const materials = extractMaterials(searchableText);
      const silhouettes = extractSilhouettes(searchableText, category);
      const occasion = extractOccasions(searchableText, category);

      // Clean image URLs (ensuring https:)
      let imageUrl = sp.images[0].src;
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

      let fallbackImageUrl = sp.images[1] ? sp.images[1].src : imageUrl;
      if (fallbackImageUrl.startsWith('//')) fallbackImageUrl = 'https:' + fallbackImageUrl;

      // Sizes
      const sizes = sp.variants
        ? sp.variants.map(v => v.title).filter(t => t && t !== 'Default Title' && !t.includes('/'))
        : ['S', 'M', 'L'];

      // In stock
      const inStock = sp.variants ? sp.variants.some(v => v.available) : true;

      const productSlug = `${store.brandId}-${sp.handle}`;

      const product: Product = {
        id: productSlug,
        brand: store.brandName,
        brandId: store.brandId,
        name: sp.title,
        price: priceNum,
        originalPrice: origPriceNum && !isNaN(origPriceNum) ? origPriceNum : undefined,
        currency: 'USD',
        category,
        colors,
        materials,
        occasion,
        silhouettes,
        imageUrl,
        fallbackImageUrl,
        productUrl: `https://${store.domain}/products/${sp.handle}`,
        sizes: sizes.length > 0 ? sizes : ['One Size'],
        inStock,
        aesthetic: store.defaultAesthetic.split(',')[0] || 'Contemporary Minimalism',
        description: rawDescription.length > 200 ? rawDescription.substring(0, 197) + '...' : (rawDescription || sp.title),
        retailerHighlight: `Live catalog discovery: authentic piece directly from ${store.brandName} lookbook.`,
        composition: materials.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', '),
        care: rawDescription.toLowerCase().includes('dry clean') ? 'Dry clean only' : 'Hand wash cold or specialist care',
      };

      await upsertDbProduct(product, {
        shopifyId: sp.id,
        handle: sp.handle,
        vendor: sp.vendor,
        publishedAt: sp.created_at,
      });

      storeIngested++;
      totalIngested++;
    }

    brandStats[store.brandName] = storeIngested;
    console.log(`  ✓ ${store.brandName}: Ingested ${storeIngested} real garments.`);
  }

  // Count total products in database
  const countRes = await pool.query('SELECT COUNT(*)::int as count FROM products');
  const totalInDb = countRes.rows[0]?.count || 0;

  console.log('\n================================================================');
  console.log(`   Deep Catalog Ingestion Finished!                             `);
  console.log(`   New/Updated Ingested Garments: ${totalIngested}               `);
  console.log(`   Total Products Now In PostgreSQL: ${totalInDb}                `);
  console.log('================================================================');

  console.log('\nBreakdown by Brand:');
  console.table(brandStats);

  // Breakdown by Category
  const catRes = await pool.query(`
    SELECT category, count(*)::int as count 
    FROM products 
    GROUP BY category 
    ORDER BY count DESC;
  `);
  console.log('\nBreakdown by Category in PostgreSQL:');
  console.table(catRes.rows);

  await pool.end();
}

runDeepIngestion().catch(err => {
  console.error('Deep ingestion failed:', err);
  process.exit(1);
});
