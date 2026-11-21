import React, { useMemo, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Check, Field, Modal, Notice } from '../ui/primitives';
import {
  applyCasing,
  detectWeightAndStyle,
  formatFileName,
  sanitizePostScriptName
} from '../lib/fontMetadata';
import { STANDARD_WEIGHTS, type CasingOption, type FontItem, type FontNameFields } from '../types/font';

export interface BatchRenameResult {
  id: string;
  family: string;
  subfamily: string;
  weight: number;
  isItalic: boolean;
  isBold: boolean;
  postScriptName: string;
  fullName: string;
  fileName: string;
  metadata?: Partial<FontNameFields>;
  vendorID?: string;
}

interface Draft {
  id: string;
  sourceFileName: string;
  originalFamily: string;
  originalSubfamily: string;
  originalUniqueId: string;
  family: string;
  subfamily: string;
  weight: number;
  isItalic: boolean;
  ext: string;
  /** Set once a row is edited by hand, so bulk controls stop overwriting it. */
  pinned: boolean;
}

const CASINGS: Array<{ value: CasingOption; label: string }> = [
  { value: 'none', label: 'PRESERVE CASING' },
  { value: 'kebab', label: 'kebab-case' },
  { value: 'snake', label: 'snake_case' },
  { value: 'camel', label: 'camelCase' },
  { value: 'pascal', label: 'PascalCase' },
  { value: 'title', label: 'Title Case' },
  { value: 'lower', label: 'lowercase' },
  { value: 'upper', label: 'UPPERCASE' }
];

interface BatchRenameModalProps {
  fonts: FontItem[];
  onClose: () => void;
  onApply: (results: BatchRenameResult[]) => void;
}

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({ fonts, onClose, onApply }) => {
  const [unifiedFamily, setUnifiedFamily] = useState(fonts[0]?.family ?? '');
  const [applyFamily, setApplyFamily] = useState(true);
  const [autoWeight, setAutoWeight] = useState(true);
  const [fileTemplate, setFileTemplate] = useState('{family}-{style}');
  const [casing, setCasing] = useState<CasingOption>('none');

  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);

  // Attribution & Credit bulk controls
  const [applyMetadata, setApplyMetadata] = useState(false);
  const [designer, setDesigner] = useState(fonts[0]?.names.designer ?? '');
  const [designerURL, setDesignerURL] = useState(fonts[0]?.names.designerURL ?? '');
  const [manufacturer, setManufacturer] = useState(fonts[0]?.names.manufacturer ?? '');
  const [vendorURL, setVendorURL] = useState(fonts[0]?.names.vendorURL ?? '');
  const [vendorID, setVendorID] = useState(fonts[0]?.vendorID ?? '');
  const [version, setVersion] = useState(fonts[0]?.names.version ?? 'Version 1.000');
  const [copyright, setCopyright] = useState(fonts[0]?.names.copyright ?? '');
  const [trademark, setTrademark] = useState(fonts[0]?.names.trademark ?? '');
  const [license, setLicense] = useState(fonts[0]?.names.license ?? '');
  const [licenseURL, setLicenseURL] = useState(fonts[0]?.names.licenseURL ?? '');
  const [description, setDescription] = useState(fonts[0]?.names.description ?? '');
  const [autoUniqueId, setAutoUniqueId] = useState(true);

  const handlePresetVinafont = () => {
    setApplyMetadata(true);
    setDesigner('Mark Do');
    setDesignerURL('https://vinafont.com');
    setManufacturer('Vinafont');
    setVendorURL('https://vinafont.com');
    setVendorID('VNFN');
    setVersion('Version 1.000');
    setCopyright('Copyright 2026 Mark Do (Vinafont). All rights reserved.');
    setTrademark('');
    setLicense('This Font Software is licensed under the SIL Open Font License, Version 1.1.');
    setLicenseURL('https://openfontlicense.org');
    setDescription('Vinafont TypeForge Edition');
  };

  const handleClearCredit = () => {
    setApplyMetadata(true);
    setDesigner('');
    setDesignerURL('');
    setManufacturer('');
    setVendorURL('');
    setVendorID('');
    setCopyright('');
    setTrademark('');
    setLicense('');
    setLicenseURL('');
    setDescription('');
  };

  /**
   * Seeded once on mount from the fonts this modal was opened for. The list is
   * intentionally not a dependency of any effect: the previous version re-seeded
   * whenever the parent re-rendered, which threw away everything typed so far.
   */
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    fonts.map((font) => ({
      id: font.id,
      sourceFileName: font.originalFileName,
      originalFamily: font.family,
      originalSubfamily: font.subfamily,
      originalUniqueId: font.names.uniqueId,
      family: font.family,
      subfamily: font.subfamily,
      weight: font.weight,
      isItalic: font.isItalic,
      ext: font.targetFormat,
      pinned: false
    }))
  );

  /** Bulk controls are folded in at render time, so nothing is destructive. */
  const resolved = useMemo(() => {
    return drafts.map((draft) => {
      let family = draft.family;
      let subfamily = draft.subfamily;
      let weight = draft.weight;
      let isItalic = draft.isItalic;

      if (!draft.pinned) {
        if (applyFamily && unifiedFamily.trim()) family = unifiedFamily.trim();

        if (autoWeight) {
          const detected = detectWeightAndStyle(
            draft.sourceFileName,
            draft.originalFamily,
            draft.originalSubfamily
          );
          subfamily = detected.styleName;
          weight = detected.weight;
          isItalic = detected.isItalic;
        }
      }

      if (findText) {
        try {
          if (useRegex) {
            const regex = new RegExp(findText, 'gi');
            family = family.replace(regex, replaceText);
            subfamily = subfamily.replace(regex, replaceText);
          } else {
            family = family.split(findText).join(replaceText);
            subfamily = subfamily.split(findText).join(replaceText);
          }
        } catch {
          /* reported separately via regexError */
        }
      }

      const postScriptName = sanitizePostScriptName(
        `${applyCasing(family, casing === 'none' ? 'none' : 'pascal')}-${subfamily}`
      );
      const fileName = formatFileName(
        fileTemplate,
        { family, style: subfamily, weight, psname: postScriptName, ext: draft.ext },
        casing
      );

      let uniqueId = draft.originalUniqueId;
      if (applyMetadata && autoUniqueId) {
        const v = version.trim() || '1.000';
        const vend =
          vendorID.trim().slice(0, 4) ||
          manufacturer.trim().slice(0, 4) ||
          'VNFN';
        uniqueId = `${v};${vend};${postScriptName}`;
      }

      return {
        id: draft.id,
        sourceFileName: draft.sourceFileName,
        originalFamily: draft.originalFamily,
        originalSubfamily: draft.originalSubfamily,
        pinned: draft.pinned,
        family,
        subfamily,
        weight,
        isItalic,
        isBold: weight >= 700,
        postScriptName,
        fullName: `${family} ${subfamily}`.trim(),
        uniqueId,
        fileName
      };
    });
  }, [
    drafts,
    applyFamily,
    unifiedFamily,
    autoWeight,
    findText,
    replaceText,
    useRegex,
    fileTemplate,
    casing,
    applyMetadata,
    autoUniqueId,
    version,
    vendorID,
    manufacturer
  ]);

  const duplicates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of resolved) {
      const key = row.fileName.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name));
  }, [resolved]);

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch, pinned: true } : draft))
    );

  const handleFindChange = (value: string) => {
    setFindText(value);
    if (!useRegex || !value) {
      setRegexError(null);
      return;
    }
    try {
      new RegExp(value, 'gi');
      setRegexError(null);
    } catch (err) {
      setRegexError(err instanceof Error ? err.message : 'INVALID PATTERN');
    }
  };

  const handleApply = () => {
    onApply(
      resolved.map((row) => ({
        id: row.id,
        family: row.family,
        subfamily: row.subfamily,
        weight: row.weight,
        isItalic: row.isItalic,
        isBold: row.isBold,
        postScriptName: row.postScriptName,
        fullName: row.fullName,
        fileName: row.fileName,
        ...(applyMetadata
          ? {
              metadata: {
                designer,
                designerURL,
                manufacturer,
                vendorURL,
                version,
                copyright,
                trademark,
                license,
                licenseURL,
                description,
                ...(autoUniqueId ? { uniqueId: row.uniqueId } : {})
              },
              vendorID:
                vendorID.trim() ||
                (manufacturer.trim() ? manufacturer.trim().slice(0, 4) : undefined)
            }
          : {})
      }))
    );
    onClose();
  };

  return (
    <Modal
      index="D"
      title="BATCH RENAME & METADATA"
      subtitle={`${fonts.length} FONT${fonts.length > 1 ? 'S' : ''} SELECTED`}
      onClose={onClose}
      footer={
        <>
          <span className="note">
            {applyMetadata
              ? `WILL UPDATE FAMILY, WEIGHTS AND CREDIT/METADATA FOR ${resolved.length} FONT${resolved.length > 1 ? 'S' : ''}`
              : 'AUTHOR, COPYRIGHT, TRADEMARK AND LICENCE ARE LEFT UNTOUCHED'}
          </span>
          <div className="acts">
            <button type="button" className="btn" onClick={onClose}>
              CANCEL
            </button>
            <button type="button" className="btn btn--solid" onClick={handleApply}>
              <Icon name="check" />
              APPLY TO {resolved.length}
            </button>
          </div>
        </>
      }
    >
      {/* ---------- family and weights ---------- */}
      <div className="cell">
        <div className="fieldset-title">
          <Icon name="layers" /> UNIFIED FAMILY &amp; WEIGHTS
        </div>

        <div className="grid-fields">
          <Field
            label="MASTER FAMILY NAME"
            hint="name ID 1 / 16 / 21"
            value={unifiedFamily}
            onChange={setUnifiedFamily}
            placeholder="Record Laser"
          />
          <label className="field">
            <span>FILENAME CASING</span>
            <select
              className="select"
              value={casing}
              onChange={(event) => setCasing(event.target.value as CasingOption)}
            >
              {CASINGS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="stack" style={{ marginTop: 20, gap: 12 }}>
          <Check
            checked={applyFamily}
            onChange={setApplyFamily}
            label="GROUP EVERY FILE UNDER THE MASTER FAMILY NAME"
          />
          <Check
            checked={autoWeight}
            onChange={setAutoWeight}
            label="DETECT WEIGHT AND ITALIC FROM THE FILENAME, SET usWeightClass AND macStyle"
          />
        </div>
      </div>

      {/* ---------- find and replace ---------- */}
      <div className="cell">
        <div className="fieldset-title">
          <Icon name="search" /> FIND &amp; REPLACE
        </div>

        <div className="grid-fields">
          <Field label="FIND" value={findText} onChange={handleFindChange} placeholder="Old name" />
          <Field label="REPLACE WITH" value={replaceText} onChange={setReplaceText} placeholder="New name" />
        </div>

        <div style={{ marginTop: 18 }}>
          <Check
            checked={useRegex}
            onChange={(next) => {
              setUseRegex(next);
              setRegexError(null);
            }}
            label="TREAT THE FIND FIELD AS A REGULAR EXPRESSION"
          />
        </div>

        {regexError ? (
          <div style={{ marginTop: 16 }}>
            <Notice kind="warn">
              <span className="plain">{regexError}</span>
            </Notice>
          </div>
        ) : null}
      </div>

      {/* ---------- filename pattern ---------- */}
      <div className="cell">
        <div className="fieldset-title">
          <Icon name="file" /> FILENAME PATTERN
        </div>

        <Field
          label="TEMPLATE"
          hint="{family} {style} {weight} {psname}"
          value={fileTemplate}
          onChange={setFileTemplate}
          placeholder="{family}-{style}"
        />

        <div className="inline" style={{ marginTop: 14, gap: 6 }}>
          {['{family}-{style}', '{family}_{weight}', '{psname}', '{family}-{style}-{weight}'].map(
            (preset) => (
              <button
                key={preset}
                type="button"
                className="btn btn--sm"
                onClick={() => setFileTemplate(preset)}
              >
                {preset}
              </button>
            )
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <Notice>
            EXAMPLE OUTPUT: <b className="plain">{resolved[0]?.fileName || 'font.ttf'}</b>
          </Notice>
        </div>

        {duplicates.size > 0 ? (
          <div style={{ marginTop: 16 }}>
            <Notice kind="warn">
              {duplicates.size} OUTPUT NAME{duplicates.size > 1 ? 'S' : ''} WOULD COLLIDE. A COUNTER
              IS APPENDED WHEN THEY ARE EXPORTED TOGETHER.
            </Notice>
          </div>
        ) : null}
      </div>

      {/* ---------- attribution & metadata ---------- */}
      <div className="cell">
        <div className="spread">
          <div className="fieldset-title">
            <Icon name="shield" /> ATTRIBUTION &amp; METADATA (CREDIT)
          </div>
          <div className="inline" style={{ gap: 6 }}>
            <button
              type="button"
              className="btn btn--sm"
              onClick={handlePresetVinafont}
            >
              PRESET: VINAFONT
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={handleClearCredit}
            >
              CLEAR ALL CREDIT
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Check
            checked={applyMetadata}
            onChange={setApplyMetadata}
            label="OVERWRITE CREDIT &amp; METADATA FOR ALL SELECTED FONTS"
          />
        </div>

        {applyMetadata ? (
          <div style={{ marginTop: 18 }}>
            <div className="grid-fields">
              <Field
                label="DESIGNER / AUTHOR"
                hint="ID 9"
                value={designer}
                onChange={setDesigner}
                placeholder="Mark Do"
              />
              <Field
                label="DESIGNER URL"
                hint="ID 12"
                value={designerURL}
                onChange={setDesignerURL}
                placeholder="https://"
              />
              <Field
                label="MANUFACTURER / FOUNDRY"
                hint="ID 8"
                value={manufacturer}
                onChange={setManufacturer}
                placeholder="Vinafont"
              />
              <Field
                label="VENDOR URL"
                hint="ID 11"
                value={vendorURL}
                onChange={setVendorURL}
                placeholder="https://"
              />
              <Field
                label="VENDOR ID"
                hint="OS/2.achVendID (4 chars)"
                value={vendorID}
                onChange={setVendorID}
                placeholder="VNFN"
              />
              <Field
                label="VERSION"
                hint="ID 5"
                value={version}
                onChange={setVersion}
                placeholder="Version 1.000"
              />
              <Field
                label="COPYRIGHT"
                hint="ID 0"
                value={copyright}
                onChange={setCopyright}
                placeholder="Copyright 2026..."
              />
              <Field
                label="TRADEMARK"
                hint="ID 7"
                value={trademark}
                onChange={setTrademark}
              />
              <Field
                label="LICENCE URL"
                hint="ID 14"
                value={licenseURL}
                onChange={setLicenseURL}
                placeholder="https://"
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <Field
                label="LICENCE DESCRIPTION"
                hint="ID 13"
                value={license}
                onChange={setLicense}
                multiline
                placeholder="This Font Software is licensed under the SIL Open Font License, Version 1.1."
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <Field
                label="DESCRIPTION"
                hint="ID 10"
                value={description}
                onChange={setDescription}
                multiline
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <Check
                checked={autoUniqueId}
                onChange={setAutoUniqueId}
                label="AUTO-GENERATE UNIQUE ID (ID 3): {version};{vendor};{postScriptName}"
              />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <Notice>
              CHECK THE BOX ABOVE OR CLICK A PRESET TO BATCH EDIT DESIGNER, FOUNDRY, COPYRIGHT AND LICENCE.
            </Notice>
          </div>
        )}
      </div>

      {/* ---------- per file preview ---------- */}
      <div className="cell">
        <div className="fieldset-title">
          <Icon name="list" /> PREVIEW — EDIT ANY ROW TO PIN IT
        </div>

        <div className="stack" style={{ gap: 10 }}>
          {resolved.map((row) => (
            <div
              key={row.id}
              style={{
                padding: '14px 0 0',
                borderTop: '1px solid var(--hair)'
              }}
            >
              <div className="spread" style={{ marginBottom: 12 }}>
                <span className="faint truncate plain" style={{ fontSize: 10.5 }}>
                  {row.sourceFileName}
                </span>
                {row.pinned ? (
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() =>
                      setDrafts((prev) =>
                        prev.map((draft) =>
                          draft.id === row.id
                            ? {
                                ...draft,
                                pinned: false,
                                family: draft.originalFamily,
                                subfamily: draft.originalSubfamily
                              }
                            : draft
                        )
                      )
                    }
                  >
                    <Icon name="undo" /> UNPIN
                  </button>
                ) : null}
              </div>

              <div className="grid-fields">
                <Field
                  label="FAMILY"
                  value={row.family}
                  onChange={(value) => updateDraft(row.id, { family: value })}
                />
                <Field
                  label="STYLE"
                  value={row.subfamily}
                  onChange={(value) => updateDraft(row.id, { subfamily: value })}
                />
                <label className="field">
                  <span>WEIGHT</span>
                  <select
                    className="select"
                    value={row.weight}
                    onChange={(event) =>
                      updateDraft(row.id, { weight: Number(event.target.value) })
                    }
                  >
                    {STANDARD_WEIGHTS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} — {option.keyword}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field">
                  <span>OUTPUT</span>
                  <div
                    className="truncate plain"
                    style={{
                      padding: '10px 0',
                      color: duplicates.has(row.fileName.toLowerCase())
                        ? 'var(--red)'
                        : 'var(--ink)',
                      fontSize: 11.5
                    }}
                    title={row.fileName}
                  >
                    {row.fileName}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <Check
                  checked={row.isItalic}
                  onChange={(next) => updateDraft(row.id, { isItalic: next })}
                  label="ITALIC"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
