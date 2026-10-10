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

    // Detect price constraint from text: e.g. "under $350", "below 400", "less than $300", "<$250"
    const priceMatch = q.match(/(?:under|below|less than|max|budget of|\<)\s*\$?(\d+)/i);
    if (priceMatch) {
      defaultIntent.maxPrice = parseInt(priceMatch[1], 10);
    }
    const minPriceMatch = q.match(/(?:above|over|more than|min|\>)\s*\$?(\d+)/i);
    if (minPriceMatch) {
      defaultIntent.minPrice = parseInt(minPriceMatch[1], 10);
    }

    // Detect category
    if (q.includes('dress') || q.includes('slip') || q.includes('gown')) defaultIntent.category = 'dress';
    else if (q.includes('skirt')) defaultIntent.category = 'skirt';
    else if (q.includes('trouser') || q.includes('pant') || q.includes('slacks')) defaultIntent.category = 'trousers';
    else if (q.includes('bag') || q.includes('tote') || q.includes('purse') || q.includes('crossbody')) defaultIntent.category = 'bag';
    else if (q.includes('coat') || q.includes('jacket') || q.includes('trench') || q.includes('outerwear')) defaultIntent.category = 'coat';
    else if (q.includes('boot') || q.includes('shoe') || q.includes('heel') || q.includes('loafer')) defaultIntent.category = 'shoes';
    else if (q.includes('sweater') || q.includes('cardigan') || q.includes('knit')) defaultIntent.category = 'knitwear';
    else if (q.includes('shirt') || q.includes('blouse') || q.includes('top')) defaultIntent.category = 'top';

    // Detect colors
    const knownColors = ['black', 'brown', 'espresso', 'camel', 'chocolate', 'ecru', 'cream', 'white', 'grey', 'charcoal', 'navy', 'rust', 'saddle', 'taupe'];
    for (const color of knownColors) {
      if (q.includes(color)) defaultIntent.targetColors.push(color);
    }

    // Detect occasions
    const knownOccasions = ['wedding', 'work', 'office', 'cocktail', 'dinner', 'evening', 'resort', 'vacation', 'summer', 'everyday', 'gala'];
    for (const occ of knownOccasions) {
      if (q.includes(occ)) defaultIntent.targetOccasions.push(occ);
    }

    // Detect silhouettes
    const knownSilhouettes = ['asymmetric', 'minimalist', 'wide-leg', 'pleated', 'sculptural', 'oversized', 'tailored', 'relaxed', 'slip', 'wrap', 'low-heel', 'kitten-heel'];
    for (const sil of knownSilhouettes) {
      if (q.includes(sil)) defaultIntent.targetSilhouettes.push(sil);
    }

    // Detect aesthetics
    const knownAesthetics = ['minimalist', 'architectural', 'understated', 'luxury', 'parisian', 'chic', 'scandinavian', 'romantic', 'clean', 'quiet luxury', 'mediterranean'];
    for (const aes of knownAesthetics) {
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
  "category": "dress" | "trousers" | "bag" | "coat" | "shoes" | "knitwear" | "top" | null,
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
      detail: `Parsed category: ${defaultIntent.category || 'open discovery'}, budget ceiling: ${defaultIntent.maxPrice ? `$${defaultIntent.maxPrice}` : 'unconstrained'}, key aesthetics: [${defaultIntent.targetAesthetic.concat(defaultIntent.targetSilhouettes).join(', ') || 'editorial'}]`,
      metrics: {
        category: defaultIntent.category || 'all',
        maxPrice: defaultIntent.maxPrice ?? 'none',
        silhouettesCount: defaultIntent.targetSilhouettes.length,
        colorsDetected: defaultIntent.targetColors.join(', ') || 'none'
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
   * Step 3 & 4: Retrieve candidates & apply deterministic hard constraints
   */
  async filterCandidates(intent: SearchIntent, preferences?: UserPreferences): Promise<{
    validCandidates: Product[];
    totalEvaluated: number;
    trace: AgentTraceStep;
  }> {
    // Attempt fast query through PostgreSQL first
    try {
      const dbHealth = await checkDbHealth();
      if (dbHealth.connected && dbHealth.productCount > 0) {
        const { candidates, totalEvaluated } = await queryDbCandidates(intent, preferences);
        const trace: AgentTraceStep = {
          id: 'step-3',
          phase: 'hard_filtering',
          title: 'Deterministic Constraint Filtering (PostgreSQL)',
          detail: `Evaluated ${totalEvaluated} garments in PostgreSQL database. ${candidates.length} strictly satisfied hard constraints (category: ${intent.category || 'any'}, maxPrice: ${intent.maxPrice ? `$${intent.maxPrice}` : 'none'}, excluded materials: ${preferences?.excludedMaterials?.length || 0}).`,
          metrics: {
            totalEvaluated,
            passedHardConstraints: candidates.length,
            filteredOut: totalEvaluated - candidates.length,
            engine: 'PostgreSQL GIN Index'
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

    const validCandidates = PRODUCTS.filter(product => {
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
        // If query explicitly asked for e.g. "black", filter out non-black items
        if (!matchesColor) return false;
      }

      return true;
    });

    const trace: AgentTraceStep = {
      id: 'step-3',
      phase: 'hard_filtering',
      title: 'Deterministic Constraint Filtering (In-Memory)',
      detail: `Evaluated ${totalEvaluated} catalog items. ${validCandidates.length} strictly satisfied hard constraints (category: ${intent.category || 'any'}, maxPrice: ${intent.maxPrice ? `$${intent.maxPrice}` : 'none'}, excluded materials: ${excludedMaterials.size}).`,
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

      // 1. Query match (0 to 1)
      let queryMatch = 0.5; // baseline
      if (intent.targetSilhouettes.length > 0) {
        const silMatches = intent.targetSilhouettes.filter(s =>
          product.silhouettes.some(ps => ps.toLowerCase().includes(s.toLowerCase()))
        ).length;
        queryMatch += (silMatches / intent.targetSilhouettes.length) * 0.3;
      } else {
        queryMatch += 0.2;
      }

      if (intent.targetOccasions.length > 0) {
        const occMatches = intent.targetOccasions.filter(o =>
          product.occasion.some(po => po.toLowerCase().includes(o.toLowerCase()))
        ).length;
        queryMatch += (occMatches / intent.targetOccasions.length) * 0.2;
      } else {
        queryMatch += 0.1;
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

    const trace: AgentTraceStep = {
      id: 'step-4',
      phase: 'aesthetic_scoring',
      title: 'Aesthetic & Affinity Scoring',
      detail: `Scored candidates using weighted formula (0.45 query match + 0.25 style + 0.20 brand affinity + 0.10 discovery quality). Top score: ${scored[0]?.matchScore ?? 0}%.`,
      metrics: {
        topCandidateScore: scored[0]?.matchScore ?? 0,
        candidatesRanked: scored.length,
      },
      timestamp: Date.now(),
    };

    return { ranked: scored, trace };
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
      // Deterministic fallback grounded explanations
      return products.map(p => {
        let reason = p.reason;
        if (p.discoveryType === 'favorite_brand') {
          reason = `From your favorite brand ${p.brand}: satisfies your ${p.silhouettes[0] || 'tailored'} silhouette constraint and fits your price requirement at $${p.price}.`;
        } else {
          reason = `Discovered brand match: ${p.brand} delivers the requested ${p.silhouettes.join(' & ')} aesthetic with premium craftsmanship under your limit.`;
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
   * Execute full end-to-end agentic search
   */
  async executeSearch(query: string, preferences?: UserPreferences): Promise<SearchResponse> {
    const traceSteps: AgentTraceStep[] = [];

    // Step 1: Parse intent
    const { intent, trace: trace1 } = await this.parseIntent(query, preferences);
    traceSteps.push(trace1);

    // Step 2: Plan brand exploration
    const { favoriteBrandIds, discoveredBrandIds, trace: trace2 } = this.planBrandExpansion(intent, preferences);
    traceSteps.push(trace2);

    // Step 3 & 4: Hard constraint filtering
    const { validCandidates, totalEvaluated, trace: trace3 } = await this.filterCandidates(intent, preferences);
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
}
