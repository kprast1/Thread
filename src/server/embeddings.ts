import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAiClient: GoogleGenAI | null = null;

if (GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0) {
  try {
    genAiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI client:', err);
  }
}

const VECTOR_DIM = 768;

// Fashion domain semantic anchor concepts mapped across the 768-dimensional space
const FASHION_CONCEPT_ANCHORS: Array<{ name: string; keywords: string[]; dimRange: [number, number] }> = [
  // 1. Aesthetics & Style Vibes (Dims 0 - 159)
  {
    name: 'minimalist_architectural',
    keywords: ['minimalist', 'architectural', 'clean', 'sculptural', 'structured', 'restraint', 'contemporary', 'modern', 'lines', 'geometric'],
    dimRange: [0, 24],
  },
  {
    name: 'quiet_luxury',
    keywords: ['quiet luxury', 'understated', 'subtle', 'refined', 'luxe', 'timeless', 'stealth wealth', 'cashmere', 'silk', 'discreet', 'tailored', 'investment'],
    dimRange: [25, 49],
  },
  {
    name: 'romantic_vintage',
    keywords: ['romantic', 'vintage', 'nostalgia', 'heirloom', 'floral', 'lace', 'tea dress', 'delicate', 'poetic', 'ruffle', 'feminine', 'prairie', 'cottagecore'],
    dimRange: [50, 74],
  },
  {
    name: 'resort_vacation',
    keywords: ['resort', 'vacation', 'summer', 'linen', 'sun-drenched', 'breezy', 'beach', 'coastal', 'getaway', 'holiday', 'slip', 'sand', 'ocean', 'relaxed'],
    dimRange: [75, 99],
  },
  {
    name: 'edgy_downtown',
    keywords: ['edgy', 'downtown', 'rock', 'leather', 'sharp', 'scandinavian edge', 'cool', 'oversized', 'blazer', 'boots', 'attitude', 'black', 'statement'],
    dimRange: [100, 129],
  },
  {
    name: 'artistic_bohemian',
    keywords: ['artistic', 'bohemian', 'barcelona', 'trompe-l’œil', 'experimental', 'tactile', 'asymmetry', 'drape', 'indie', 'knitwear', 'unconventional'],
    dimRange: [130, 159],
  },

  // 2. Garment Categories (Dims 160 - 279)
  {
    name: 'dress',
    keywords: ['dress', 'slip dress', 'gown', 'midi dress', 'maxi dress', 'mini dress', 'sundress', 'kaftan', 'cocktail dress'],
    dimRange: [160, 179],
  },
  {
    name: 'coat_outerwear',
    keywords: ['coat', 'jacket', 'trench', 'blazer', 'overcoat', 'bomber', 'outerwear', 'double-breasted', 'parka'],
    dimRange: [180, 199],
  },
  {
    name: 'knitwear',
    keywords: ['knitwear', 'sweater', 'cardigan', 'knit', 'pullover', 'ribbed', 'cashmere sweater', 'turtleneck', 'jumper'],
    dimRange: [200, 219],
  },
  {
    name: 'trousers',
    keywords: ['trousers', 'pants', 'slacks', 'pleated pant', 'wide-leg', 'jeans', 'denim', 'tailored trouser'],
    dimRange: [220, 239],
  },
  {
    name: 'skirt',
    keywords: ['skirt', 'midi skirt', 'slip skirt', 'mini skirt', 'maxi skirt', 'pleated skirt', 'bias skirt'],
    dimRange: [240, 254],
  },
  {
    name: 'shoes',
    keywords: ['shoes', 'boots', 'ankle boots', 'heels', 'kitten-heel', 'sandals', 'mules', 'loafers', 'slides', 'wedges', 'footwear'],
    dimRange: [255, 269],
  },
  {
    name: 'bag',
    keywords: ['bag', 'tote', 'shoulder bag', 'crossbody', 'clutch', 'handbag', 'raffia tote', 'leather bag', 'purse'],
    dimRange: [270, 279],
  },

  // 3. Silhouettes & Cuts (Dims 280 - 419)
  {
    name: 'silhouettes_asymmetric',
    keywords: ['asymmetric', 'one-shoulder', 'irregular hem', 'draped', 'gathered', 'diagonal'],
    dimRange: [280, 309],
  },
  {
    name: 'silhouettes_tailored_wide',
    keywords: ['wide-leg', 'pleated', 'tailored', 'high-waist', 'oversized', 'straight-leg', 'structured', 'sharp'],
    dimRange: [310, 344],
  },
  {
    name: 'silhouettes_fluid_slip',
    keywords: ['slip', 'bias-cut', 'column', 'fluid', 'flowing', 'backless', 'cutout', 'halter', 'sleeveless', 'bodycon'],
    dimRange: [345, 379],
  },
  {
    name: 'silhouettes_heels_shoes',
    keywords: ['pointed-toe', 'square-toe', 'kitten-heel', 'low-heel', 'block-heel', 'sculptural heel', 'strappy'],
    dimRange: [380, 419],
  },

  // 4. Fabrics & Tactility (Dims 420 - 559)
  {
    name: 'materials_silk_satin',
    keywords: ['silk', 'satin', 'crepe', 'georgette', 'chiffon', 'organza', 'triacetate', 'lustrous'],
    dimRange: [420, 454],
  },
  {
    name: 'materials_wool_cashmere',
    keywords: ['wool', 'cashmere', 'mohair', 'alpaca', 'heavy knit', 'cozy', 'warm', 'pure wool', 'ribbed wool'],
    dimRange: [455, 489],
  },
  {
    name: 'materials_linen_cotton',
    keywords: ['linen', 'organic cotton', 'poplin', 'gauze', 'canvas', 'denim', 'natural blend', 'breathable'],
    dimRange: [490, 524],
  },
  {
    name: 'materials_leather_suede',
    keywords: ['leather', 'calfskin', 'suede', 'alt-leather', 'glossy', 'smooth leather', 'buttery'],
    dimRange: [525, 559],
  },

  // 5. Occasions & Contexts (Dims 560 - 659)
  {
    name: 'occasion_evening_gala',
    keywords: ['evening', 'gala', 'cocktail', 'celebration', 'black tie', 'party', 'dinner', 'date night', 'wedding guest'],
    dimRange: [560, 609],
  },
  {
    name: 'occasion_work_office',
    keywords: ['work', 'office', 'business casual', 'tailored meeting', 'professional', 'everyday tailoring', 'commute'],
    dimRange: [610, 659],
  },

  // 6. Colors & Palette (Dims 660 - 767)
  {
    name: 'color_monochrome',
    keywords: ['black', 'charcoal', 'dark', 'noir', 'white', 'ivory', 'ecru', 'cream', 'monochrome'],
    dimRange: [660, 695],
  },
  {
    name: 'color_earth_neutrals',
    keywords: ['brown', 'chocolate', 'espresso', 'camel', 'taupe', 'beige', 'tan', 'sand', 'olive', 'khaki', 'rust', 'terracotta'],
    dimRange: [696, 735],
  },
  {
    name: 'color_accents',
    keywords: ['burgundy', 'wine', 'navy', 'blue', 'red', 'green', 'butter', 'yellow', 'pink', 'blush', 'lilac'],
    dimRange: [736, 767],
  },
];

/**
 * Deterministic hash to distribute token weight across pseudo-random dimensions
 */
function hashString(str: string, seed: number = 0): number {
  let h = seed ^ 0x12345678;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Fast semantic fashion embedding generator (768 dimensions).
 * Yields consistent, cosine-comparable vectors encoding fashion aesthetics,
 * categories, silhouettes, fabrics, and contextual terminology.
 */
export function generateLocalFashionEmbedding(text: string): number[] {
  const vec = new Float64Array(VECTOR_DIM);
  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/[\s,.;:!?()/-]+/).filter(w => w.length > 1);

  // 1. Activate concept anchors
  for (const anchor of FASHION_CONCEPT_ANCHORS) {
    let anchorScore = 0;
    for (const kw of anchor.keywords) {
      if (normalizedText.includes(kw)) {
        // Multi-word exact phrase match gets stronger weight
        anchorScore += kw.includes(' ') ? 2.5 : 1.2;
      }
    }

    if (anchorScore > 0) {
      const [start, end] = anchor.dimRange;
      const span = end - start + 1;
      for (let i = start; i <= end; i++) {
        // Distribute activation across the concept's designated subspace
        const subIndex = i - start;
        const wave = Math.sin((subIndex / span) * Math.PI);
        vec[i] += anchorScore * wave * 1.5;
      }
    }
  }

  // 2. Subword feature hashing for general vocabulary coverage across the vector
  for (const word of words) {
    // Hash full word
    const h1 = hashString(word, 42) % VECTOR_DIM;
    const h2 = hashString(word, 1337) % VECTOR_DIM;
    const sign1 = (hashString(word, 7) % 2 === 0) ? 1 : -1;
    const sign2 = (hashString(word, 99) % 2 === 0) ? 1 : -1;

    vec[h1] += 0.4 * sign1;
    vec[h2] += 0.3 * sign2;

    // Character 3-grams for morphological similarity
    if (word.length >= 4) {
      for (let j = 0; j <= word.length - 3; j++) {
        const tri = word.slice(j, j + 3);
        const hTri = hashString(tri, 555) % VECTOR_DIM;
        const signTri = (hashString(tri, 888) % 2 === 0) ? 1 : -1;
        vec[hTri] += 0.15 * signTri;
      }
    }
  }

  // 3. L2 Normalize to unit vector for cosine distance computation
  let norm = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vec[i] /= norm;
    }
  } else {
    // Fallback if empty string
    vec[0] = 1.0;
  }

  return Array.from(vec);
}

/**
 * Universal embedding generator:
 * - Uses Google Gemini text-embedding-004 when GEMINI_API_KEY is configured
 * - Seamlessly falls back to the deterministic 768-dim semantic fashion encoder
 */
export async function getSemanticEmbedding(text: string): Promise<number[]> {
  if (genAiClient) {
    try {
      const response = await genAiClient.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });
      if (response?.embeddings?.[0]?.values) {
        return response.embeddings[0].values;
      }
    } catch (err: any) {
      console.warn('Gemini embedding failed, using local semantic encoder:', err.message);
    }
  }

  return generateLocalFashionEmbedding(text);
}

/**
 * Helper to format a vector as PostgreSQL vector literal: '[0.123, -0.456, ...]'
 */
export function formatVectorForPg(vec: number[]): string {
  return `[${vec.map(v => Number(v.toFixed(6))).join(',')}]`;
}
