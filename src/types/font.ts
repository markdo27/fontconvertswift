import type { Font as OpentypeFont } from 'opentype.js';
import type { OutlineFlavor } from '../lib/sfnt';

export type FontFormat = 'woff2' | 'woff' | 'ttf' | 'otf';

export const FONT_FORMATS: FontFormat[] = ['woff2', 'woff', 'ttf', 'otf'];

/** The name-table fields the editor exposes, beyond family and style. */
export interface FontNameFields {
  fullName: string;
  postScriptName: string;
  uniqueId: string;
  version: string;
  copyright: string;
  trademark: string;
  designer: string;
  manufacturer: string;
  description: string;
  designerURL: string;
  vendorURL: string;
  license: string;
  licenseURL: string;
}

export interface FontItem {
  id: string;
  originalFileName: string;
  fileName: string;

  /** The container the file arrived in. */
  originalFormat: FontFormat;
  targetFormat: FontFormat;
  /** Whether the glyphs are TrueType (`glyf`) or PostScript (`CFF `) outlines. */
  outlineFlavor: OutlineFlavor;

  originalSize: number;
  convertedSize: number | null;

  // OpenType names
  family: string;
  subfamily: string;
  names: FontNameFields;

  // Metrics and weights
  weight: number;
  isItalic: boolean;
  isBold: boolean;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  numGlyphs: number;
  tableTags: string[];

  /**
   * The decompressed sfnt for the font as it currently stands, including any
   * metadata edits. Every conversion and download is built from this.
   */
  sfntBuffer: ArrayBuffer;
  /** The sfnt exactly as loaded, so edits can always be reverted. */
  originalSfntBuffer: ArrayBuffer;
  convertedBuffer: ArrayBuffer | null;

  /** Parsed form, used only for glyph inspection and previews. */
  parsedFont: OpentypeFont | null;
  fontFaceFamily: string | null;

  status: 'idle' | 'converting' | 'success' | 'error';
  errorMessage?: string;
  isSelected: boolean;
  /** True once the metadata has been edited away from the loaded file. */
  isEdited: boolean;
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
}

export type CasingOption =
  | 'none'
  | 'kebab'
  | 'snake'
  | 'camel'
  | 'pascal'
  | 'title'
  | 'lower'
  | 'upper';

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

/** The desktop container that matches a font's outline flavour. */
export function nativeDesktopFormat(flavor: OutlineFlavor): FontFormat {
  return flavor === 'cff' ? 'otf' : 'ttf';
}

/**
 * True when the chosen container misrepresents the outlines inside, e.g. a
 * CFF font handed out as `.ttf`. The file still works, but the extension lies.
 */
export function isMislabelledContainer(flavor: OutlineFlavor, target: FontFormat): boolean {
  if (target !== 'ttf' && target !== 'otf') return false;
  return target !== nativeDesktopFormat(flavor);
}
