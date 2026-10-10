import React from 'react';
import { Bookmark, SlidersHorizontal, Sparkles, Compass } from 'lucide-react';

interface NavbarProps {
  activeTab: 'search' | 'brands' | 'wishlist';
  setActiveTab: (tab: 'search' | 'brands' | 'wishlist') => void;
  savedCount: number;
  onOpenPreferences: () => void;
  onOpenStylist: () => void;
  dbStats?: { connected: boolean; productCount: number; brandCount: number } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  onOpenPreferences,
  onOpenStylist,
  dbStats,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 py-3.5">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab('search')}
            className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity whitespace-nowrap text-left"
          >
            <span className="text-xl font-bold tracking-widest text-neutral-900">
              THREAD
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-600">
            <button
              onClick={() => setActiveTab('search')}
              className={`whitespace-nowrap transition-colors py-1 ${
                activeTab === 'search'
                  ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900'
                  : 'hover:text-neutral-900'
              }`}
            >
              Shop & Discover
            </button>

            <button
              onClick={() => setActiveTab('brands')}
              className={`whitespace-nowrap transition-colors py-1 ${
                activeTab === 'brands'
                  ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900'
                  : 'hover:text-neutral-900'
              }`}
            >
              Brand Network
            </button>

            <button
              onClick={() => setActiveTab('wishlist')}
              className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1.5 ${
                activeTab === 'wishlist'
                  ? 'text-neutral-900 font-semibold border-b-2 border-neutral-900'
                  : 'hover:text-neutral-900'
              }`}
            >
              <span>Saved Pieces</span>
              {savedCount > 0 && (
                <span className="text-[10px] font-mono font-semibold bg-neutral-900 text-white rounded-full px-1.5 py-0.2">
                  {savedCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Postgres Database Status Pill */}
          {dbStats && dbStats.connected && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 rounded-full"
              title={`PostgreSQL database connected on port 5433 with ${dbStats.productCount} indexed garments.`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Postgres Live ({dbStats.productCount} pieces)</span>
            </div>
          )}

          {/* Personal Stylist Button */}
          <button
            onClick={onOpenStylist}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 transition-colors rounded-xs shadow-2xs"
            title="Consult Personal Stylist"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Personal Stylist</span>
          </button>

          {/* Style Profile Modal */}
          <button
            onClick={onOpenPreferences}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-300 hover:border-neutral-900 transition-colors rounded-xs shadow-2xs"
            title="Edit Style Profile & Favorite Brands"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preferences</span>
          </button>
        </div>
      </div>
    </header>
  );
};
