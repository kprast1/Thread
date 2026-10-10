import React, { useState } from 'react';
import { BRANDS } from '../data/brands';
import { UserPreferences } from '../types';
import { Check, X, ArrowRight, Sparkles, SlidersHorizontal } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSavePreferences: (updated: UserPreferences) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [favoriteBrandIds, setFavoriteBrandIds] = useState<string[]>(
    preferences.favoriteBrandIds.length > 0 ? preferences.favoriteBrandIds : ['cos', 'toteme', 'reformation']
  );
  const [sizes, setSizes] = useState<string[]>(preferences.sizes || ['S', 'M']);
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>(preferences.currency || 'USD');
  const [maxBudget, setMaxBudget] = useState<number | undefined>(preferences.priceBudget?.max || 400);
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>(
    preferences.styleAesthetics.length > 0
      ? preferences.styleAesthetics
      : ['Minimalist & Architectural', 'Understated Luxury', 'Relaxed Tailoring']
  );
  const [excludedMaterials, setExcludedMaterials] = useState<string[]>(
    preferences.excludedMaterials || ['Polyester']
  );
  const [brandSearch, setBrandSearch] = useState('');

  if (!isOpen) return null;

  const toggleBrand = (id: string) => {
    if (favoriteBrandIds.includes(id)) {
      setFavoriteBrandIds(favoriteBrandIds.filter(b => b !== id));
    } else {
      setFavoriteBrandIds([...favoriteBrandIds, id]);
    }
  };

  const toggleAesthetic = (aesthetic: string) => {
    if (selectedAesthetics.includes(aesthetic)) {
      setSelectedAesthetics(selectedAesthetics.filter(a => a !== aesthetic));
    } else {
      setSelectedAesthetics([...selectedAesthetics, aesthetic]);
    }
  };

  const toggleSize = (size: string) => {
    if (sizes.includes(size)) {
      setSizes(sizes.filter(s => s !== size));
    } else {
      setSizes([...sizes, size]);
    }
  };

  const toggleExcludedMaterial = (mat: string) => {
    if (excludedMaterials.includes(mat)) {
      setExcludedMaterials(excludedMaterials.filter(m => m !== mat));
    } else {
      setExcludedMaterials([...excludedMaterials, mat]);
    }
  };

  const handleFinish = () => {
    onSavePreferences({
      ...preferences,
      favoriteBrandIds,
      sizes,
      currency,
      priceBudget: { max: maxBudget },
      styleAesthetics: selectedAesthetics,
      excludedMaterials,
    });
    onClose();
  };

  const filteredBrands = BRANDS.filter(b =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
    b.aestheticSummary.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const availableAesthetics = [
    'Minimalist & Architectural',
    'Understated Luxury',
    'Parisian Chic',
    'Relaxed Tailoring',
    'Modern Feminine',
    'Minimalist Resort',
  ];

  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2', '4', '6', '8'];
  const commonMaterialsToAvoid = ['Polyester', 'Synthetic Leather', 'Acrylic', 'Viscose'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FCFCFB] text-[#191919] w-full max-w-2xl border border-neutral-300 shadow-2xl rounded-none p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-200 pb-5 mb-6">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">
              Personalized Discovery · Step {step} of 2
            </div>
            <h2 className="text-2xl font-editorial tracking-tight font-medium">
              {step === 1 ? 'Curate Your Favorite Brands' : 'Fine-Tune Style & Constraints'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Brands */}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-sm text-neutral-600 leading-relaxed">
              Select brands that define your aesthetic. The agent searches these first and uses them to discover emerging labels with matching design principles.
            </p>

            <div className="relative">
              <input
                type="text"
                placeholder="Search brands (e.g. COS, Toteme, Sézane)..."
                value={brandSearch}
                onChange={e => setBrandSearch(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-white border border-neutral-300 focus:outline-hidden focus:border-neutral-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredBrands.map(brand => {
                const isSelected = favoriteBrandIds.includes(brand.id);
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => toggleBrand(brand.id)}
                    className={`flex items-start justify-between p-3 text-left border transition-all ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{brand.name}</div>
                      <div className={`text-xs mt-0.5 line-clamp-1 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {brand.aestheticKeywords.slice(0, 3).join(' · ')}
                      </div>
                      <div className={`text-[11px] font-mono mt-1 ${isSelected ? 'text-neutral-400' : 'text-neutral-400'}`}>
                        {brand.priceRange}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-white bg-white text-neutral-900'
                          : 'border-neutral-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-3" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <span className="text-xs text-neutral-500">
                {favoriteBrandIds.length} brand{favoriteBrandIds.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                >
                  <span>Continue to Preferences</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Aesthetics */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
                Aesthetic Directives
              </label>
              <div className="flex flex-wrap gap-2">
                {availableAesthetics.map(aes => {
                  const active = selectedAesthetics.includes(aes);
                  return (
                    <button
                      key={aes}
                      type="button"
                      onClick={() => toggleAesthetic(aes)}
                      className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {aes}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sizes & Budget Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
                  Typical Sizes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {sizeOptions.map(size => {
                    const active = sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`w-9 h-9 text-xs font-mono font-medium border transition-colors flex items-center justify-center ${
                          active
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
                  Default Target Budget Ceiling
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-neutral-500">$</span>
                  <input
                    type="number"
                    value={maxBudget || ''}
                    onChange={e => setMaxBudget(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="e.g. 350"
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-neutral-300 focus:outline-hidden focus:border-neutral-900"
                  />
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as any)}
                    className="px-3 py-2 text-xs font-mono bg-white border border-neutral-300 focus:outline-hidden focus:border-neutral-900"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Avoided Materials */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Fabrics or Materials to Exclude
              </label>
              <p className="text-xs text-neutral-500 mb-2">
                Items composed of these materials will be excluded by the agent's hard constraint filter.
              </p>
              <div className="flex flex-wrap gap-2">
                {commonMaterialsToAvoid.map(mat => {
                  const active = excludedMaterials.includes(mat);
                  return (
                    <button
                      key={mat}
                      type="button"
                      onClick={() => toggleExcludedMaterial(mat)}
                      className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-red-900 text-white border-red-900'
                          : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-600'
                      }`}
                    >
                      {active ? `✕ Exclude ${mat}` : `Exclude ${mat}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-neutral-600 hover:text-neutral-900 underline"
              >
                Back to Brands
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-neutral-900 hover:bg-neutral-800 transition-colors"
              >
                Save Profile & Start Discovery
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
