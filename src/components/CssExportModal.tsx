import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Code } from 'lucide-react';
import { FontItem } from '../types/font';
import saveAs from 'file-saver';

interface CssExportModalProps {
  fonts: FontItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const CssExportModal: React.FC<CssExportModalProps> = ({
  fonts,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  const generateCss = (): string => {
    if (fonts.length === 0) return '/* No fonts loaded */';

    const rules = fonts.map(font => {
      const formatStr = 
        font.targetFormat === 'woff2' ? "format('woff2')" :
        font.targetFormat === 'woff' ? "format('woff')" :
        font.targetFormat === 'otf' ? "format('opentype')" :
        "format('truetype')";

      const fontStyle = font.isItalic ? 'italic' : 'normal';

      return `@font-face {
  font-family: '${font.family}';
  src: url('./${font.fileName}') ${formatStr};
  font-weight: ${font.weight};
  font-style: ${fontStyle};
  font-display: swap;
}`;
    });

    return `/* TypeForge Generated @font-face CSS */\n\n` + rules.join('\n\n');
  };

  const cssContent = generateCss();

  const handleCopy = () => {
    navigator.clipboard.writeText(cssContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([cssContent], { type: 'text/css;charset=utf-8' });
    saveAs(blob, 'fonts.css');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                CSS @font-face Generator
              </h2>
              <p className="text-xs text-slate-400">
                Ready-to-use CSS snippets for web projects
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

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-indigo-200 overflow-x-auto">
            <pre>{cssContent}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {fonts.length} @font-face declarations
          </span>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy CSS'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download fonts.css</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
