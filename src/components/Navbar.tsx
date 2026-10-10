import React from 'react';
import { Bookmark, SlidersHorizontal, Compass, Search } from 'lucide-react';

interface NavbarProps {
  activeTab: 'search' | 'brands' | 'wishlist';
  setActiveTab: (tab: 'search' | 'brands' | 'wishlist') => void;
  savedCount: number;
  onOpenPreferences: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  onOpenPreferences,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FBFBFA]/95 backdrop-blur-md border-b border-black/[0.08] transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark in display serif */}
        <button
          onClick={() => setActiveTab('search')}
          className="text-2xl font-editorial tracking-tight text-[#191919] hover:opacity-80 transition-opacity whitespace-nowrap shrink-0 text-left font-semibold"
        >
          THREAD
        </button>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-[13px] tracking-wide text-neutral-600 font-medium">
          <button
            onClick={() => setActiveTab('search')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'search'
                ? 'text-[#191919] font-semibold border-b border-[#191919]'
                : 'hover:text-[#191919]'
            }`}
          >
            Search & Discovery
          </button>

          <button
            onClick={() => setActiveTab('brands')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              activeTab === 'brands'
                ? 'text-[#191919] font-semibold border-b border-[#191919]'
                : 'hover:text-[#191919]'
            }`}
          >
            Brand Network
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'wishlist'
                ? 'text-[#191919] font-semibold border-b border-[#191919]'
                : 'hover:text-[#191919]'
            }`}
          >
            <span>Saved Pieces</span>
            {savedCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums bg-neutral-200 text-neutral-800 rounded px-1.5 py-0.2">
                {savedCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: 1 primary action button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenPreferences}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-neutral-900 bg-white border border-neutral-300 hover:border-neutral-900 transition-colors whitespace-nowrap shrink-0 rounded-sm shadow-xs"
            title="Edit Style Profile & Favorite Brands"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Style Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
};
