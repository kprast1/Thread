export type BrandTier = 'accessible' | 'contemporary' | 'accessible_luxury' | 'luxury';

export interface Brand {
  id: string;
  name: string;
  tier: BrandTier;
  priceRange: string;
  aestheticSummary: string;
  aestheticKeywords: string[];
  origin: string;
  website: string;
  similarBrandIds: string[];
  similarityNotes?: Record<string, string>;
}

export interface Product {
  id: string;
  brand: string;
  brandId: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  category: 'dress' | 'trousers' | 'coat' | 'bag' | 'shoes' | 'knitwear' | 'top' | 'skirt';
  colors: string[];
  materials: string[];
  occasion: string[];
  silhouettes: string[];
  imageUrl: string;
  fallbackImageUrl?: string;
  productUrl: string;
  sizes: string[];
  inStock: boolean;
  aesthetic: string;
  description: string;
  retailerHighlight: string;
  composition: string;
  care: string;
}

export type FeedbackType = 'love' | 'not_my_style' | 'too_expensive' | 'wrong_silhouette' | 'more_like_this';

export interface ProductFeedback {
  productId: string;
  type: FeedbackType;
  timestamp: number;
}

export interface UserPreferences {
  favoriteBrandIds: string[];
  sizes: string[];
  currency: 'USD' | 'EUR' | 'GBP';
  shippingCountry: string;
  priceBudget: {
    min?: number;
    max?: number;
  };
  styleAesthetics: string[];
  excludedBrands: string[];
  excludedMaterials: string[];
  feedbackHistory: ProductFeedback[];
}

export interface SearchIntent {
  category: string | null;
  targetColors: string[];
  targetOccasions: string[];
  targetSilhouettes: string[];
  targetMaterials: string[];
  targetAesthetic: string[];
  maxPrice: number | null;
  minPrice: number | null;
  excludedWords: string[];
  summary: string;
}

export interface AgentTraceStep {
  id: string;
  phase: 'understanding' | 'brand_expansion' | 'catalog_search' | 'hard_filtering' | 'aesthetic_scoring' | 'grounded_explanation';
  title: string;
  detail: string;
  metrics?: Record<string, string | number>;
  timestamp: number;
}

export interface SearchResultProduct extends Product {
  reason: string;
  discoveryType: 'favorite_brand' | 'discovered_brand';
  similarityToFavorite?: string;
  matchScore: number;
  scoreBreakdown: {
    queryMatch: number;
    styleMatch: number;
    brandAffinity: number;
    discoveryQuality: number;
  };
}

export interface SearchResponse {
  searchId: string;
  query: string;
  extractedIntent: SearchIntent;
  favoriteBrandProducts: SearchResultProduct[];
  discoveredBrandProducts: SearchResultProduct[];
  allProducts: SearchResultProduct[];
  suggestedRefinements: string[];
  agentTrace: AgentTraceStep[];
  summary: string;
  coverageStats: {
    favoriteBrandsSearched: string[];
    discoveredBrandsSearched: string[];
    totalCandidatesEvaluated: number;
    passedHardConstraints: number;
  };
}

export interface StylistMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  recommendedProductIds?: string[];
  stylingTips?: string[];
  suggestedPrompts?: string[];
}
