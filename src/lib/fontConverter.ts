import * as opentype from 'opentype.js';
import type { Font as OpentypeFont } from 'opentype.js';
import * as fflate from 'fflate';
import { compressWoff2, decompressWoff2 } from './woff2Wasm';
import { outlineFlavorOf, parseSfnt, type OutlineFlavor } from './sfnt';
import type { FontFormat } from '../types/font';

export function sniffFontFormat(buffer: ArrayBuffer, fallbackFileName = ''): FontFormat {
  if (buffer.byteLength >= 4) {
    const magic = new DataView(buffer).getUint32(0);

    if (magic === 0x774f4632) return 'woff2'; // "wOF2"
    if (magic === 0x774f4646) return 'woff'; // "wOFF"
    if (magic === 0x4f54544f) return 'otf'; // "OTTO" - CFF outlines
    if (magic === 0x00010000 || magic === 0x74727565) return 'ttf';
  }

  const ext = fallbackFileName.toLowerCase().split('.').pop();
  if (ext === 'woff2') return 'woff2';
  if (ext === 'woff') return 'woff';
  if (ext === 'otf') return 'otf';
  return 'ttf';
}

export async function decompressWoff2ToSfnt(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const decompressed = await decompressWoff2(new Uint8Array(buffer));
  return decompressed.buffer.slice(
    decompressed.byteOffset,
    decompressed.byteOffset + decompressed.byteLength
  ) as ArrayBuffer;
}

export async function compressSfntToWoff2(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const compressed = await compressWoff2(new Uint8Array(buffer));
  return compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength
  ) as ArrayBuffer;
}

export function decompressWoff1ToSfnt(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  if (view.getUint32(0) !== 0x774f4646) {
    throw new Error('Not a valid WOFF 1.0 file.');
  }

  const flavor = view.getUint32(4);
  const numTables = view.getUint16(12);

  interface TableRec {
    tag: string;
    checksum: number;
    origLength: number;
    data: Uint8Array;
  }

  const tables: TableRec[] = [];
  for (let i = 0; i < numTables; i++) {
    const dirOffset = 44 + i * 20;
    const tag = String.fromCharCode(
      view.getUint8(dirOffset),
      view.getUint8(dirOffset + 1),
      view.getUint8(dirOffset + 2),
      view.getUint8(dirOffset + 3)
    );
    const offset = view.getUint32(dirOffset + 4);
    const compLength = view.getUint32(dirOffset + 8);
    const origLength = view.getUint32(dirOffset + 12);
    const checksum = view.getUint32(dirOffset + 16);

    const compData = new Uint8Array(buffer, offset, compLength);
    const rawData = compLength < origLength ? fflate.unzlibSync(compData) : compData;
    tables.push({ tag, checksum, origLength, data: rawData });
  }

  const headerSize = 12 + numTables * 16;
  let curOffset = (headerSize + 3) & ~3;
  const sfntRecords: Array<TableRec & { offset: number }> = [];

  for (const table of tables) {
    sfntRecords.push({ ...table, offset: curOffset });
    curOffset += (table.origLength + 3) & ~3;
  }

  const outBuf = new Uint8Array(curOffset);
  const outView = new DataView(outBuf.buffer);

  outView.setUint32(0, flavor);
  outView.setUint16(4, numTables);
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = Math.pow(2, entrySelector) * 16;
  outView.setUint16(6, searchRange);
  outView.setUint16(8, entrySelector);
  outView.setUint16(10, numTables * 16 - searchRange);

  sfntRecords.forEach((table, i) => {
    const recOffset = 12 + i * 16;
    for (let c = 0; c < 4; c++) {
      outView.setUint8(recOffset + c, table.tag.charCodeAt(c));
    }
    outView.setUint32(recOffset + 4, table.checksum);
    outView.setUint32(recOffset + 8, table.offset);
    outView.setUint32(recOffset + 12, table.origLength);
    outBuf.set(table.data, table.offset);
  });

  return outBuf.buffer as ArrayBuffer;
}

export function compressSfntToWoff1(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  const flavor = view.getUint32(0);
  const numTables = view.getUint16(4);
  const totalSfntSize = buffer.byteLength;

  interface WoffTable {
    tag: string;
    checksum: number;
    offset: number;
    compLength: number;
    origLength: number;
    data: Uint8Array;
  }

  const tables: WoffTable[] = [];
  const headerSize = 44 + numTables * 20;
  let curWoffOffset = (headerSize + 3) & ~3;

  for (let i = 0; i < numTables; i++) {
    const recOffset = 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(recOffset),
      view.getUint8(recOffset + 1),
      view.getUint8(recOffset + 2),
      view.getUint8(recOffset + 3)
    );
    const checksum = view.getUint32(recOffset + 4);
    const offset = view.getUint32(recOffset + 8);
    const length = view.getUint32(recOffset + 12);

    const rawData = new Uint8Array(buffer, offset, length);
    const compressed = fflate.zlibSync(rawData, { level: 9 });
    const useComp = compressed.byteLength < rawData.byteLength;
    const finalData = useComp ? compressed : rawData;

    tables.push({
      tag,
      checksum,
      offset: curWoffOffset,
      compLength: finalData.byteLength,
      origLength: length,
      data: finalData
    });

    curWoffOffset += (finalData.byteLength + 3) & ~3;
  }

  const woffBuf = new Uint8Array(curWoffOffset);
  const wView = new DataView(woffBuf.buffer);

  wView.setUint32(0, 0x774f4646); // "wOFF"
  wView.setUint32(4, flavor);
  wView.setUint32(8, curWoffOffset);
  wView.setUint16(12, numTables);
  wView.setUint16(14, 0);
  wView.setUint32(16, totalSfntSize);
  wView.setUint16(20, 1);
  wView.setUint16(22, 0);
  wView.setUint32(24, 0);
  wView.setUint32(28, 0);
  wView.setUint32(32, 0);
  wView.setUint32(36, 0);
  wView.setUint32(40, 0);

  tables.forEach((table, i) => {
    const dOffset = 44 + i * 20;
    for (let c = 0; c < 4; c++) {
      wView.setUint8(dOffset + c, table.tag.charCodeAt(c));
    }
    wView.setUint32(dOffset + 4, table.offset);
    wView.setUint32(dOffset + 8, table.compLength);
    wView.setUint32(dOffset + 12, table.origLength);
    wView.setUint32(dOffset + 16, table.checksum);
    woffBuf.set(table.data, table.offset);
  });

  return woffBuf.buffer as ArrayBuffer;
}

/** Unwraps any supported container down to a raw sfnt. */
export async function toSfnt(buffer: ArrayBuffer, format: FontFormat): Promise<ArrayBuffer> {
  if (format === 'woff2') return decompressWoff2ToSfnt(buffer);
  if (format === 'woff') return decompressWoff1ToSfnt(buffer);
  return buffer;
}

export interface LoadedFont {
  sfntBuffer: ArrayBuffer;
  format: FontFormat;
  outlineFlavor: OutlineFlavor;
  tableTags: string[];
  font: OpentypeFont | null;
  parseError?: string;
}

/**
 * Unwraps a font file to its sfnt and reads its table directory.
 *
 * opentype.js is used only to parse glyph outlines for the character map and
 * specimen views. If it cannot parse the font, loading still succeeds: the
 * table directory and the metadata editor do not depend on it.
 */
export async function loadFont(buffer: ArrayBuffer, fileName = ''): Promise<LoadedFont> {
  const format = sniffFontFormat(buffer, fileName);
  const sfntBuffer = await toSfnt(buffer, format);
  const sfnt = parseSfnt(sfntBuffer);

  let font: OpentypeFont | null = null;
  let parseError: string | undefined;
  try {
    font = opentype.parse(sfntBuffer);
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
  }

  return {
    sfntBuffer,
    format,
    outlineFlavor: outlineFlavorOf(sfnt),
    tableTags: sfnt.tables.map((t) => t.tag).sort(),
    font,
    parseError
  };
}

/**
 * Packs an sfnt into the requested container.
 *
 * This is a repackaging step, not a rebuild: `ttf` and `otf` hand back the sfnt
 * itself and `woff`/`woff2` wrap it, so outlines, hinting and layout tables are
 * carried through untouched. Nothing is regenerated from parsed glyphs.
 */
export async function packSfnt(sfntBuffer: ArrayBuffer, target: FontFormat): Promise<ArrayBuffer> {
  if (target === 'woff2') return compressSfntToWoff2(sfntBuffer);
  if (target === 'woff') return compressSfntToWoff1(sfntBuffer);
  return sfntBuffer;
}

export function mimeTypeFor(format: FontFormat): string {
  switch (format) {
    case 'woff2':
      return 'font/woff2';
    case 'woff':
      return 'font/woff';
    case 'otf':
      return 'font/otf';
    default:
      return 'font/ttf';
  }
}

export function cssFormatFor(format: FontFormat): string {
  switch (format) {
    case 'woff2':
      return "format('woff2')";
    case 'woff':
      return "format('woff')";
    case 'otf':
      return "format('opentype')";
    default:
      return "format('truetype')";
  }
}

const registeredFaces = new Map<string, { styleEl: HTMLStyleElement; url: string }>();

/**
 * Installs an sfnt as a usable `@font-face` and returns its generated family
 * name. Re-registering under the same key revokes the previous blob URL, so
 * repeated metadata edits do not leak object URLs.
 */
export function registerFontFace(
  key: string,
  familyName: string,
  sfntBuffer: ArrayBuffer,
  flavor: OutlineFlavor
): string {
  const previous = registeredFaces.get(key);
  if (previous) {
    URL.revokeObjectURL(previous.url);
    previous.styleEl.remove();
  }

  const mimeType = flavor === 'cff' ? 'font/otf' : 'font/ttf';
  const formatStr = flavor === 'cff' ? "format('opentype')" : "format('truetype')";

  const url = URL.createObjectURL(new Blob([sfntBuffer], { type: mimeType }));
  const safeName = `TF_${familyName.replace(/[^\w]/g, '_').slice(0, 40)}_${key.replace(/[^\w]/g, '')}`;

  const styleEl = document.createElement('style');
  styleEl.textContent = `@font-face{font-family:'${safeName}';src:url('${url}') ${formatStr};font-display:block}`;
  document.head.appendChild(styleEl);

  registeredFaces.set(key, { styleEl, url });
  return safeName;
}

export function releaseFontFace(key: string): void {
  const entry = registeredFaces.get(key);
  if (!entry) return;
  URL.revokeObjectURL(entry.url);
  entry.styleEl.remove();
  registeredFaces.delete(key);
}
