import type { Font as OpentypeFont } from 'opentype.js';
import type { GlyphDetail } from '../types/font';

export interface UnicodeCategory {
  id: string;
  name: string;
  count?: number;
}

export const UNICODE_CATEGORIES: UnicodeCategory[] = [
  { id: 'all', name: 'All Glyphs' },
  { id: 'ascii', name: 'Basic Latin (ASCII)' },
  { id: 'latin1', name: 'Latin-1 Supplement' },
  { id: 'latinExt', name: 'Latin Extended' },
  { id: 'digits', name: 'Digits & Numbers' },
  { id: 'punctuation', name: 'Punctuation' },
  { id: 'symbols', name: 'Currency & Symbols' },
  { id: 'greek', name: 'Greek' },
  { id: 'cyrillic', name: 'Cyrillic' },
  { id: 'other', name: 'Other / Unmapped' },
];

export function getUnicodeCategory(code?: number): string {
  if (code === undefined || isNaN(code)) return 'other';
  
  if (code >= 0x0030 && code <= 0x0039) return 'digits';
  if ((code >= 0x0020 && code <= 0x002F) || (code >= 0x003A && code <= 0x0040) || 
      (code >= 0x005B && code <= 0x0060) || (code >= 0x007B && code <= 0x007E) ||
      (code >= 0x2000 && code <= 0x206F)) {
    return 'punctuation';
  }
  if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) {
    return 'ascii';
  }
  if (code >= 0x00A0 && code <= 0x00FF) return 'latin1';
  if (code >= 0x0100 && code <= 0x024F) return 'latinExt';
  if (code >= 0x0370 && code <= 0x03FF) return 'greek';
  if (code >= 0x0400 && code <= 0x04FF) return 'cyrillic';
  if ((code >= 0x20A0 && code <= 0x20CF) || (code >= 0x2100 && code <= 0x23FF)) return 'symbols';
  
  return 'other';
}

export function extractGlyphsFromFont(font: OpentypeFont): GlyphDetail[] {
  const glyphsList: GlyphDetail[] = [];
  const numGlyphs = font.glyphs ? font.glyphs.length : 0;
  
  for (let i = 0; i < numGlyphs; i++) {
    const glyph = font.glyphs.get(i);
    if (!glyph) continue;
    
    const unicode = glyph.unicode;
    const char = unicode !== undefined ? String.fromCodePoint(unicode) : undefined;
    const unicodeHex = unicode !== undefined ? `U+${unicode.toString(16).toUpperCase().padStart(4, '0')}` : undefined;
    const category = getUnicodeCategory(unicode);
    
    let pathSvg = '';
    try {
      const p = glyph.getPath(0, 0, 72);
      pathSvg = p.toPathData(2);
    } catch {
      pathSvg = '';
    }
    
    glyphsList.push({
      index: i,
      unicode,
      char,
      unicodeHex,
      name: glyph.name || `glyph_${i}`,
      category,
      advanceWidth: glyph.advanceWidth || 0,
      leftSideBearing: glyph.leftSideBearing,
      xMin: glyph.xMin,
      xMax: glyph.xMax,
      yMin: glyph.yMin,
      yMax: glyph.yMax,
      pathSvg,
      pathCmds: glyph.path ? glyph.path.commands : []
    });
  }
  
  return glyphsList;
}

export const SAMPLE_PANGRAMS = [
  { label: 'English - Fox (Classic)', text: 'The quick brown fox jumps over the lazy dog.' },
  { label: 'English - Sphinx', text: 'Sphinx of black quartz, judge my vow.' },
  { label: 'English - Jackdaws', text: 'Jackdaws love my big sphinx of quartz.' },
  { label: 'Numbers & Currency', text: '$123,456,789.00 \u20ac98.50 \u00a345.20 \u00a512,000 50% off + - * / = @ #' },
  { label: 'Alphabet Uppercase', text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { label: 'Alphabet Lowercase', text: 'abcdefghijklmnopqrstuvwxyz' },
  { label: 'French', text: "Voix ambigu\u00eb d'un c\u0153ur qui au z\u00e9phyr pr\u00e9f\u00e8re les jattes de kiwis." },
  { label: 'German', text: 'Victor jagt zw\u00f6lf Boxk\u00e4mpfer quer \u00fcber den gro\u00dfen Sylter Deich.' },
  { label: 'Spanish', text: 'El veloz murci\u00e9lago hind\u00fa com\u00eda feliz cardillo y kiwi. La cig\u00fce\u00f1a tocaba el saxof\u00f3n.' },
  { label: 'Vietnamese', text: 'Do\u00e3n Ho\u00e0ng C\u01b0\u01a1ng m\u00ea \u0111\u1eafm ti\u1ebfng \u0111\u00e0n violon v\u00e0 say s\u01b0a h\u00e1t kh\u00fac ca \u00eam d\u1ecbu.' },
  { label: 'Cyrillic', text: '\u0421\u044a\u0435\u0448\u044c \u0436\u0435 \u0435\u0449\u0451 \u044d\u0442\u0438\u0445 \u043c\u044f\u0433\u043a\u0438\u0445 \u0444\u0440\u0430\u043d\u0446\u0443\u0437\u0441\u043a\u0438\u0445 \u0431\u0443\u043b\u043e\u043a, \u0434\u0430 \u0432\u044b\u043f\u0435\u0439 \u0447\u0430\u044e.' },
  { label: 'Symbols & Punctuation', text: '\u201cHello, World!\u201d (100% [True] / {False}) <Tag> & &amp; * ~ ^ ` _ | \\ ? !' },
];
