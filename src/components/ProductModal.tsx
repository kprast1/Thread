import React, { useState } from 'react';
import { SearchResultProduct, FeedbackType } from '../types';
import { X, ExternalLink, Bookmark, Check, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { BRANDS } from '../data/brands';

interface ProductModalProps {
  product: SearchResultProduct | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (productId: string) => void;
  onSendFeedback: (productId: string, type: FeedbackType) => void;
  currentFeedback?: FeedbackType;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  isSaved,
  onToggleSave,
  onSendFeedback,
  currentFeedback,
}) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  if (!product) return null;

  const brandInfo = BRANDS.find(b => b.id === product.brandId);

  const feedbackOptions: { type: FeedbackType; label: string }[] = [
    { type: 'love', label: 'Love this' },
    { type: 'more_like_this', label: 'More like this' },
    { type: 'not_my_style', label: 'Not my style' },
    { type: 'wrong_silhouette', label: 'Wrong silhouette' },
    { type: 'too_expensive', label: 'Too expensive' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FCFCFB] text-[#191919] w-full max-w-4xl border border-neutral-300 shadow-2xl rounded-none max-h-[92vh] overflow-y-auto">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-200 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="font-semibold uppercase tracking-wider text-neutral-900">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span>{product.discoveryType === 'favorite_brand' ? 'From Favorite Brand' : 'Discovered Alternative'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">${product.price} {product.currency}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Close product preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column PDP Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-8">
          {/* Gallery Column */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden border border-neutral-200">
              <img
                src={product.imageUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-3 left-3">
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 ${
                  product.discoveryType === 'favorite_brand'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-900 border border-neutral-300'
                }`}>
                  {product.discoveryType === 'favorite_brand' ? 'Favorite Brand' : 'Discovered Brand'}
                </span>
              </div>
            </div>

            {brandInfo && (
              <div className="p-3.5 bg-neutral-100/60 border border-neutral-200 text-xs text-neutral-600">
                <div className="font-semibold text-neutral-900 uppercase tracking-wider text-[11px] mb-1">
                  Brand DNA · {brandInfo.name} ({brandInfo.origin})
                </div>
                <p className="leading-relaxed">
                  {brandInfo.aestheticSummary}
                </p>
                {product.similarityToFavorite && (
                  <p className="mt-2 text-neutral-800 font-medium italic">
                    ✦ {product.similarityToFavorite}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-1">
                  {product.brand}
                </div>
                <h2 className="text-2xl sm:text-3xl font-editorial font-medium text-neutral-900 leading-tight">
                  {product.name}
                </h2>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-2xl font-mono tabular-nums font-semibold text-neutral-900">
                    ${product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm font-mono tabular-nums text-neutral-400 line-through">
                      ${product.originalPrice}
                    </span>
                  )}
                  <span className="text-xs font-mono text-neutral-400">
                    {product.currency}
                  </span>
                </div>
              </div>

              {/* Grounded AI Matching Reason */}
              <div className="p-4 bg-neutral-50 border border-neutral-300">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-900 block mb-1">
                  Agent Matching Rationale
                </span>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  {product.reason}
                </p>
                <div className="mt-2 text-[11px] font-mono text-neutral-500 flex items-center gap-3">
                  <span>Match Score: <strong>{product.matchScore}%</strong></span>
                  <span>·</span>
                  <span>Silhouette: <strong>{product.silhouettes.join(', ')}</strong></span>
                </div>
              </div>

              {/* Description & Retailer Highlight */}
              <div className="space-y-3 text-xs text-neutral-700">
                <p className="leading-relaxed">
                  {product.description}
                </p>
                <div className="p-3 bg-white border border-neutral-200 text-neutral-600">
                  <strong className="text-neutral-900 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                    Fabric & Craftsmanship
                  </strong>
                  <div>Composition: {product.composition}</div>
                  <div>Care: {product.care}</div>
                </div>
              </div>

              {/* Sizes */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
                    Available Sizing
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`w-9 h-9 text-xs font-mono border transition-colors flex items-center justify-center ${
                          selectedSize === size
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-900'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback controls (PRD 5.6) */}
              <div className="pt-2 border-t border-neutral-200">
                <div className="text-xs text-neutral-500 mb-2">
                  Train the agent on this piece:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {feedbackOptions.map(opt => {
                    const isSelected = currentFeedback === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => onSendFeedback(product.id, opt.type)}
                        className={`px-2.5 py-1 text-xs border transition-colors ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-800'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-6 border-t border-neutral-200 mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => onToggleSave(product.id)}
                className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider border flex items-center justify-center gap-2 transition-colors ${
                  isSaved
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-900 border-neutral-300 hover:border-neutral-900'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span>{isSaved ? 'Saved to Wishlist' : 'Save Piece'}</span>
              </button>

              <a
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider bg-neutral-900 text-white hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 text-center"
              >
                <span>View at {product.brand}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
