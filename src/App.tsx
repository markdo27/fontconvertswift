import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

import { Icon } from './ui/Icon';
import { Bar, Check, Modal, Notice } from './ui/primitives';
import { Masthead } from './components/Masthead';
import { AuthorSection, Foot } from './components/AuthorSection';
import { FileDropzone, isFontFile } from './components/FileDropzone';
import { FontCard } from './components/FontCard';
import { MetadataModal, type MetadataDraft } from './components/MetadataModal';
import { BatchRenameModal, type BatchRenameResult } from './components/BatchRenameModal';
import { CharacterMapModal } from './components/CharacterMapModal';
import { SpecimenModal } from './components/SpecimenModal';
import { CssExportModal, buildFontFaceCss } from './components/CssExportModal';

import {
  loadFont,
  mimeTypeFor,
  packSfnt,
  registerFontFace,
  releaseFontFace
} from './lib/fontConverter';
import { readMetadataFromSfnt, writeMetadataToSfnt } from './lib/fontMetadata';
import { parseSfnt, readUnitsPerEm, getTable } from './lib/sfnt';
import { replaceExtension, uniqueFileName } from './lib/format';
import {
  FONT_FORMATS,
  nativeDesktopFormat,
  type FontFormat,
  type FontItem
} from './types/font';

type Toast = { id: number; message: string; kind: 'info' | 'success' | 'error' };
type SortKey = 'added' | 'family' | 'weight' | 'size';

let toastSeq = 0;

export default function App() {
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(
    null
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Library view
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | FontFormat>('all');
  const [sortKey, setSortKey] = useState<SortKey>('added');
  const [compact, setCompact] = useState(false);
  const [sampleText, setSampleText] = useState('Sphinx of black quartz');

  // Modals — each is mounted only while open so its hooks start clean.
  const [batchOpen, setBatchOpen] = useState(false);
  const [cssOpen, setCssOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [charMapId, setCharMapId] = useState<string | null>(null);
  const [specimenId, setSpecimenId] = useState<string | null>(null);

  const notify = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  /* ---------------- loading ---------------- */

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setIsLoading(true);

      const loaded: FontItem[] = [];
      const failures: string[] = [];

      for (const file of files) {
        try {
          const buffer = await file.arrayBuffer();
          const result = await loadFont(buffer, file.name);
          const metadata = readMetadataFromSfnt(result.sfntBuffer, file.name);

          const sfnt = parseSfnt(result.sfntBuffer);
          const unitsPerEm = readUnitsPerEm(getTable(sfnt, 'head')) || 1000;

          const id = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
          const targetFormat: FontFormat =
            result.format === 'ttf' || result.format === 'otf'
              ? 'woff2'
              : nativeDesktopFormat(result.outlineFlavor);

          const fontFaceFamily = registerFontFace(
            id,
            metadata.family,
            result.sfntBuffer,
            result.outlineFlavor
          );

          loaded.push({
            id,
            originalFileName: file.name,
            fileName: replaceExtension(file.name, targetFormat),
            originalFormat: result.format,
            targetFormat,
            outlineFlavor: result.outlineFlavor,
            originalSize: file.size,
            convertedSize: null,
            family: metadata.family,
            subfamily: metadata.subfamily,
            names: metadata.names,
            weight: metadata.weight,
            isItalic: metadata.isItalic,
            isBold: metadata.isBold,
            unitsPerEm,
            ascender: result.font?.ascender ?? 0,
            descender: result.font?.descender ?? 0,
            numGlyphs: result.font?.glyphs?.length ?? 0,
            tableTags: result.tableTags,
            sfntBuffer: result.sfntBuffer,
            originalSfntBuffer: result.sfntBuffer,
            convertedBuffer: null,
            parsedFont: result.font,
            fontFaceFamily,
            status: 'idle',
            isSelected: true,
            isEdited: false
          });
        } catch (err) {
          failures.push(`${file.name}: ${err instanceof Error ? err.message : 'unreadable'}`);
        }
      }

      if (loaded.length > 0) {
        setFonts((prev) => [...prev, ...loaded]);
        notify(`Loaded ${loaded.length} font${loaded.length > 1 ? 's' : ''}`, 'success');
      }
      for (const failure of failures) notify(failure, 'error');

      setIsLoading(false);
    },
    [notify]
  );

  /* ---------------- window-wide drag and drop ---------------- */

  const dragDepth = useRef(0);

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      dragDepth.current += 1;
      setIsDragOver(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    };
    const onDragLeave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragOver(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragOver(false);

      const files = Array.from(event.dataTransfer.files).filter((file) => isFontFile(file.name));
      const rejected = event.dataTransfer.files.length - files.length;

      if (files.length > 0) void handleFilesSelected(files);
      if (rejected > 0) {
        notify(`Ignored ${rejected} file${rejected > 1 ? 's' : ''} that are not fonts`, 'error');
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFilesSelected, notify]);

  /* ---------------- derived ---------------- */

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = fonts.filter((font) => {
      if (formatFilter !== 'all' && font.originalFormat !== formatFilter) return false;
      if (!needle) return true;
      return (
        font.family.toLowerCase().includes(needle) ||
        font.subfamily.toLowerCase().includes(needle) ||
        font.fileName.toLowerCase().includes(needle) ||
        font.names.designer.toLowerCase().includes(needle)
      );
    });

    const sorted = [...list];
    if (sortKey === 'family') {
      sorted.sort(
        (a, b) => a.family.localeCompare(b.family) || a.weight - b.weight
      );
    } else if (sortKey === 'weight') {
      sorted.sort((a, b) => a.weight - b.weight || a.family.localeCompare(b.family));
    } else if (sortKey === 'size') {
      sorted.sort((a, b) => b.originalSize - a.originalSize);
    }
    return sorted;
  }, [fonts, query, formatFilter, sortKey]);

  const selected = useMemo(() => fonts.filter((font) => font.isSelected), [fonts]);
  /** Bulk actions apply to the selection, or to everything when nothing is ticked. */
  const workingSet = selected.length > 0 ? selected : fonts;

  const allVisibleSelected = visible.length > 0 && visible.every((font) => font.isSelected);
  const someVisibleSelected = visible.some((font) => font.isSelected);

  const editFont = fonts.find((font) => font.id === editId) || null;
  const charMapFont = fonts.find((font) => font.id === charMapId) || null;
  const specimenFont = fonts.find((font) => font.id === specimenId) || null;

  /* ---------------- mutations ---------------- */

  const patchFont = (id: string, patch: Partial<FontItem>) =>
    setFonts((prev) => prev.map((font) => (font.id === id ? { ...font, ...patch } : font)));

  const handleToggleSelect = (id: string) =>
    setFonts((prev) =>
      prev.map((font) => (font.id === id ? { ...font, isSelected: !font.isSelected } : font))
    );

  const handleSelectAllVisible = (select: boolean) => {
    const ids = new Set(visible.map((font) => font.id));
    setFonts((prev) =>
      prev.map((font) => (ids.has(font.id) ? { ...font, isSelected: select } : font))
    );
  };

  const handleChangeTargetFormat = (id: string, format: FontFormat) =>
    patchFont(id, {
      targetFormat: format,
      fileName: replaceExtension(
        fonts.find((font) => font.id === id)?.fileName || `font.${format}`,
        format
      ),
      convertedBuffer: null,
      convertedSize: null,
      status: 'idle'
    });

  const handleDeleteFont = (id: string) => {
    releaseFontFace(id);
    setFonts((prev) => prev.filter((font) => font.id !== id));
    if (editId === id) setEditId(null);
    if (charMapId === id) setCharMapId(null);
    if (specimenId === id) setSpecimenId(null);
  };

  const handleClearAll = () => {
    for (const font of fonts) releaseFontFace(font.id);
    setFonts([]);
    setConfirmClear(false);
    notify('Library cleared');
  };

  /** Re-parses an edited sfnt and swaps in a fresh preview face. */
  const refreshPreview = (font: FontItem, sfntBuffer: ArrayBuffer, family: string) => ({
    fontFaceFamily: registerFontFace(font.id, family, sfntBuffer, font.outlineFlavor)
  });

  const handleSaveMetadata = (id: string, draft: MetadataDraft) => {
    const font = fonts.find((item) => item.id === id);
    if (!font) return;

    try {
      const sfntBuffer = writeMetadataToSfnt(font.sfntBuffer, {
        family: draft.family,
        subfamily: draft.subfamily,
        weight: draft.weight,
        isItalic: draft.isItalic,
        isBold: draft.isBold,
        names: draft.names
      });

      patchFont(id, {
        family: draft.family,
        subfamily: draft.subfamily,
        weight: draft.weight,
        isItalic: draft.isItalic,
        isBold: draft.isBold,
        names: draft.names,
        fileName: replaceExtension(draft.fileName, font.targetFormat),
        sfntBuffer,
        convertedBuffer: null,
        convertedSize: null,
        status: 'idle',
        errorMessage: undefined,
        isEdited: true,
        ...refreshPreview(font, sfntBuffer, draft.family)
      });

      notify(`Saved ${draft.family} ${draft.subfamily}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not write the metadata';
      patchFont(id, { status: 'error', errorMessage: message });
      notify(`Could not save ${font.family}: ${message}`, 'error');
    }
  };

  const handleApplyBatchRename = (results: BatchRenameResult[]) => {
    let applied = 0;
    const problems: string[] = [];

    setFonts((prev) =>
      prev.map((font) => {
        const result = results.find((item) => item.id === font.id);
        if (!result) return font;

        try {
          // Only the fields the batch tool owns are passed. Designer,
          // copyright, trademark and licence are left undefined, so they are
          // carried through untouched rather than dropped.
          const sfntBuffer = writeMetadataToSfnt(font.sfntBuffer, {
            family: result.family,
            subfamily: result.subfamily,
            weight: result.weight,
            isItalic: result.isItalic,
            isBold: result.isBold,
            names: {
              fullName: result.fullName,
              postScriptName: result.postScriptName
            }
          });

          applied += 1;

          return {
            ...font,
            family: result.family,
            subfamily: result.subfamily,
            weight: result.weight,
            isItalic: result.isItalic,
            isBold: result.isBold,
            names: {
              ...font.names,
              fullName: result.fullName,
              postScriptName: result.postScriptName
            },
            fileName: replaceExtension(result.fileName, font.targetFormat),
            sfntBuffer,
            convertedBuffer: null,
            convertedSize: null,
            status: 'idle' as const,
            errorMessage: undefined,
            isEdited: true,
            ...refreshPreview(font, sfntBuffer, result.family)
          };
        } catch (err) {
          problems.push(`${font.fileName}: ${err instanceof Error ? err.message : 'failed'}`);
          return { ...font, status: 'error' as const, errorMessage: 'Rename failed' };
        }
      })
    );

    if (applied > 0) notify(`Renamed ${applied} font${applied > 1 ? 's' : ''}`, 'success');
    for (const problem of problems) notify(problem, 'error');
  };

  const handleRevert = (id: string) => {
    const font = fonts.find((item) => item.id === id);
    if (!font) return;

    const metadata = readMetadataFromSfnt(font.originalSfntBuffer, font.originalFileName);
    patchFont(id, {
      family: metadata.family,
      subfamily: metadata.subfamily,
      names: metadata.names,
      weight: metadata.weight,
      isItalic: metadata.isItalic,
      isBold: metadata.isBold,
      fileName: replaceExtension(font.originalFileName, font.targetFormat),
      sfntBuffer: font.originalSfntBuffer,
      convertedBuffer: null,
      convertedSize: null,
      status: 'idle',
      errorMessage: undefined,
      isEdited: false,
      ...refreshPreview(font, font.originalSfntBuffer, metadata.family)
    });
    notify(`Reverted ${font.originalFileName}`);
  };

  /* ---------------- export ---------------- */

  const handleExportSingle = async (font: FontItem) => {
    patchFont(font.id, { status: 'converting' });
    try {
      const output = await packSfnt(font.sfntBuffer, font.targetFormat);
      const outName = replaceExtension(font.fileName, font.targetFormat);

      patchFont(font.id, {
        status: 'success',
        convertedBuffer: output,
        convertedSize: output.byteLength,
        fileName: outName,
        errorMessage: undefined
      });

      saveAs(new Blob([output], { type: mimeTypeFor(font.targetFormat) }), outName);
      notify(`Exported ${outName}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Conversion failed';
      patchFont(font.id, { status: 'error', errorMessage: message });
      notify(`${font.fileName}: ${message}`, 'error');
    }
  };

  const handleConvertAll = async (target: FontFormat) => {
    const list = workingSet;
    if (list.length === 0) return;

    setIsBusy(true);
    let done = 0;

    for (let i = 0; i < list.length; i++) {
      const font = list[i];
      setProgress({ current: i + 1, total: list.length, name: font.fileName });

      try {
        const output = await packSfnt(font.sfntBuffer, target);
        const outName = replaceExtension(font.fileName, target);
        patchFont(font.id, {
          targetFormat: target,
          fileName: outName,
          convertedBuffer: output,
          convertedSize: output.byteLength,
          status: 'success',
          errorMessage: undefined
        });
        done += 1;
      } catch (err) {
        patchFont(font.id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Conversion failed'
        });
      }
    }

    setIsBusy(false);
    setProgress(null);
    notify(
      done === list.length
        ? `Converted ${done} font${done > 1 ? 's' : ''} to .${target}`
        : `Converted ${done} of ${list.length} to .${target}`,
      done === list.length ? 'success' : 'error'
    );
  };

  const handleDownloadZip = async () => {
    const list = workingSet;
    if (list.length === 0) return;

    setIsBusy(true);
    const zip = new JSZip();
    const taken = new Set<string>();
    const bundled: FontItem[] = [];

    for (let i = 0; i < list.length; i++) {
      const font = list[i];
      setProgress({ current: i + 1, total: list.length, name: font.fileName });

      try {
        const output = font.convertedBuffer || (await packSfnt(font.sfntBuffer, font.targetFormat));
        const name = uniqueFileName(replaceExtension(font.fileName, font.targetFormat), taken);
        taken.add(name.toLowerCase());
        zip.file(name, output);
        bundled.push({ ...font, fileName: name });
      } catch (err) {
        patchFont(font.id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Could not archive'
        });
      }
    }

    if (bundled.length > 0) {
      zip.file('fonts.css', buildFontFaceCss(bundled, '.', true));

      const readme = [
        'TYPEFORGE EXPORT',
        '',
        ...bundled.map(
          (font) =>
            `${font.fileName}  —  ${font.family} ${font.subfamily}, weight ${font.weight}${
              font.isItalic ? ', italic' : ''
            }${font.names.designer ? `, by ${font.names.designer}` : ''}`
        ),
        '',
        'Outlines, hinting and layout tables are carried over from the source files unchanged.',
        'Renaming a typeface does not relicense it — check each licence before redistributing.',
        ''
      ].join('\n');
      zip.file('README.txt', readme);

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `typeforge-${new Date().toISOString().slice(0, 10)}.zip`);
      notify(`Bundled ${bundled.length} font${bundled.length > 1 ? 's' : ''}`, 'success');
    } else {
      notify('Nothing could be bundled', 'error');
    }

    setIsBusy(false);
    setProgress(null);
  };

  /* ---------------- render ---------------- */

  const hasFonts = fonts.length > 0;

  return (
    <div className="sheet">
      {progress ? (
        <div className="progress">
          <Icon name="refresh" className="spin" />
          <span className="truncate">
            {progress.current}/{progress.total} — {progress.name}
          </span>
          <div className="track">
            <div
              className="fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {isDragOver ? (
        <div className="veil">
          <div>
            <div className="dot">DROP TO LOAD</div>
            <p style={{ marginTop: 14, letterSpacing: '0.14em', fontSize: 11 }}>
              WOFF2 · WOFF · TTF · OTF
            </p>
          </div>
        </div>
      ) : null}

      <Masthead loadedCount={fonts.length} />

      {/* ============ A / LOAD ============ */}
      <Bar index="A" title="LOAD FONTS" count={hasFonts ? String(fonts.length) : undefined} />
      <div className="row row--one">
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          isLoading={isLoading}
          isDragOver={isDragOver}
        />
      </div>

      {hasFonts ? (
        <>
          {/* ============ B / LIBRARY ============ */}
          <Bar
            index="B"
            title="LIBRARY"
            count={`${visible.length}${selected.length ? ` · ${selected.length} SELECTED` : ''}`}
          >
            <div className="seg">
              <button type="button" aria-pressed={!compact} onClick={() => setCompact(false)}>
                GRID
              </button>
              <button type="button" aria-pressed={compact} onClick={() => setCompact(true)}>
                LIST
              </button>
            </div>
          </Bar>

          <div className="row row--one">
            <div className="cell" style={{ padding: '20px 26px' }}>
              <div className="spread">
                <label className="field grow" style={{ maxWidth: 280 }}>
                  <span className="sr-only">Search the library</span>
                  <input
                    className="input input--plain"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search family, style, file or author"
                    spellCheck={false}
                  />
                </label>

                <label className="field grow" style={{ maxWidth: 260 }}>
                  <span className="sr-only">Preview text</span>
                  <input
                    className="input input--plain"
                    value={sampleText}
                    onChange={(event) => setSampleText(event.target.value)}
                    placeholder="Preview text"
                  />
                </label>

                <label className="field">
                  <span className="sr-only">Filter by source format</span>
                  <select
                    className="select"
                    value={formatFilter}
                    onChange={(event) =>
                      setFormatFilter(event.target.value as 'all' | FontFormat)
                    }
                  >
                    <option value="all">ALL FORMATS</option>
                    {FONT_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="sr-only">Sort</span>
                  <select
                    className="select"
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SortKey)}
                  >
                    <option value="added">ORDER ADDED</option>
                    <option value="family">FAMILY A–Z</option>
                    <option value="weight">WEIGHT</option>
                    <option value="size">SIZE</option>
                  </select>
                </label>
              </div>

              <div className="spread" style={{ marginTop: 20 }}>
                <Check
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={handleSelectAllVisible}
                  label={`SELECT ALL SHOWN (${visible.length})`}
                />

                <div className="inline">
                  <span className="count faint">CONVERT ALL TO</span>
                  {FONT_FORMATS.map((format) => (
                    <button
                      key={format}
                      type="button"
                      className="btn btn--sm"
                      disabled={isBusy}
                      onClick={() => handleConvertAll(format)}
                    >
                      .{format}
                    </button>
                  ))}
                </div>
              </div>

              <div className="spread" style={{ marginTop: 16 }}>
                <span className="count faint">
                  ACTIONS APPLY TO {selected.length > 0 ? `${selected.length} SELECTED` : 'ALL FONTS'}
                </span>
                <div className="inline">
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => setBatchOpen(true)}
                    disabled={workingSet.length === 0}
                  >
                    <Icon name="layers" /> BATCH RENAME
                  </button>
                  <button type="button" className="btn btn--sm" onClick={() => setCssOpen(true)}>
                    <Icon name="code" /> CSS
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--solid"
                    onClick={handleDownloadZip}
                    disabled={isBusy}
                  >
                    <Icon name="package" /> DOWNLOAD ZIP
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => setConfirmClear(true)}
                  >
                    <Icon name="trash" /> CLEAR
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={`row${compact ? ' row--list' : ''}`}>
            {visible.map((font, index) => (
              <FontCard
                key={font.id}
                font={font}
                index={index}
                sampleText={sampleText}
                onToggleSelect={handleToggleSelect}
                onChangeTargetFormat={handleChangeTargetFormat}
                onDownload={handleExportSingle}
                onDelete={handleDeleteFont}
                onRevert={handleRevert}
                onOpenCharacterMap={(item) => setCharMapId(item.id)}
                onOpenSpecimen={(item) => setSpecimenId(item.id)}
                onOpenEdit={(item) => setEditId(item.id)}
              />
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="row row--one">
              <div className="cell">
                <div className="empty">NOTHING MATCHES THIS SEARCH</div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ============ F / G / H ============ */}
      <AuthorSection />
      <Foot />

      {/* ---------- modals ---------- */}
      {editFont ? (
        <MetadataModal
          key={editFont.id}
          font={editFont}
          onClose={() => setEditId(null)}
          onSave={handleSaveMetadata}
        />
      ) : null}

      {batchOpen && workingSet.length > 0 ? (
        <BatchRenameModal
          fonts={workingSet}
          onClose={() => setBatchOpen(false)}
          onApply={handleApplyBatchRename}
        />
      ) : null}

      {charMapFont ? (
        <CharacterMapModal
          key={charMapFont.id}
          font={charMapFont}
          onClose={() => setCharMapId(null)}
          onNotify={notify}
        />
      ) : null}

      {specimenFont ? (
        <SpecimenModal
          key={specimenFont.id}
          font={specimenFont}
          onClose={() => setSpecimenId(null)}
        />
      ) : null}

      {cssOpen ? (
        <CssExportModal
          fonts={workingSet}
          onClose={() => setCssOpen(false)}
          onNotify={notify}
        />
      ) : null}

      {confirmClear ? (
        <Modal
          index="!"
          title="CLEAR THE LIBRARY"
          onClose={() => setConfirmClear(false)}
          narrow
          footer={
            <>
              <span className="note">NOTHING IS SAVED ANYWHERE ELSE</span>
              <div className="acts">
                <button type="button" className="btn" onClick={() => setConfirmClear(false)}>
                  KEEP THEM
                </button>
                <button type="button" className="btn btn--solid" onClick={handleClearAll}>
                  <Icon name="trash" /> CLEAR {fonts.length}
                </button>
              </div>
            </>
          }
        >
          <div className="cell">
            <Notice kind="warn">
              REMOVING {fonts.length} FONT{fonts.length > 1 ? 'S' : ''} FROM THIS SHEET.{' '}
              {fonts.some((font) => font.isEdited)
                ? 'SOME HAVE UNEXPORTED METADATA EDITS THAT WILL BE LOST.'
                : 'YOUR ORIGINAL FILES ON DISK ARE NOT TOUCHED.'}
            </Notice>
          </div>
        </Modal>
      ) : null}

      <div className="toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" data-kind={toast.kind} role="status">
            <Icon name={toast.kind === 'error' ? 'warn' : toast.kind === 'success' ? 'check' : 'info'} />
            <span className="plain">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

