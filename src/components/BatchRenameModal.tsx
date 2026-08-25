import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Layers, 
  Check, 
  FileText, 
  Wand2, 
  RefreshCw, 
  Edit3, 
  Sliders,
  Type,
  FolderTree,
  ArrowRight
} from 'lucide-react';
import { 
  FontItem, 
  STANDARD_WEIGHTS, 
  CasingOption, 
  BatchRenameConfig 
} from '../types/font';
import { 
  detectWeightAndStyle, 
  sanitizePostScriptName, 
  formatFileName 
} from '../lib/fontMetadata';

interface BatchRenameModalProps {
  selectedFonts: FontItem[];
  allFonts: FontItem[];
  isOpen: boolean;
  onClose: () => void;
  onApplyBatchRename: (updatedItems: Array<{ id: string; family: string; subfamily: string; weight: number; isItalic: boolean; fileName: string; postScriptName: string }>) => void;
}

interface FontDraft {
  id: string;
  originalFileName: string;
  currentFamily: string;
  currentSubfamily: string;
  currentWeight: number;
  newFamily: string;
  newSubfamily: string;
  newWeight: number;
  newIsItalic: boolean;
  newPostScriptName: string;
  newFileName: string;
  ext: string;
}

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({
  selectedFonts,
  allFonts,
  isOpen,
  onClose,
  onApplyBatchRename
}) => {
  if (!isOpen) return null;

  // If no specific fonts are selected, apply to all fonts
  const targetFonts = selectedFonts.length > 0 ? selectedFonts : allFonts;

  const [activeTab, setActiveTab] = useState<'family' | 'find_replace' | 'filename'>('family');
  
  // Master Controls
  const [masterFamily, setMasterFamily] = useState<string>('');
  const [useAutoWeight, setUseAutoWeight] = useState<boolean>(true);
  const [fileTemplate, setFileTemplate] = useState<string>('{family}-{style}');
  const [casing, setCasing] = useState<CasingOption>('none');
  
  // Find & Replace
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [useRegex, setUseRegex] = useState<boolean>(false);

  // Editable Drafts
  const [drafts, setDrafts] = useState<FontDraft[]>([]);

  // Initialize drafts when targetFonts change
  useEffect(() => {
    // Guess common family name from the first item or common prefix
    let initialMaster = '';
    if (targetFonts.length > 0) {
      initialMaster = targetFonts[0].family;
    }
    setMasterFamily(initialMaster);

    const initialDrafts: FontDraft[] = targetFonts.map(font => {
      const detected = detectWeightAndStyle(font.fileName, font.family, font.subfamily);
      const ext = font.originalFileName.split('.').pop() || 'ttf';
      const psName = sanitizePostScriptName(`${font.family}-${font.subfamily}`);
      
      return {
        id: font.id,
        originalFileName: font.originalFileName,
        currentFamily: font.family,
        currentSubfamily: font.subfamily,
        currentWeight: font.weight,
        newFamily: font.family,
        newSubfamily: font.subfamily,
        newWeight: font.weight,
        newIsItalic: font.isItalic,
        newPostScriptName: psName,
        newFileName: font.fileName,
        ext
      };
    });

    setDrafts(initialDrafts);
  }, [targetFonts]);

  // Recalculate drafts when master family or auto-weight toggles
  const applyMasterFamilyAndWeights = () => {
    setDrafts(prev => prev.map(d => {
      const familyToUse = masterFamily.trim() || d.currentFamily;
      let styleToUse = d.newSubfamily;
      let weightToUse = d.newWeight;
      let italicToUse = d.newIsItalic;

      if (useAutoWeight) {
        const detected = detectWeightAndStyle(d.originalFileName, familyToUse, d.currentSubfamily);
        styleToUse = detected.styleName;
        weightToUse = detected.weight;
        italicToUse = detected.isItalic;
      }

      const psName = sanitizePostScriptName(`${familyToUse}-${styleToUse}`);
      const fileName = formatFileName(fileTemplate, {
        family: familyToUse,
        style: styleToUse,
        weight: weightToUse,
        psname: psName,
        ext: d.ext
      }, casing);

      return {
        ...d,
        newFamily: familyToUse,
        newSubfamily: styleToUse,
        newWeight: weightToUse,
        newIsItalic: italicToUse,
        newPostScriptName: psName,
        newFileName: fileName
      };
    }));
  };

  // Run apply whenever master parameters change
  useEffect(() => {
    applyMasterFamilyAndWeights();
  }, [masterFamily, useAutoWeight, fileTemplate, casing]);

  // Handle Find & Replace
  const handleRunFindReplace = () => {
    if (!findText) return;

    setDrafts(prev => prev.map(d => {
      let fam = d.newFamily;
      let sub = d.newSubfamily;

      try {
        if (useRegex) {
          const regex = new RegExp(findText, 'gi');
          fam = fam.replace(regex, replaceText);
          sub = sub.replace(regex, replaceText);
        } else {
          fam = fam.split(findText).join(replaceText);
          sub = sub.split(findText).join(replaceText);
        }
      } catch (e) {
        console.error('Find/replace regex error:', e);
      }

      const psName = sanitizePostScriptName(`${fam}-${sub}`);
      const fileName = formatFileName(fileTemplate, {
        family: fam,
        style: sub,
        weight: d.newWeight,
        psname: psName,
        ext: d.ext
      }, casing);

      return {
        ...d,
        newFamily: fam,
        newSubfamily: sub,
        newPostScriptName: psName,
        newFileName: fileName
      };
    }));
  };

  const handleUpdateDraft = (id: string, updates: Partial<FontDraft>) => {
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d;
      const updated = { ...d, ...updates };
      const psName = sanitizePostScriptName(`${updated.newFamily}-${updated.newSubfamily}`);
      const fileName = formatFileName(fileTemplate, {
        family: updated.newFamily,
        style: updated.newSubfamily,
        weight: updated.newWeight,
        psname: psName,
        ext: d.ext
      }, casing);
      return {
        ...updated,
        newPostScriptName: psName,
        newFileName: fileName
      };
    }));
  };

  const handleApply = () => {
    const payload = drafts.map(d => ({
      id: d.id,
      family: d.newFamily,
      subfamily: d.newSubfamily,
      weight: d.newWeight,
      isItalic: d.newIsItalic,
      fileName: d.newFileName,
      postScriptName: d.newPostScriptName
    }));

    onApplyBatchRename(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Box */}
      <div className="relative w-full max-w-5xl h-[88vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Batch Rename & Weight Normalizer
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {targetFonts.length} Fonts Selected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Group multiple font variants into one unified family and standardize weights
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

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-900/60 flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('family')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'family'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Unified Family & Weights</span>
          </button>

          <button
            onClick={() => setActiveTab('find_replace')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'find_replace'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Find & Replace</span>
          </button>

          <button
            onClick={() => setActiveTab('filename')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'filename'
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Filename Patterns (Bash)</span>
          </button>
        </div>

        {/* Tab 1: Family & Weight Controls */}
        {activeTab === 'family' && (
          <div className="p-5 border-b border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Set Unified Family Name for All Fonts:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={masterFamily}
                  onChange={(e) => setMasterFamily(e.target.value)}
                  placeholder="e.g. Record Laser"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Updates OpenType Family Name (ID 1 &amp; 16) across all selected fonts so apps group them together.
              </p>
            </div>

            <div className="flex flex-col justify-between">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Smart Weight &amp; Style Mapping:
              </label>
              <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <input
                  type="checkbox"
                  id="autoWeight"
                  checked={useAutoWeight}
                  onChange={(e) => setUseAutoWeight(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="autoWeight" className="text-xs text-slate-300 cursor-pointer">
                  Auto-detect weights &amp; styles from filenames (e.g. Black $\rightarrow$ 900, Bold $\rightarrow$ 700)
                </label>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Sets <code className="font-mono text-slate-400">OS/2.usWeightClass</code> and <code className="font-mono text-slate-400">head.macStyle</code> flags automatically.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Find & Replace Controls */}
        {activeTab === 'find_replace' && (
          <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Find Text / Pattern:
              </label>
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="e.g. Record Laser or _"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Replace With:
              </label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="e.g. My Custom Font"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
              <input
                type="checkbox"
                id="useRegex"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
              />
              <label htmlFor="useRegex" className="text-xs text-slate-300 cursor-pointer">
                Regex
              </label>
            </div>

            <button
              onClick={handleRunFindReplace}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Replace in Selected
            </button>
          </div>
        )}

        {/* Tab 3: Filename Template Controls */}
        {activeTab === 'filename' && (
          <div className="p-5 border-b border-slate-800 bg-slate-950/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Filename Pattern:
              </label>
              <input
                type="text"
                value={fileTemplate}
                onChange={(e) => setFileTemplate(e.target.value)}
                placeholder="{family}-{style}"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Tokens: <code className="text-indigo-400 font-mono">&#123;family&#125;</code>, <code className="text-indigo-400 font-mono">&#123;style&#125;</code>, <code className="text-indigo-400 font-mono">&#123;weight&#125;</code>, <code className="text-indigo-400 font-mono">&#123;psname&#125;</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Case Formatting:
              </label>
              <select
                value={casing}
                onChange={(e) => setCasing(e.target.value as CasingOption)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="none">Preserve Original Casing</option>
                <option value="kebab">kebab-case (font-bold.ttf)</option>
                <option value="snake">snake_case (font_bold.ttf)</option>
                <option value="camel">camelCase (fontBold.ttf)</option>
                <option value="pascal">PascalCase (FontBold.ttf)</option>
                <option value="title">Title Case (Font Bold.ttf)</option>
                <option value="lower">lowercase (font bold.ttf)</option>
                <option value="upper">UPPERCASE (FONT BOLD.TTF)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-mono truncate">
                Example: <span className="text-emerald-400 font-semibold">{drafts[0]?.newFileName || 'font-bold.ttf'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Font Variants Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="space-y-3">
            {drafts.map((draft, idx) => (
              <div 
                key={draft.id} 
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                  
                  {/* Left: Input Family & Subfamily */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                    
                    {/* Family */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Font Family (ID 1 &amp; 16)
                      </label>
                      <input
                        type="text"
                        value={draft.newFamily}
                        onChange={(e) => handleUpdateDraft(draft.id, { newFamily: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Subfamily / Style */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Subfamily / Style (ID 2 &amp; 17)
                      </label>
                      <input
                        type="text"
                        value={draft.newSubfamily}
                        onChange={(e) => handleUpdateDraft(draft.id, { newSubfamily: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Weight Dropdown */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Weight Class (OS/2)
                      </label>
                      <select
                        value={draft.newWeight}
                        onChange={(e) => handleUpdateDraft(draft.id, { newWeight: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer font-mono"
                      >
                        {STANDARD_WEIGHTS.map(w => (
                          <option key={w.value} value={w.value}>
                            {w.value} - {w.keyword}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PostScript Name */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        PostScript Name (ID 6)
                      </label>
                      <input
                        type="text"
                        value={draft.newPostScriptName}
                        onChange={(e) => handleUpdateDraft(draft.id, { newPostScriptName: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                  </div>

                </div>

                {/* Filename Before & After Preview */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-500">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-slate-400">Original:</span>
                    <span className="text-slate-300 truncate max-w-xs">{draft.originalFileName}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-400">Output:</span>
                    <span className="text-emerald-400 font-semibold">{draft.newFileName}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Applying updates will rewrite OpenType <code className="font-mono text-slate-300">name</code>, <code className="font-mono text-slate-300">OS/2</code>, and <code className="font-mono text-slate-300">head</code> tables in memory.
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Changes ({drafts.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
