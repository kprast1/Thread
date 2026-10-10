import React, { useState } from 'react';
import { Search, ArrowRight, Sparkles, Filter, X } from 'lucide-react';
import { UserPreferences, SearchIntent } from '../types';
import { BRANDS } from '../data/brands';

interface SearchHeaderProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  preferences: UserPreferences;
  currentIntent?: SearchIntent | null;
  onOpenPreferences: () => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  onSearch,
  isLoading,
  preferences,
  currentIntent,
  onOpenPreferences,
}) => {
  const [query, setQuery] = useState('');

  const samplePrompts = [
    "Black midi dress for a wedding. Elegant, minimalist, asymmetric, under $350",
    "Structured brown leather bag that feels expensive under $400",
    "Comfortable work trousers that don't look too corporate",
    "Summer dress, Mediterranean, simple but interesting",
    "Something similar to Toteme coat, but more affordable",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleSelectSample = (sample: string) => {
    setQuery(sample);
    onSearch(sample);
  };

  const favoriteNames = preferences.favoriteBrandIds
    .map(id => BRANDS.find(b => b.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="pt-8 pb-10 border-b border-black/[0.06] bg-gradient-to-b from-white to-[#FBFBFA]">
      <div className="max-w-5xl mx-auto px-6">
        {/* Subtle kicker */}
        <div className="flex items-center justify-between mb-3 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800 tracking-wider uppercase text-[11px]">
              Agentic Fashion Discovery
            </span>
            <span aria-hidden="true">·</span>
            <span>Natural language search across curated fashion houses</span>
          </div>

          <button
            onClick={onOpenPreferences}
            className="hover:text-neutral-900 transition-colors text-xs flex items-center gap-1 font-medium"
          >
            <span>Priority Brands: {favoriteNames.slice(0, 3).join(', ')}{favoriteNames.length > 3 ? ` +${favoriteNames.length - 3}` : ''}</span>
          </button>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-editorial tracking-tight text-neutral-900 mb-6 font-medium leading-[1.15]">
          Find what you actually mean, from brands you’ll actually like.
        </h1>

        {/* Search Input Box */}
        <form onSubmit={handleSubmit} className="relative mb-4">
          <div className="relative flex items-center bg-white border-2 border-neutral-900 shadow-sm transition-all focus-within:shadow-md">
            <div className="pl-4 pr-2 text-neutral-400">
              <Search className="w-5 h-5 text-neutral-900" />
            </div>

            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Describe what you want (e.g. 'black midi dress for a wedding, minimalist, asymmetric, under $350')..."
              className="w-full py-4 pr-32 text-sm sm:text-base text-neutral-900 bg-transparent placeholder:text-neutral-400 focus:outline-hidden"
              disabled={isLoading}
            />

            <div className="absolute right-2 flex items-center gap-2">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-neutral-400 hover:text-neutral-800"
                  aria-label="Clear query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="px-5 py-2.5 text-xs font-semibold tracking-wider uppercase text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Searching</span>
                  </>
                ) : (
                  <>
                    <span>Search</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Curated Sample Inspiration Prompts (Interactive buttons) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-neutral-400 font-medium whitespace-nowrap">Try:</span>
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSample(prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs text-neutral-600 bg-white border border-neutral-200 hover:border-neutral-900 hover:text-neutral-900 transition-colors truncate max-w-xs sm:max-w-md text-left"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* Active Constraints Readout if intent exists */}
        {currentIntent && (
          <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
            <span className="font-medium text-neutral-800 uppercase tracking-wider text-[11px]">
              Active Constraints:
            </span>
            {currentIntent.category && (
              <span>Category: <strong className="text-neutral-800 font-semibold">{currentIntent.category}</strong></span>
            )}
            {currentIntent.maxPrice && (
              <>
                <span aria-hidden="true">·</span>
                <span>Max Budget: <strong className="text-neutral-800 font-semibold font-mono tabular-nums">${currentIntent.maxPrice}</strong></span>
              </>
            )}
            {currentIntent.targetColors.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>Color: <strong className="text-neutral-800 font-semibold">{currentIntent.targetColors.join(', ')}</strong></span>
              </>
            )}
            {currentIntent.targetSilhouettes.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>Silhouettes: <strong className="text-neutral-800 font-semibold">{currentIntent.targetSilhouettes.join(', ')}</strong></span>
              </>
            )}
            {preferences.excludedMaterials.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-red-700">Excluded: {preferences.excludedMaterials.join(', ')}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
