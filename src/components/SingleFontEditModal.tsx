import React, { useState, useEffect } from 'react';
import { X, Check, Edit, FileText, Info } from 'lucide-react';
import { FontItem, STANDARD_WEIGHTS } from '../types/font';
import { sanitizePostScriptName } from '../lib/fontMetadata';

interface SingleFontEditModalProps {
  font: FontItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFont: {
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
  }) => void;
}

export const SingleFontEditModal: React.FC<SingleFontEditModalProps> = ({
  font,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen || !font) return null;

  const [family, setFamily] = useState(font.family);
  const [subfamily, setSubfamily] = useState(font.subfamily);
  const [fullName, setFullName] = useState(font.fullName);
  const [postScriptName, setPostScriptName] = useState(font.postScriptName);
  const [uniqueId, setUniqueId] = useState(font.uniqueId);
  const [version, setVersion] = useState(font.version);
  const [weight, setWeight] = useState(font.weight);
  const [isItalic, setIsItalic] = useState(font.isItalic);
  const [isBold, setIsBold] = useState(font.isBold);
  const [fileName, setFileName] = useState(font.fileName);
  const [copyright, setCopyright] = useState(font.copyright || '');
  const [designer, setDesigner] = useState(font.designer || '');
  const [manufacturer, setManufacturer] = useState(font.manufacturer || '');

  useEffect(() => {
    setFamily(font.family);
    setSubfamily(font.subfamily);
    setFullName(font.fullName);
    setPostScriptName(font.postScriptName);
    setUniqueId(font.uniqueId);
    setVersion(font.version);
    setWeight(font.weight);
    setIsItalic(font.isItalic);
    setIsBold(font.isBold);
    setFileName(font.fileName);
    setCopyright(font.copyright || '');
    setDesigner(font.designer || '');
    setManufacturer(font.manufacturer || '');
  }, [font]);

  const handleFamilyChange = (val: string) => {
    setFamily(val);
    setFullName(`${val} ${subfamily}`.trim());
    setPostScriptName(sanitizePostScriptName(`${val}-${subfamily}`));
  };

  const handleSubfamilyChange = (val: string) => {
    setSubfamily(val);
    setFullName(`${family} ${val}`.trim());
    setPostScriptName(sanitizePostScriptName(`${family}-${val}`));
  };

  const handleSave = () => {
    onSave({
      id: font.id,
      family,
      subfamily,
      fullName,
      postScriptName,
      uniqueId,
      version,
      weight,
      isItalic,
      isBold,
      fileName,
      copyright,
      designer,
      manufacturer
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Edit Font Metadata
              </h2>
              <p className="text-xs text-slate-400">
                Modify OpenType name table and OS/2 metrics
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

        {/* Content Form */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Family Name (ID 1 &amp; 16)
              </label>
              <input
                type="text"
                value={family}
                onChange={(e) => handleFamilyChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Subfamily / Style (ID 2 &amp; 17)
              </label>
              <input
                type="text"
                value={subfamily}
                onChange={(e) => handleSubfamilyChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Full Name (ID 4)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                PostScript Name (ID 6)
              </label>
              <input
                type="text"
                value={postScriptName}
                onChange={(e) => setPostScriptName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Weight Class (OS/2)
              </label>
              <select
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
              >
                {STANDARD_WEIGHTS.map(w => (
                  <option key={w.value} value={w.value}>
                    {w.value} - {w.keyword}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Version String (ID 5)
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Output File Name
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6 pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isItalic}
                onChange={(e) => setIsItalic(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 cursor-pointer"
              />
              <span className="text-slate-300 font-medium">Italic / Oblique Flag</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBold}
                onChange={(e) => setIsBold(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 cursor-pointer"
              />
              <span className="text-slate-300 font-medium">Bold Flag</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block font-semibold text-slate-400 mb-1">
                Designer / Author
              </label>
              <input
                type="text"
                value={designer}
                onChange={(e) => setDesigner(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-400 mb-1">
                Manufacturer / Foundry
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Metadata</span>
          </button>
        </div>

      </div>
    </div>
  );
};
