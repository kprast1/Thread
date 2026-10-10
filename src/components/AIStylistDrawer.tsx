import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, ArrowRight, Bookmark, Check, ShieldCheck, ChevronRight } from 'lucide-react';
import { StylistMessage, SearchResultProduct, UserPreferences } from '../types';
import { PRODUCTS } from '../data/products';

interface AIStylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSelectProduct: (product: SearchResultProduct) => void;
  onApplySearchQuery: (query: string) => void;
}

export const AIStylistDrawer: React.FC<AIStylistDrawerProps> = ({
  isOpen,
  onClose,
  preferences,
  onSelectProduct,
  onApplySearchQuery,
}) => {
  const [messages, setMessages] = useState<StylistMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: "Hello! I'm your THREAD Personal Stylist. Tell me about an occasion, an aesthetic vibe you want to achieve, or ask for pairing advice for any piece in your wardrobe.",
      timestamp: Date.now(),
      stylingTips: [
        'Describe the vibe in your own words—like "understated cocktail dinner" or "like Toteme but accessible".',
        'Tell me your budget ceiling or fabrics you want to avoid.'
      ],
      suggestedPrompts: [
        "What should I wear to a fall wedding in the mountains?",
        "How do I style wide-leg linen trousers for the office?",
        "Show me minimalist black dresses under $300",
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMsg: StylistMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/stylist/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
          userPreferences: preferences,
        }),
      });

      if (!res.ok) throw new Error('Stylist consultation failed');

      const data = await res.json();
      const botMsg: StylistMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
        recommendedProductIds: data.recommendedProductIds,
        stylingTips: data.stylingTips,
        suggestedPrompts: data.suggestedPrompts,
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: "I've pulled a few architectural pieces that prioritize clean tailoring and natural textiles for your style brief.",
          timestamp: Date.now(),
          recommendedProductIds: [PRODUCTS[0].id, PRODUCTS[1].id],
          stylingTips: [
            'Maintain tonal cohesion with monochromatic pairings.',
            'Balance volume on the bottom with closer tailoring up top.'
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-neutral-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-900">THREAD Personal Stylist</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-xs">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">Wardrobe & occasion styling consultation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors rounded-sm hover:bg-neutral-200/50"
            aria-label="Close stylist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-lg p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-neutral-900 text-white font-normal'
                    : 'bg-neutral-100 text-neutral-800 border border-neutral-200/60'
                }`}
              >
                {msg.content}

                {/* Styling Tips Callout */}
                {msg.stylingTips && msg.stylingTips.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-neutral-200/80 text-xs">
                    <span className="font-semibold text-neutral-900 block mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
                      Stylist Rules:
                    </span>
                    <ul className="space-y-1.5 text-neutral-600 pl-3">
                      {msg.stylingTips.map((tip, i) => (
                        <li key={i} className="list-disc">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommended Catalog Products Attached */}
              {msg.recommendedProductIds && msg.recommendedProductIds.length > 0 && (
                <div className="mt-3 w-full max-w-[95%]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2 block">
                    Curated Pieces from Catalog:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {msg.recommendedProductIds.map(id => {
                      const prod = PRODUCTS.find(p => p.id === id);
                      if (!prod) return null;
                      const searchProd: SearchResultProduct = {
                        ...prod,
                        reason: 'Recommended by AI Stylist',
                        discoveryType: preferences.favoriteBrandIds.includes(prod.brandId)
                          ? 'favorite_brand'
                          : 'discovered_brand',
                        matchScore: 95,
                        scoreBreakdown: { queryMatch: 95, styleMatch: 95, brandAffinity: 95, discoveryQuality: 95 },
                      };

                      return (
                        <div
                          key={id}
                          onClick={() => onSelectProduct(searchProd)}
                          className="flex items-center gap-3 p-2 bg-white border border-neutral-200 hover:border-neutral-900 cursor-pointer transition-all shadow-xs group"
                        >
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-12 h-16 object-cover bg-neutral-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-left">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 block truncate">
                              {prod.brand}
                            </span>
                            <span className="text-xs font-medium text-neutral-900 block truncate group-hover:underline">
                              {prod.name}
                            </span>
                            <span className="text-xs font-mono text-neutral-700 font-semibold block mt-0.5">
                              ${prod.price}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suggested Follow-ups */}
              {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 max-w-[95%]">
                  {msg.suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(prompt)}
                      className="text-[11px] px-2.5 py-1 bg-white border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:text-neutral-900 transition-colors text-left flex items-center gap-1 shadow-2xs"
                    >
                      <span>{prompt}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-neutral-50 border border-neutral-200 max-w-[70%] text-xs text-neutral-600">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-neutral-900" />
              <span>Analyzing silhouettes & curating recommendations...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t border-neutral-200 bg-white">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask for styling advice, outfit pairings, or dupes..."
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-300 focus:border-neutral-900 focus:bg-white focus:outline-hidden transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 bg-neutral-900 text-white hover:bg-black transition-colors disabled:opacity-40 shrink-0 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
