import React, { useState } from 'react';
import { Sparkles, ArrowRight, CornerDownRight, RotateCcw } from 'lucide-react';

interface RefinementBarProps {
  onRefine: (instruction: string) => void;
  isLoading: boolean;
  suggestedRefinements: string[];
  activeQuery: string;
  onResetSearch: () => void;
}

export const RefinementBar: React.FC<RefinementBarProps> = ({
  onRefine,
  isLoading,
  suggestedRefinements,
  activeQuery,
  onResetSearch,
}) => {
  const [refinementText, setRefinementText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refinementText.trim() && !isLoading) {
      onRefine(refinementText.trim());
      setRefinementText('');
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onRefine(suggestion);
  };

  return (
    <div className="bg-white border border-neutral-300 p-6 mb-10 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-900">
              Conversational Refinement
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-500">Refine without losing previous search context</span>
          </div>
          <div className="text-xs text-neutral-800 font-medium mt-1">
            Current query: "{activeQuery}"
          </div>
        </div>

        <button
          onClick={onResetSearch}
          className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 self-start sm:self-auto transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Query</span>
        </button>
      </div>

      {/* Suggested One-Click Refinement Buttons */}
      {suggestedRefinements.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-neutral-500 mb-2">Suggested directional shifts:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedRefinements.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSuggestion(sug)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs text-neutral-800 bg-neutral-100 hover:bg-neutral-900 hover:text-white border border-neutral-200 transition-colors flex items-center gap-1.5"
              >
                <span>+ {sug}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Freeform Refinement Input */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="pl-3 pr-2 text-neutral-400">
          <CornerDownRight className="w-4 h-4 text-neutral-700" />
        </div>
        <input
          type="text"
          value={refinementText}
          onChange={e => setRefinementText(e.target.value)}
          placeholder="Give follow-up direction (e.g. 'more relaxed silhouette', 'under $250 only', 'more interesting neckline')..."
          className="w-full py-2.5 pr-28 text-xs sm:text-sm bg-neutral-50 border border-neutral-300 focus:bg-white focus:outline-hidden focus:border-neutral-900"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!refinementText.trim() || isLoading}
          className="absolute right-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 transition-colors"
        >
          {isLoading ? 'Refining...' : 'Apply'}
        </button>
      </form>
    </div>
  );
};
