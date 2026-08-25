import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Copy, 
  Check, 
  Info, 
  Code, 
  Compass
} from 'lucide-react';
import { FontItem, GlyphDetail } from '../types/font';
import { UNICODE_CATEGORIES, extractGlyphsFromFont } from '../lib/glyphUtils';

interface CharacterMapModalProps {
  font: FontItem | null;
  onClose: () => void;
}

export const CharacterMapModal: React.FC<CharacterMapModalProps> = ({
  font,
  onClose
}) => {
  if (!font || !font.parsedFont) return null;

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGlyph, setSelectedGlyph] = useState<GlyphDetail | null>(null);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [copiedChar, setCopiedChar] = useState(false);

  // Extract all glyphs from the parsed font
  const allGlyphs = useMemo(() => {
    if (!font.parsedFont) return [];
    return extractGlyphsFromFont(font.parsedFont);
  }, [font.parsedFont]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allGlyphs.length };
    for (const g of allGlyphs) {
      counts[g.category] = (counts[g.category] || 0) + 1;
    }
    return counts;
  }, [allGlyphs]);

  // Filtered glyphs list
  const filteredGlyphs = useMemo(() => {
    return allGlyphs.filter((g) => {
      const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchesChar = g.char && g.char.toLowerCase() === q;
      const matchesName = g.name && g.name.toLowerCase().includes(q);
      const matchesHex = g.unicodeHex && g.unicodeHex.toLowerCase().includes(q);
      const matchesDec = g.unicode && String(g.unicode).includes(q);

      return matchesChar || matchesName || matchesHex || matchesDec;
    });
  }, [allGlyphs, selectedCategory, searchQuery]);

  const handleCopySvg = (svgPath: string) => {
    navigator.clipboard.writeText(svgPath);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  const handleCopyChar = (char?: string) => {
    if (!char) return;
    navigator.clipboard.writeText(char);
    setCopiedChar(true);
    setTimeout(() => setCopiedChar(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-6xl h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Character & Glyph Map
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {font.family} {font.subfamily}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {allGlyphs.length} total glyphs • Units per Em: {font.unitsPerEm} • Ascender: {font.ascender} • Descender: {font.descender}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Category Tabs & Search */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {UNICODE_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              if (count === 0 && cat.id !== 'all') return null;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by character, U+0041, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

        </div>

        {/* Glyphs Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {filteredGlyphs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <Info className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">No glyphs match the current filter or search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2.5">
              {filteredGlyphs.map((glyph) => (
                <div
                  key={glyph.index}
                  onClick={() => setSelectedGlyph(glyph)}
                  className={`group relative flex flex-col items-center justify-between p-2 rounded-2xl border transition-all cursor-pointer aspect-square ${
                    selectedGlyph?.index === glyph.index
                      ? 'border-indigo-500 bg-indigo-950/40 shadow-lg ring-1 ring-indigo-500'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40 hover:scale-105'
                  }`}
                >
                  {/* Unicode Hex Badge */}
                  <span className="text-[9px] font-mono text-slate-500 group-hover:text-indigo-400 transition-colors">
                    {glyph.unicodeHex || `#${glyph.index}`}
                  </span>

                  {/* Rendered Character Preview */}
                  <div className="flex-1 flex items-center justify-center w-full my-1">
                    {glyph.char ? (
                      <span 
                        style={{ fontFamily: font.fontFaceFamily || 'inherit' }}
                        className="text-2xl sm:text-3xl text-slate-100 group-hover:scale-110 transition-transform select-none"
                      >
                        {glyph.char}
                      </span>
                    ) : glyph.pathSvg ? (
                      <svg viewBox={`0 -${font.ascender || 800} ${font.unitsPerEm || 1000} ${font.unitsPerEm || 1000}`} className="w-8 h-8 text-slate-200 fill-current">
                        <path d={glyph.pathSvg} transform="scale(1, -1)" />
                      </svg>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono">[{glyph.name}]</span>
                    )}
                  </div>

                  {/* Glyph Name / Index */}
                  <span className="text-[9px] text-slate-400 truncate max-w-full font-mono">
                    {glyph.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Glyph Inspector Panel */}
        {selectedGlyph && (
          <div className="border-t border-slate-800 bg-slate-950/90 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-150">
            
            <div className="flex items-center space-x-4">
              {/* Big Preview Box */}
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 shadow-inner">
                {selectedGlyph.char ? (
                  <span 
                    style={{ fontFamily: font.fontFaceFamily || 'inherit' }}
                    className="text-4xl text-indigo-300 select-none"
                  >
                    {selectedGlyph.char}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">Glyph</span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-white">
                    {selectedGlyph.name}
                  </h4>
                  {selectedGlyph.unicodeHex && (
                    <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedGlyph.unicodeHex}
                    </span>
                  )}
                  {selectedGlyph.unicode !== undefined && (
                    <span className="text-xs text-slate-400 font-mono">
                      Dec: {selectedGlyph.unicode}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                  <span>Width: <strong className="text-slate-200">{selectedGlyph.advanceWidth}</strong></span>
                  {selectedGlyph.xMin !== undefined && (
                    <span>Bounds: <strong className="text-slate-200">[{selectedGlyph.xMin}, {selectedGlyph.yMin}] to [{selectedGlyph.xMax}, {selectedGlyph.yMax}]</strong></span>
                  )}
                  <span>Index: <strong className="text-slate-200">#{selectedGlyph.index}</strong></span>
                </div>
              </div>
            </div>

            {/* Action buttons for Selected Glyph */}
            <div className="flex items-center space-x-2">
              {selectedGlyph.char && (
                <button
                  onClick={() => handleCopyChar(selectedGlyph.char)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                >
                  {copiedChar ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedChar ? 'Copied Char!' : 'Copy Character'}</span>
                </button>
              )}

              {selectedGlyph.pathSvg && (
                <button
                  onClick={() => handleCopySvg(selectedGlyph.pathSvg)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {copiedSvg ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Code className="w-3.5 h-3.5" />}
                  <span>{copiedSvg ? 'Copied SVG Path!' : 'Copy SVG Path'}</span>
                </button>
              )}

              <button
                onClick={() => setSelectedGlyph(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
