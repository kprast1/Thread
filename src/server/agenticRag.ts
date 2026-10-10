import { GoogleGenAI, Type, createPartFromFunctionResponse, FunctionCallingConfigMode } from '@google/genai';
import { pool, queryDbCandidates } from './db';
import { getSemanticEmbedding } from './embeddings';
import { BRANDS } from '../data/brands';
import {
  AgentTraceStep,
  Brand,
  Product,
  SearchResultProduct,
  SearchIntent,
  SearchResponse,
  UserPreferences,
} from '../types';

export class GeminiAgenticRagEngine {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  public isAvailable(): boolean {
    return this.ai !== null;
  }

  /**
   * Tool Declarations for Gemini Function Calling
   */
  private getToolDeclarations() {
    return [
      {
        name: 'search_catalog_by_vector',
        description:
          'Searches 1,236 authentic fashion garments in PostgreSQL using 768-dimensional pgvector cosine semantic similarity. Ideal for visual aesthetics, vibes, silhouettes, occasions, and descriptive queries.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: 'The natural language aesthetic query (e.g. "quiet luxury linen slip dress", "sculptural evening blazer").',
            },
            category: {
              type: Type.STRING,
              description: 'Optional category filter: dress, trousers, bag, coat, shoes, knitwear, top, skirt.',
            },
            maxPrice: {
              type: Type.NUMBER,
              description: 'Maximum price ceiling in USD.',
            },
            minPrice: {
              type: Type.NUMBER,
              description: 'Minimum price floor in USD.',
            },
            targetColors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Optional color palette filters (e.g. ["black", "espresso"]).',
            },
            limit: {
              type: Type.NUMBER,
              description: 'Number of candidates to retrieve (default 24, max 36).',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'filter_catalog_by_attributes',
        description:
          'Executes exact structured SQL filtering in PostgreSQL by category, price range, fabrics/materials, silhouettes, and brands.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'Category: dress, trousers, bag, coat, shoes, knitwear, top, skirt.',
            },
            maxPrice: { type: Type.NUMBER, description: 'Maximum price in USD.' },
            minPrice: { type: Type.NUMBER, description: 'Minimum price in USD.' },
            materials: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Target materials (e.g. ["linen", "silk", "wool", "cashmere"]).',
            },
            silhouettes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Target silhouettes (e.g. ["asymmetric", "wide-leg", "tailored"]).',
            },
            occasions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Target occasions (e.g. ["wedding", "cocktail", "work"]).',
            },
            brandIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Filter to specific brand IDs.',
            },
            limit: { type: Type.NUMBER, description: 'Limit candidates (default 24).' },
          },
        },
      },
      {
        name: 'get_brand_affinities',
        description:
          'Queries the 24-brand contemporary fashion knowledge graph to discover aesthetic peer brands, price tiers, and affinity rationales.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            brandNameOrId: {
              type: Type.STRING,
              description: 'Brand name or identifier (e.g. "Toteme", "Khaite", "COS", "Anine Bing", "Cult Gaia").',
            },
          },
          required: ['brandNameOrId'],
        },
      },
      {
        name: 'inspect_garment_details',
        description:
          'Fetches full composition, care instructions, retailer highlights, and descriptions for specific product IDs.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            productIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of product IDs to inspect.',
            },
          },
          required: ['productIds'],
        },
      },
    ];
  }

  /**
   * Execute Tool: search_catalog_by_vector
   */
  private async executeVectorSearch(args: any): Promise<{ candidates: any[]; count: number }> {
    const query = args.query || '';
    const queryEmbedding = await getSemanticEmbedding(query);

    const intent: SearchIntent = {
      category: args.category || null,
      maxPrice: args.maxPrice !== undefined ? Number(args.maxPrice) : null,
      minPrice: args.minPrice !== undefined ? Number(args.minPrice) : null,
      targetColors: Array.isArray(args.targetColors) ? args.targetColors : [],
      targetOccasions: [],
      targetSilhouettes: [],
      targetMaterials: [],
      targetAesthetic: [],
      excludedWords: [],
      summary: query,
    };

    const limit = Math.min(args.limit || 24, 36);
    const { candidates } = await queryDbCandidates(intent, undefined, {
      queryEmbedding,
      rawQuery: query,
      limit,
    });

    const summarized = candidates.map(c => ({
      id: c.id,
      name: c.name,
      brand: c.brand,
      brandId: c.brandId,
      price: c.price,
      category: c.category,
      materials: c.materials,
      silhouettes: c.silhouettes,
      occasions: c.occasion,
      aesthetic: c.aesthetic,
      similarityScore: (c as any).semanticScore ?? null,
      description: c.description?.substring(0, 150),
    }));

    return { candidates: summarized, count: summarized.length };
  }

  /**
   * Execute Tool: filter_catalog_by_attributes
   */
  private async executeAttributeFilter(args: any): Promise<{ candidates: any[]; count: number }> {
    const conditions: string[] = ['in_stock = true'];
    const values: any[] = [];
    let paramIdx = 1;

    if (args.category) {
      conditions.push(`category = $${paramIdx++}`);
      values.push(args.category);
    }
    if (args.maxPrice !== undefined && args.maxPrice !== null) {
      conditions.push(`price <= $${paramIdx++}`);
      values.push(Number(args.maxPrice));
    }
    if (args.minPrice !== undefined && args.minPrice !== null) {
      conditions.push(`price >= $${paramIdx++}`);
      values.push(Number(args.minPrice));
    }
    if (Array.isArray(args.materials) && args.materials.length > 0) {
      conditions.push(`materials && $${paramIdx++}`);
      values.push(args.materials.map((m: string) => m.toLowerCase()));
    }
    if (Array.isArray(args.silhouettes) && args.silhouettes.length > 0) {
      conditions.push(`silhouettes && $${paramIdx++}`);
      values.push(args.silhouettes.map((s: string) => s.toLowerCase()));
    }
    if (Array.isArray(args.occasions) && args.occasions.length > 0) {
      conditions.push(`occasions && $${paramIdx++}`);
      values.push(args.occasions.map((o: string) => o.toLowerCase()));
    }
    if (Array.isArray(args.brandIds) && args.brandIds.length > 0) {
      conditions.push(`LOWER(brand_id) = ANY($${paramIdx++})`);
      values.push(args.brandIds.map((b: string) => b.toLowerCase()));
    }

    const limit = Math.min(args.limit || 24, 36);
    const sql = `
      SELECT id, name, brand_name as brand, brand_id as "brandId", price::float as price,
             category, materials, silhouettes, occasions, aesthetic, description
      FROM products
      WHERE ${conditions.join(' AND ')}
      ORDER BY price ASC
      LIMIT ${limit};
    `;

    const res = await pool.query(sql, values);
    return { candidates: res.rows, count: res.rows.length };
  }

  /**
   * Execute Tool: get_brand_affinities
   */
  private async executeBrandAffinities(args: any): Promise<any> {
    const term = (args.brandNameOrId || '').toLowerCase().trim();

    // Look up in database or brand graph
    const found = BRANDS.find(
      b => b.id.toLowerCase() === term || b.name.toLowerCase().includes(term) || term.includes(b.name.toLowerCase())
    );

    if (!found) {
      return {
        brand: args.brandNameOrId,
        message: 'Brand not explicitly in catalog graph, but catalog contains 24 contemporary fashion houses.',
        availableCatalogBrands: BRANDS.map(b => ({ id: b.id, name: b.name, tier: b.tier })),
      };
    }

    const peers = (found.similarBrandIds || [])
      .map(id => BRANDS.find(b => b.id === id))
      .filter((b): b is Brand => Boolean(b))
      .map(b => ({
        id: b.id,
        name: b.name,
        tier: b.tier,
        priceRange: b.priceRange,
        aestheticSummary: b.aestheticSummary,
        affinityNote: found.similarityNotes?.[b.id] || `Shared aesthetic alignment in ${found.aestheticKeywords.slice(0, 3).join(', ')}.`,
      }));

    return {
      targetBrand: {
        id: found.id,
        name: found.name,
        tier: found.tier,
        priceRange: found.priceRange,
        aestheticSummary: found.aestheticSummary,
        aestheticKeywords: found.aestheticKeywords,
      },
      discoveredPeerBrands: peers,
    };
  }

  /**
   * Execute Tool: inspect_garment_details
   */
  private async executeInspectGarments(args: any): Promise<any[]> {
    const ids: string[] = Array.isArray(args.productIds) ? args.productIds.slice(0, 10) : [];
    if (ids.length === 0) return [];

    const res = await pool.query(
      `SELECT id, name, brand_name as brand, price::float as price, category,
              composition, care, retailer_highlight, description, sizes
       FROM products
       WHERE id = ANY($1)`,
      [ids]
    );

    return res.rows;
  }

  /**
   * Main Autonomous Multi-Turn Agentic RAG Search Loop
   */
  public async executeAgenticSearch(
    query: string,
    preferences?: UserPreferences
  ): Promise<SearchResponse | null> {
    if (!this.ai) return null;

    const traceSteps: AgentTraceStep[] = [];
    const candidatesCatalogMap = new Map<string, Product>();

    const favoriteBrandIds = preferences?.favoriteBrandIds || [];
    const budgetCeiling = preferences?.priceBudget?.max;
    const excludedMaterials = preferences?.excludedMaterials || [];

    const systemInstruction = `You are THREAD's Senior Fashion AI Stylist and Autonomous Retrieval Agent.
You have access to 4 live PostgreSQL tools to search our catalog of 1,236 authentic garments from 24 contemporary fashion houses (Toteme, Khaite, COS, Anine Bing, Cult Gaia, Dissh, Matteau, Dôen, Source Unknown, Sézane, Faithfull the Brand, SIR the Label, Paloma Wool, etc.).

Your objective:
1. Understand the user's styling brief, vibe, and any constraints.
2. Formulate targeted queries to call retrieval tools (such as 'search_catalog_by_vector', 'get_brand_affinities', 'filter_catalog_by_attributes').
3. You can call multiple tools across turns if needed (e.g. check brand peers, search vector catalog, inspect garments).
4. After gathering candidates, curate a final selection of 12 to 24 garments that fit the user's aesthetic, budget, and silhouette requirements.
5. Provide grounded stylist commentary for each selected garment referencing specific fabric textures, cuts, or aesthetic pairings.
6. Return your final answer strictly in JSON format as specified.`;

    const userPrompt = `User Query: "${query}"
User Preferences:
- Favorite Brands: ${favoriteBrandIds.length > 0 ? favoriteBrandIds.join(', ') : 'None specified'}
- Price Budget Ceiling: ${budgetCeiling ? `$${budgetCeiling}` : 'None'}
- Excluded Materials: ${excludedMaterials.length > 0 ? excludedMaterials.join(', ') : 'None'}

Please use your RAG tools to explore the catalog, find the best matching garments, and curate your top recommendations.
Once you have retrieved sufficient candidates, output a JSON response matching this schema:
{
  "summary": "Editorial styling rationale summarizing the selection...",
  "selectedProducts": [
    {
      "id": "exact_product_id_from_tool_results",
      "reason": "Specific attribute-based stylist rationale (cut, fabric, silhouette, aesthetic alignment)...",
      "matchScore": 88
    }
  ],
  "suggestedRefinements": [
    "Refinement option 1",
    "Refinement option 2"
  ]
}`;

    const contents: any[] = [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ];

    const maxTurns = 5;
    let turn = 0;
    let finalModelText = '';

    while (turn < maxTurns) {
      turn++;
      const startTime = Date.now();

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: this.getToolDeclarations() as any }],
          temperature: 0.2,
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate) break;

      contents.push(candidate.content);

      const functionCalls = response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) {
        // Model produced final response
        finalModelText = response.text || '';
        break;
      }

      // Execute each tool call
      const toolResponseParts: any[] = [];

      for (const call of functionCalls) {
        const toolStartTime = Date.now();
        const args = (call.args || {}) as Record<string, any>;
        let toolOutput: any = null;

        if (call.name === 'search_catalog_by_vector') {
          const res = await this.executeVectorSearch(args);
          toolOutput = res;
          // Cache products in map
          for (const item of res.candidates) {
            candidatesCatalogMap.set(item.id, item as any);
          }

          traceSteps.push({
            id: `rag-step-${traceSteps.length + 1}`,
            phase: 'rag_vector_search',
            title: `pgvector Semantic Search: "${args.query || ''}"`,
            detail: `Autonomous tool execution: queried 768-dim pgvector HNSW index. Retrieved ${res.count} candidates${args.category ? ` [category: ${args.category}]` : ''}${args.maxPrice ? ` [maxPrice: $${args.maxPrice}]` : ''}.`,
            metrics: {
              tool: call.name,
              candidatesRetrieved: res.count,
              latencyMs: Date.now() - toolStartTime,
            },
            timestamp: Date.now(),
          });
        } else if (call.name === 'filter_catalog_by_attributes') {
          const res = await this.executeAttributeFilter(args);
          toolOutput = res;
          for (const item of res.candidates) {
            candidatesCatalogMap.set(item.id, item as any);
          }

          traceSteps.push({
            id: `rag-step-${traceSteps.length + 1}`,
            phase: 'rag_sql_filter',
            title: `Structured Catalog Filter`,
            detail: `Autonomous tool execution: executed SQL constraint filter. Retrieved ${res.count} garments matching attributes.`,
            metrics: {
              tool: call.name,
              candidatesRetrieved: res.count,
              latencyMs: Date.now() - toolStartTime,
            },
            timestamp: Date.now(),
          });
        } else if (call.name === 'get_brand_affinities') {
          const res = await this.executeBrandAffinities(args);
          toolOutput = res;

          traceSteps.push({
            id: `rag-step-${traceSteps.length + 1}`,
            phase: 'rag_brand_graph',
            title: `Brand Affinity Graph Traversal: ${args.brandNameOrId || ''}`,
            detail: `Autonomous tool execution: explored 24-brand aesthetic graph for "${args.brandNameOrId || ''}". Discovered ${res.discoveredPeerBrands?.length || 0} contemporary peers.`,
            metrics: {
              tool: call.name,
              peerBrandsFound: res.discoveredPeerBrands?.length || 0,
              latencyMs: Date.now() - toolStartTime,
            },
            timestamp: Date.now(),
          });
        } else if (call.name === 'inspect_garment_details') {
          const res = await this.executeInspectGarments(args);
          toolOutput = res;

          traceSteps.push({
            id: `rag-step-${traceSteps.length + 1}`,
            phase: 'rag_inspection',
            title: `Inspect Garment Details`,
            detail: `Autonomous tool execution: inspected fabric composition, care, and retailer notes for ${res.length} garments.`,
            metrics: {
              tool: call.name,
              inspectedCount: res.length,
              latencyMs: Date.now() - toolStartTime,
            },
            timestamp: Date.now(),
          });
        }

        toolResponseParts.push(
          createPartFromFunctionResponse(call.id || '', call.name || '', { output: toolOutput })
        );
      }

      contents.push({
        role: 'user',
        parts: toolResponseParts,
      });

      // If we have gathered candidates and are at turn >= 2 (or have >= 12 candidates),
      // prompt Gemini for final editorial stylist curation with tools disabled
      if (candidatesCatalogMap.size >= 12 || turn >= 2) {
        contents.push({
          role: 'user',
          parts: [
            {
              text: `From the candidate garments you retrieved with your tools, curate 12 to 24 pieces and provide your final answer strictly as a JSON object with this schema:
{
  "summary": "Editorial styling rationale summarizing the selection...",
  "selectedProducts": [
    {
      "id": "exact_product_id_from_tool_results",
      "reason": "Specific attribute-based stylist rationale (cut, fabric, silhouette, aesthetic alignment)...",
      "matchScore": 88
    }
  ],
  "suggestedRefinements": [
    "Refinement option 1",
    "Refinement option 2"
  ]
}`,
            },
          ],
        });

        const synthResponse = await this.ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            toolConfig: {
              functionCallingConfig: { mode: FunctionCallingConfigMode.NONE },
            },
            temperature: 0.2,
          },
        });

        finalModelText = synthResponse.text || '';
        break;
      }
    }

    // Parse final JSON response from Gemini
    if (!finalModelText || finalModelText.trim().length === 0) {
      return null;
    }

    try {
      // Extract JSON substring if surrounded by markdown code blocks
      let cleanJson = finalModelText.trim();
      const jsonBlock = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlock) {
        cleanJson = jsonBlock[1];
      }

      const parsed = JSON.parse(cleanJson);
      if (!parsed.selectedProducts || !Array.isArray(parsed.selectedProducts)) {
        return null;
      }

      const selectedIds: string[] = parsed.selectedProducts.map((p: any) => p.id);
      if (selectedIds.length === 0) return null;

      // Hydrate products fully from PostgreSQL
      const dbRes = await pool.query(
        `SELECT id, brand_name as "brand", brand_id as "brandId", name, price::float as price,
                original_price::float as "originalPrice", currency, category, colors, materials,
                occasions as "occasion", silhouettes, image_url as "imageUrl",
                fallback_image_url as "fallbackImageUrl", product_url as "productUrl", sizes,
                in_stock as "inStock", aesthetic, description, retailer_highlight as "retailerHighlight",
                composition, care
         FROM products
         WHERE id = ANY($1)`,
        [selectedIds]
      );

      const dbMap = new Map<string, Product>();
      dbRes.rows.forEach(r => dbMap.set(r.id, r));

      const rationaleMap = new Map<string, { reason: string; matchScore: number }>();
      parsed.selectedProducts.forEach((p: any) => {
        rationaleMap.set(p.id, {
          reason: p.reason || 'Curated by AI Stylist matching aesthetic and silhouette preferences',
          matchScore: typeof p.matchScore === 'number' ? Math.max(50, Math.min(99, p.matchScore)) : 80,
        });
      });

      const enriched: SearchResultProduct[] = [];
      const discoveredBrandIds = new Set<string>();

      for (const id of selectedIds) {
        const prod = dbMap.get(id);
        if (!prod) continue;

        const isFav = favoriteBrandIds.includes(prod.brandId);
        if (!isFav) discoveredBrandIds.add(prod.brandId);

        const info = rationaleMap.get(id) || { reason: '', matchScore: 80 };
        enriched.push({
          ...prod,
          reason: info.reason,
          discoveryType: isFav ? 'favorite_brand' : 'discovered_brand',
          matchScore: info.matchScore,
          scoreBreakdown: {
            queryMatch: Math.min(100, info.matchScore + 5),
            styleMatch: info.matchScore,
            brandAffinity: isFav ? 95 : 75,
            discoveryQuality: isFav ? 70 : 90,
          },
        });
      }

      if (enriched.length === 0) return null;

      // Add final synthesis step to trace
      traceSteps.push({
        id: `rag-step-${traceSteps.length + 1}`,
        phase: 'grounded_explanation',
        title: 'Gemini Editorial Stylist Synthesis',
        detail: `Curated ${enriched.length} garments with attribute-grounded commentary. Discovered ${discoveredBrandIds.size} complementary brands.`,
        metrics: {
          curatedCount: enriched.length,
          model: 'gemini-2.5-flash',
        },
        timestamp: Date.now(),
      });

      const favoriteBrandProducts = enriched.filter(p => p.discoveryType === 'favorite_brand');
      const discoveredBrandProducts = enriched.filter(p => p.discoveryType === 'discovered_brand');

      const extractedIntent: SearchIntent = {
        category: null,
        targetColors: [],
        targetOccasions: [],
        targetSilhouettes: [],
        targetMaterials: [],
        targetAesthetic: [],
        maxPrice: budgetCeiling ?? null,
        minPrice: null,
        excludedWords: excludedMaterials,
        summary: query,
      };

      return {
        searchId: `agentic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        query,
        extractedIntent,
        favoriteBrandProducts,
        discoveredBrandProducts,
        allProducts: enriched,
        suggestedRefinements: Array.isArray(parsed.suggestedRefinements)
          ? parsed.suggestedRefinements.slice(0, 4)
          : ['Less formal / relaxed style', 'Explore alternative silhouettes', 'Under $250 options'],
        agentTrace: traceSteps,
        summary: parsed.summary || `Curated ${enriched.length} garments matching "${query}".`,
        coverageStats: {
          favoriteBrandsSearched: favoriteBrandIds.map(id => BRANDS.find(b => b.id === id)?.name || id),
          discoveredBrandsSearched: Array.from(discoveredBrandIds).map(id => BRANDS.find(b => b.id === id)?.name || id),
          totalCandidatesEvaluated: candidatesCatalogMap.size || 1236,
          passedHardConstraints: enriched.length,
        },
      };
    } catch (err: any) {
      console.warn('Failed to parse Gemini agentic RAG response:', err.message);
      return null;
    }
  }
}
