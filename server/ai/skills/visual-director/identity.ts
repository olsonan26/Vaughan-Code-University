export interface VisualIdentity {
  styleName: string;
  mood: string;
  realism: string;
  sophistication: string;
  lighting: string;
  texture: string;
  colorTendencies: string;
  typography: string;
  background: string;
  diagramStyle: string;
  preferredMetaphors: string[];
  forbiddenCliches: string[];
  brandElements: string[];
}

export const DEFAULT_VISUAL_IDENTITY: VisualIdentity = {
  styleName: 'Premium Professional Editorial & Educational',
  mood: 'Sophisticated, intelligent, elegant, authoritative, emotionally resonant',
  realism: 'High-end cinematic realism with subtle tactile dimensionality',
  sophistication: 'Polished certification-course level, executive editorial visual design',
  lighting: 'Controlled directional studio and cinematic lighting with soft shadows and rich depth',
  texture: 'Believable materials, tactile surfaces, subtle paper, stone, glass, and metal textures',
  colorTendencies: 'Rich muted earth and jewel tones, disciplined accent colors, controlled contrast',
  typography: 'Clean refined typography, generous safe margins, minimal clear text',
  background: 'Deep subtle negative space, organic dark or soft neutral architectural backdrops',
  diagramStyle: 'Clean geometric structure, high visual hierarchy, disciplined line work',
  preferredMetaphors: [
    'Architectural structures and frameworks',
    'Geometric alignment and balance',
    'Refining raw material into crystalline structure',
    'Light passing through structural prisms',
    'Layered dimensional concepts',
  ],
  forbiddenCliches: [
    'Generic AI art',
    'Stock-photo look',
    'Cartoon clip-art',
    'Excessive neon',
    'Random glowing symbols',
    'Mystical cliches',
    'Zodiac decoration',
    'Fantasy-poster look',
    'Clutter',
    'Oversaturation',
    'Excessive text in image',
    'Cheesy social-graphic look',
    'Bad anatomy',
    'Inaccurate formulas',
  ],
  brandElements: [
    'Vaughan Code University signature dark slate and warm gold color palette',
    'Disciplined negative space',
    'High-contrast focal points',
    'Subtle metallic or architectural accents',
  ],
};
