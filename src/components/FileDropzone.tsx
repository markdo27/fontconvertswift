import React, { useRef, useState } from 'react';
import { 
  UploadCloud, 
  FolderPlus, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ArrowRightLeft,
  CheckCircle2
} from 'lucide-react';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadDemoFonts: () => void;
  isLoading: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
  onLoadDemoFonts,
  isLoading
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files: File[] = [];
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && isFontFile(file.name)) {
            files.push(file);
          }
        }
      }
    } else if (e.dataTransfer.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (isFontFile(file.name)) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(f => isFontFile(f.name));
      if (files.length > 0) {
        onFilesSelected(files);
      }
      e.target.value = '';
    }
  };

  const isFontFile = (name: string): boolean => {
    const ext = name.toLowerCase().split('.').pop();
    return ['woff2', 'woff', 'ttf', 'otf'].includes(ext || '');
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-4 px-4">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".woff2,.woff,.ttf,.otf"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group rounded-3xl border-2 border-dashed transition-all duration-300 p-8 sm:p-10 text-center cursor-pointer overflow-hidden ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-950/30 scale-[1.01] shadow-2xl shadow-indigo-500/20'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
        }`}
      >
        {/* Glow ambient background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/10 via-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          
          {/* Animated Icon Circle */}
          <div className="w-18 h-18 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/60 shadow-xl flex items-center justify-center group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-300">
            <UploadCloud className="w-9 h-9 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Drop fonts here, or <span className="text-indigo-400 underline decoration-indigo-400/40 underline-offset-4">browse files</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Convert from <span className="font-semibold text-slate-200">WOFF2</span> &amp; <span className="font-semibold text-slate-200">WOFF</span> to <span className="font-semibold text-slate-200">TTF</span> / <span className="font-semibold text-slate-200">OTF</span> and vice versa.
            </p>
          </div>

          {/* Action Button Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Select Font Files</span>
            </button>

            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-slate-400" />
              <span>Upload Folder</span>
            </button>

            <button
              onClick={onLoadDemoFonts}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-200 text-xs sm:text-sm font-semibold border border-purple-500/30 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>Load Demo Fonts</span>
            </button>
          </div>

          {/* Feature Highlights Badges */}
          <div className="pt-5 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 border-t border-slate-800/80 w-full max-w-2xl">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>WASM Google Brotli &amp; WOFF2</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Private (Runs Client-Side)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
              <span>Batch Rename &amp; Family Grouping</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
