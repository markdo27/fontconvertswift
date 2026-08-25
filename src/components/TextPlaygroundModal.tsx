import React, { useState } from 'react';
import { 
  X, 
  Type, 
  Sliders, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Layers
} from 'lucide-react';
import { FontItem } from '../types/font';
import { SAMPLE_PANGRAMS } from '../lib/glyphUtils';

interface TextPlaygroundModalProps {
  font: FontItem | null;
  onClose: () => void;
}

export const TextPlaygroundModal: React.FC<TextPlaygroundModalProps> = ({
  font,
  onClose
}) => {
  if (!font) return null;

  const [activeTab, setActiveTab] = useState<'playground' | 'waterfall'>('playground');
  const [fontSize, setFontSize] = useState<number>(42);
  const [lineHeight, setLineHeight] = useState<number>(1.3);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [textTransform, setTextTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none');
  const [theme, setTheme] = useState<'dark' | 'light' | 'cyber' | 'contrast'>('dark');
  const [text, setText] = useState<string>(SAMPLE_PANGRAMS[0].text);
  const [copied, setCopied] = useState<boolean>(false);

  const waterfallSizes = [12, 14, 16, 20, 24, 32, 40, 48, 64, 72, 96];

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'light':
        return 'bg-white text-slate-900 border-slate-200';
      case 'cyber':
        return 'bg-slate-950 text-emerald-400 border-emerald-900/50';
      case 'contrast':
        return 'bg-black text-white border-white/30';
      case 'dark':
      default:
        return 'bg-slate-950 text-slate-100 border-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Card */}
      <div className="relative w-full max-w-6xl h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Typography Playground & Waterfall
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  {font.family} {font.subfamily}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live interactive rendering test & sizing waterfall
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

        {/* Controls Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
          
          {/* Tabs: Playground vs Waterfall */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('playground')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'playground'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Playground
            </button>
            <button
              onClick={() => setActiveTab('waterfall')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'waterfall'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Waterfall View
            </button>
          </div>

          {/* Pangram Quick Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Preset:</span>
            <select
              onChange={(e) => setText(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer max-w-xs truncate"
            >
              {SAMPLE_PANGRAMS.map((p, idx) => (
                <option key={idx} value={p.text}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Themes Selector */}
          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setTheme('dark')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${theme === 'dark' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
              title="Dark Theme"
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${theme === 'light' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-400'}`}
              title="Light Theme"
            >
              Light
            </button>
            <button
              onClick={() => setTheme('cyber')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${theme === 'cyber' ? 'bg-emerald-950 text-emerald-300 font-bold' : 'text-slate-400'}`}
              title="Cyber Neon"
            >
              Cyber
            </button>
            <button
              onClick={() => setTheme('contrast')}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${theme === 'contrast' ? 'bg-white text-black font-bold' : 'text-slate-400'}`}
              title="High Contrast"
            >
              Contrast
            </button>
          </div>

        </div>

        {/* Playground Sub-Controls (Only in Playground mode) */}
        {activeTab === 'playground' && (
          <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-950/40 flex flex-wrap items-center gap-6 text-xs text-slate-300">
            
            {/* Font Size Slider */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 w-16">Size: {fontSize}px</span>
              <input
                type="range"
                min="8"
                max="144"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-28 accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Line Height Slider */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 w-16">Line: {lineHeight}</span>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-24 accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Letter Spacing Slider */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 w-18">Spacing: {letterSpacing}px</span>
              <input
                type="range"
                min="-4"
                max="20"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                className="w-24 accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Text Alignment */}
            <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
              <button
                onClick={() => setTextAlign('left')}
                className={`p-1 rounded cursor-pointer ${textAlign === 'left' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign('center')}
                className={`p-1 rounded cursor-pointer ${textAlign === 'center' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign('right')}
                className={`p-1 rounded cursor-pointer ${textAlign === 'right' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign('justify')}
                className={`p-1 rounded cursor-pointer ${textAlign === 'justify' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Text Transform */}
            <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px]">
              {(['none', 'uppercase', 'lowercase', 'capitalize'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTextTransform(t)}
                  className={`px-1.5 py-0.5 rounded uppercase font-semibold cursor-pointer ${textTransform === t ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                >
                  {t === 'none' ? 'Abc' : t.slice(0, 3)}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="ml-auto inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

          </div>
        )}

        {/* Main Content Area */}
        <div className={`flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar ${getThemeClasses()}`}>
          
          {activeTab === 'playground' ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                fontFamily: font.fontFaceFamily || 'inherit',
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`,
                textAlign: textAlign,
                textTransform: textTransform,
              }}
              className="w-full h-full bg-transparent border-0 resize-none focus:outline-none placeholder-slate-600 selection:bg-purple-500/30"
              placeholder="Type anything here to test the font..."
            />
          ) : (
            <div className="space-y-6">
              {waterfallSizes.map((sz) => (
                <div key={sz} className="border-b border-current/10 pb-4">
                  <div className="flex items-center justify-between text-[11px] font-mono opacity-50 mb-1">
                    <span>{sz}px</span>
                    <span>{font.family} {font.subfamily}</span>
                  </div>
                  <div
                    style={{
                      fontFamily: font.fontFaceFamily || 'inherit',
                      fontSize: `${sz}px`,
                      lineHeight: 1.25,
                      textTransform: textTransform,
                    }}
                    className="break-words select-all"
                  >
                    {text}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
