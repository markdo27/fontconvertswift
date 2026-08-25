import * as opentype from 'opentype.js';
import type { Font as OpentypeFont } from 'opentype.js';
import * as fflate from 'fflate';
import { decompressWoff2, compressWoff2 } from './woff2Wasm';
import { FontFormat } from '../types/font';

export function sniffFontFormat(buffer: ArrayBuffer, fallbackFileName: string = ''): FontFormat {
  if (buffer.byteLength >= 4) {
    const view = new DataView(buffer);
    const magic = view.getUint32(0);
    
    if (magic === 0x774F4632) return 'woff2'; // "wOF2"
    if (magic === 0x774F4646) return 'woff';  // "wOFF"
    if (magic === 0x4F54544F) return 'otf';   // "OTTO" (CFF / OpenType)
    if (magic === 0x00010000 || magic === 0x74727565) return 'ttf'; // 0x00010000 or "true"
  }
  
  const ext = fallbackFileName.toLowerCase().split('.').pop();
  if (ext === 'woff2') return 'woff2';
  if (ext === 'woff') return 'woff';
  if (ext === 'otf') return 'otf';
  return 'ttf';
}

export async function decompressWoff2ToSfnt(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const uint8 = new Uint8Array(buffer);
  const decompressed = await decompressWoff2(uint8);
  const sliced = decompressed.buffer.slice(
    decompressed.byteOffset,
    decompressed.byteOffset + decompressed.byteLength
  );
  return sliced as ArrayBuffer;
}

export async function compressSfntToWoff2(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const uint8 = new Uint8Array(buffer);
  const compressed = await compressWoff2(uint8);
  const sliced = compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength
  );
  return sliced as ArrayBuffer;
}

export function decompressWoff1ToSfnt(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  const magic = view.getUint32(0);
  if (magic !== 0x774F4646) {
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

  // Calculate table offsets
  const headerSize = 12 + numTables * 16;
  let curOffset = (headerSize + 3) & ~3;
  const sfntRecords: Array<TableRec & { offset: number }> = [];

  for (const t of tables) {
    sfntRecords.push({ ...t, offset: curOffset });
    curOffset += (t.origLength + 3) & ~3;
  }

  const outBuf = new Uint8Array(curOffset);
  const outView = new DataView(outBuf.buffer);

  // SFNT Header
  outView.setUint32(0, flavor);
  outView.setUint16(4, numTables);
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = Math.pow(2, entrySelector) * 16;
  outView.setUint16(6, searchRange);
  outView.setUint16(8, entrySelector);
  outView.setUint16(10, numTables * 16 - searchRange);

  // SFNT Table Directory
  sfntRecords.forEach((t, i) => {
    const recOffset = 12 + i * 16;
    for (let c = 0; c < 4; c++) {
      outView.setUint8(recOffset + c, t.tag.charCodeAt(c));
    }
    outView.setUint32(recOffset + 4, t.checksum);
    outView.setUint32(recOffset + 8, t.offset);
    outView.setUint32(recOffset + 12, t.origLength);
    outBuf.set(t.data, t.offset);
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

  // WOFF Header
  wView.setUint32(0, 0x774F4646); // "wOFF"
  wView.setUint32(4, flavor);
  wView.setUint32(8, curWoffOffset);
  wView.setUint16(12, numTables);
  wView.setUint16(14, 0);
  wView.setUint32(16, totalSfntSize);
  wView.setUint16(20, 1); // majorVersion
  wView.setUint16(22, 0); // minorVersion
  wView.setUint32(24, 0); // metaOffset
  wView.setUint32(28, 0); // metaLength
  wView.setUint32(32, 0); // metaOrigLength
  wView.setUint32(36, 0); // privOffset
  wView.setUint32(40, 0); // privLength

  tables.forEach((t, i) => {
    const dOffset = 44 + i * 20;
    for (let c = 0; c < 4; c++) {
      wView.setUint8(dOffset + c, t.tag.charCodeAt(c));
    }
    wView.setUint32(dOffset + 4, t.offset);
    wView.setUint32(dOffset + 8, t.compLength);
    wView.setUint32(dOffset + 12, t.origLength);
    wView.setUint32(dOffset + 16, t.checksum);
    woffBuf.set(t.data, t.offset);
  });

  return woffBuf.buffer as ArrayBuffer;
}

export async function convertToSfntBuffer(
  buffer: ArrayBuffer,
  format: FontFormat
): Promise<ArrayBuffer> {
  if (format === 'woff2') {
    return await decompressWoff2ToSfnt(buffer);
  } else if (format === 'woff') {
    return decompressWoff1ToSfnt(buffer);
  }
  return buffer;
}

export async function parseFont(
  buffer: ArrayBuffer,
  fallbackFileName: string = ''
): Promise<{ font: OpentypeFont; sfntBuffer: ArrayBuffer; format: FontFormat }> {
  const format = sniffFontFormat(buffer, fallbackFileName);
  const sfntBuffer = await convertToSfntBuffer(buffer, format);
  
  const font = opentype.parse(sfntBuffer);
  return { font, sfntBuffer, format };
}

export async function convertFontBuffer(
  inputBuffer: ArrayBuffer,
  fromFormat: FontFormat,
  toFormat: FontFormat,
  loadedFont?: OpentypeFont
): Promise<ArrayBuffer> {
  // Step 1: Ensure we have an SFNT (TTF/OTF) buffer
  let sfntBuffer: ArrayBuffer;
  if (loadedFont) {
    sfntBuffer = loadedFont.toArrayBuffer();
  } else {
    sfntBuffer = await convertToSfntBuffer(inputBuffer, fromFormat);
  }

  // Step 2: Convert SFNT to target format
  if (toFormat === 'woff2') {
    return await compressSfntToWoff2(sfntBuffer);
  } else if (toFormat === 'woff') {
    return compressSfntToWoff1(sfntBuffer);
  } else if (toFormat === 'ttf' || toFormat === 'otf') {
    return sfntBuffer;
  }

  return sfntBuffer;
}

export function registerFontFace(
  fontFamilyName: string,
  buffer: ArrayBuffer,
  format: FontFormat
): string {
  const mimeType =
    format === 'woff2'
      ? 'font/woff2'
      : format === 'woff'
      ? 'font/woff'
      : format === 'otf'
      ? 'font/otf'
      : 'font/ttf';

  const blob = new Blob([buffer], { type: mimeType });
  const fontUrl = URL.createObjectURL(blob);
  const safeName = `CustomFont_${fontFamilyName.replace(/[^\w]/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;

  const formatStr =
    format === 'woff2'
      ? "format('woff2')"
      : format === 'woff'
      ? "format('woff')"
      : format === 'otf'
      ? "format('opentype')"
      : "format('truetype')";

  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: '${safeName}';
      src: url('${fontUrl}') ${formatStr};
      font-display: swap;
    }
  `;
  document.head.appendChild(style);

  return safeName;
}
