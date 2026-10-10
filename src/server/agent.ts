import { GoogleGenAI } from '@google/genai';
import { BRANDS } from '../data/brands';
import { PRODUCTS } from '../data/products';
import {
  AgentTraceStep,
  Brand,
  Product,
  SearchResultProduct,
  SearchIntent,
  SearchResponse,
  UserPreferences
} from '../types';
import { checkDbHealth, queryDbCandidates } from './db';
import { getSemanticEmbedding } from './embeddings';
import { GeminiAgenticRagEngine } from './agenticRag';

// Server-side Gemini client with aistudio-build telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export class FashionSearchAgent {
  private geminiRag = new GeminiAgenticRagEngine();
  /**
   * Step 1: Parse user query into structured search intent
   */
  async parseIntent(query: string, preferences?: UserPreferences): Promise<{ intent: SearchIntent; trace: AgentTraceStep }> {
    const defaultIntent: SearchIntent = {
      category: null,
      targetColors: [],
      targetOccasions: [],
      targetSilhouettes: [],
      targetMaterials: [],
      targetAesthetic: [],
      maxPrice: preferences?.priceBudget?.max ?? null,
      minPrice: preferences?.priceBudget?.min ?? null,
      excludedWords: preferences?.excludedMaterials || [],
      summary: query,
    };

    const q = query.toLowerCase();

    // 1. Price constraint extraction: e.g. "under $350", "below 400", "less than $300", "<$250", "sub-$200"
    const priceMatch = q.match(/(?:under|below|less than|max|budget of|\<|sub-)\s*\$?(\d+)/i);
    if (priceMatch) {
      defaultIntent.maxPrice = parseInt(priceMatch[1], 10);
    }
    const minPriceMatch = q.match(/(?:above|over|more than|min|\>)\s*\$?(\d+)/i);
    if (minPriceMatch) {
      defaultIntent.minPrice = parseInt(minPriceMatch[1], 10);
    }
    if (q.includes('affordable') || q.includes('budget') || q.includes('cheap') || q.includes('dupe')) {
      if (!defaultIntent.maxPrice) defaultIntent.maxPrice = 280;
    }

    // 2. Comprehensive Category Extraction
    if (/(?:dress|slip|gown|sundress|halter dress|maxi dress|midi dress|shift dress)/i.test(q)) {
      defaultIntent.category = 'dress';
    } else if (/(?:trouser|trousers|pant|pants|slacks|chinos|wide-leg|puddle pant)/i.test(q)) {
      defaultIntent.category = 'trousers';
    } else if (/(?:bag|tote|purse|crossbody|shoulder bag|handbag|clutch|satchel)/i.test(q)) {
      defaultIntent.category = 'bag';
    } else if (/(?:coat|jacket|trench|outerwear|blazer|overcoat|wool coat|parka)/i.test(q)) {
      defaultIntent.category = 'coat';
    } else if (/(?:shoe|shoes|loafer|loafers|boot|boots|heel|heels|mule|mules|kitten-heel|flat|flats|sandal|sandals)/i.test(q)) {
      defaultIntent.category = 'shoes';
    } else if (/(?:sweater|cardigan|knit|knitwear|jumper|pullover|turtleneck|crewneck|mockneck)/i.test(q)) {
      defaultIntent.category = 'knitwear';
    } else if (/(?:skirt|skirts|maxi skirt|midi skirt|slip skirt|wrap skirt)/i.test(q)) {
      defaultIntent.category = 'skirt';
    } else if (/(?:top|tops|shirt|shirts|blouse|blouses|tee|t-shirt|tank|button-down)/i.test(q)) {
      defaultIntent.category = 'top';
    }

    // 3. Color Synonyms & Detection
    const colorMap: Record<string, string[]> = {
      black: ['black', 'noir', 'onyx'],
      white: ['white', 'ecru', 'cream', 'ivory', 'oatmeal', 'bone'],
      brown: ['brown', 'espresso', 'chocolate', 'mocha', 'coffee', 'chestnut'],
      camel: ['camel', 'tan', 'beige', 'sand', 'taupe', 'cognac', 'saddle'],
      grey: ['grey', 'gray', 'charcoal', 'slate', 'melange'],
      navy: ['navy', 'midnight', 'dark blue'],
      olive: ['olive', 'sage', 'khaki', 'forest green', 'green'],
      burgundy: ['burgundy', 'wine', 'bordeaux', 'rust', 'terracotta', 'red'],
    };

    for (const [canonical, variants] of Object.entries(colorMap)) {
      if (variants.some(v => q.includes(v))) {
        defaultIntent.targetColors.push(canonical);
        // Also keep variant for exact matching
        variants.forEach(v => {
          if (q.includes(v) && !defaultIntent.targetColors.includes(v)) {
            defaultIntent.targetColors.push(v);
          }
        });
      }
    }

    // 4. Occasions Detection
    const occasionKeywords = ['wedding', 'work', 'office', 'cocktail', 'dinner', 'evening', 'resort', 'vacation', 'summer', 'everyday', 'gala', 'date night', 'party', 'casual'];
    for (const occ of occasionKeywords) {
      if (q.includes(occ)) defaultIntent.targetOccasions.push(occ);
    }

    // 5. Silhouettes & Details
    const silhouetteKeywords = ['asymmetric', 'minimalist', 'wide-leg', 'pleated', 'sculptural', 'oversized', 'tailored', 'relaxed', 'slip', 'wrap', 'low-heel', 'kitten-heel', 'square-toe', 'bias-cut', 'halter', 'high-waisted', 'mock-neck', 'slouchy'];
    for (const sil of silhouetteKeywords) {
      if (q.includes(sil)) defaultIntent.targetSilhouettes.push(sil);
    }

    // 6. Materials & Fabrics
    const materialKeywords = ['silk', 'linen', 'wool', 'cashmere', 'leather', 'cotton', 'mohair', 'alpaca', 'poplin', 'viscose', 'lyocell'];
    for (const mat of materialKeywords) {
      if (q.includes(mat)) defaultIntent.targetMaterials.push(mat);
    }

    // 7. Aesthetics & Design Vibe
    const aestheticKeywords = ['quiet luxury', 'minimalist', 'architectural', 'understated', 'luxury', 'parisian', 'chic', 'scandinavian', 'romantic', 'clean', 'mediterranean', 'old money', 'modern tailoring'];
    for (const aes of aestheticKeywords) {
      if (q.includes(aes)) defaultIntent.targetAesthetic.push(aes);
    }

    // Enhance with Gemini 3.8 Flash if API key is provided
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `Analyze this fashion search query and extract structured intent:
Query: "${query}"
User brand preferences: ${preferences?.favoriteBrandIds?.join(', ') || 'none'}
User budget preference: ${preferences?.priceBudget?.max ? `$${preferences.priceBudget.max}` : 'none'}

Return a JSON object with:
{
  "category": "dress" | "trousers" | "bag" | "coat" | "shoes" | "knitwear" | "top" | "skirt" | null,
  "targetColors": string[],
  "targetOccasions": string[],
  "targetSilhouettes": string[],
  "targetMaterials": string[],
  "targetAesthetic": string[],
  "maxPrice": number or null,
  "minPrice": number or null,
  "aestheticSummary": string
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.category) defaultIntent.category = parsed.category;
          if (Array.isArray(parsed.targetColors) && parsed.targetColors.length > 0) {
            defaultIntent.targetColors = Array.from(new Set([...defaultIntent.targetColors, ...parsed.targetColors]));
          }
          if (Array.isArray(parsed.targetSilhouettes) && parsed.targetSilhouettes.length > 0) {
            defaultIntent.targetSilhouettes = Array.from(new Set([...defaultIntent.targetSilhouettes, ...parsed.targetSilhouettes]));
          }
          if (Array.isArray(parsed.targetOccasions) && parsed.targetOccasions.length > 0) {
            defaultIntent.targetOccasions = Array.from(new Set([...defaultIntent.targetOccasions, ...parsed.targetOccasions]));
          }
          if (Array.isArray(parsed.targetMaterials) && parsed.targetMaterials.length > 0) {
            defaultIntent.targetMaterials = Array.from(new Set([...defaultIntent.targetMaterials, ...parsed.targetMaterials]));
          }
          if (parsed.maxPrice) defaultIntent.maxPrice = parsed.maxPrice;
          if (parsed.aestheticSummary) defaultIntent.summary = parsed.aestheticSummary;
        }
      } catch (err) {
        console.warn('Gemini intent extraction notice:', err);
      }
    }

    const trace: AgentTraceStep = {
      id: 'step-1',
      phase: 'understanding',
      title: 'Decoded Natural-Language Intent',
      detail: `Parsed intent: ${defaultIntent.category ? `Category [${defaultIntent.category}]` : 'Open catalog discovery'}, Budget ceiling: ${defaultIntent.maxPrice ? `$${defaultIntent.maxPrice}` : 'Unconstrained'}, Aesthetics & Silhouettes: [${defaultIntent.targetAesthetic.concat(defaultIntent.targetSilhouettes).slice(0, 4).join(', ') || 'Tailored & Contemporary'}].`,
      metrics: {
        category: defaultIntent.category || 'all',
        maxPrice: defaultIntent.maxPrice ? `$${defaultIntent.maxPrice}` : 'unconstrained',
        silhouettesCount: defaultIntent.targetSilhouettes.length,
        colorsDetected: defaultIntent.targetColors.join(', ') || 'any'
      },
      timestamp: Date.now(),
    };

    return { intent: defaultIntent, trace };
  }

  /**
   * Step 2: Plan search & expand brands based on user's favorite brands
   */
  planBrandExpansion(intent: SearchIntent, preferences?: UserPreferences): {
    favoriteBrandIds: string[];
    discoveredBrandIds: string[];
    trace: AgentTraceStep;
  } {
    const favoriteBrandIds = preferences?.favoriteBrandIds && preferences.favoriteBrandIds.length > 0
      ? preferences.favoriteBrandIds
      : ['cos', 'toteme', 'reformation']; // default starting favorites if none selected

    // Excluded brands
    const excluded = new Set(preferences?.excludedBrands || []);

    // Graph traversal: find similar brands
    const discoveredBrandSet = new Set<string>();

    for (const favId of favoriteBrandIds) {
      const brand = BRANDS.find(b => b.id === favId);
      if (brand && brand.similarBrandIds) {
        for (const simId of brand.similarBrandIds) {
          if (!favoriteBrandIds.includes(simId) && !excluded.has(simId)) {
            discoveredBrandSet.add(simId);
          }
        }
      }
    }

    const discoveredBrandIds = Array.from(discoveredBrandSet);

    const trace: AgentTraceStep = {
      id: 'step-2',
      phase: 'brand_expansion',
      title: 'Planned Multi-Brand Exploration',
      detail: `Prioritizing ${favoriteBrandIds.length} favorite brand(s) (${favoriteBrandIds.map(id => BRANDS.find(b => b.id === id)?.name || id).join(', ')}). Discovered ${discoveredBrandIds.length} candidate brand(s) via aesthetic similarity clusters.`,
      metrics: {
        favoriteBrands: favoriteBrandIds.length,
        discoveredBrands: discoveredBrandIds.length,
      },
      timestamp: Date.now(),
    };

    return { favoriteBrandIds, discoveredBrandIds, trace };
  }

  /**
   * Step 3 & 4: Retrieve candidates using pgvector HNSW cosine similarity & deterministic hard constraints
   */
  async filterCandidates(
    intent: SearchIntent,
    preferences?: UserPreferences,
    rawQuery?: string
  ): Promise<{
    validCandidates: Product[];
    totalEvaluated: number;
    trace: AgentTraceStep;
  }> {
    // Attempt fast query through PostgreSQL with pgvector cosine ranking
    try {
      const dbHealth = await checkDbHealth();
      if (dbHealth.connected && dbHealth.productCount > 0) {
        let queryEmbedding: number[] | undefined;
        if (rawQuery && rawQuery.trim().length > 0) {
          queryEmbedding = await getSemanticEmbedding(rawQuery);
        }

        const { candidates, totalEvaluated } = await queryDbCandidates(intent, preferences, {
          queryEmbedding,
          rawQuery,
          limit: 36,
        });

        const trace: AgentTraceStep = {
          id: 'step-3',
          phase: 'hard_filtering',
          title: 'Semantic Vector & Constraint Retrieval (pgvector HNSW)',
          detail: `Evaluated ${totalEvaluated} garments in PostgreSQL. Retrieved ${candidates.length} top candidates via 768-dim HNSW cosine similarity and constraint filters (category: ${intent.category || 'any'}, maxPrice: ${intent.maxPrice ? `$${intent.maxPrice}` : 'none'}, excluded materials: ${preferences?.excludedMaterials?.length || 0}).`,
          metrics: {
            totalEvaluated,
            passedHardConstraints: candidates.length,
            filteredOut: totalEvaluated - candidates.length,
            engine: 'PostgreSQL pgvector HNSW & GIN Indexes',
          },
          timestamp: Date.now(),
        };
        return { validCandidates: candidates, totalEvaluated, trace };
      }
    } catch (e) {
      console.warn('PostgreSQL query error, falling back to memory catalog:', (e as any).message);
    }

    // Fallback: In-memory evaluation
    const totalEvaluated = PRODUCTS.length;
    const excludedMaterials = new Set((preferences?.excludedMaterials || []).map(m => m.toLowerCase()));
    const excludedBrands = new Set((preferences?.excludedBrands || []).map(b => b.toLowerCase()));

    let validCandidates = PRODUCTS.filter(product => {
      // Hard constraint 1: Excluded brands
      if (excludedBrands.has(product.brandId.toLowerCase())) return false;

      // Hard constraint 2: Category match (if intent specified a distinct category)
      if (intent.category && product.category !== intent.category) return false;

      // Hard constraint 3: Max price ceiling
      if (intent.maxPrice !== null && product.price > intent.maxPrice) return false;

      // Hard constraint 4: Min price floor
      if (intent.minPrice !== null && product.price < intent.minPrice) return false;

      // Hard constraint 5: Excluded materials
      for (const mat of product.materials) {
        if (excludedMaterials.has(mat.toLowerCase())) return false;
      }

      // Hard constraint 6: Specific color requirement if query strongly mandates
      if (intent.targetColors.length > 0) {
        const matchesColor = intent.targetColors.some(tc =>
          product.colors.some(pc => pc.toLowerCase().includes(tc.toLowerCase()) || tc.toLowerCase().includes(pc.toLowerCase()))
        );
        if (!matchesColor) return false;
      }

      return true;
    });

    let adaptiveNote = '';
    // Adaptive Constraint Relaxation: If strict combination pruned all items,
    // maintain hard budget/materials safety but relax color tone to show silhouette matches
    if (validCandidates.length === 0 && intent.targetColors.length > 0) {
      const relaxedColorCandidates = PRODUCTS.filter(product => {
        if (excludedBrands.has(product.brandId.toLowerCase())) return false;
        if (intent.category && product.category !== intent.category) return false;
        if (intent.maxPrice !== null && product.price > intent.maxPrice) return false;
        if (intent.minPrice !== null && product.price < intent.minPrice) return false;
        for (const mat of product.materials) {
          if (excludedMaterials.has(mat.toLowerCase())) return false;
        }
        return true;
      });
      if (relaxedColorCandidates.length > 0) {
        validCandidates = relaxedColorCandidates;
        adaptiveNote = ` (Adaptively relaxed color filter to surface ${validCandidates.length} style-compatible pieces within budget)`;
      }
    }

    const trace: AgentTraceStep = {
      id: 'step-3',
      phase: 'hard_filtering',
      title: 'Deterministic Constraint Filtering',
      detail: `Evaluated ${totalEvaluated} catalog items. ${validCandidates.length} passed hard constraints (category: ${intent.category || 'all'}, budget: ${intent.maxPrice ? `$${intent.maxPrice}` : 'unconstrained'}, excluded fabrics: ${excludedMaterials.size})${adaptiveNote}.`,
      metrics: {
        totalEvaluated,
        passedHardConstraints: validCandidates.length,
        filteredOut: totalEvaluated - validCandidates.length,
      },
      timestamp: Date.now(),
    };

    return { validCandidates, totalEvaluated, trace };
  }

  /**
   * Step 5: Rank products using PRD formula:
   * score = 0.45 * query_match + 0.25 * style_match + 0.20 * brand_affinity + 0.10 * discovery_quality
   */
  rankCandidates(
    candidates: Product[],
    intent: SearchIntent,
    favoriteBrandIds: string[],
    preferences?: UserPreferences
  ): {
    ranked: SearchResultProduct[];
    trace: AgentTraceStep;
  } {
    const feedbackMap = new Map<string, string>();
    if (preferences?.feedbackHistory) {
      preferences.feedbackHistory.forEach(f => feedbackMap.set(f.productId, f.type));
    }

    const scored = candidates.map(product => {
      const isFavorite = favoriteBrandIds.includes(product.brandId);

      // 1. Query match (0 to 1) - powered by pgvector semantic score
      const semanticScore = (product as any).semanticScore;
      let queryMatch = typeof semanticScore === 'number' ? semanticScore : 0.5;
      if (intent.targetSilhouettes.length > 0) {
        const silMatches = intent.targetSilhouettes.filter(s =>
          product.silhouettes.some(ps => ps.toLowerCase().includes(s.toLowerCase()))
        ).length;
        queryMatch += (silMatches / intent.targetSilhouettes.length) * 0.15;
      }
      if (intent.targetOccasions.length > 0) {
        const occMatches = intent.targetOccasions.filter(o =>
          product.occasion.some(po => po.toLowerCase().includes(o.toLowerCase()))
        ).length;
        queryMatch += (occMatches / intent.targetOccasions.length) * 0.15;
      }
      queryMatch = Math.min(1, queryMatch);

      // 2. Style match (0 to 1)
      let styleMatch = 0.6;
      if (preferences?.styleAesthetics && preferences.styleAesthetics.length > 0) {
        const aestheticMatches = preferences.styleAesthetics.filter(a =>
          product.aesthetic.toLowerCase().includes(a.toLowerCase())
        ).length;
        styleMatch = 0.4 + (aestheticMatches / preferences.styleAesthetics.length) * 0.6;
      }
      styleMatch = Math.min(1, styleMatch);

      // 3. Brand affinity (0 to 1)
      let brandAffinity = 0.3;
      if (isFavorite) {
        brandAffinity = 1.0;
      } else {
        // Discovered brand: calculate similarity to user's favorite brands
        const brandObj = BRANDS.find(b => b.id === product.brandId);
        if (brandObj && brandObj.similarBrandIds) {
          const overlap = brandObj.similarBrandIds.filter(id => favoriteBrandIds.includes(id)).length;
          brandAffinity = overlap > 0 ? 0.75 : 0.45;
        }
      }

      // 4. Discovery quality (0 to 1)
      let discoveryQuality = 0.7;
      if (!isFavorite) {
        discoveryQuality = 0.9; // bonus for enriching candidate variety with credible alternative
      }

      // Adjust for user feedback
      const feedback = feedbackMap.get(product.id);
      let feedbackPenalty = 0;
      if (feedback === 'not_my_style' || feedback === 'wrong_silhouette') feedbackPenalty = -0.3;
      else if (feedback === 'too_expensive') feedbackPenalty = -0.2;
      else if (feedback === 'love' || feedback === 'more_like_this') feedbackPenalty = 0.2;

      // PRD Formula
      const totalScore = (
        0.45 * queryMatch +
        0.25 * styleMatch +
        0.20 * brandAffinity +
        0.10 * discoveryQuality
      ) + feedbackPenalty;

      const normalizedScore = Math.max(0, Math.min(1, totalScore));

      // Similarity note if discovered
      let similarityToFavorite: string | undefined;
      if (!isFavorite) {
        const brandObj = BRANDS.find(b => b.id === product.brandId);
        const relatedFav = brandObj?.similarBrandIds.find(id => favoriteBrandIds.includes(id));
        if (relatedFav && brandObj?.similarityNotes?.[relatedFav]) {
          similarityToFavorite = brandObj.similarityNotes[relatedFav];
        } else if (relatedFav) {
          const favName = BRANDS.find(b => b.id === relatedFav)?.name || relatedFav;
          similarityToFavorite = `Aesthetic affinity with ${favName}: complementary tailoring & clean palette.`;
        }
      }

      const item: SearchResultProduct = {
        ...product,
        reason: `${product.silhouettes.slice(0, 2).join(' ')} design matching your aesthetic brief and $${product.price} budget`,
        discoveryType: isFavorite ? 'favorite_brand' : 'discovered_brand',
        similarityToFavorite,
        matchScore: Math.round(normalizedScore * 100),
        scoreBreakdown: {
          queryMatch: Math.round(queryMatch * 100),
          styleMatch: Math.round(styleMatch * 100),
          brandAffinity: Math.round(brandAffinity * 100),
          discoveryQuality: Math.round(discoveryQuality * 100),
        },
      };

      return item;
    });

    // Sort descending by matchScore
    scored.sort((a, b) => b.matchScore - a.matchScore);

    // Filter out low-matching outliers:
    // Only return high-confidence curated matches (top 18-24 products)
    let curatedResults = scored.filter(p => p.matchScore >= 45);
    if (curatedResults.length < 6) {
      curatedResults = scored.slice(0, Math.min(12, scored.length));
    } else if (curatedResults.length > 24) {
      curatedResults = curatedResults.slice(0, 24);
    }

    const trace: AgentTraceStep = {
      id: 'step-4',
      phase: 'aesthetic_scoring',
      title: 'Aesthetic & Affinity Scoring',
      detail: `Scored candidates using weighted formula (0.45 query match + 0.25 style + 0.20 brand affinity + 0.10 discovery quality). Selected top ${curatedResults.length} curated garments. Top score: ${curatedResults[0]?.matchScore ?? 0}%.`,
      metrics: {
        topCandidateScore: curatedResults[0]?.matchScore ?? 0,
        candidatesRanked: scored.length,
        curatedCandidates: curatedResults.length,
      },
      timestamp: Date.now(),
    };

    return { ranked: curatedResults, trace };
  }

  /**
   * Step 6: Generate grounded explanations using Gemini 3.8 Flash
   */
  async enrichExplanations(
    query: string,
    products: SearchResultProduct[],
    favoriteBrandIds: string[]
  ): Promise<SearchResultProduct[]> {
    if (!process.env.GEMINI_API_KEY || products.length === 0) {
      // Dynamic attribute-grounded explanations reflecting real materials & cuts
      return products.map(p => {
        const silText = p.silhouettes.slice(0, 2).join(' & ') || 'tailored';
        const matText = p.composition || p.materials.join(', ') || 'fine textile';
        let reason = p.reason;
        if (p.discoveryType === 'favorite_brand') {
          reason = `From your favorite house ${p.brand}: Crafted in ${matText} with ${silText} proportions, meeting your ${p.occasion[0] || 'wardrobe'} requirement under budget at $${p.price}.`;
        } else {
          reason = `Discovered peer brand ${p.brand}: Delivers ${p.aesthetic} design language in ${matText} with a ${silText} drape at $${p.price}.`;
        }
        return { ...p, reason };
      });
    }

    try {
      const topItems = products.slice(0, 8);
      const itemsPayload = topItems.map(p => ({
        id: p.id,
        brand: p.brand,
        name: p.name,
        price: p.price,
        silhouettes: p.silhouettes,
        material: p.materials,
        type: p.discoveryType
      }));

      const prompt = `You are the THREAD Fashion Search Agent.
User query: "${query}"
Favorite brands: ${favoriteBrandIds.join(', ')}

Given these top recommended products, generate a grounded 1-sentence explanation for each product explaining EXACTLY why it matches the query and how it aligns with their style/budget constraints.
Ground every reason in real attributes (silhouettes, occasion, fabric, price). Do not invent false claims.

Items: ${JSON.stringify(itemsPayload)}

Return JSON:
{
  "explanations": [
    { "id": "product_id", "reason": "concise grounded explanation" }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed.explanations)) {
          const map = new Map<string, string>();
          parsed.explanations.forEach((e: any) => map.set(e.id, e.reason));

          return products.map(p => {
            if (map.has(p.id)) {
              return { ...p, reason: map.get(p.id)! };
            }
            return p;
          });
        }
      }
    } catch (err) {
      console.warn('Gemini grounded explanation notice:', err);
    }

    return products;
  }

  /**
   * Step 7: Generate dynamic refinement suggestions
   */
  generateRefinementSuggestions(query: string, intent: SearchIntent): string[] {
    const suggestions: string[] = [];
    const q = query.toLowerCase();

    if (intent.category === 'dress') {
      if (!q.includes('less formal') && !q.includes('casual')) suggestions.push('Less formal / relaxed style');
      if (!q.includes('neckline')) suggestions.push('More architectural neckline');
      if (!q.includes('slip')) suggestions.push('Explore bias-cut slip silhouettes');
    } else if (intent.category === 'trousers') {
      if (!q.includes('pleat')) suggestions.push('Crisper front pleats');
      if (!q.includes('linen')) suggestions.push('Lightweight linen & lyocell');
      suggestions.push('More relaxed wide-leg puddle');
    } else if (intent.category === 'bag') {
      suggestions.push('Smaller shoulder bag silhouette');
      suggestions.push('Under $300 alternatives');
      suggestions.push('Dark espresso & chocolate tones only');
    } else if (intent.category === 'coat') {
      suggestions.push('Scarf-collar wrap options');
      suggestions.push('Lighter transition weight');
      suggestions.push('Clean single-breasted cut');
    }

    if (intent.maxPrice && intent.maxPrice > 250) {
      suggestions.push(`Under $${Math.round(intent.maxPrice * 0.75 / 10) * 10}`);
    }

    suggestions.push('Show more discovered brands');

    return suggestions.slice(0, 4);
  }

  /**
   * Execute full end-to-end agentic search:
   * Uses autonomous Gemini Agentic RAG when API key is provided,
   * with seamless fallback to deterministic hybrid RAG.
   */
  async executeSearch(query: string, preferences?: UserPreferences): Promise<SearchResponse> {
    // 1. If Gemini API is available, run autonomous Agentic RAG tool loop
    if (this.geminiRag.isAvailable()) {
      try {
        const agenticResponse = await this.geminiRag.executeAgenticSearch(query, preferences);
        if (agenticResponse && agenticResponse.allProducts.length > 0) {
          return agenticResponse;
        }
      } catch (err: any) {
        console.warn('Gemini Agentic RAG notice, falling back to deterministic hybrid RAG:', err.message);
      }
    }

    // 2. Deterministic Hybrid RAG Engine (Local / Offline Fallback)
    return this.executeDeterministicSearch(query, preferences);
  }

  /**
   * Deterministic Hybrid RAG pipeline
   */
  async executeDeterministicSearch(query: string, preferences?: UserPreferences): Promise<SearchResponse> {
    const traceSteps: AgentTraceStep[] = [];

    // Step 1: Parse intent
    const { intent, trace: trace1 } = await this.parseIntent(query, preferences);
    traceSteps.push(trace1);

    // Step 2: Plan brand exploration
    const { favoriteBrandIds, discoveredBrandIds, trace: trace2 } = this.planBrandExpansion(intent, preferences);
    traceSteps.push(trace2);

    // Step 3 & 4: Hard constraint filtering & pgvector semantic retrieval
    const { validCandidates, totalEvaluated, trace: trace3 } = await this.filterCandidates(intent, preferences, query);
    traceSteps.push(trace3);

    // Step 5: Ranking & aesthetic affinity scoring
    const { ranked, trace: trace4 } = this.rankCandidates(validCandidates, intent, favoriteBrandIds, preferences);
    traceSteps.push(trace4);

    // Step 6: Grounded AI explanations
    const enriched = await this.enrichExplanations(query, ranked, favoriteBrandIds);

    const trace5: AgentTraceStep = {
      id: 'step-5',
      phase: 'grounded_explanation',
      title: 'Synthesized Grounded Explanations',
      detail: `Generated verifiable attribute-based matching rationales for ${enriched.length} curated products.`,
      metrics: {
        productsCurated: enriched.length,
      },
      timestamp: Date.now(),
    };
    traceSteps.push(trace5);

    // Split into favorite brands and discovered brands (PRD Section 5.4)
    const favoriteBrandProducts = enriched.filter(p => p.discoveryType === 'favorite_brand');
    const discoveredBrandProducts = enriched.filter(p => p.discoveryType === 'discovered_brand');

    const suggestedRefinements = this.generateRefinementSuggestions(query, intent);

    return {
      searchId: `search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      query,
      extractedIntent: intent,
      favoriteBrandProducts,
      discoveredBrandProducts,
      allProducts: enriched,
      suggestedRefinements,
      agentTrace: traceSteps,
      summary: `Curated ${enriched.length} products across ${favoriteBrandIds.length} favorite brands and ${discoveredBrandIds.length} discovered brands matching "${query}".`,
      coverageStats: {
        favoriteBrandsSearched: favoriteBrandIds.map(id => BRANDS.find(b => b.id === id)?.name || id),
        discoveredBrandsSearched: discoveredBrandIds.map(id => BRANDS.find(b => b.id === id)?.name || id),
        totalCandidatesEvaluated: totalEvaluated,
        passedHardConstraints: validCandidates.length,
      },
    };
  }

  /**
   * Refine search conversationally (PRD Section 5.5)
   */
  async refineSearch(
    originalQuery: string,
    refinement: string,
    preferences?: UserPreferences
  ): Promise<SearchResponse> {
    const combinedQuery = `${originalQuery}. Refinement: ${refinement}`;
    return this.executeSearch(combinedQuery, preferences);
  }

  /**
   * Conversational Fashion Stylist Consultation
   */
  async consultStylist(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    preferences?: UserPreferences
  ): Promise<{
    reply: string;
    recommendedProductIds: string[];
    stylingTips: string[];
    suggestedPrompts: string[];
  }> {
    const q = message.toLowerCase();

    // Select candidate pieces based on user intent
    const { intent } = await this.parseIntent(message, preferences);
    const { validCandidates } = await this.filterCandidates(intent, preferences, message);
    const candidatePool: Product[] = validCandidates.length > 0 ? validCandidates : PRODUCTS;
    const recommended: Product[] = candidatePool.slice(0, 3);
    const recommendedProductIds = recommended.map((p: Product) => p.id);

    // Call Gemini 3.8 Flash if key available
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are the THREAD AI Fashion Stylist, an expert luxury wardrobe advisor.
User Profile:
- Favorite Brands: ${preferences?.favoriteBrandIds?.join(', ') || 'COS, Toteme, Reformation'}
- Excluded Fabrics: ${preferences?.excludedMaterials?.join(', ') || 'Polyester'}
- Budget Ceiling: ${preferences?.priceBudget?.max ? `$${preferences.priceBudget.max}` : '$400'}

Conversation:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}
User: "${message}"

Available Catalog Pieces:
${JSON.stringify(candidatePool.slice(0, 6).map((p: Product) => ({ id: p.id, brand: p.brand, name: p.name, price: p.price, composition: p.composition, silhouettes: p.silhouettes })))}

Respond with JSON:
{
  "reply": "Warm, authoritative, concise styling advice discussing silhouettes, fabrics, proportions, and pairing advice. Mention 1 or 2 specific pieces by brand name.",
  "recommendedProductIds": ["id1", "id2"],
  "stylingTips": ["Styling tip 1 (footwear or accessories)", "Styling tip 2 (proportion or layering)"],
  "suggestedPrompts": ["Next question 1", "Next question 2"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return {
            reply: parsed.reply || 'Here are my curated styling recommendations for your look.',
            recommendedProductIds: Array.isArray(parsed.recommendedProductIds) && parsed.recommendedProductIds.length > 0
              ? parsed.recommendedProductIds
              : recommendedProductIds,
            stylingTips: parsed.stylingTips || [
              'Balance fluid drape with structured leather accents for architectural contrast.',
              'Stick to tonal natural hues to emphasize clean craftsmanship.'
            ],
            suggestedPrompts: parsed.suggestedPrompts || [
              'Show me matching leather bags',
              'What shoes would go best with this?'
            ]
          };
        }
      } catch (err) {
        console.warn('Gemini stylist error:', err);
      }
    }

    // Dynamic offline fashion stylist reasoning engine
    let reply = `For this look, I recommend focusing on clean proportions and high-integrity natural textiles. `;
    const tips: string[] = [];

    if (q.includes('wedding') || q.includes('cocktail') || q.includes('gala') || q.includes('dress')) {
      reply += `An architectural or bias-cut midi silhouette creates instant elegance without feeling overdone. I've pulled pieces from ${recommended.map((r: Product) => r.brand).join(' and ')} that strike the balance between understated minimalism and sophisticated draping.`;
      tips.push('Ground fluid silk or georgette with razor-thin kitten heels or architectural square-toe footwear.');
      tips.push('Keep jewelry sculptural—a single brushed gold cuff or drop earring lets clean necklines stand out.');
    } else if (q.includes('trouser') || q.includes('work') || q.includes('office') || q.includes('pant')) {
      reply += `Modern workwear is all about relaxed tailoring—wide-leg trousers with front pleats that puddle slightly over footwear, paired with fine-gauge knitwear.`;
      tips.push('Counterbalance the voluminous wide-leg drape with a close-fitting mock-neck knit or tailored bodysuit.');
      tips.push('Style with stacked loafers or sharp pointed flats to maintain intentional proportions.');
    } else if (q.includes('coat') || q.includes('jacket') || q.includes('winter') || q.includes('fall')) {
      reply += `A high-quality wool or cashmere outerwear piece transforms any basic ensemble into an intentional uniform. Look for exaggerated raglan shoulders or scarf-collar drapes.`;
      tips.push('Opt for double-faced wool or unlined cashmere for a weightless, fluid drape that layers easily.');
      tips.push('Pair with an unstructured slouchy nappa leather tote to complete the quiet luxury aesthetic.');
    } else {
      reply += `I've analyzed your preference profile and pulled these standout pieces from ${recommended.map((r: Product) => r.brand).join(', ')}. Each piece emphasizes pure natural fibers, clean silhouettes, and versatile wardrobe longevity.`;
      tips.push('Invest in foundational natural textiles (silk, certified wool, pure linen) rather than fast-fashion blends.');
      tips.push('Mix textural contrasts—pair fluid silk against ribbed wool knitwear for tactile depth.');
    }

    return {
      reply,
      recommendedProductIds: recommendedProductIds.length > 0 ? recommendedProductIds : [PRODUCTS[0].id, PRODUCTS[1].id],
      stylingTips: tips,
      suggestedPrompts: [
        'How should I style this with accessories?',
        'Show me alternatives under $250',
        'Find shoes that pair well with this silhouette'
      ]
    };
  }
}
