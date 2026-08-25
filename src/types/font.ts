import type { Font as OpentypeFont } from 'opentype.js';

export type FontFormat = 'woff2' | 'woff' | 'ttf' | 'otf';

export interface FontItem {
  id: string;
  originalFileName: string;
  fileName: string;
  originalFormat: FontFormat;
  targetFormat: FontFormat;
  originalSize: number;
  convertedSize: number | null;
  
  // Font OpenType Names
  family: string;
  subfamily: string; // Style: Regular, Bold, Italic, Medium, etc.
  fullName: string;
  postScriptName: string;
  uniqueId: string;
  version: string;
  typographicFamily?: string;
  typographicSubfamily?: string;
  
  // Metrics & Weights
  weight: number; // 100 to 900
  isItalic: boolean;
  isBold: boolean;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  numGlyphs: number;
  
  // Additional info
  copyright?: string;
  designer?: string;
  manufacturer?: string;
  
  // Buffers & Runtime
  originalBuffer: ArrayBuffer;
  convertedBuffer: ArrayBuffer | null;
  parsedFont: OpentypeFont | null;
  fontFaceUrl: string | null;
  fontFaceFamily: string | null;
  
  // UI & Processing status
  status: 'idle' | 'converting' | 'success' | 'error';
  errorMessage?: string;
  isSelected?: boolean;
}

export interface GlyphDetail {
  index: number;
  unicode?: number;
  char?: string;
  unicodeHex?: string;
  name: string;
  category: string;
  advanceWidth: number;
  leftSideBearing?: number;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  pathSvg: string;
  pathCmds: any[];
}

export type CasingOption = 'none' | 'kebab' | 'snake' | 'camel' | 'pascal' | 'title' | 'lower' | 'upper';

export interface BatchRenameConfig {
  unifiedFamily: string;
  updateFamily: boolean;
  findText: string;
  replaceText: string;
  useRegex: boolean;
  fileTemplate: string;
  casing: CasingOption;
  autoDetectWeights: boolean;
  autoGeneratePostScript: boolean;
  syncTypographicNames: boolean;
}

export interface WeightOption {
  value: number;
  label: string;
  keyword: string;
}

export const STANDARD_WEIGHTS: WeightOption[] = [
  { value: 100, label: '100 - Thin / Hairline', keyword: 'Thin' },
  { value: 200, label: '200 - Extra Light / Ultra Light', keyword: 'ExtraLight' },
  { value: 300, label: '300 - Light', keyword: 'Light' },
  { value: 400, label: '400 - Regular / Normal / Book', keyword: 'Regular' },
  { value: 500, label: '500 - Medium', keyword: 'Medium' },
  { value: 600, label: '600 - Semi Bold / Demi Bold', keyword: 'SemiBold' },
  { value: 700, label: '700 - Bold', keyword: 'Bold' },
  { value: 800, label: '800 - Extra Bold / Ultra Bold', keyword: 'ExtraBold' },
  { value: 900, label: '900 - Black / Heavy', keyword: 'Black' },
  { value: 950, label: '950 - Extra Black / Ultra', keyword: 'Ultra' }
];
