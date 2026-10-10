import React, { useState } from 'react';
import { Search, ArrowRight, Sparkles, X, SlidersHorizontal } from 'lucide-react';
import { UserPreferences, SearchIntent } from '../types';
import { BRANDS } from '../data/brands';

interface SearchHeaderProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  preferences: UserPreferences;
  currentIntent?: SearchIntent | null;
  onOpenPreferences: () => void;
  onOpenStylist?: () => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  onSearch,
  isLoading,
  preferences,
  currentIntent,
  onOpenPreferences,
  onOpenStylist,
}) => {
  const [query, setQuery] = useState('');

  const quickPills = [
    { label: 'Quiet Luxury', query: 'Quiet luxury minimalist pieces in natural fibers' },
    { label: 'Wedding Guest < $350', query: 'Black or dark midi dress for wedding under $350, elegant and minimalist' },
    { label: 'Wide-Leg Linen', query: 'Relaxed wide-leg linen trousers for warm weather' },
    { label: 'Toteme Aesthetic', query: 'Sculptural outerwear and tailoring similar to Toteme' },
    { label: '100% Cashmere & Silk', query: 'Pure cashmere knitwear and silk pieces under $350' },
    { label: 'Structured Leather Bag', query: 'Structured leather tote or shoulder bag under $400' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleSelectPill = (pillQuery: string) => {
    setQuery(pillQuery);
    onSearch(pillQuery);
  };

  const favoriteNames = preferences.favoriteBrandIds
    .map(id => BRANDS.find(b => b.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="bg-white border-b border-neutral-200/80 pt-6 pb-6">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 text-xs">
          <div className="flex items-center gap-2 text-neutral-600">
            <span className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px]">
              Curated Style Search
            </span>
            <span aria-hidden="true">·</span>
            <span>Discover by silhouette, occasion, fabric, or aesthetic</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenPreferences}
              className="text-xs text-neutral-600 hover:text-neutral-900 transition-colors flex items-center gap-1.5 font-medium"
            >
              <SlidersHorizontal className="w-3 h-3 text-neutral-500" />
              <span>Prioritizing: {favoriteNames.slice(0, 3).join(', ')}{favoriteNames.length > 3 ? ` +${favoriteNames.length - 3}` : ''}</span>
            </button>

            {onOpenStylist && (
              <button
                onClick={onOpenStylist}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 transition-colors rounded-sm"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Personal Stylist</span>
              </button>
            )}
          </div>
        </div>

        {/* Modern E-Commerce Search Input Box */}
        <form onSubmit={handleSubmit} className="relative mb-3">
          <div className="relative flex items-center bg-white border border-neutral-300 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-all rounded-xs shadow-2xs">
            <div className="pl-4 pr-2 text-neutral-400">
              <Search className="w-4 h-4 text-neutral-700" />
            </div>

            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by aesthetic, silhouette, occasion, or price (e.g. 'black midi dress for a wedding under $350')..."
              className="w-full py-3.5 pr-28 text-sm text-neutral-900 bg-transparent placeholder:text-neutral-400 focus:outline-hidden"
              disabled={isLoading}
            />

            <div className="absolute right-2 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-neutral-400 hover:text-neutral-800 transition-colors"
                  aria-label="Clear query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="px-4 py-2 text-xs font-semibold tracking-wider uppercase text-white bg-neutral-900 hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 rounded-xs"
              >
                {isLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Searching</span>
                  </>
                ) : (
                  <>
                    <span>Search</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Discovery Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-neutral-400 font-medium whitespace-nowrap text-[11px] uppercase tracking-wider">
            Quick Discovery:
          </span>
          {quickPills.map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPill(pill.query)}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-400 transition-colors whitespace-nowrap rounded-xs"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Active Constraints Readout if intent exists */}
        {currentIntent && (
          <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-neutral-700 uppercase tracking-wider text-[10px]">
              Active Constraints:
            </span>
            {currentIntent.category && (
              <span className="bg-neutral-100 px-2 py-0.5 rounded-xs text-neutral-800 font-medium">
                Category: <strong>{currentIntent.category}</strong>
              </span>
            )}
            {currentIntent.maxPrice && (
              <span className="bg-neutral-100 px-2 py-0.5 rounded-xs text-neutral-800 font-medium font-mono tabular-nums">
                Budget: <strong>&lt; ${currentIntent.maxPrice}</strong>
              </span>
            )}
            {currentIntent.targetColors.length > 0 && (
              <span className="bg-neutral-100 px-2 py-0.5 rounded-xs text-neutral-800 font-medium">
                Color: <strong>{currentIntent.targetColors.join(', ')}</strong>
              </span>
            )}
            {currentIntent.targetSilhouettes.length > 0 && (
              <span className="bg-neutral-100 px-2 py-0.5 rounded-xs text-neutral-800 font-medium">
                Cut: <strong>{currentIntent.targetSilhouettes.join(', ')}</strong>
              </span>
            )}
            {preferences.excludedMaterials.length > 0 && (
              <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-xs">
                Zero: {preferences.excludedMaterials.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
