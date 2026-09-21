import React, { useMemo, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Check, Field, Modal, Notice } from '../ui/primitives';
import { sanitizePostScriptName } from '../lib/fontMetadata';
import { STANDARD_WEIGHTS, type FontItem, type FontNameFields } from '../types/font';
import { replaceExtension } from '../lib/format';

export interface MetadataDraft {
  family: string;
  subfamily: string;
  weight: number;
  isItalic: boolean;
  isBold: boolean;
  fileName: string;
  names: FontNameFields;
}

interface MetadataModalProps {
  font: FontItem;
  onClose: () => void;
  onSave: (id: string, draft: MetadataDraft) => void;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({ font, onClose, onSave }) => {
  const [family, setFamily] = useState(font.family);
  const [subfamily, setSubfamily] = useState(font.subfamily);
  const [weight, setWeight] = useState(font.weight);
  const [isItalic, setIsItalic] = useState(font.isItalic);
  const [isBold, setIsBold] = useState(font.isBold);
  const [fileName, setFileName] = useState(font.fileName);
  const [names, setNames] = useState<FontNameFields>(font.names);

  /**
   * While linked, the full name and PostScript name follow the family and
   * style. Editing either one by hand unlinks it, so a deliberate value is
   * never overwritten by a later family rename.
   */
  const [linkDerived, setLinkDerived] = useState(
    font.names.fullName === `${font.family} ${font.subfamily}`.trim()
  );

  const setName = (key: keyof FontNameFields, value: string) =>
    setNames((prev) => ({ ...prev, [key]: value }));

  const applyIdentity = (nextFamily: string, nextSubfamily: string) => {
    setFamily(nextFamily);
    setSubfamily(nextSubfamily);
    if (!linkDerived) return;

    const fullName = `${nextFamily} ${nextSubfamily}`.trim();
    setNames((prev) => ({
      ...prev,
      fullName,
      postScriptName: sanitizePostScriptName(`${nextFamily}-${nextSubfamily}`)
    }));
  };

  const psIssue = useMemo(() => {
    const cleaned = sanitizePostScriptName(names.postScriptName);
    if (!names.postScriptName.trim()) return 'REQUIRED — A FONT WITHOUT A POSTSCRIPT NAME MAY NOT INSTALL.';
    if (cleaned !== names.postScriptName) return `WILL BE SAVED AS "${cleaned}" — SPACES AND []{}()<>/% ARE NOT ALLOWED.`;
    return null;
  }, [names.postScriptName]);

  const familyIssue = !family.trim() ? 'REQUIRED.' : null;

  const previewFamily = font.fontFaceFamily ? `'${font.fontFaceFamily}'` : undefined;

  const handleSave = () => {
    if (familyIssue) return;
    onSave(font.id, {
      family: family.trim(),
      subfamily: subfamily.trim() || 'Regular',
      weight,
      isItalic,
      isBold,
      fileName: fileName.trim() || font.fileName,
      names: { ...names, postScriptName: sanitizePostScriptName(names.postScriptName) }
    });
    onClose();
  };

  return (
    <Modal
      index="E"
      title="EDIT FONT METADATA"
      subtitle={`${font.family} ${font.subfamily} · ${font.tableTags.length} TABLES`}
      onClose={onClose}
      footer={
        <>
          <span className="note">
            WRITES THE NAME, OS/2 AND HEAD TABLES ONLY · {font.tableTags.length - 3} OTHER TABLES
            COPIED UNTOUCHED
          </span>
          <div className="acts">
            <button type="button" className="btn" onClick={onClose}>
              CANCEL
            </button>
            <button
              type="button"
              className="btn btn--solid"
              onClick={handleSave}
              disabled={Boolean(familyIssue)}
            >
              <Icon name="check" />
              SAVE METADATA
            </button>
          </div>
        </>
      }
    >
      <div className="cell">
        <div
          className="specimen"
          style={{ ...(previewFamily ? { fontFamily: previewFamily } : {}), margin: 0 }}
        >
          {family || 'Family name'} <span className="faint">{subfamily}</span>
        </div>
      </div>

      {/* ---------- identity ---------- */}
      <div className="cell">
        <div className="fieldset-title">
          <Icon name="type" /> IDENTITY
        </div>

        <div className="grid-fields">
          <Field
            label="FAMILY NAME"
            hint="ID 1 / 16 / 21"
            value={family}
            onChange={(value) => applyIdentity(value, subfamily)}
            placeholder="Record Laser"
          />
          <Field
            label="SUBFAMILY / STYLE"
            hint="ID 2 / 17 / 22"
            value={subfamily}
            onChange={(value) => applyIdentity(family, value)}
            placeholder="Bold Italic"
          />
          <Field
            label="FULL NAME"
            hint="ID 4"
            value={names.fullName}
            onChange={(value) => {
              setLinkDerived(false);
              setName('fullName', value);
            }}
          />
          <Field
            label="POSTSCRIPT NAME"
            hint="ID 6"
            value={names.postScriptName}
            onChange={(value) => {
              setLinkDerived(false);
              setName('postScriptName', value);
            }}
          />
          <Field
            label="VERSION"
            hint="ID 5"
            value={names.version}
            onChange={(value) => setName('version', value)}
            placeholder="Version 1.000"
          />
          <Field
            label="UNIQUE ID"
            hint="ID 3"
            value={names.uniqueId}
            onChange={(value) => setName('uniqueId', value)}
          />
        </div>

        {familyIssue ? (
          <div style={{ marginTop: 16 }}>
            <Notice kind="warn">FAMILY NAME {familyIssue}</Notice>
          </div>
        ) : null}
        {psIssue ? (
          <div style={{ marginTop: 16 }}>
            <Notice kind="warn">POSTSCRIPT NAME {psIssue}</Notice>
          </div>
        ) : null}
        {linkDerived ? null : (
          <div style={{ marginTop: 16 }}>
            <Notice>
              FULL NAME AND POSTSCRIPT NAME ARE SET BY HAND AND NO LONGER FOLLOW THE FAMILY.{' '}
              <button
                type="button"
                className="btn btn--sm"
                style={{ marginLeft: 8 }}
                onClick={() => {
                  setLinkDerived(true);
                  applyIdentity(family, subfamily);
                  setNames((prev) => ({
                    ...prev,
                    fullName: `${family} ${subfamily}`.trim(),
                    postScriptName: sanitizePostScriptName(`${family}-${subfamily}`)
                  }));
                }}
              >
                <Icon name="refresh" /> RELINK
              </button>
            </Notice>
          </div>
        )}
      </div>

      {/* ---------- weight and style ---------- */}
      <div className="cell">
        <div className="fieldset-title">
          <Icon name="sliders" /> WEIGHT &amp; STYLE FLAGS
        </div>

        <div className="grid-fields">
          <label className="field">
            <span>WEIGHT CLASS — OS/2.usWeightClass</span>
            <select
              className="select"
              value={weight}
              onChange={(event) => {
                const next = Number(event.target.value);
                setWeight(next);
                setIsBold(next >= 700);
              }}
            >
              {STANDARD_WEIGHTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Field
            label="OUTPUT FILE NAME"
            value={fileName}
            onChange={setFileName}
            hint={`.${font.targetFormat}`}
          />
        </div>

        <div className="inline" style={{ marginTop: 20, gap: 26 }}>
          <Check
            checked={isItalic}
            onChange={setIsItalic}
            label="ITALIC — fsSelection bit 0, macStyle bit 1"
          />
          <Check
            checked={isBold}
            onChange={setIsBold}
            label="BOLD — fsSelection bit 5, macStyle bit 0"
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <Notice>
            EVERY OTHER fsSelection BIT — USE_TYPO_METRICS, WWS, OBLIQUE — IS LEFT AS THE FONT HAD
            IT, SO EDITING A NAME CANNOT CHANGE HOW THE FONT LINE SPACES.
          </Notice>
        </div>
      </div>

      {/* ---------- attribution: the author section ---------- */}
      <div className="cell">
        <div className="fieldset-title">
          <Icon name="shield" /> ATTRIBUTION
        </div>

        <div className="grid-fields">
          <Field
            label="DESIGNER / AUTHOR"
            hint="ID 9"
            value={names.designer}
            onChange={(value) => setName('designer', value)}
            placeholder="Mark Do"
          />
          <Field
            label="DESIGNER URL"
            hint="ID 12"
            value={names.designerURL}
            onChange={(value) => setName('designerURL', value)}
            placeholder="https://"
          />
          <Field
            label="MANUFACTURER / FOUNDRY"
            hint="ID 8"
            value={names.manufacturer}
            onChange={(value) => setName('manufacturer', value)}
          />
          <Field
            label="VENDOR URL"
            hint="ID 11"
            value={names.vendorURL}
            onChange={(value) => setName('vendorURL', value)}
            placeholder="https://"
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <Field
            label="DESCRIPTION"
            hint="ID 10"
            value={names.description}
            onChange={(value) => setName('description', value)}
            multiline
          />
        </div>
      </div>

      {/* ---------- licence ---------- */}
      <div className="cell">
        <div className="fieldset-title">
          <Icon name="file" /> COPYRIGHT &amp; LICENCE
        </div>

        <div className="grid-fields">
          <Field
            label="COPYRIGHT"
            hint="ID 0"
            value={names.copyright}
            onChange={(value) => setName('copyright', value)}
          />
          <Field
            label="TRADEMARK"
            hint="ID 7"
            value={names.trademark}
            onChange={(value) => setName('trademark', value)}
          />
          <Field
            label="LICENCE URL"
            hint="ID 14"
            value={names.licenseURL}
            onChange={(value) => setName('licenseURL', value)}
            placeholder="https://"
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <Field
            label="LICENCE DESCRIPTION"
            hint="ID 13"
            value={names.license}
            onChange={(value) => setName('license', value)}
            multiline
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <Notice kind="warn">
            RENAMING A TYPEFACE DOES NOT RELICENSE IT. CLEARING A COPYRIGHT OR LICENCE ENTRY ONLY
            CHANGES THIS FILE, NOT YOUR RIGHT TO USE OR REDISTRIBUTE THE DESIGN.
          </Notice>
        </div>
      </div>
    </Modal>
  );
};

export { replaceExtension };
