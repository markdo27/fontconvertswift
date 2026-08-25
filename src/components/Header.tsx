import React from 'react';
import { 
  Type, 
  Layers, 
  Download, 
  RefreshCw, 
  FileCode, 
  Trash2, 
  Sparkles,
  Edit3
} from 'lucide-react';
import { FontFormat, FontItem } from '../types/font';

interface HeaderProps {
  fonts: FontItem[];
  selectedFonts: FontItem[];
  onConvertAll: (targetFormat: FontFormat) => void;
  onOpenBatchRename: () => void;
  onOpenCssExport: () => void;
  onDownloadAllZip: () => void;
  onClearAll: () => void;
  isConverting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fonts,
  selectedFonts,
  onConvertAll,
  onOpenBatchRename,
  onOpenCssExport,
  onDownloadAllZip,
  onClearAll,
  isConverting
}) => {
  const totalCount = fonts.length;
  const selectedCount = selectedFonts.length;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Type className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                TypeForge
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Font Converter, Character Map & Batch Renamer
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Renamer Button */}
            <button
              onClick={onOpenBatchRename}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 hover:border-indigo-500/50 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Batch rename font family, weights, and filenames"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Batch Rename {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
            </button>

            {/* Quick Convert All Dropdown */}
            <div className="relative group">
              <button
                disabled={isConverting}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isConverting ? 'animate-spin' : ''}`} />
                <span>Convert All To</span>
                <span className="text-[10px] opacity-75">?</span>
              </button>

              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => onConvertAll('ttf')}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-lg flex items-center justify-between cursor-pointer"
                >
                  <span>TrueType (.ttf)</span>
                  <span className="text-[10px] text-slate-400 font-mono">TTF</span>
                </button>
                <button
                  onClick={() => onConvertAll('otf')}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-lg flex items-center justify-between cursor-pointer"
                >
                  <span>OpenType (.otf)</span>
                  <span className="text-[10px] text-slate-400 font-mono">OTF</span>
                </button>
                <button
                  onClick={() => onConvertAll('woff2')}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-lg flex items-center justify-between cursor-pointer"
                >
                  <span>Web Font (.woff2)</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">WOFF2</span>
                </button>
                <button
                  onClick={() => onConvertAll('woff')}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-lg flex items-center justify-between cursor-pointer"
                >
                  <span>Legacy Web (.woff)</span>
                  <span className="text-[10px] text-slate-400 font-mono">WOFF</span>
                </button>
              </div>
            </div>

            {/* CSS Snippet */}
            <button
              onClick={onOpenCssExport}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 transition-all cursor-pointer"
              title="Generate @font-face CSS snippets"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>CSS</span>
            </button>

            {/* Download All ZIP */}
            <button
              onClick={onDownloadAllZip}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 hover:border-emerald-500/50 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Download all converted & renamed fonts as a single ZIP archive"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download ZIP</span>
            </button>

            {/* Clear All */}
            <button
              onClick={onClearAll}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
              title="Clear all loaded fonts"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
