import type { Font as OpentypeFont } from 'opentype.js';
import { CasingOption } from '../types/font';

export interface ExtractedFontMetadata {
  family: string;
  subfamily: string;
  fullName: string;
  postScriptName: string;
  uniqueId: string;
  version: string;
  weight: number;
  isItalic: boolean;
  isBold: boolean;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  numGlyphs: number;
  copyright?: string;
  designer?: string;
  manufacturer?: string;
}

export function cleanFontString(str?: string): string {
  if (!str) return '';
  return str.replace(/\0/g, '').trim();
}

export function detectWeightAndStyle(
  fileName: string,
  existingFamily?: string,
  existingSubfamily?: string
): { weight: number; styleName: string; isItalic: boolean; isBold: boolean } {
  const combined = `${fileName} ${existingFamily || ''} ${existingSubfamily || ''}`.toLowerCase();
  
  const isItalic = /italic|oblique|obl/i.test(combined);
  let weight = 400;
  let weightName = 'Regular';

  if (/thin|hairline/i.test(combined)) {
    weight = 100;
    weightName = 'Thin';
  } else if (/extra[\s_-]?light|ultra[\s_-]?light/i.test(combined)) {
    weight = 200;
    weightName = 'ExtraLight';
  } else if (/light/i.test(combined)) {
    weight = 300;
    weightName = 'Light';
  } else if (/extra[\s_-]?(black|ultra)|ultra[\s_-]?black/i.test(combined)) {
    weight = 950;
    weightName = 'ExtraBlack';
  } else if (/extra[\s_-]?bold|ultra[\s_-]?bold/i.test(combined)) {
    weight = 800;
    weightName = 'ExtraBold';
  } else if (/semi[\s_-]?bold|demi[\s_-]?bold/i.test(combined)) {
    weight = 600;
    weightName = 'SemiBold';
  } else if (/ultra/i.test(combined)) {
    weight = 950;
    weightName = 'Ultra';
  } else if (/black|heavy/i.test(combined)) {
    weight = 900;
    weightName = 'Black';
  } else if (/bold/i.test(combined)) {
    weight = 700;
    weightName = 'Bold';
  } else if (/medium/i.test(combined)) {
    weight = 500;
    weightName = 'Medium';
  } else if (/book|regular|normal|roman|plain/i.test(combined)) {
    weight = 400;
    weightName = 'Regular';
  }

  const isBold = weight >= 700;
  
  let finalStyle = weightName;
  if (isItalic) {
    finalStyle = weightName === 'Regular' ? 'Italic' : `${weightName} Italic`;
  }

  return { weight, styleName: finalStyle, isItalic, isBold };
}

export function sanitizePostScriptName(name: string): string {
  return name
    .replace(/[^\w-]/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, 63) || 'Font-Regular';
}

export function applyCasing(text: string, casing: CasingOption): string {
  if (!text) return text;
  
  const words = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  switch (casing) {
    case 'kebab':
      return words.map(w => w.toLowerCase()).join('-');
    case 'snake':
      return words.map(w => w.toLowerCase()).join('_');
    case 'camel':
      return words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    case 'pascal':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    case 'title':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    case 'lower':
      return words.map(w => w.toLowerCase()).join(' ');
    case 'upper':
      return words.map(w => w.toUpperCase()).join(' ');
    case 'none':
    default:
      return text;
  }
}

export function formatFileName(
  template: string,
  vars: { family: string; style: string; weight: number | string; psname: string; ext: string },
  casing: CasingOption = 'none'
): string {
  let name = template
    .replace(/\{family\}/gi, vars.family)
    .replace(/\{style\}/gi, vars.style)
    .replace(/\{weight\}/gi, String(vars.weight))
    .replace(/\{psname\}/gi, vars.psname);

  if (casing !== 'none') {
    name = applyCasing(name, casing);
  }

  name = name.replace(/[<>:"/\\|?*]/g, '').trim();
  if (!name) name = 'font';
  
  return `${name}.${vars.ext}`;
}

export function extractMetadataFromParsedFont(
  font: OpentypeFont,
  fileName: string
): ExtractedFontMetadata {
  const namesObj = font.names as any;
  const win = namesObj?.windows;
  const mac = namesObj?.macintosh;
  const uni = namesObj?.unicode;

  const getRawName = (field: string): string => {
    const val = win?.[field]?.en || mac?.[field]?.en || uni?.[field]?.en || 
                namesObj?.[field]?.en || namesObj?.[field];
    return cleanFontString(typeof val === 'string' ? val : '');
  };

  let family = getRawName('fontFamily') || getRawName('preferredFamily') || getRawName('wwsFamily');
  let subfamily = getRawName('fontSubfamily') || getRawName('preferredSubfamily') || getRawName('wwsSubfamily');
  let fullName = getRawName('fullName');
  let postScriptName = getRawName('postScriptName');
  let uniqueId = getRawName('uniqueID') || `1.000;TypeForge;${postScriptName || 'font'}`;
  let version = getRawName('version') || 'Version 1.000';
  let copyright = getRawName('copyright');
  let designer = getRawName('designer');
  let manufacturer = getRawName('manufacturer');

  if (!family || family.length < 2) {
    const base = fileName.replace(/\.(woff2|woff|ttf|otf)$/i, '');
    family = base.replace(/-(regular|bold|italic|black|light|medium|thin|heavy)/i, '').trim() || 'Custom Font';
  }

  const detected = detectWeightAndStyle(fileName, family, subfamily);
  if (!subfamily || subfamily === ' ') {
    subfamily = detected.styleName;
  }

  const weight = font.tables.os2?.usWeightClass || detected.weight;
  const isItalic = (font.tables.os2?.fsSelection && (font.tables.os2.fsSelection & 1) !== 0) || detected.isItalic;
  const isBold = weight >= 700 || detected.isBold;

  if (!fullName) {
    fullName = `${family} ${subfamily}`.trim();
  }
  if (!postScriptName) {
    postScriptName = sanitizePostScriptName(`${family}-${subfamily}`);
  }

  return {
    family,
    subfamily,
    fullName,
    postScriptName,
    uniqueId,
    version,
    weight,
    isItalic,
    isBold,
    unitsPerEm: font.unitsPerEm || 1000,
    ascender: font.ascender || 800,
    descender: font.descender || -200,
    numGlyphs: font.glyphs ? font.glyphs.length : 0,
    copyright,
    designer,
    manufacturer
  };
}

export function updateFontMetadata(
  font: OpentypeFont,
  meta: {
    family: string;
    subfamily: string;
    fullName?: string;
    postScriptName?: string;
    uniqueId?: string;
    version?: string;
    weight?: number;
    isItalic?: boolean;
    isBold?: boolean;
    copyright?: string;
    designer?: string;
    manufacturer?: string;
  }
): ArrayBuffer {
  const family = meta.family.trim();
  const subfamily = meta.subfamily.trim();
  const fullName = meta.fullName?.trim() || `${family} ${subfamily}`.trim();
  const postScriptName = sanitizePostScriptName(meta.postScriptName?.trim() || `${family}-${subfamily}`);
  const uniqueId = meta.uniqueId?.trim() || `1.000;TypeForge;${postScriptName}`;
  const version = meta.version?.trim() || 'Version 1.000';
  const weight = meta.weight !== undefined ? meta.weight : 400;
  const isItalic = meta.isItalic ?? false;
  const isBold = meta.isBold ?? (weight >= 700);

  const nameEntries: Record<string, { en: string }> = {
    fontFamily: { en: family },
    fontSubfamily: { en: subfamily },
    fullName: { en: fullName },
    postScriptName: { en: postScriptName },
    uniqueID: { en: uniqueId },
    version: { en: version },
    preferredFamily: { en: family },
    preferredSubfamily: { en: subfamily },
    wwsFamily: { en: family },
    wwsSubfamily: { en: subfamily }
  };

  if (meta.copyright) nameEntries.copyright = { en: meta.copyright };
  if (meta.designer) nameEntries.designer = { en: meta.designer };
  if (meta.manufacturer) nameEntries.manufacturer = { en: meta.manufacturer };

  // Set names on both windows and macintosh platforms
  (font as any).names = {
    macintosh: { ...nameEntries },
    windows: { ...nameEntries }
  };

  // Update OS/2 table
  if (font.tables.os2) {
    font.tables.os2.usWeightClass = weight;
    
    let fsSelection = 0;
    if (isItalic) fsSelection |= 1; // bit 0: ITALIC
    if (isBold) fsSelection |= 32; // bit 5: BOLD
    if (!isItalic && !isBold && weight === 400) fsSelection |= 64; // bit 6: REGULAR
    fsSelection |= 128; // bit 7: USE_TYPO_METRICS
    fsSelection |= 256; // bit 8: WWS
    font.tables.os2.fsSelection = fsSelection;
  }

  // Update head table
  if (font.tables.head) {
    let macStyle = 0;
    if (isBold) macStyle |= 1; // bit 0: Bold
    if (isItalic) macStyle |= 2; // bit 1: Italic
    font.tables.head.macStyle = macStyle;
  }

  return font.toArrayBuffer();
}
