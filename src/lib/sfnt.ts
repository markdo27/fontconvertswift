/**
 * Byte-level SFNT (TrueType / OpenType) toolkit.
 *
 * Everything here works directly on the font's table directory so that editing
 * metadata rewrites *only* the tables that changed. Every other table is copied
 * across verbatim, which keeps outlines, hinting (`cvt `/`fpgm`/`prep`),
 * layout (`GSUB`/`GPOS`/`GDEF`), `kern`, `MATH`, colour tables and everything
 * else intact.
 *
 * The previous implementation round-tripped through opentype.js's
 * `Font.toArrayBuffer()`, which rebuilds the font from parsed glyphs. That
 * either threw outright on common GSUB lookups or silently re-flavoured the
 * font to CFF and dropped half its tables.
 */

export interface SfntTable {
  tag: string;
  data: Uint8Array;
}

export interface ParsedSfnt {
  /** sfnt version: 0x00010000 for TrueType outlines, 0x4F54544F ("OTTO") for CFF. */
  version: number;
  tables: SfntTable[];
}

export type OutlineFlavor = 'truetype' | 'cff';

export const SFNT_TRUETYPE = 0x00010000;
export const SFNT_OTTO = 0x4f54544f;
export const SFNT_TRUE = 0x74727565;
export const SFNT_TTCF = 0x74746366;

/** OpenType `name` table IDs we read and write. */
export const NAME_ID = {
  copyright: 0,
  fontFamily: 1,
  fontSubfamily: 2,
  uniqueID: 3,
  fullName: 4,
  version: 5,
  postScriptName: 6,
  trademark: 7,
  manufacturer: 8,
  designer: 9,
  description: 10,
  vendorURL: 11,
  designerURL: 12,
  license: 13,
  licenseURL: 14,
  preferredFamily: 16,
  preferredSubfamily: 17,
  compatibleFull: 18,
  sampleText: 19,
  wwsFamily: 21,
  wwsSubfamily: 22
} as const;

export type NameKey = keyof typeof NAME_ID;

export interface NameRecord {
  platformID: number;
  encodingID: number;
  languageID: number;
  nameID: number;
  value: string;
}

function tagAt(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

/** Reads the table directory. Accepts bare TrueType/OpenType and the first font of a TTC. */
export function parseSfnt(buffer: ArrayBuffer): ParsedSfnt {
  if (buffer.byteLength < 12) {
    throw new Error('Not a font file: too short to hold an sfnt header.');
  }

  const view = new DataView(buffer);
  let base = 0;
  let version = view.getUint32(0);

  if (version === SFNT_TTCF) {
    // TrueType Collection: take the first font in the collection.
    if (buffer.byteLength < 16) throw new Error('Truncated TrueType Collection.');
    base = view.getUint32(12);
    version = view.getUint32(base);
  }

  if (version !== SFNT_TRUETYPE && version !== SFNT_OTTO && version !== SFNT_TRUE) {
    throw new Error(
      `Unsupported sfnt version 0x${version.toString(16)}. Expected a TrueType or OpenType font.`
    );
  }

  const numTables = view.getUint16(base + 4);
  const tables: SfntTable[] = [];

  for (let i = 0; i < numTables; i++) {
    const rec = base + 12 + i * 16;
    if (rec + 16 > buffer.byteLength) {
      throw new Error('Truncated font: the table directory runs past the end of the file.');
    }

    const tag = tagAt(view, rec);
    const offset = view.getUint32(rec + 8);
    const length = view.getUint32(rec + 12);

    if (offset + length > buffer.byteLength) {
      // Some fonts pad the final table short. Clamp rather than reject the file.
      const clamped = Math.max(0, buffer.byteLength - offset);
      if (clamped === 0) continue;
      tables.push({ tag, data: new Uint8Array(buffer, offset, clamped) });
      continue;
    }

    tables.push({ tag, data: new Uint8Array(buffer, offset, length) });
  }

  return { version, tables };
}

export function getTable(sfnt: ParsedSfnt, tag: string): Uint8Array | null {
  const found = sfnt.tables.find((t) => t.tag === tag);
  return found ? found.data : null;
}

export function setTable(sfnt: ParsedSfnt, tag: string, data: Uint8Array): void {
  const index = sfnt.tables.findIndex((t) => t.tag === tag);
  if (index >= 0) {
    sfnt.tables[index] = { tag, data };
  } else {
    sfnt.tables.push({ tag, data });
  }
}

export function outlineFlavorOf(sfnt: ParsedSfnt): OutlineFlavor {
  if (sfnt.version === SFNT_OTTO) return 'cff';
  if (sfnt.tables.some((t) => t.tag === 'CFF ' || t.tag === 'CFF2')) return 'cff';
  return 'truetype';
}

/** OpenType table checksum: the sum of the table's big-endian uint32s, padded to 4 bytes. */
function checksumOf(data: Uint8Array): number {
  let sum = 0;
  const full = data.length & ~3;

  for (let i = 0; i < full; i += 4) {
    sum = (sum + ((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3])) >>> 0;
  }

  // The spec pads the final partial word with zeroes.
  if (full < data.length) {
    let tail = 0;
    for (let i = 0; i < 4; i++) {
      tail = ((tail << 8) | (full + i < data.length ? data[full + i] : 0)) >>> 0;
    }
    sum = (sum + tail) >>> 0;
  }

  return sum >>> 0;
}

/**
 * Re-assembles a font from its table directory, recomputing every table
 * checksum and `head.checkSumAdjustment`.
 */
export function buildSfnt(sfnt: ParsedSfnt): ArrayBuffer {
  // The table directory must be sorted by tag; the table data itself may be in
  // any order, but keeping it in tag order too makes output deterministic.
  const tables = [...sfnt.tables]
    .sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))
    .map((table) => {
      // checkSumAdjustment has to read as zero while checksums are taken, both
      // for head's own record and for the whole-file sum computed below.
      if (table.tag !== 'head' || table.data.length < 12) return table;
      const head = new Uint8Array(table.data);
      new DataView(head.buffer).setUint32(8, 0);
      return { tag: table.tag, data: head };
    });

  const numTables = tables.length;

  const headerSize = 12 + numTables * 16;
  let total = (headerSize + 3) & ~3;

  const offsets: number[] = [];
  for (const table of tables) {
    offsets.push(total);
    total += (table.data.length + 3) & ~3;
  }

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  const entrySelector = numTables > 0 ? Math.floor(Math.log2(numTables)) : 0;
  const searchRange = Math.pow(2, entrySelector) * 16;

  view.setUint32(0, sfnt.version);
  view.setUint16(4, numTables);
  view.setUint16(6, searchRange);
  view.setUint16(8, entrySelector);
  view.setUint16(10, numTables * 16 - searchRange);

  let headTableOffset = -1;

  tables.forEach((table, i) => {
    const rec = 12 + i * 16;
    for (let c = 0; c < 4; c++) {
      view.setUint8(rec + c, table.tag.charCodeAt(c) & 0xff);
    }
    view.setUint32(rec + 4, checksumOf(table.data));
    view.setUint32(rec + 8, offsets[i]);
    view.setUint32(rec + 12, table.data.length);
    out.set(table.data, offsets[i]);

    if (table.tag === 'head') headTableOffset = offsets[i];
  });

  if (headTableOffset >= 0 && headTableOffset + 12 <= out.length) {
    // head.checkSumAdjustment is the only field written after assembly: it is
    // whatever makes the whole file sum to 0xB1B0AFBA.
    view.setUint32(headTableOffset + 8, (0xb1b0afba - checksumOf(out)) >>> 0);
  }

  return out.buffer as ArrayBuffer;
}

/* ------------------------------------------------------------------ */
/* name table                                                          */
/* ------------------------------------------------------------------ */

const MAC_ROMAN_HIGH =
  'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
  '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';

function decodeMacRoman(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) {
    out += byte < 0x80 ? String.fromCharCode(byte) : MAC_ROMAN_HIGH[byte - 0x80] || '';
  }
  return out;
}

function encodeMacRoman(text: string): Uint8Array | null {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      out[i] = code;
      continue;
    }
    const index = MAC_ROMAN_HIGH.indexOf(text[i]);
    // Not representable in MacRoman: the caller should drop the Mac record and
    // rely on the Windows/UTF-16 one, which every modern OS reads.
    if (index < 0) return null;
    out[i] = 0x80 + index;
  }
  return out;
}

function decodeUtf16Be(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  }
  return out;
}

function encodeUtf16Be(text: string): Uint8Array {
  const out = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out[i * 2] = code >> 8;
    out[i * 2 + 1] = code & 0xff;
  }
  return out;
}

/** True for the platform/encoding combinations that store text as UTF-16BE. */
function isUtf16(platformID: number, _encodingID: number): boolean {
  // Unicode (0) and Windows (3) are UTF-16BE; Macintosh (1) is MacRoman.
  return platformID === 0 || platformID === 3;
}

/** English for the given platform: Windows 0x409, Macintosh 0, Unicode any. */
function isEnglish(platformID: number, languageID: number): boolean {
  if (platformID === 3) return languageID === 0x0409;
  if (platformID === 1) return languageID === 0;
  return true; // Unicode records carry no meaningful language id
}

export function parseNameTable(data: Uint8Array): NameRecord[] {
  if (data.length < 6) return [];

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getUint16(2);
  const storageOffset = view.getUint16(4);
  const records: NameRecord[] = [];

  for (let i = 0; i < count; i++) {
    const rec = 6 + i * 12;
    if (rec + 12 > data.length) break;

    const platformID = view.getUint16(rec);
    const encodingID = view.getUint16(rec + 2);
    const languageID = view.getUint16(rec + 4);
    const nameID = view.getUint16(rec + 6);
    const length = view.getUint16(rec + 8);
    const offset = view.getUint16(rec + 10);

    const start = storageOffset + offset;
    if (start + length > data.length) continue;

    const raw = data.subarray(start, start + length);
    const value = isUtf16(platformID, encodingID) ? decodeUtf16Be(raw) : decodeMacRoman(raw);

    records.push({ platformID, encodingID, languageID, nameID, value: value.replace(/\0/g, '') });
  }

  return records;
}

export function buildNameTable(records: NameRecord[]): Uint8Array {
  const sorted = [...records].sort(
    (a, b) =>
      a.platformID - b.platformID ||
      a.encodingID - b.encodingID ||
      a.languageID - b.languageID ||
      a.nameID - b.nameID
  );

  const encoded: Array<{ record: NameRecord; bytes: Uint8Array }> = [];

  for (const record of sorted) {
    let bytes: Uint8Array | null;
    if (isUtf16(record.platformID, record.encodingID)) {
      bytes = encodeUtf16Be(record.value);
    } else {
      bytes = encodeMacRoman(record.value);
      if (bytes === null) continue; // not representable; the Windows record covers it
    }
    encoded.push({ record, bytes });
  }

  // Identical strings share one run in the storage area, as most compilers do.
  const storage: number[] = [];
  const seen = new Map<string, number>();
  const placements: Array<{ record: NameRecord; offset: number; length: number }> = [];

  for (const { record, bytes } of encoded) {
    const key = `${isUtf16(record.platformID, record.encodingID) ? 'u' : 'm'}:${record.value}`;
    let offset = seen.get(key);
    if (offset === undefined) {
      offset = storage.length;
      for (const byte of bytes) storage.push(byte);
      seen.set(key, offset);
    }
    placements.push({ record, offset, length: bytes.length });
  }

  const count = placements.length;
  const headerSize = 6 + count * 12;
  const out = new Uint8Array(headerSize + storage.length);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0); // format 0
  view.setUint16(2, count);
  view.setUint16(4, headerSize);

  placements.forEach((placement, i) => {
    const rec = 6 + i * 12;
    view.setUint16(rec, placement.record.platformID);
    view.setUint16(rec + 2, placement.record.encodingID);
    view.setUint16(rec + 4, placement.record.languageID);
    view.setUint16(rec + 6, placement.record.nameID);
    view.setUint16(rec + 8, placement.length);
    view.setUint16(rec + 10, placement.offset);
  });

  out.set(new Uint8Array(storage), headerSize);
  return out;
}

/**
 * Applies `edits` (nameID -> new value) to an existing set of name records.
 *
 * For every edited ID the non-English records are dropped, because a localised
 * name for a family the user just renamed is stale. Records for IDs the user
 * did not touch are preserved exactly, so trademark, licence, description,
 * sample text and any other entry survive the edit.
 *
 * An empty string removes the ID entirely.
 */
export function applyNameEdits(
  existing: NameRecord[],
  edits: Map<number, string>
): NameRecord[] {
  const out: NameRecord[] = [];
  const written = new Set<number>();

  for (const record of existing) {
    if (!edits.has(record.nameID)) {
      out.push(record);
      continue;
    }

    const value = edits.get(record.nameID)!;
    if (!value) continue; // cleared by the user
    if (!isEnglish(record.platformID, record.languageID)) continue; // stale localisation

    out.push({ ...record, value });
    written.add(record.nameID);
  }

  // IDs the font did not carry yet get a fresh Windows + Macintosh pair.
  for (const [nameID, value] of edits) {
    if (!value || written.has(nameID)) continue;
    out.push({ platformID: 3, encodingID: 1, languageID: 0x0409, nameID, value });
    out.push({ platformID: 1, encodingID: 0, languageID: 0, nameID, value });
  }

  return out;
}

/** Reads the English value of a name ID, preferring Windows then Mac then Unicode. */
export function readName(records: NameRecord[], nameID: number): string {
  const pick = (platformID: number) =>
    records.find(
      (r) => r.nameID === nameID && r.platformID === platformID && isEnglish(r.platformID, r.languageID)
    );

  const record = pick(3) || pick(1) || pick(0) || records.find((r) => r.nameID === nameID);
  return record ? record.value.trim() : '';
}

/* ------------------------------------------------------------------ */
/* OS/2 and head                                                       */
/* ------------------------------------------------------------------ */

/** fsSelection bits we manage. Every other bit is left exactly as the font had it. */
export const FS_SELECTION = {
  ITALIC: 1 << 0,
  BOLD: 1 << 5,
  REGULAR: 1 << 6,
  OBLIQUE: 1 << 9
};

export interface Os2Values {
  usWeightClass: number;
  fsSelection: number;
  achVendID: string;
}

export function readOs2(data: Uint8Array | null): Os2Values | null {
  if (!data || data.length < 64) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    usWeightClass: view.getUint16(4),
    fsSelection: view.getUint16(62),
    achVendID: String.fromCharCode(
      view.getUint8(58),
      view.getUint8(59),
      view.getUint8(60),
      view.getUint8(61)
    ).replace(/\0/g, '').trim()
  };
}

export function patchOs2(
  data: Uint8Array,
  patch: { usWeightClass?: number; isBold?: boolean; isItalic?: boolean; achVendID?: string }
): Uint8Array {
  const out = new Uint8Array(data); // copy, never mutate the source font
  if (out.length < 64) return out;

  const view = new DataView(out.buffer);

  if (patch.usWeightClass !== undefined) {
    view.setUint16(4, Math.max(1, Math.min(1000, Math.round(patch.usWeightClass))));
  }

  if (patch.isBold !== undefined || patch.isItalic !== undefined) {
    let fsSelection = view.getUint16(62);
    const isBold = patch.isBold ?? (fsSelection & FS_SELECTION.BOLD) !== 0;
    const isItalic = patch.isItalic ?? (fsSelection & FS_SELECTION.ITALIC) !== 0;

    fsSelection &= ~(FS_SELECTION.ITALIC | FS_SELECTION.BOLD | FS_SELECTION.REGULAR);
    if (isItalic) fsSelection |= FS_SELECTION.ITALIC;
    if (isBold) fsSelection |= FS_SELECTION.BOLD;
    if (!isItalic && !isBold) fsSelection |= FS_SELECTION.REGULAR;
    if (!isItalic) fsSelection &= ~FS_SELECTION.OBLIQUE;

    view.setUint16(62, fsSelection);
  }

  if (patch.achVendID) {
    const vendor = (patch.achVendID + '    ').slice(0, 4);
    for (let i = 0; i < 4; i++) view.setUint8(58 + i, vendor.charCodeAt(i) & 0xff);
  }

  return out;
}

export function readHeadMacStyle(data: Uint8Array | null): number | null {
  if (!data || data.length < 46) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return view.getUint16(44);
}

export function readUnitsPerEm(data: Uint8Array | null): number | null {
  if (!data || data.length < 20) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return view.getUint16(18);
}

export function patchHead(
  data: Uint8Array,
  patch: { isBold?: boolean; isItalic?: boolean }
): Uint8Array {
  const out = new Uint8Array(data);
  if (out.length < 46) return out;

  const view = new DataView(out.buffer);
  let macStyle = view.getUint16(44);

  if (patch.isBold !== undefined) {
    macStyle = patch.isBold ? macStyle | 1 : macStyle & ~1;
  }
  if (patch.isItalic !== undefined) {
    macStyle = patch.isItalic ? macStyle | 2 : macStyle & ~2;
  }

  view.setUint16(44, macStyle);
  return out;
}
