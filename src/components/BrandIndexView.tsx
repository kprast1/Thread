import React, { useState } from 'react';
import { BRANDS } from '../data/brands';
import { Brand } from '../types';
import { Check, Compass, ExternalLink, ArrowRight, Sparkles } from 'lucide-react';

interface BrandIndexViewProps {
  favoriteBrandIds: string[];
  onToggleFavorite: (brandId: string) => void;
  onExploreBrandSearch: (brandName: string) => void;
}

export const BrandIndexView: React.FC<BrandIndexViewProps> = ({
  favoriteBrandIds,
  onToggleFavorite,
  onExploreBrandSearch,
}) => {
  const [selectedBrand, setSelectedBrand] = useState<Brand>(BRANDS[0]);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = BRANDS.filter(b => {
    if (filterTier !== 'all' && b.tier !== filterTier) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) ||
        b.aestheticSummary.toLowerCase().includes(q) ||
        b.origin.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Editorial Header */}
      <div className="max-w-3xl mb-10">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-2">
          Curated Catalog & Brand Network
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 leading-tight mb-2">
          Fashion House Affinity Network
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          THREAD doesn't just match keywords—it clusters fashion houses by aesthetic silhouette, fabric weight, and design philosophy. Explore the supported brands and their similarity mappings.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Brands' },
            { id: 'contemporary', label: 'Contemporary' },
            { id: 'accessible_luxury', label: 'Accessible Luxury' },
            { id: 'luxury', label: 'High Luxury' },
            { id: 'accessible', label: 'Accessible' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTier(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors border ${
                filterTier === tab.id
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter brands..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-neutral-300 focus:outline-hidden focus:border-neutral-900 w-full sm:w-60"
        />
      </div>

      {/* 2-Column Layout: Brand Grid & Interactive Detail / Similarity Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Brand Grid Column */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[750px] overflow-y-auto pr-2">
          {filtered.map(brand => {
            const isFav = favoriteBrandIds.includes(brand.id);
            const isSelected = selectedBrand.id === brand.id;

            return (
              <div
                key={brand.id}
                onClick={() => setSelectedBrand(brand)}
                className={`p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-neutral-900 ring-1 ring-neutral-900 bg-white'
                    : 'border-neutral-200 bg-white hover:border-neutral-400'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-neutral-900 text-sm">
                      {brand.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(brand.id);
                      }}
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 border transition-colors ${
                        isFav
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {isFav ? '★ Favorite' : '+ Favorite'}
                    </button>
                  </div>

                  <div className="text-[11px] text-neutral-500 font-mono mb-2">
                    {brand.origin} · {brand.priceRange}
                  </div>

                  <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                    {brand.aestheticSummary}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">
                    {brand.similarBrandIds.length} aesthetic peers
                  </span>
                  <span className="text-neutral-900 font-medium hover:underline">
                    Inspect Network →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Brand Detail & Similarity Graph Column */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
                  Aesthetic DNA & Network Mapping
                </span>
                <h2 className="text-2xl font-editorial font-medium text-neutral-900 mt-1">
                  {selectedBrand.name}
                </h2>
                <div className="text-xs text-neutral-500 font-mono mt-0.5">
                  {selectedBrand.origin} · Tier: {selectedBrand.tier.replace('_', ' ')} · {selectedBrand.priceRange}
                </div>
              </div>

              <a
                href={selectedBrand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-neutral-200 hover:border-neutral-900 text-neutral-700 transition-colors"
                title="Visit brand website"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed mb-6">
              {selectedBrand.aestheticSummary}
            </p>

            {/* Aesthetic Directives */}
            <div className="mb-6">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-700 block mb-2">
                Aesthetic Attributes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedBrand.aestheticKeywords.map(kw => (
                  <span
                    key={kw}
                    className="text-xs px-2.5 py-1 bg-neutral-100 text-neutral-800"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Similar Brands & Why */}
            <div className="pt-4 border-t border-neutral-200">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-900 block mb-3">
                Aesthetic Peers & Similar Houses ({selectedBrand.similarBrandIds.length})
              </span>

              <div className="space-y-3">
                {selectedBrand.similarBrandIds.map(simId => {
                  const peer = BRANDS.find(b => b.id === simId);
                  if (!peer) return null;
                  const reason = selectedBrand.similarityNotes?.[simId] || `Shares ${selectedBrand.name}'s design ethos with complementary price and silhouettes.`;

                  return (
                    <div key={simId} className="p-3 bg-neutral-50 border border-neutral-200 text-xs">
                      <div className="flex items-center justify-between font-semibold text-neutral-900 mb-1">
                        <span>{peer.name}</span>
                        <span className="font-mono text-neutral-400 font-normal text-[11px]">
                          {peer.priceRange}
                        </span>
                      </div>
                      <p className="text-neutral-600 leading-relaxed">
                        {reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-200 mt-6 flex gap-3">
            <button
              onClick={() => onExploreBrandSearch(`Pieces from ${selectedBrand.name}`)}
              className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 hover:bg-neutral-800 transition-colors text-center"
            >
              Search {selectedBrand.name} Pieces
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
