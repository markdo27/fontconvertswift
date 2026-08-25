import React, { useState } from 'react';
import { 
  Check, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Type, 
  Edit, 
  Trash2, 
  CheckSquare, 
  Square, 
  ArrowRight,
  Sparkles,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { FontFormat, FontItem } from '../types/font';

interface FontListTableProps {
  fonts: FontItem[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (select: boolean) => void;
  onChangeTargetFormat: (id: string, format: FontFormat) => void;
  onConvertSingle: (font: FontItem) => void;
  onDownloadSingle: (font: FontItem) => void;
  onDeleteFont: (id: string) => void;
  onOpenCharacterMap: (font: FontItem) => void;
  onOpenPlayground: (font: FontItem) => void;
  onOpenEditSingle: (font: FontItem) => void;
}

export const FontListTable: React.FC<FontListTableProps> = ({
  fonts,
  onToggleSelect,
  onSelectAll,
  onChangeTargetFormat,
  onConvertSingle,
  onDownloadSingle,
  onDeleteFont,
  onOpenCharacterMap,
  onOpenPlayground,
  onOpenEditSingle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [previewSampleText, setPreviewSampleText] = useState('Sphinx of black quartz');

  const filteredFonts = fonts.filter(font => {
    const matchesSearch = 
      font.family.toLowerCase().includes(searchTerm.toLowerCase()) ||
      font.subfamily.toLowerCase().includes(searchTerm.toLowerCase()) ||
      font.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFormat = 
      formatFilter === 'all' || font.originalFormat === formatFilter;

    return matchesSearch && matchesFormat;
  });

  const allSelected = filteredFonts.length > 0 && filteredFonts.every(f => f.isSelected);
  const someSelected = filteredFonts.some(f => f.isSelected);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFormatBadgeColor = (format: FontFormat) => {
    switch (format) {
      case 'woff2':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'woff':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'otf':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'ttf':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      
      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search fonts by family, style or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Format Filter Tabs & Preview Text Input */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Format Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            {['all', 'woff2', 'woff', 'ttf', 'otf'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormatFilter(fmt)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer uppercase ${
                  formatFilter === fmt
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Sample Text Preview Switcher */}
          <div className="hidden sm:flex items-center space-x-2">
            <input
              type="text"
              value={previewSampleText}
              onChange={(e) => setPreviewSampleText(e.target.value)}
              placeholder="Sample text..."
              className="w-48 px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
              title="Custom preview text"
            />
          </div>

        </div>

      </div>

      {/* Table Header / Selection Status */}
      <div className="flex items-center justify-between px-4 py-2.5 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onSelectAll(!allSelected)}
            className="flex items-center space-x-2 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            ) : someSelected ? (
              <div className="w-4 h-4 rounded border border-indigo-400 bg-indigo-600/30 flex items-center justify-center">
                <div className="w-2 h-0.5 bg-indigo-400" />
              </div>
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>Select All ({filteredFonts.length})</span>
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-12">
          <span>Target Format</span>
          <span>Weight / Style</span>
          <span>Glyphs</span>
          <span>Actions</span>
        </div>
      </div>

      {/* Font Items List */}
      <div className="space-y-3">
        {filteredFonts.map((font) => {
          const fontFaceStyle = font.fontFaceFamily
            ? { fontFamily: font.fontFaceFamily }
            : {};

          return (
            <div
              key={font.id}
              className={`group relative rounded-2xl border transition-all duration-200 p-4 sm:p-5 ${
                font.isSelected
                  ? 'border-indigo-500/60 bg-indigo-950/20 shadow-lg shadow-indigo-500/5'
                  : 'border-slate-800/90 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Left: Checkbox + Family + Live Preview */}
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => onToggleSelect(font.id)}
                    className="mt-1 flex-shrink-0 cursor-pointer text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {font.isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight truncate">
                        {font.family}
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {font.subfamily}
                      </span>
                      
                      {/* Format Badge */}
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getFormatBadgeColor(font.originalFormat)}`}>
                        {font.originalFormat}
                      </span>

                      <span className="text-xs text-slate-500 font-mono">
                        {formatBytes(font.originalSize)}
                      </span>
                    </div>

                    {/* Live Font Rendering Preview */}
                    <div 
                      style={fontFaceStyle}
                      className="text-xl sm:text-2xl text-slate-100 py-1.5 overflow-hidden text-ellipsis whitespace-nowrap select-none"
                    >
                      {previewSampleText || 'The quick brown fox jumps over the lazy dog'}
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500 font-mono">
                      <span className="truncate max-w-xs text-slate-400">
                        {font.fileName}
                      </span>
                      {font.convertedSize !== null && (
                        <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Converted: {formatBytes(font.convertedSize)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Controls & Actions */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/60">
                  
                  {/* Target Format Selector */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-slate-400 font-medium">To:</span>
                    <select
                      value={font.targetFormat}
                      onChange={(e) => onChangeTargetFormat(font.id, e.target.value as FontFormat)}
                      className="px-2.5 py-1.5 text-xs font-bold uppercase rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="ttf">TTF</option>
                      <option value="otf">OTF</option>
                      <option value="woff2">WOFF2</option>
                      <option value="woff">WOFF</option>
                    </select>
                  </div>

                  {/* Weight Class Badge */}
                  <div className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono text-center">
                    {font.weight}
                  </div>

                  {/* Glyphs count */}
                  <div className="text-xs text-slate-400 font-medium">
                    {font.numGlyphs} glyphs
                  </div>

                  {/* Action Icon Buttons */}
                  <div className="flex items-center space-x-1">
                    
                    {/* Character Map */}
                    <button
                      onClick={() => onOpenCharacterMap(font)}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-600/20 border border-transparent hover:border-indigo-500/30 transition-all cursor-pointer"
                      title="Inspect Character Map & Glyphs"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Text Playground */}
                    <button
                      onClick={() => onOpenPlayground(font)}
                      className="p-2 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-600/20 border border-transparent hover:border-purple-500/30 transition-all cursor-pointer"
                      title="Open Typography Playground & Waterfall"
                    >
                      <Type className="w-4 h-4" />
                    </button>

                    {/* Edit Single Metadata */}
                    <button
                      onClick={() => onOpenEditSingle(font)}
                      className="p-2 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-600/20 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer"
                      title="Edit Family, Subfamily & OpenType Metadata"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Convert & Download Single */}
                    <button
                      onClick={() => onConvertSingle(font)}
                      disabled={font.status === 'converting'}
                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-600/20 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer"
                      title={`Convert and Download as .${font.targetFormat}`}
                    >
                      {font.status === 'converting' ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>

                    {/* Delete font */}
                    <button
                      onClick={() => onDeleteFont(font.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                      title="Remove font"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>

                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
