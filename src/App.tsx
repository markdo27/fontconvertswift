import React, { useState } from 'react';
import { 
  Type, 
  Sparkles, 
  Layers, 
  Download, 
  RefreshCw, 
  FileCode, 
  Trash2, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

import { FontFormat, FontItem } from './types/font';
import { 
  parseFont, 
  convertFontBuffer, 
  registerFontFace, 
  sniffFontFormat 
} from './lib/fontConverter';
import { 
  extractMetadataFromParsedFont, 
  updateFontMetadata, 
  formatFileName, 
  sanitizePostScriptName 
} from './lib/fontMetadata';

import { Header } from './components/Header';
import { FileDropzone } from './components/FileDropzone';
import { FontListTable } from './components/FontListTable';
import { BatchRenameModal } from './components/BatchRenameModal';
import { CharacterMapModal } from './components/CharacterMapModal';
import { TextPlaygroundModal } from './components/TextPlaygroundModal';
import { SingleFontEditModal } from './components/SingleFontEditModal';
import { CssExportModal } from './components/CssExportModal';

export default function App() {
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // Modals state
  const [isBatchRenameOpen, setIsBatchRenameOpen] = useState<boolean>(false);
  const [characterMapFont, setCharacterMapFont] = useState<FontItem | null>(null);
  const [playgroundFont, setPlaygroundFont] = useState<FontItem | null>(null);
  const [editSingleFont, setEditSingleFont] = useState<FontItem | null>(null);
  const [isCssExportOpen, setIsCssExportOpen] = useState<boolean>(false);

  // Toast / notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Process incoming files
  const handleFilesSelected = async (files: File[]) => {
    setIsLoading(true);
    let successCount = 0;
    const newFontItems: FontItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buffer = await file.arrayBuffer();
        const detectedFormat = sniffFontFormat(buffer, file.name);

        const { font, sfntBuffer, format } = await parseFont(buffer, file.name);
        const metadata = extractMetadataFromParsedFont(font, file.name);

        // Default target format: if WOFF/WOFF2 -> TTF; if TTF/OTF -> WOFF2
        let defaultTarget: FontFormat = 'ttf';
        if (detectedFormat === 'ttf' || detectedFormat === 'otf') {
          defaultTarget = 'woff2';
        }

        // Register font-face using sfntBuffer for 100% reliable browser preview
        const fontFaceFamily = registerFontFace(
          metadata.family,
          sfntBuffer,
          format === 'otf' ? 'otf' : 'ttf'
        );

        const fontItem: FontItem = {
          id: `font_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          originalFileName: file.name,
          fileName: file.name,
          originalFormat: detectedFormat,
          targetFormat: defaultTarget,
          originalSize: file.size,
          convertedSize: null,
          family: metadata.family,
          subfamily: metadata.subfamily,
          fullName: metadata.fullName,
          postScriptName: metadata.postScriptName,
          uniqueId: metadata.uniqueId,
          version: metadata.version,
          weight: metadata.weight,
          isItalic: metadata.isItalic,
          isBold: metadata.isBold,
          unitsPerEm: metadata.unitsPerEm,
          ascender: metadata.ascender,
          descender: metadata.descender,
          numGlyphs: metadata.numGlyphs,
          copyright: metadata.copyright,
          designer: metadata.designer,
          manufacturer: metadata.manufacturer,
          originalBuffer: buffer,
          convertedBuffer: null,
          parsedFont: font,
          fontFaceUrl: null,
          fontFaceFamily,
          status: 'idle',
          isSelected: true
        };

        newFontItems.push(fontItem);
        successCount++;
      } catch (err: any) {
        console.error(`Error parsing font ${file.name}:`, err);
        showToast(`Failed to parse ${file.name}: ${err.message || 'Corrupted or unsupported format'}`, 'error');
      }
    }

    if (newFontItems.length > 0) {
      setFonts(prev => [...prev, ...newFontItems]);
      showToast(`Loaded ${newFontItems.length} font${newFontItems.length > 1 ? 's' : ''} successfully!`, 'success');
    }
    setIsLoading(false);
  };

  // Toggle font selection
  const handleToggleSelect = (id: string) => {
    setFonts(prev => prev.map(f => f.id === id ? { ...f, isSelected: !f.isSelected } : f));
  };

  // Select all / deselect all
  const handleSelectAll = (select: boolean) => {
    setFonts(prev => prev.map(f => ({ ...f, isSelected: select })));
  };

  // Change individual target format
  const handleChangeTargetFormat = (id: string, format: FontFormat) => {
    setFonts(prev => prev.map(f => {
      if (f.id !== id) return f;
      const baseName = f.fileName.replace(/\.[^.]+$/, '');
      return {
        ...f,
        targetFormat: format,
        fileName: `${baseName}.${format}`,
        convertedBuffer: null,
        convertedSize: null
      };
    }));
  };

  // Delete font
  const handleDeleteFont = (id: string) => {
    setFonts(prev => prev.filter(f => f.id !== id));
  };

  // Convert Single Font
  const handleConvertSingle = async (font: FontItem) => {
    setFonts(prev => prev.map(f => f.id === font.id ? { ...f, status: 'converting' } : f));
    try {
      const outBuffer = await convertFontBuffer(
        font.originalBuffer,
        font.originalFormat,
        font.targetFormat,
        font.parsedFont || undefined
      );

      const baseName = font.fileName.replace(/\.[^.]+$/, '');
      const outName = `${baseName}.${font.targetFormat}`;

      setFonts(prev => prev.map(f => f.id === font.id ? {
        ...f,
        status: 'success',
        convertedBuffer: outBuffer,
        convertedSize: outBuffer.byteLength,
        fileName: outName
      } : f));

      // Trigger instant single download
      const mimeType = 
        font.targetFormat === 'woff2' ? 'font/woff2' :
        font.targetFormat === 'woff' ? 'font/woff' :
        font.targetFormat === 'otf' ? 'font/otf' : 'font/ttf';

      const blob = new Blob([outBuffer], { type: mimeType });
      saveAs(blob, outName);
      showToast(`Converted & downloaded ${outName}!`, 'success');
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setFonts(prev => prev.map(f => f.id === font.id ? { ...f, status: 'error', errorMessage: err.message } : f));
      showToast(`Failed to convert ${font.fileName}: ${err.message}`, 'error');
    }
  };

  // Convert All Selected or All Fonts to a specific format
  const handleConvertAll = async (targetFormat: FontFormat) => {
    const selected = fonts.filter(f => f.isSelected);
    const targetList = selected.length > 0 ? selected : fonts;
    if (targetList.length === 0) return;

    setIsConverting(true);
    let convertedCount = 0;

    for (let i = 0; i < targetList.length; i++) {
      const f = targetList[i];
      setProgress({ current: i + 1, total: targetList.length, name: f.fileName });

      try {
        const outBuffer = await convertFontBuffer(
          f.originalBuffer,
          f.originalFormat,
          targetFormat,
          f.parsedFont || undefined
        );

        const baseName = f.fileName.replace(/\.[^.]+$/, '');
        const outName = `${baseName}.${targetFormat}`;

        setFonts(prev => prev.map(item => item.id === f.id ? {
          ...item,
          targetFormat,
          fileName: outName,
          convertedBuffer: outBuffer,
          convertedSize: outBuffer.byteLength,
          status: 'success'
        } : item));

        convertedCount++;
      } catch (err: any) {
        console.error(`Error converting ${f.fileName}:`, err);
        setFonts(prev => prev.map(item => item.id === f.id ? { ...item, status: 'error' } : item));
      }
    }

    setIsConverting(false);
    setProgress(null);
    showToast(`Successfully converted ${convertedCount} fonts to .${targetFormat}!`, 'success');
  };

  // Apply Batch Rename & Weight Normalization
  const handleApplyBatchRename = (
    updatedItems: Array<{ id: string; family: string; subfamily: string; weight: number; isItalic: boolean; fileName: string; postScriptName: string }>
  ) => {
    setFonts(prev => prev.map(f => {
      const update = updatedItems.find(u => u.id === f.id);
      if (!update || !f.parsedFont) return f;

      try {
        const newSfnt = updateFontMetadata(f.parsedFont, {
          family: update.family,
          subfamily: update.subfamily,
          weight: update.weight,
          isItalic: update.isItalic,
          postScriptName: update.postScriptName,
          fullName: `${update.family} ${update.subfamily}`.trim()
        });

        const newFontFace = registerFontFace(update.family, newSfnt, f.originalFormat === 'otf' ? 'otf' : 'ttf');

        return {
          ...f,
          family: update.family,
          subfamily: update.subfamily,
          weight: update.weight,
          isItalic: update.isItalic,
          isBold: update.weight >= 700,
          fullName: `${update.family} ${update.subfamily}`.trim(),
          postScriptName: update.postScriptName,
          fileName: update.fileName,
          originalBuffer: newSfnt,
          fontFaceFamily: newFontFace,
          convertedBuffer: null,
          convertedSize: null
        };
      } catch (err) {
        console.error(`Failed to update metadata for ${f.fileName}:`, err);
        return f;
      }
    }));

    showToast(`Updated metadata for ${updatedItems.length} fonts!`, 'success');
  };

  // Save Single Font Edit
  const handleSaveSingleFont = (updated: {
    id: string;
    family: string;
    subfamily: string;
    fullName: string;
    postScriptName: string;
    uniqueId: string;
    version: string;
    weight: number;
    isItalic: boolean;
    isBold: boolean;
    fileName: string;
    copyright?: string;
    designer?: string;
    manufacturer?: string;
  }) => {
    setFonts(prev => prev.map(f => {
      if (f.id !== updated.id || !f.parsedFont) return f;

      try {
        const newSfnt = updateFontMetadata(f.parsedFont, {
          family: updated.family,
          subfamily: updated.subfamily,
          fullName: updated.fullName,
          postScriptName: updated.postScriptName,
          uniqueId: updated.uniqueId,
          version: updated.version,
          weight: updated.weight,
          isItalic: updated.isItalic,
          isBold: updated.isBold,
          copyright: updated.copyright,
          designer: updated.designer,
          manufacturer: updated.manufacturer
        });

        const newFontFace = registerFontFace(updated.family, newSfnt, f.originalFormat === 'otf' ? 'otf' : 'ttf');

        return {
          ...f,
          ...updated,
          originalBuffer: newSfnt,
          fontFaceFamily: newFontFace,
          convertedBuffer: null,
          convertedSize: null
        };
      } catch (err) {
        console.error('Error saving single font metadata:', err);
        return f;
      }
    }));

    showToast(`Saved metadata for ${updated.family} ${updated.subfamily}!`, 'success');
  };

  // Download All as ZIP
  const handleDownloadAllZip = async () => {
    const selected = fonts.filter(f => f.isSelected);
    const targetList = selected.length > 0 ? selected : fonts;
    if (targetList.length === 0) return;

    setIsConverting(true);
    const zip = new JSZip();

    for (let i = 0; i < targetList.length; i++) {
      const f = targetList[i];
      setProgress({ current: i + 1, total: targetList.length, name: f.fileName });

      try {
        let bufferToZip = f.convertedBuffer;
        if (!bufferToZip) {
          bufferToZip = await convertFontBuffer(
            f.originalBuffer,
            f.originalFormat,
            f.targetFormat,
            f.parsedFont || undefined
          );
        }

        const ext = f.targetFormat;
        const base = f.fileName.replace(/\.[^.]+$/, '');
        const filenameInZip = `${base}.${ext}`;

        zip.file(filenameInZip, bufferToZip);
      } catch (err: any) {
        console.error(`Error archiving ${f.fileName}:`, err);
      }
    }

    // Add CSS definitions to zip
    const cssRules = targetList.map(font => {
      const formatStr = 
        font.targetFormat === 'woff2' ? "format('woff2')" :
        font.targetFormat === 'woff' ? "format('woff')" :
        font.targetFormat === 'otf' ? "format('opentype')" :
        "format('truetype')";
      const fontStyle = font.isItalic ? 'italic' : 'normal';
      const base = font.fileName.replace(/\.[^.]+$/, '');
      const fontFile = `${base}.${font.targetFormat}`;

      return `@font-face {
  font-family: '${font.family}';
  src: url('./${fontFile}') ${formatStr};
  font-weight: ${font.weight};
  font-style: ${fontStyle};
  font-display: swap;
}`;
    }).join('\n\n');

    zip.file('fonts.css', `/* TypeForge Exported Font Styles */\n\n${cssRules}\n`);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'TypeForge_Fonts_Bundle.zip');

    setIsConverting(false);
    setProgress(null);
    showToast(`Downloaded ZIP archive with ${targetList.length} fonts!`, 'success');
  };

  const selectedFonts = fonts.filter(f => f.isSelected);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 text-xs font-semibold backdrop-blur-lg ${
            toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200' :
            toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-200' :
            'bg-indigo-950/90 border-indigo-500/30 text-indigo-200'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
             toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> :
             <Sparkles className="w-4 h-4 text-indigo-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Conversion Progress Bar */}
      {progress && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600/90 backdrop-blur-md px-4 py-2 flex items-center justify-between text-xs font-semibold text-white shadow-lg">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Processing ({progress.current}/{progress.total}): <strong className="font-mono">{progress.name}</strong></span>
          </div>
          <div className="w-32 bg-indigo-900 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-white h-full transition-all duration-150"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        fonts={fonts}
        selectedFonts={selectedFonts}
        onConvertAll={handleConvertAll}
        onOpenBatchRename={() => setIsBatchRenameOpen(true)}
        onOpenCssExport={() => setIsCssExportOpen(true)}
        onDownloadAllZip={handleDownloadAllZip}
        onClearAll={() => setFonts([])}
        isConverting={isConverting}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Dropzone */}
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          isLoading={isLoading}
        />

        {/* Font List & Management */}
        {fonts.length > 0 && (
          <FontListTable
            fonts={fonts}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onChangeTargetFormat={handleChangeTargetFormat}
            onConvertSingle={handleConvertSingle}
            onDownloadSingle={handleConvertSingle}
            onDeleteFont={handleDeleteFont}
            onOpenCharacterMap={(font) => setCharacterMapFont(font)}
            onOpenPlayground={(font) => setPlaygroundFont(font)}
            onOpenEditSingle={(font) => setEditSingleFont(font)}
          />
        )}

      </main>

      {/* Modals */}
      <BatchRenameModal
        selectedFonts={selectedFonts}
        allFonts={fonts}
        isOpen={isBatchRenameOpen}
        onClose={() => setIsBatchRenameOpen(false)}
        onApplyBatchRename={handleApplyBatchRename}
      />

      <CharacterMapModal
        font={characterMapFont}
        onClose={() => setCharacterMapFont(null)}
      />

      <TextPlaygroundModal
        font={playgroundFont}
        onClose={() => setPlaygroundFont(null)}
      />

      <SingleFontEditModal
        font={editSingleFont}
        isOpen={!!editSingleFont}
        onClose={() => setEditSingleFont(null)}
        onSave={handleSaveSingleFont}
      />

      <CssExportModal
        fonts={selectedFonts.length > 0 ? selectedFonts : fonts}
        isOpen={isCssExportOpen}
        onClose={() => setIsCssExportOpen(false)}
      />

    </div>
  );
}
