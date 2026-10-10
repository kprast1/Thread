import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { SearchHeader } from './components/SearchHeader';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { RefinementBar } from './components/RefinementBar';
import { BrandIndexView } from './components/BrandIndexView';
import { WishlistView } from './components/WishlistView';
import { OnboardingModal } from './components/OnboardingModal';
import { AIStylistDrawer } from './components/AIStylistDrawer';
import {
  UserPreferences,
  SearchResponse,
  SearchResultProduct,
  FeedbackType,
} from './types';
import { BRANDS } from './data/brands';
import { PRODUCTS } from './data/products';
import { Sparkles, SlidersHorizontal, AlertCircle, ArrowUpDown, Filter, RotateCcw, LayoutGrid, Check } from 'lucide-react';

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
  const [isStylistOpen, setIsStylistOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SearchResultProduct | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackType>>({});
  const [searchError, setSearchError] = useState<string | null>(null);

  // Catalog Browsing Controls (When not in specific search mode)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(1500);

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

  // Feedback handler
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

  // Filtered Catalog for Homepage Browsing (when not searching)
  const defaultCatalogProducts: SearchResultProduct[] = useMemo(() => {
    return PRODUCTS.map(p => {
      const isFav = preferences.favoriteBrandIds.includes(p.brandId);
      return {
        ...p,
        reason: isFav ? `From priority house ${p.brand}` : `Discovered peer label matching ${p.aesthetic}`,
        discoveryType: isFav ? 'favorite_brand' : 'discovered_brand',
        matchScore: isFav ? 92 : 85,
        scoreBreakdown: { queryMatch: 90, styleMatch: 88, brandAffinity: isFav ? 95 : 75, discoveryQuality: 85 },
      };
    });
  }, [preferences.favoriteBrandIds]);

  const displayedCatalog = useMemo(() => {
    return defaultCatalogProducts
      .filter(p => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (selectedBrandFilter !== 'all' && p.brandId !== selectedBrandFilter) return false;
        if (p.price > maxPriceFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        return b.matchScore - a.matchScore;
      });
  }, [defaultCatalogProducts, selectedCategory, selectedBrandFilter, maxPriceFilter, sortBy]);

  const categories = [
    { id: 'all', label: 'All Pieces' },
    { id: 'dress', label: 'Dresses' },
    { id: 'trousers', label: 'Trousers' },
    { id: 'coat', label: 'Coats & Jackets' },
    { id: 'knitwear', label: 'Knitwear' },
    { id: 'bag', label: 'Bags' },
    { id: 'shoes', label: 'Shoes' },
    { id: 'skirt', label: 'Skirts' },
    { id: 'top', label: 'Tops' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedProducts.length}
        onOpenPreferences={() => setIsOnboardingOpen(true)}
        onOpenStylist={() => setIsStylistOpen(true)}
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
              onOpenStylist={() => setIsStylistOpen(true)}
            />

            {/* Error banner if search fails */}
            {searchError && (
              <div className="max-w-7xl mx-auto px-6 mt-4">
                <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 rounded-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{searchError}</span>
                </div>
              </div>
            )}

            {/* CASE 1: SEARCH RESULTS VIEW */}
            {searchResponse ? (
              <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Conversational Refinement Bar */}
                <RefinementBar
                  onRefine={handleRefineSearch}
                  isLoading={isLoading}
                  suggestedRefinements={searchResponse.suggestedRefinements}
                  activeQuery={searchResponse.query}
                  onResetSearch={() => setSearchResponse(null)}
                />

                {/* 0 Products Fallback */}
                {searchResponse.allProducts.length === 0 ? (
                  <div className="p-12 text-center bg-neutral-50 border border-neutral-200 my-8">
                    <h3 className="text-base font-semibold text-neutral-900 mb-2">
                      No exact matches satisfied all active filters
                    </h3>
                    <p className="text-xs text-neutral-600 max-w-md mx-auto mb-6">
                      No pieces met your exact budget ceiling or fabric exclusions. Try broadening the filters or consult the Personal Stylist for alternatives.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleRefineSearch('Relax price ceiling and show alternatives')}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 hover:bg-black transition-colors"
                      >
                        Broaden Search Constraints
                      </button>
                      <button
                        onClick={() => setSearchResponse(null)}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 bg-white border border-neutral-300 hover:border-neutral-900 transition-colors"
                      >
                        Browse Full Catalog
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {/* Priority Curated: From Favorite Brands */}
                    {searchResponse.favoriteBrandProducts.length > 0 && (
                      <section>
                        <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3 mb-6">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 block">
                              Priority Curation
                            </span>
                            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
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

                    {/* Discovered Peer Brands */}
                    {searchResponse.discoveredBrandProducts.length > 0 && (
                      <section>
                        <div className="flex items-baseline justify-between border-b border-neutral-200 pb-3 mb-6">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 block">
                              Discovery & Aesthetic Peers
                            </span>
                            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
                              Brands You Might Love ({searchResponse.discoveredBrandProducts.length})
                            </h2>
                          </div>
                          <span className="text-xs text-neutral-500 italic">
                            Discovered via stylistic affinity mapping
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
              /* CASE 2: LIVE STORE CATALOG VIEW (Real Website Experience) */
              <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Category Navigation Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-6 border-b border-neutral-200 no-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-xs whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-neutral-900 text-white font-semibold'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Filter and Sort Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-neutral-100 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Brand Filter Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500 font-medium">Brand:</span>
                      <select
                        value={selectedBrandFilter}
                        onChange={e => setSelectedBrandFilter(e.target.value)}
                        className="bg-white border border-neutral-300 py-1 px-2.5 rounded-xs text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900"
                      >
                        <option value="all">All Brands</option>
                        {BRANDS.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Max Price Filter Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500 font-medium">Price Ceiling:</span>
                      <select
                        value={maxPriceFilter}
                        onChange={e => setMaxPriceFilter(Number(e.target.value))}
                        className="bg-white border border-neutral-300 py-1 px-2.5 rounded-xs text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900"
                      >
                        <option value={1500}>Any Price</option>
                        <option value={200}>Under $200</option>
                        <option value={350}>Under $350</option>
                        <option value={500}>Under $500</option>
                        <option value={800}>Under $800</option>
                      </select>
                    </div>

                    {(selectedCategory !== 'all' || selectedBrandFilter !== 'all' || maxPriceFilter !== 1500) && (
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setSelectedBrandFilter('all');
                          setMaxPriceFilter(1500);
                        }}
                        className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 underline ml-2"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Sort and Count */}
                  <div className="flex items-center gap-4">
                    <span className="text-neutral-500">
                      Showing <strong className="text-neutral-900">{displayedCatalog.length}</strong> pieces
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500 font-medium">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="bg-white border border-neutral-300 py-1 px-2.5 rounded-xs text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900"
                      >
                        <option value="featured">Curated For You</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Live E-Commerce Product Grid */}
                {displayedCatalog.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {displayedCatalog.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isSaved={savedProducts.some(p => p.id === product.id)}
                        onToggleSave={handleToggleSave}
                        onQuickView={setSelectedProduct}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-neutral-50 border border-neutral-200">
                    <p className="text-sm text-neutral-600 mb-3">No pieces match the selected filter combination.</p>
                    <button
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedBrandFilter('all');
                        setMaxPriceFilter(1500);
                      }}
                      className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold uppercase tracking-wider"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
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

      {/* Floating Stylist Trigger Pill */}
      <button
        onClick={() => setIsStylistOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-neutral-900 hover:bg-black text-white text-xs font-semibold tracking-wider uppercase shadow-xl hover:shadow-2xl transition-all rounded-full hover:scale-103"
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>Personal Stylist</span>
      </button>

      {/* Interactive Personal Stylist Drawer */}
      <AIStylistDrawer
        isOpen={isStylistOpen}
        onClose={() => setIsStylistOpen(false)}
        preferences={preferences}
        onSelectProduct={(p) => {
          setSelectedProduct(p);
        }}
        onApplySearchQuery={(q) => {
          setIsStylistOpen(false);
          handleExecuteSearch(q);
        }}
      />

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

      {/* Modern E-Commerce Clean Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-widest text-neutral-900">THREAD</span>
            <span>·</span>
            <span>Curated Multi-Brand Fashion</span>
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
