import React, { useState } from 'react';
import { Bookmark, ExternalLink, Eye, Sparkles } from 'lucide-react';
import { SearchResultProduct } from '../types';

interface ProductCardProps {
  product: SearchResultProduct;
  isSaved: boolean;
  onToggleSave: (productId: string) => void;
  onQuickView: (product: SearchResultProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSaved,
  onToggleSave,
  onQuickView,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group flex flex-col bg-white border border-neutral-200/80 hover:border-neutral-900 transition-all duration-200">
      {/* Visual Slot */}
      <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden cursor-pointer" onClick={() => onQuickView(product)}>
        {!imgError ? (
          <img
            src={product.imageUrl}
            alt={`${product.brand} - ${product.name}`}
            referrerPolicy="no-referrer"
            onError={() => {
              if (product.fallbackImageUrl && product.imageUrl !== product.fallbackImageUrl) {
                // Try fallback image
                setImgError(false);
              } else {
                setImgError(true);
              }
            }}
            className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-600 text-center">
            <span className="text-xs uppercase tracking-widest font-semibold">{product.brand}</span>
            <span className="text-sm font-editorial font-medium mt-1">{product.name}</span>
            <span className="text-xs text-neutral-400 mt-2 font-mono tabular-nums">${product.price}</span>
          </div>
        )}

        {/* Brand Origin Indicator Kicker */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {product.discoveryType === 'favorite_brand' ? (
            <span className="text-[10px] uppercase tracking-wider font-semibold bg-neutral-900 text-white px-2 py-0.5 shadow-xs">
              Favorite Brand
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wider font-semibold bg-white text-neutral-900 border border-neutral-300 px-2 py-0.5 shadow-xs">
              Discovered Brand
            </span>
          )}
        </div>

        {/* Save button (Wishlist) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(product.id);
          }}
          className={`absolute top-3 right-3 p-2 transition-colors z-10 shadow-xs ${
            isSaved
              ? 'bg-neutral-900 text-white'
              : 'bg-white/90 text-neutral-700 hover:text-neutral-900 hover:bg-white'
          }`}
          aria-label={isSaved ? 'Remove from saved pieces' : 'Save to wishlist'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Quick View Hover Overlay Button */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="w-full py-2 text-xs font-semibold uppercase tracking-wider text-neutral-900 bg-white hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Product Details</span>
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Metadata with typographic separator */}
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-neutral-800">
              {product.brand}
            </span>
            <span className="font-mono text-neutral-400 text-[11px] capitalize">
              {product.category}
            </span>
          </div>

          {/* Product Name */}
          <h3
            onClick={() => onQuickView(product)}
            className="text-sm font-medium text-neutral-900 leading-snug hover:underline cursor-pointer line-clamp-1 mb-2"
          >
            {product.name}
          </h3>

          {/* Price with Tabular Numerals */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-base font-semibold font-mono tabular-nums text-neutral-900">
              ${product.price}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs font-mono tabular-nums text-neutral-400 line-through">
                ${product.originalPrice}
              </span>
            )}
            <span className="text-[11px] font-mono text-neutral-400">
              {product.currency}
            </span>
          </div>

          {/* Grounded Relevance Explanation */}
          <div className="text-xs text-neutral-600 bg-neutral-50 border border-neutral-200/70 p-2.5 mb-2 leading-relaxed">
            <span className="font-semibold text-neutral-800 block text-[11px] uppercase tracking-wider mb-0.5">
              Why it matches:
            </span>
            {product.reason}
          </div>

          {/* Similarity Origin note for discovered brand */}
          {product.similarityToFavorite && (
            <div className="text-[11px] text-neutral-500 italic mb-3">
              ✦ {product.similarityToFavorite}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="text-xs text-neutral-600 hover:text-neutral-900 underline"
          >
            Specs & Silhouettes
          </button>

          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:text-neutral-600 flex items-center gap-1 transition-colors"
          >
            <span>Retailer</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
