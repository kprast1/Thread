import { pool, upsertDbBrand, upsertDbProduct } from '../src/server/db';
import { Product, Brand } from '../src/types';

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
  defaultAesthetic: string;
  tier: 'accessible' | 'contemporary' | 'accessible_luxury' | 'luxury';
  priceRange: string;
  origin: string;
  similarBrandIds: string[];
}

const TARGET_STORES: TargetStore[] = [
  {
    brandId: 'source_unknown',
    brandName: 'Source Unknown',
    domain: 'thesourceunknown.com',
    defaultAesthetic: 'Architectural minimalism, structured wrap silhouettes, sculptural tailoring, and modern outerwear.',
    tier: 'contemporary',
    priceRange: '$120 – $420',
    origin: 'New York, USA',
    similarBrandIds: ['cos', 'toteme', 'tibi', 'massimo_dutti'],
  },
  {
    brandId: 'dissh',
    brandName: 'Dissh',
    domain: 'dissh.com',
    defaultAesthetic: 'Effortless Australian neutrals, refined linen tailoring, ribbed knit dresses, and sun-drenched minimalism.',
    tier: 'contemporary',
    priceRange: '$90 – $280',
    origin: 'Brisbane, Australia',
    similarBrandIds: ['reformation', 'sezane', 'massimo_dutti', 'and_other_stories'],
  },
  {
    brandId: 'staud',
    brandName: 'Staud',
    domain: 'staud.clothing',
    defaultAesthetic: 'Modern vintage romanticism, sculptural shoulder bags, vibrant tailoring, and playful celebratory silhouettes.',
    tier: 'contemporary',
    priceRange: '$195 – $595',
    origin: 'Los Angeles, USA',
    similarBrandIds: ['reformation', 'ganni', 'rouje', 'toteme'],
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

  if (combined.includes('dress') || combined.includes('slip') || combined.includes('gown') || combined.includes('maxi dress') || combined.includes('midi dress') || combined.includes('mini dress')) return 'dress';
  if (combined.includes('skirt')) return 'skirt';
  if (combined.includes('trouser') || combined.includes('pant') || combined.includes('jean') || combined.includes('slack')) return 'trousers';
  if (combined.includes('coat') || combined.includes('jacket') || combined.includes('trench') || combined.includes('blazer') || combined.includes('outerwear')) return 'coat';
  if (combined.includes('bag') || combined.includes('tote') || combined.includes('purse') || combined.includes('crossbody') || combined.includes('clutch')) return 'bag';
  if (combined.includes('boot') || combined.includes('shoe') || combined.includes('heel') || combined.includes('loafer') || combined.includes('mule') || combined.includes('sandal')) return 'shoes';
  if (combined.includes('sweater') || combined.includes('cardigan') || combined.includes('knit') || combined.includes('pullover')) return 'knitwear';
  if (combined.includes('top') || combined.includes('shirt') || combined.includes('blouse') || combined.includes('tee') || combined.includes('tank')) return 'top';

  return 'top';
}

function extractColors(text: string): string[] {
  const colors: string[] = [];
  const colorKeywords = [
    'black', 'white', 'ivory', 'cream', 'ecru', 'beige', 'camel', 'taupe', 'brown',
    'espresso', 'chocolate', 'navy', 'blue', 'charcoal', 'grey', 'gray', 'rust',
    'olive', 'khaki', 'sage', 'green', 'burgundy', 'wine', 'red', 'sand', 'tan'
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
    'chiffon', 'georgette', 'mohair', 'alpaca', 'polyester', 'nylon', 'spandex'
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
    'scarf-collar', 'one-shoulder', 'sleeveless', 'low-heel', 'kitten-heel'
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
    'resort', 'everyday', 'casual', 'celebration', 'gala'
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
    else occasions.push('everyday');
  }

  return Array.from(new Set(occasions));
}

async function fetchStoreCatalog(store: TargetStore, limit = 40): Promise<ShopifyProduct[]> {
  const url = `https://${store.domain}/products.json?limit=${limit}`;
  console.log(`\nFetching live inventory from ${store.brandName} (${url})...`);

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

async function runIngestion() {
  console.log('====================================================');
  console.log('   THREAD Live Brand Catalog Ingestion Pipeline     ');
  console.log('====================================================');

  let totalIngested = 0;

  for (const store of TARGET_STORES) {
    // 1. Ensure brand exists in database
    const brandObj: Brand = {
      id: store.brandId,
      name: store.brandName,
      tier: store.tier,
      priceRange: store.priceRange,
      aestheticSummary: store.defaultAesthetic,
      aestheticKeywords: ['Contemporary', 'Sculptural', 'Refined', 'Tailored', 'Minimalist'],
      origin: store.origin,
      website: `https://${store.domain}`,
      similarBrandIds: store.similarBrandIds,
    };
    await upsertDbBrand(brandObj);

    // 2. Fetch live products from store
    const shopifyProducts = await fetchStoreCatalog(store, 35);
    console.log(`Fetched ${shopifyProducts.length} raw products from ${store.brandName}. Normalizing and ingesting...`);

    let storeIngested = 0;
    for (const sp of shopifyProducts) {
      if (!sp.images || sp.images.length === 0) continue;

      const rawDescription = stripHtml(sp.body_html || '');
      const rawTags = Array.isArray(sp.tags) ? sp.tags : (typeof sp.tags === 'string' ? (sp.tags as string).split(',').map(t => t.trim()) : []);
      const searchableText = `${sp.title} ${rawTags.join(' ')} ${rawDescription}`;

      const category = extractCategory(sp.title, sp.product_type || '', rawTags);
      const colors = extractColors(searchableText);
      const materials = extractMaterials(searchableText);
      const silhouettes = extractSilhouettes(searchableText, category);
      const occasion = extractOccasions(searchableText, category);

      // Determine price
      const primaryVariant = sp.variants && sp.variants.length > 0 ? sp.variants[0] : null;
      const priceNum = primaryVariant ? parseFloat(primaryVariant.price) : 200;
      const origPriceNum = primaryVariant?.compare_at_price ? parseFloat(primaryVariant.compare_at_price) : undefined;

      // Image URL
      const imageUrl = sp.images[0].src;
      const fallbackImageUrl = sp.images[1] ? sp.images[1].src : imageUrl;

      // Sizes
      const sizes = sp.variants
        ? sp.variants.map(v => v.title).filter(t => t && t !== 'Default Title' && !t.includes('/'))
        : ['S', 'M', 'L'];

      // Stock
      const inStock = sp.variants ? sp.variants.some(v => v.available) : true;

      const productSlug = `${store.brandId}-${sp.handle}`;

      const product: Product = {
        id: productSlug,
        brand: store.brandName,
        brandId: store.brandId,
        name: sp.title,
        price: isNaN(priceNum) ? 195 : priceNum,
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
        publishedAt: sp.created_at,
      });

      storeIngested++;
      totalIngested++;
    }

    console.log(`✓ Successfully ingested and normalized ${storeIngested} garments from ${store.brandName}.`);
  }

  console.log('\n====================================================');
  console.log(`Ingestion Finished! Total Live Garments Ingested: ${totalIngested}`);
  console.log('====================================================');

  await pool.end();
}

runIngestion().catch(err => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
