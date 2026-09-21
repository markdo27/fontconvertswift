import {
  NAME_ID,
  applyNameEdits,
  buildNameTable,
  buildSfnt,
  getTable,
  parseNameTable,
  parseSfnt,
  patchHead,
  patchOs2,
  readName,
  readOs2,
  setTable
} from './sfnt';
import type { CasingOption, FontNameFields } from '../types/font';

export interface ExtractedFontMetadata {
  family: string;
  subfamily: string;
  names: FontNameFields;
  weight: number;
  isItalic: boolean;
  isBold: boolean;
}

export function cleanFontString(value?: string): string {
  if (!value) return '';
  return value.replace(/\0/g, '').trim();
}

export function detectWeightAndStyle(
  fileName: string,
  existingFamily?: string,
  existingSubfamily?: string
): { weight: number; styleName: string; isItalic: boolean; isBold: boolean } {
  const combined = `${fileName} ${existingFamily || ''} ${existingSubfamily || ''}`.toLowerCase();

  const isItalic = /italic|oblique|obl\b/i.test(combined);
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

/**
 * PostScript names may only use printable ASCII minus `[](){}<>/%` and space,
 * and are capped at 63 characters.
 */
export function sanitizePostScriptName(name: string): string {
  return (
    name
      .replace(/\s+/g, '')
      .replace(/[^\x21-\x7E]/g, '')
      .replace(/[[\](){}<>/%]/g, '')
      .slice(0, 63) || 'Font-Regular'
  );
}

export function applyCasing(text: string, casing: CasingOption): string {
  if (!text) return text;

  const words = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  switch (casing) {
    case 'kebab':
      return words.map((w) => w.toLowerCase()).join('-');
    case 'snake':
      return words.map((w) => w.toLowerCase()).join('_');
    case 'camel':
      return words
        .map((w, i) =>
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        )
        .join('');
    case 'pascal':
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    case 'title':
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    case 'lower':
      return words.map((w) => w.toLowerCase()).join(' ');
    case 'upper':
      return words.map((w) => w.toUpperCase()).join(' ');
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

export function emptyNameFields(): FontNameFields {
  return {
    fullName: '',
    postScriptName: '',
    uniqueId: '',
    version: '',
    copyright: '',
    trademark: '',
    designer: '',
    manufacturer: '',
    description: '',
    designerURL: '',
    vendorURL: '',
    license: '',
    licenseURL: ''
  };
}

/**
 * Reads metadata straight out of the font's `name`, `OS/2` and `head` tables.
 * Nothing here depends on a font parser's ability to *rewrite* the font.
 */
export function readMetadataFromSfnt(
  sfntBuffer: ArrayBuffer,
  fileName: string
): ExtractedFontMetadata {
  const sfnt = parseSfnt(sfntBuffer);
  const records = parseNameTable(getTable(sfnt, 'name') || new Uint8Array(0));
  const get = (id: number) => cleanFontString(readName(records, id));

  let family = get(NAME_ID.fontFamily) || get(NAME_ID.preferredFamily) || get(NAME_ID.wwsFamily);
  let subfamily =
    get(NAME_ID.fontSubfamily) || get(NAME_ID.preferredSubfamily) || get(NAME_ID.wwsSubfamily);

  if (!family || family.length < 2) {
    const base = fileName.replace(/\.(woff2|woff|ttf|otf|ttc|otc)$/i, '');
    family =
      base.replace(/[-_](regular|bold|italic|black|light|medium|thin|heavy)$/i, '').trim() ||
      'Custom Font';
  }

  const detected = detectWeightAndStyle(fileName, family, subfamily);
  if (!subfamily) subfamily = detected.styleName;

  const os2 = readOs2(getTable(sfnt, 'OS/2'));
  const weight = os2?.usWeightClass || detected.weight;
  const isItalic = os2 ? (os2.fsSelection & 1) !== 0 : detected.isItalic;
  const isBold = os2 ? (os2.fsSelection & 32) !== 0 : detected.isBold;

  const names: FontNameFields = {
    fullName: get(NAME_ID.fullName) || `${family} ${subfamily}`.trim(),
    postScriptName: get(NAME_ID.postScriptName) || sanitizePostScriptName(`${family}-${subfamily}`),
    uniqueId: get(NAME_ID.uniqueID),
    version: get(NAME_ID.version) || 'Version 1.000',
    copyright: get(NAME_ID.copyright),
    trademark: get(NAME_ID.trademark),
    designer: get(NAME_ID.designer),
    manufacturer: get(NAME_ID.manufacturer),
    description: get(NAME_ID.description),
    designerURL: get(NAME_ID.designerURL),
    vendorURL: get(NAME_ID.vendorURL),
    license: get(NAME_ID.license),
    licenseURL: get(NAME_ID.licenseURL)
  };

  return { family, subfamily, names, weight, isItalic, isBold };
}

export interface MetadataPatch {
  family?: string;
  subfamily?: string;
  weight?: number;
  isItalic?: boolean;
  isBold?: boolean;
  names?: Partial<FontNameFields>;
}

/**
 * Rewrites the `name`, `OS/2` and `head` tables of an sfnt and leaves every
 * other table byte-for-byte identical.
 *
 * `undefined` fields are left alone, so a caller that only renames a family
 * cannot wipe the designer, licence or trademark by omission. Passing an
 * explicit empty string clears that entry.
 */
export function writeMetadataToSfnt(sfntBuffer: ArrayBuffer, patch: MetadataPatch): ArrayBuffer {
  const sfnt = parseSfnt(sfntBuffer);
  const records = parseNameTable(getTable(sfnt, 'name') || new Uint8Array(0));

  const edits = new Map<number, string>();
  const put = (id: number, value: string | undefined) => {
    if (value === undefined) return;
    edits.set(id, value.trim());
  };

  const family = patch.family?.trim();
  const subfamily = patch.subfamily?.trim();

  if (family !== undefined) {
    put(NAME_ID.fontFamily, family);
    put(NAME_ID.preferredFamily, family);
    put(NAME_ID.wwsFamily, family);
  }
  if (subfamily !== undefined) {
    put(NAME_ID.fontSubfamily, subfamily);
    put(NAME_ID.preferredSubfamily, subfamily);
    put(NAME_ID.wwsSubfamily, subfamily);
  }

  const names = patch.names || {};
  put(NAME_ID.fullName, names.fullName);
  put(NAME_ID.uniqueID, names.uniqueId);
  put(NAME_ID.version, names.version);
  put(NAME_ID.copyright, names.copyright);
  put(NAME_ID.trademark, names.trademark);
  put(NAME_ID.manufacturer, names.manufacturer);
  put(NAME_ID.designer, names.designer);
  put(NAME_ID.description, names.description);
  put(NAME_ID.vendorURL, names.vendorURL);
  put(NAME_ID.designerURL, names.designerURL);
  put(NAME_ID.license, names.license);
  put(NAME_ID.licenseURL, names.licenseURL);

  if (names.postScriptName !== undefined) {
    put(NAME_ID.postScriptName, sanitizePostScriptName(names.postScriptName));
  }

  if (edits.size > 0) {
    setTable(sfnt, 'name', buildNameTable(applyNameEdits(records, edits)));
  }

  const os2Data = getTable(sfnt, 'OS/2');
  if (os2Data && (patch.weight !== undefined || patch.isBold !== undefined || patch.isItalic !== undefined)) {
    setTable(
      sfnt,
      'OS/2',
      patchOs2(os2Data, {
        usWeightClass: patch.weight,
        isBold: patch.isBold,
        isItalic: patch.isItalic
      })
    );
  }

  const headData = getTable(sfnt, 'head');
  if (headData && (patch.isBold !== undefined || patch.isItalic !== undefined)) {
    setTable(sfnt, 'head', patchHead(headData, { isBold: patch.isBold, isItalic: patch.isItalic }));
  }

  return buildSfnt(sfnt);
}
