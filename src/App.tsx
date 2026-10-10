import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SearchHeader } from './components/SearchHeader';
import { AgentTraceView } from './components/AgentTraceView';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { RefinementBar } from './components/RefinementBar';
import { BrandIndexView } from './components/BrandIndexView';
import { WishlistView } from './components/WishlistView';
import { OnboardingModal } from './components/OnboardingModal';
import {
  UserPreferences,
  SearchResponse,
  SearchResultProduct,
  FeedbackType,
} from './types';
import { BRANDS } from './data/brands';
import { PRODUCTS } from './data/products';
import { Sparkles, ArrowRight, ShieldCheck, Heart, SlidersHorizontal, AlertCircle } from 'lucide-react';

const STORAGE_PREFS_KEY = 'thread_user_preferences_v1';
const STORAGE_SAVED_KEY = 'thread_saved_products_v1';

const defaultPreferences: UserPreferences = {
  favoriteBrandIds: ['cos', 'toteme', 'reformation'],
  sizes: ['S', 'M'],
  currency: 'USD',
  shippingCountry: 'US',
  priceBudget: { max: 400 },
  styleAesthetics: ['Minimalist & Architectural', 'Understated Luxury', 'Relaxed Tailoring'],
  excludedBrands: [],
  excludedMaterials: ['Polyester'],
  feedbackHistory: [],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'brands' | 'wishlist'>('search');
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read saved preferences');
    }
    return defaultPreferences;
  });

  const [savedProducts, setSavedProducts] = useState<SearchResultProduct[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SAVED_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read saved products');
    }
    return [];
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SearchResultProduct | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackType>>({});
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<{ connected: boolean; brandCount: number; productCount: number } | null>(null);

  // Check database health on mount
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data && data.database) {
          setDbStats(data.database);
        }
      })
      .catch(() => {});
  }, []);

  // Save preferences changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn('Could not persist preferences');
    }
  }, [preferences]);

  // Save wishlist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(savedProducts));
    } catch (e) {
      console.warn('Could not persist saved products');
    }
  }, [savedProducts]);

  // Execute Search via Server API
  const handleExecuteSearch = async (query: string) => {
    setIsLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userPreferences: preferences,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed with status ${res.status}`);
      }

      const data: SearchResponse = await res.json();
      setSearchResponse(data);
      setActiveTab('search');
    } catch (err: any) {
      console.error('Search request failed:', err);
      setSearchError(err.message || 'Unable to complete search request.');
    } finally {
      setIsLoading(false);
    }
  };

  // Conversational Refinement via Server API
  const handleRefineSearch = async (refinement: string) => {
    if (!searchResponse) return;
    setIsLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/search/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuery: searchResponse.query,
          refinement,
          userPreferences: preferences,
        }),
      });

      if (!res.ok) {
        throw new Error('Refinement failed');
      }

      const data: SearchResponse = await res.json();
      setSearchResponse(data);
    } catch (err: any) {
      console.error('Refinement failed:', err);
      setSearchError(err.message || 'Unable to apply refinement.');
    } finally {
      setIsLoading(false);
    }
  };

  // Wishlist toggle
  const handleToggleSave = (productId: string) => {
    const existing = savedProducts.find(p => p.id === productId);
    if (existing) {
      setSavedProducts(savedProducts.filter(p => p.id !== productId));
    } else {
      // Find from current search or catalog
      const productToAdd = searchResponse?.allProducts.find(p => p.id === productId) ||
        PRODUCTS.find(p => p.id === productId);
      if (productToAdd) {
        const asSearchResult: SearchResultProduct = 'matchScore' in productToAdd
          ? (productToAdd as SearchResultProduct)
          : {
              ...productToAdd,
              reason: 'Saved piece',
              discoveryType: preferences.favoriteBrandIds.includes(productToAdd.brandId) ? 'favorite_brand' : 'discovered_brand',
              matchScore: 90,
              scoreBreakdown: { queryMatch: 90, styleMatch: 90, brandAffinity: 90, discoveryQuality: 90 },
            };
        setSavedProducts([...savedProducts, asSearchResult]);
      }
    }
  };

  // Feedback handler (PRD 5.6)
  const handleSendFeedback = (productId: string, type: FeedbackType) => {
    setFeedbacks(prev => ({ ...prev, [productId]: type }));
    const updatedFeedbackHistory = [
      ...preferences.feedbackHistory.filter(f => f.productId !== productId),
      { productId, type, timestamp: Date.now() },
    ];
    setPreferences({
      ...preferences,
      feedbackHistory: updatedFeedbackHistory,
    });

    // Notify backend
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, type }),
    }).catch(e => console.warn('Feedback sync err:', e));
  };

  // Toggle brand favorite in preferences
  const handleToggleFavoriteBrand = (brandId: string) => {
    if (preferences.favoriteBrandIds.includes(brandId)) {
      setPreferences({
        ...preferences,
        favoriteBrandIds: preferences.favoriteBrandIds.filter(id => id !== brandId),
      });
    } else {
      setPreferences({
        ...preferences,
        favoriteBrandIds: [...preferences.favoriteBrandIds, brandId],
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA] text-[#191919]">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedProducts.length}
        onOpenPreferences={() => setIsOnboardingOpen(true)}
        dbStats={dbStats}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'search' && (
          <div>
            {/* Search Console Header */}
            <SearchHeader
              onSearch={handleExecuteSearch}
              isLoading={isLoading}
              preferences={preferences}
              currentIntent={searchResponse?.extractedIntent}
              onOpenPreferences={() => setIsOnboardingOpen(true)}
            />

            {/* Error banner if search fails */}
            {searchError && (
              <div className="max-w-5xl mx-auto px-6 mt-6">
                <div className="p-4 bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{searchError}</span>
                </div>
              </div>
            )}

            {/* If Results Exist */}
            {searchResponse ? (
              <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Conversational Refinement Bar */}
                <RefinementBar
                  onRefine={handleRefineSearch}
                  isLoading={isLoading}
                  suggestedRefinements={searchResponse.suggestedRefinements}
                  activeQuery={searchResponse.query}
                  onResetSearch={() => setSearchResponse(null)}
                />

                {/* Agent Transparency Trace */}
                <AgentTraceView
                  traceSteps={searchResponse.agentTrace}
                  coverageStats={searchResponse.coverageStats}
                />

                {/* Case: 0 products found */}
                {searchResponse.allProducts.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-neutral-200 my-8">
                    <h3 className="text-xl font-editorial font-medium text-neutral-900 mb-2">
                      No exact matches satisfied all constraints
                    </h3>
                    <p className="text-xs text-neutral-600 max-w-md mx-auto mb-6">
                      The agent strictly enforced your constraints (e.g. price ceiling, excluded materials, or specific silhouette). Try relaxing the budget or category.
                    </p>
                    <button
                      onClick={() => handleRefineSearch('Relax price ceiling and show alternatives')}
                      className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900"
                    >
                      Broaden Search Constraints
                    </button>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {/* Section 1: From Your Favorite Brands (PRD 5.4) */}
                    {searchResponse.favoriteBrandProducts.length > 0 && (
                      <section>
                        <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3 mb-6">
                          <div>
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 block">
                              Priority Curation
                            </span>
                            <h2 className="text-xl sm:text-2xl font-editorial font-medium text-neutral-900">
                              From Your Favorite Brands ({searchResponse.favoriteBrandProducts.length})
                            </h2>
                          </div>
                          <span className="text-xs text-neutral-500 font-mono">
                            Priority: {preferences.favoriteBrandIds.map(id => BRANDS.find(b => b.id === id)?.name || id).join(', ')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                          {searchResponse.favoriteBrandProducts.map(product => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              isSaved={savedProducts.some(p => p.id === product.id)}
                              onToggleSave={handleToggleSave}
                              onQuickView={setSelectedProduct}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Section 2: Brands You Might Love (PRD 5.4) */}
                    {searchResponse.discoveredBrandProducts.length > 0 && (
                      <section>
                        <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3 mb-6">
                          <div>
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 block">
                              Discovery & Aesthetic Peers
                            </span>
                            <h2 className="text-xl sm:text-2xl font-editorial font-medium text-neutral-900">
                              Brands You Might Love ({searchResponse.discoveredBrandProducts.length})
                            </h2>
                          </div>
                          <span className="text-xs text-neutral-500 italic">
                            Identified via aesthetic similarity to your favorite brands
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                          {searchResponse.discoveredBrandProducts.map(product => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              isSaved={savedProducts.some(p => p.id === product.id)}
                              onToggleSave={handleToggleSave}
                              onQuickView={setSelectedProduct}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Initial State: Editorial Lookbook & Capabilities Showcase */
              <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Campaign Showcase Banner */}
                <div className="relative overflow-hidden bg-neutral-900 text-white mb-12">
                  <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                    <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-3">
                          Curated Agentic Discovery
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-editorial font-medium leading-[1.1] mb-6">
                          Stop clicking 20 filters on 10 tabs. Just describe the look.
                        </h2>
                        <p className="text-sm text-neutral-300 max-w-lg leading-relaxed mb-8">
                          THREAD interprets subjective intent—like "architectural," "understated," "not too corporate," or "like Toteme but more affordable"—and plans a cross-brand search calibrated to your personal taste.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400">
                        <span className="flex items-center gap-1.5 text-white font-sans font-semibold">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Real Verified Products
                        </span>
                        <span>·</span>
                        <span>Deterministic Constraint Engine</span>
                        <span>·</span>
                        <span>Aesthetic Graph Mapping</span>
                      </div>
                    </div>

                    <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full">
                      <img
                        src="/src/assets/images/hero_fashion_editorial_1791644350234.jpg"
                        alt="THREAD editorial fashion collection"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  </div>
                </div>

                {/* 3 Core Discovery Scenarios Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  <div
                    onClick={() => handleExecuteSearch("Black midi dress for a wedding. Elegant, minimalist, asymmetric, under $350")}
                    className="group bg-white border border-neutral-200 p-6 cursor-pointer hover:border-neutral-900 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden mb-4">
                        <img
                          src="/src/assets/images/lookbook_minimal_dress_1791644362450.jpg"
                          alt="Asymmetric wedding dress"
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                        Scenario 01 · Occasion & Asymmetry
                      </div>
                      <h3 className="text-lg font-editorial font-medium text-neutral-900 mb-2">
                        "Black midi dress for a wedding. Minimalist, asymmetric, under $350."
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                        Agent searches COS, Reformation, and Massimo Dutti, while discovering cult labels like Source Unknown for sculptural draping.
                      </p>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-neutral-900 group-hover:underline flex items-center gap-1">
                      <span>Launch This Search</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div
                    onClick={() => handleExecuteSearch("Comfortable work trousers that don't look too corporate")}
                    className="group bg-white border border-neutral-200 p-6 cursor-pointer hover:border-neutral-900 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden mb-4">
                        <img
                          src="/src/assets/images/lookbook_tailored_style_1791644374485.jpg"
                          alt="Relaxed tailored trousers"
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                        Scenario 02 · Subjective Aesthetic
                      </div>
                      <h3 className="text-lg font-editorial font-medium text-neutral-900 mb-2">
                        "Comfortable work trousers that don't look too corporate."
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                        Agent translates "not too corporate" into relaxed pleated fluid draping, pooling hem cuts, and non-stiff Japanese crepe.
                      </p>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-neutral-900 group-hover:underline flex items-center gap-1">
                      <span>Launch This Search</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div
                    onClick={() => handleExecuteSearch("Structured brown leather bag that feels expensive under $400")}
                    className="group bg-white border border-neutral-200 p-6 cursor-pointer hover:border-neutral-900 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden mb-4">
                        <img
                          src="/src/assets/images/hero_fashion_editorial_1791644350234.jpg"
                          alt="Structured brown leather accessories"
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                        Scenario 03 · Quality & Budget Ceiling
                      </div>
                      <h3 className="text-lg font-editorial font-medium text-neutral-900 mb-2">
                        "Structured brown leather bag that feels expensive under $400."
                      </h3>
                      <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                        Agent filters out cheap synthetics, prioritizes Italian full-grain calfskin, and evaluates architectural hardware.
                      </p>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-neutral-900 group-hover:underline flex items-center gap-1">
                      <span>Launch This Search</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Brand Network Tab */}
        {activeTab === 'brands' && (
          <BrandIndexView
            favoriteBrandIds={preferences.favoriteBrandIds}
            onToggleFavorite={handleToggleFavoriteBrand}
            onExploreBrandSearch={(prompt) => {
              setActiveTab('search');
              handleExecuteSearch(prompt);
            }}
          />
        )}

        {/* Wishlist Tab */}
        {activeTab === 'wishlist' && (
          <WishlistView
            savedProducts={savedProducts}
            onRemoveSaved={handleToggleSave}
            onQuickView={setSelectedProduct}
            onNavigateToSearch={() => setActiveTab('search')}
          />
        )}
      </main>

      {/* Product Detail Modal (PDP) */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isSaved={selectedProduct ? savedProducts.some(p => p.id === selectedProduct.id) : false}
        onToggleSave={handleToggleSave}
        onSendFeedback={handleSendFeedback}
        currentFeedback={selectedProduct ? feedbacks[selectedProduct.id] : undefined}
      />

      {/* Style Profile & Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        preferences={preferences}
        onSavePreferences={(updated) => setPreferences(updated)}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-neutral-200 bg-white py-10 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            <span className="font-editorial text-lg font-semibold text-neutral-900 tracking-tight">THREAD</span>
            <span>·</span>
            <span>Agentic Fashion Discovery Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="hover:text-neutral-900 transition-colors"
            >
              Preferences & Brands
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className="hover:text-neutral-900 transition-colors"
            >
              Affinity Network
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className="hover:text-neutral-900 transition-colors"
            >
              Wishlist ({savedProducts.length})
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
