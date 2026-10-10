import { Brand } from '../types';

export const BRANDS: Brand[] = [
  {
    id: 'cos',
    name: 'COS',
    tier: 'contemporary',
    priceRange: '$90 – $390',
    aestheticSummary: 'Architectural minimalism, sculptural tailoring, and modern silhouettes with Scandinavian restraint.',
    aestheticKeywords: ['Architectural', 'Minimalist', 'Sculptural', 'Monochrome', 'Tailored', 'Clean'],
    origin: 'Stockholm, Sweden',
    website: 'https://www.cos.com',
    similarBrandIds: ['toteme', 'massimo_dutti', 'source_unknown', 'and_other_stories', 'tibi'],
    similarityNotes: {
      toteme: 'Shares clean Nordic minimalism and sculptural tailoring at an accessible contemporary tier.',
      source_unknown: 'Both emphasize architectural volume and asymmetric draped details.',
      massimo_dutti: 'Comparable price tier for sophisticated European office and evening essentials.'
    }
  },
  {
    id: 'toteme',
    name: 'Toteme',
    tier: 'luxury',
    priceRange: '$350 – $1,400',
    aestheticSummary: 'Nordic understated luxury, sharp tailored coats, monochrome uniforms, and pristine draping.',
    aestheticKeywords: ['Understated Luxury', 'Sculptural', 'Nordic', 'Tailored', 'Minimalist', 'Timeless'],
    origin: 'Stockholm, Sweden',
    website: 'https://toteme-studio.com',
    similarBrandIds: ['cos', 'khaite', 'source_unknown', 'tibi', 'massimo_dutti'],
    similarityNotes: {
      cos: 'Toteme represents the ultra-luxury pinnacle of the Scandinavian architectural look championed by COS.',
      khaite: 'Both deliver definitive high-fashion wardrobe anchors with extraordinary fabric weight.',
      source_unknown: 'Source Unknown offers similar structured wrap silhouettes and drapey tailoring at an accessible price.'
    }
  },
  {
    id: 'reformation',
    name: 'Reformation',
    tier: 'contemporary',
    priceRange: '$120 – $450',
    aestheticSummary: 'Effortlessly feminine, figure-skimming silk slips, romantic necklines, and sustainable celebration dresses.',
    aestheticKeywords: ['Romantic', 'Feminine', 'Wedding Guest', 'Silk', 'Slip Dress', 'Flirty'],
    origin: 'Los Angeles, USA',
    website: 'https://www.thereformation.com',
    similarBrandIds: ['sezane', 'rouje', 'dissh', 'staud', 'and_other_stories'],
    similarityNotes: {
      rouje: 'Both excel at romantic vintage-inspired silhouettes and celebration-ready dresses.',
      dissh: 'Dissh brings the same feminine appeal with more subdued Australian neutral linens and knits.',
      sezane: 'Shares the romantic retro sensibility with European craftsmanship.'
    }
  },
  {
    id: 'sezane',
    name: 'Sézane',
    tier: 'contemporary',
    priceRange: '$110 – $380',
    aestheticSummary: 'Parisian chic, romantic vintage-inspired details, tactile knitwear, and effortless French tailoring.',
    aestheticKeywords: ['Parisian Chic', 'Vintage Romantic', 'Tactile', 'Effortless', 'Warm Neutrals'],
    origin: 'Paris, France',
    website: 'https://www.sezane.com',
    similarBrandIds: ['rouje', 'reformation', 'and_other_stories', 'massimo_dutti'],
    similarityNotes: {
      rouje: 'The two definitive pillars of modern Parisian feminine style.',
      and_other_stories: 'Similar accessible price point with Paris atelier design influences.'
    }
  },
  {
    id: 'massimo_dutti',
    name: 'Massimo Dutti',
    tier: 'contemporary',
    priceRange: '$120 – $490',
    aestheticSummary: 'Sophisticated European tailoring, rich wools, fluid silk blends, and understated quiet luxury.',
    aestheticKeywords: ['European Tailoring', 'Understated Luxury', 'Fluid Silhouettes', 'Workwear', 'Timeless'],
    origin: 'Barcelona, Spain',
    website: 'https://www.massimodutti.com',
    similarBrandIds: ['cos', 'toteme', 'aritzia', 'sezane'],
    similarityNotes: {
      toteme: 'Massimo Dutti Studio collection mirrors Toteme’s heavy wools and sharp trench silhouettes at 1/3 the cost.',
      aritzia: 'Both are go-to destinations for non-corporate, effortless office tailoring.'
    }
  },
  {
    id: 'ganni',
    name: 'Ganni',
    tier: 'contemporary',
    priceRange: '$140 – $550',
    aestheticSummary: 'Copenhagen cool, playful proportions, oversized collars, leopard accents, and modern optimistic edge.',
    aestheticKeywords: ['Copenhagen Cool', 'Playful Proportions', 'Statement Details', 'Eclectic', 'Modern'],
    origin: 'Copenhagen, Denmark',
    website: 'https://www.ganni.com',
    similarBrandIds: ['staud', 'and_other_stories', 'reformation'],
    similarityNotes: {
      staud: 'Both blend playful statement shapes with accessible contemporary luxury.',
      and_other_stories: 'Shares the experimental Scandinavian spirit and playful silhouettes.'
    }
  },
  {
    id: 'aritzia',
    name: 'Aritzia',
    tier: 'contemporary',
    priceRange: '$98 – $350',
    aestheticSummary: 'Elevated everyday essentials, iconic slouchy trousers, fluid Japanese crepe, and modern layering.',
    aestheticKeywords: ['Modern Tailoring', 'Effortless Basics', 'Fluid Crepe', 'Versatile', 'Minimal'],
    origin: 'Vancouver, Canada',
    website: 'https://www.aritzia.com',
    similarBrandIds: ['cos', 'massimo_dutti', 'dissh', 'everlane'],
    similarityNotes: {
      cos: 'Similar clean line discipline for modern office and evening separates.',
      dissh: 'Both specialize in relaxed, fluid trousers and understated wardrobe foundations.'
    }
  },
  {
    id: 'and_other_stories',
    name: '& Other Stories',
    tier: 'accessible',
    priceRange: '$60 – $280',
    aestheticSummary: 'Eclectic Parisian and Stockholm design studios, contemporary party dresses, and creative statement pieces.',
    aestheticKeywords: ['Contemporary Eclectic', 'Accessible Chic', 'Creative Details', 'Stockholm Style'],
    origin: 'Stockholm, Sweden',
    website: 'https://www.stories.com',
    similarBrandIds: ['cos', 'sezane', 'ganni', 'reformation'],
    similarityNotes: {
      cos: 'Sister brand with a more eclectic, softer sensibility and accessible pricing.'
    }
  },
  {
    id: 'khaite',
    name: 'Khaite',
    tier: 'luxury',
    priceRange: '$680 – $3,200',
    aestheticSummary: 'Sublime New York modern luxury, sculptural sweetheart necklines, heavy ribbed cashmere, and dramatic volume.',
    aestheticKeywords: ['Modern Luxury', 'Dramatic Silhouettes', 'Sculptural Knitwear', 'Sensual', 'Heirloom'],
    origin: 'New York, USA',
    website: 'https://khaite.com',
    similarBrandIds: ['toteme', 'tibi', 'nanushka', 'source_unknown'],
    similarityNotes: {
      toteme: 'Top-tier peers in minimalist luxury with supreme sculptural craftsmanship.',
      source_unknown: 'Provides directional asymmetric silhouettes with a similar moody, high-end editorial vibe.'
    }
  },
  {
    id: 'staud',
    name: 'Staud',
    tier: 'contemporary',
    priceRange: '$195 – $595',
    aestheticSummary: 'Sculptural statement bags, retro-chic color-blocking, sharp asymmetric necklines, and California modernism.',
    aestheticKeywords: ['Sculptural Bags', 'Retro Modern', 'Bold Lines', 'Architectural Leather'],
    origin: 'Los Angeles, USA',
    website: 'https://staud.clothing',
    similarBrandIds: ['polene', 'ganni', 'reformation'],
    similarityNotes: {
      polene: 'Both specialize in iconic, architectural leather accessories with distinctive organic curves.'
    }
  },
  {
    id: 'polene',
    name: 'Polène',
    tier: 'accessible_luxury',
    priceRange: '$380 – $680',
    aestheticSummary: 'Handcrafted Parisian leather goods, sculptural undulating folds, certified Italian tanneries, timeless organic shapes.',
    aestheticKeywords: ['Sculptural Leather', 'Parisian Craftsmanship', 'Understated Luxury', 'Organic Curves'],
    origin: 'Paris, France',
    website: 'https://polene-paris.com',
    similarBrandIds: ['staud', 'toteme', 'massimo_dutti'],
    similarityNotes: {
      toteme: 'Shares the clean, logo-free sculptural leather aesthetic coveted by minimalist shoppers.'
    }
  },
  {
    id: 'dissh',
    name: 'Dissh',
    tier: 'accessible',
    priceRange: '$90 – $260',
    aestheticSummary: 'Australian relaxed luxury, breezy neutral linens, buttery ribbed knit dresses, and coastal minimalism.',
    aestheticKeywords: ['Minimalist Resort', 'Ribbed Knitwear', 'Neutral Palette', 'Relaxed Chic', 'Accessible'],
    origin: 'Brisbane, Australia',
    website: 'https://dissh.com',
    similarBrandIds: ['reformation', 'aritzia', 'cos'],
    similarityNotes: {
      reformation: 'A more neutral, laid-back alternative to Reformation with exceptional linen and knit midi dresses.'
    }
  },
  {
    id: 'rouje',
    name: 'Rouje',
    tier: 'contemporary',
    priceRange: '$140 – $380',
    aestheticSummary: 'The quintessential Parisienne wardrobe: retro tea dresses, delicate prints, and effortless sensuality by Jeanne Damas.',
    aestheticKeywords: ['French Chic', 'Vintage Floral', 'Tea Dress', 'Sensual', 'Parisian'],
    origin: 'Paris, France',
    website: 'https://rouje.com',
    similarBrandIds: ['sezane', 'reformation'],
    similarityNotes: {
      sezane: 'Direct aesthetic sibling in authentic vintage-inspired French dressing.'
    }
  },
  {
    id: 'tibi',
    name: 'Tibi',
    tier: 'accessible_luxury',
    priceRange: '$395 – $995',
    aestheticSummary: 'Chill, Modern, Classic (CMC): deliberate asymmetry, pragmatic luxury, architectural cuts, and relaxed balance.',
    aestheticKeywords: ['Architectural', 'Pragmatic Luxury', 'Asymmetric', 'Modern Classic', 'Deliberate'],
    origin: 'New York, USA',
    website: 'https://tibi.com',
    similarBrandIds: ['toteme', 'cos', 'source_unknown'],
    similarityNotes: {
      toteme: 'Both cater to the discerning woman seeking deliberate, non-cookie-cutter tailoring.'
    }
  },
  {
    id: 'source_unknown',
    name: 'Source Unknown',
    tier: 'contemporary',
    priceRange: '$110 – $340',
    aestheticSummary: 'Directional Seoul & LA minimalism, deconstructed tailoring, architectural asymmetric hems, and edgy restraint.',
    aestheticKeywords: ['Architectural Drapes', 'Asymmetric', 'Deconstructed', 'Minimalist', 'Cult Following'],
    origin: 'Los Angeles / Seoul',
    website: 'https://thesourceunknown.com',
    similarBrandIds: ['cos', 'toteme', 'tibi'],
    similarityNotes: {
      toteme: 'Discovered brand that captures Toteme-style high-concept silhouettes at an approachable price tier.',
      cos: 'Offers more adventurous asymmetric drapes for shoppers who love COS minimalism.'
    }
  },
  {
    id: 'everlane',
    name: 'Everlane',
    tier: 'accessible',
    priceRange: '$75 – $240',
    aestheticSummary: 'Radically transparent wardrobe foundations, clean drape trousers, classic wool outerwear, and everyday ease.',
    aestheticKeywords: ['Wardrobe Essentials', 'Clean Casual', 'Ethical Fashion', 'Relaxed Fit'],
    origin: 'San Francisco, USA',
    website: 'https://www.everlane.com',
    similarBrandIds: ['aritzia', 'cos'],
    similarityNotes: {
      aritzia: 'Reliable, accessible essentials for work and everyday with clean tailoring.'
    }
  },
  {
    id: 'nanushka',
    name: 'Nanushka',
    tier: 'accessible_luxury',
    priceRange: '$380 – $980',
    aestheticSummary: 'Budapest bohemian craftsmanship, buttery alt-leather, fluid draping, and sensual modern elegance.',
    aestheticKeywords: ['Bohemian Luxury', 'Alt-Leather', 'Draped Silhouettes', 'Sensual Tailoring'],
    origin: 'Budapest, Hungary',
    website: 'https://www.nanushka.com',
    similarBrandIds: ['toteme', 'khaite'],
    similarityNotes: {
      toteme: 'Supplies high-tactility luxury pieces that seamlessly integrate with a minimalist wardrobe.'
    }
  }
];
