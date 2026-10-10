import React from 'react';
import { SearchResultProduct, Product } from '../types';
import { Bookmark, ExternalLink, Trash2, ArrowRight } from 'lucide-react';

interface WishlistViewProps {
  savedProducts: SearchResultProduct[];
  onRemoveSaved: (productId: string) => void;
  onQuickView: (product: SearchResultProduct) => void;
  onNavigateToSearch: () => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  savedProducts,
  onRemoveSaved,
  onQuickView,
  onNavigateToSearch,
}) => {
  if (savedProducts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="w-12 h-12 bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-4">
          <Bookmark className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 mb-2">
          Your Saved Pieces Collection is Empty
        </h2>
        <p className="text-sm text-neutral-600 max-w-md mx-auto mb-6 leading-relaxed">
          Bookmark pieces you love to build your personal collection and refine future recommendations.
        </p>
        <button
          onClick={onNavigateToSearch}
          className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 hover:bg-neutral-800 transition-colors inline-flex items-center gap-2"
        >
          <span>Start Searching</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const totalPrice = savedProducts.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 border-b border-neutral-200 mb-8">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block mb-1">
            Personal Wardrobe Wishlist
          </span>
          <h1 className="text-3xl font-editorial font-medium text-neutral-900">
            Saved Pieces ({savedProducts.length})
          </h1>
        </div>

        <div className="text-xs text-neutral-600 font-mono">
          Estimated Curation Value: <strong className="text-neutral-900 text-sm font-semibold tabular-nums">${totalPrice} USD</strong>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {savedProducts.map(product => (
          <div key={product.id} className="group bg-white border border-neutral-200 flex flex-col justify-between">
            <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden cursor-pointer" onClick={() => onQuickView(product)}>
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSaved(product.id);
                }}
                className="absolute top-2 right-2 p-1.5 bg-white/90 text-neutral-600 hover:text-red-700 hover:bg-white shadow-xs transition-colors"
                title="Remove from wishlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col flex-1 justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-0.5">
                  {product.brand}
                </div>
                <h3
                  onClick={() => onQuickView(product)}
                  className="text-sm font-medium text-neutral-900 line-clamp-1 hover:underline cursor-pointer mb-2"
                >
                  {product.name}
                </h3>
                <div className="text-sm font-mono font-semibold tabular-nums text-neutral-900 mb-3">
                  ${product.price} {product.currency}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onQuickView(product)}
                  className="text-xs text-neutral-600 hover:text-neutral-900 underline"
                >
                  Details
                </button>
                <a
                  href={product.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:text-neutral-600 flex items-center gap-1"
                >
                  <span>Shop</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
