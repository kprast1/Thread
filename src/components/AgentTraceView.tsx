import React, { useState } from 'react';
import { AgentTraceStep } from '../types';
import { ChevronDown, ChevronUp, Cpu, CheckCircle2, ShieldCheck, Compass, Sparkles } from 'lucide-react';

interface AgentTraceViewProps {
  traceSteps: AgentTraceStep[];
  coverageStats?: {
    favoriteBrandsSearched: string[];
    discoveredBrandsSearched: string[];
    totalCandidatesEvaluated: number;
    passedHardConstraints: number;
  };
}

export const AgentTraceView: React.FC<AgentTraceViewProps> = ({
  traceSteps,
  coverageStats,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!traceSteps || traceSteps.length === 0) return null;

  const isAgenticRag = traceSteps.some(s => s.phase.startsWith('rag_'));

  return (
    <div className="bg-white border border-neutral-200 mb-8 transition-all">
      {/* Top Banner Bar */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/70 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-neutral-900 text-white flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                Agentic Search Strategy
              </span>
              {isAgenticRag && (
                <span className="text-[11px] font-medium bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Gemini Agentic RAG
                </span>
              )}
              <span className="text-xs text-neutral-500">·</span>
              <span className="text-xs text-emerald-800 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed ({traceSteps.length} steps)
              </span>
            </div>
            <div className="text-xs text-neutral-600 mt-0.5">
              Searched {coverageStats?.favoriteBrandsSearched.length || 0} favorite brand(s) & discovered {coverageStats?.discoveredBrandsSearched.length || 0} aesthetic peers
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto">
          {coverageStats && (
            <div className="hidden lg:flex items-center gap-3 text-xs text-neutral-500 font-mono tabular-nums">
              <span>Evaluated: <strong className="text-neutral-800">{coverageStats.totalCandidatesEvaluated}</strong></span>
              <span>·</span>
              <span>Passed Hard Filter: <strong className="text-neutral-800">{coverageStats.passedHardConstraints}</strong></span>
            </div>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:border-neutral-900 transition-colors"
          >
            <span>{isExpanded ? 'Hide Agent Trace' : 'View Search Transparency'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Step-by-Step Breakdown */}
      {isExpanded && (
        <div className="p-6 space-y-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-neutral-100 text-xs text-neutral-600">
            <div>
              <span className="font-semibold text-neutral-900 block mb-1">
                Favorite Brands Cataloged:
              </span>
              <p className="leading-relaxed">
                {coverageStats?.favoriteBrandsSearched.join(', ') || 'None specified'}
              </p>
            </div>
            <div>
              <span className="font-semibold text-neutral-900 block mb-1">
                Aesthetic Peer Brands Discovered:
              </span>
              <p className="leading-relaxed">
                {coverageStats?.discoveredBrandsSearched.join(', ') || 'None'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {traceSteps.map((step, idx) => (
              <div key={step.id || idx} className="flex items-start gap-3.5 text-xs">
                <div className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-700 font-mono text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  0{idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900">{step.title}</span>
                    <span className="text-neutral-400 font-mono text-[11px]">[{step.phase}]</span>
                  </div>
                  <p className="text-neutral-600 mt-0.5 leading-relaxed">
                    {step.detail}
                  </p>
                  {step.metrics && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] font-mono text-neutral-500">
                      {Object.entries(step.metrics).map(([key, val]) => (
                        <span key={key}>
                          {key}: <strong className="text-neutral-700">{val}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center justify-between">
            <span>Formula: 0.45 query match + 0.25 style + 0.20 brand affinity + 0.10 discovery quality</span>
            <span>Zero hallucinated products or speculative stock claims</span>
          </div>
        </div>
      )}
    </div>
  );
};
