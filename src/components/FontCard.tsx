import React from 'react';
import { Icon } from '../ui/Icon';
import { Check } from '../ui/primitives';
import { formatBytes, formatDelta } from '../lib/format';
import {
  FONT_FORMATS,
  isMislabelledContainer,
  nativeDesktopFormat,
  type FontFormat,
  type FontItem
} from '../types/font';

interface FontCardProps {
  font: FontItem;
  index: number;
  sampleText: string;
  onToggleSelect: (id: string) => void;
  onChangeTargetFormat: (id: string, format: FontFormat) => void;
  onDownload: (font: FontItem) => void;
  onDelete: (id: string) => void;
  onRevert: (id: string) => void;
  onOpenCharacterMap: (font: FontItem) => void;
  onOpenSpecimen: (font: FontItem) => void;
  onOpenEdit: (font: FontItem) => void;
}

export const FontCard: React.FC<FontCardProps> = ({
  font,
  index,
  sampleText,
  onToggleSelect,
  onChangeTargetFormat,
  onDownload,
  onDelete,
  onRevert,
  onOpenCharacterMap,
  onOpenSpecimen,
  onOpenEdit
}) => {
  const mislabelled = isMislabelledContainer(font.outlineFlavor, font.targetFormat);
  const previewFamily = font.fontFaceFamily ? `'${font.fontFaceFamily}'` : undefined;

  return (
    <div className="cell font-cell" data-selected={font.isSelected}>
      <div className="font-head">
        <span className="dot idx">{String(index + 1).padStart(2, '0')}</span>
        <div className="name">
          <h3>{font.family}</h3>
          <div className="sub">{font.subfamily || 'REGULAR'}</div>
        </div>
        <Check
          checked={font.isSelected}
          onChange={() => onToggleSelect(font.id)}
          label={<span className="sr-only">Select {font.family}</span>}
          id={`sel-${font.id}`}
        />
      </div>

      <div
        className={`specimen${font.fontFaceFamily ? '' : ' specimen--loading'}`}
        style={previewFamily ? { fontFamily: previewFamily } : undefined}
      >
        {sampleText || 'Sphinx of black quartz'}
      </div>

      <div className="tags">
        <span className="tag tag--ink">{font.originalFormat}</span>
        <span className="tag">{font.outlineFlavor === 'cff' ? 'CFF' : 'TRUETYPE'}</span>
        <span className="tag">{font.weight}</span>
        {font.isItalic ? <span className="tag">ITALIC</span> : null}
        {font.isEdited ? <span className="tag tag--edited">EDITED</span> : null}
        {font.status === 'error' ? <span className="tag tag--red">ERROR</span> : null}
      </div>

      <div className="stats">
        <div>
          SOURCE
          <b>{formatBytes(font.originalSize)}</b>
        </div>
        <div>
          GLYPHS
          <b>{font.numGlyphs || '—'}</b>
        </div>
        <div>
          UPM
          <b>{font.unitsPerEm}</b>
        </div>
        <div>
          TABLES
          <b>{font.tableTags.length}</b>
        </div>
        {font.convertedSize !== null ? (
          <div>
            OUTPUT
            <b>
              {formatBytes(font.convertedSize)}{' '}
              <span className="faint">{formatDelta(font.originalSize, font.convertedSize)}</span>
            </b>
          </div>
        ) : null}
      </div>

      {font.status === 'error' && font.errorMessage ? (
        <div className="notice notice--warn" style={{ marginTop: 14 }}>
          <Icon name="warn" />
          <div className="plain">{font.errorMessage}</div>
        </div>
      ) : null}

      {mislabelled ? (
        <div className="notice" style={{ marginTop: 14 }}>
          <Icon name="info" />
          <div>
            THIS FONT HAS {font.outlineFlavor === 'cff' ? 'POSTSCRIPT (CFF)' : 'TRUETYPE'} OUTLINES.
            <b> .{nativeDesktopFormat(font.outlineFlavor)} </b>
            IS THE HONEST EXTENSION FOR IT.
          </div>
        </div>
      ) : null}

      <div className="font-actions">
        <label className="field" style={{ marginRight: 'auto' }}>
          <span className="sr-only">Output format</span>
          <select
            className="select"
            value={font.targetFormat}
            onChange={(event) => onChangeTargetFormat(font.id, event.target.value as FontFormat)}
            aria-label={`Output format for ${font.family}`}
            style={{ width: 'auto', padding: '6px 28px 6px 11px', fontSize: 9.5 }}
          >
            {FONT_FORMATS.map((format) => (
              <option key={format} value={format}>
                .{format}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn--sm btn--solid"
          onClick={() => onDownload(font)}
          disabled={font.status === 'converting'}
          title={`Export as .${font.targetFormat}`}
        >
          <Icon name={font.status === 'converting' ? 'refresh' : 'download'}
            className={font.status === 'converting' ? 'spin' : undefined} />
          EXPORT
        </button>

        <button type="button" className="btn btn--sm" onClick={() => onOpenEdit(font)} title="Edit metadata">
          <Icon name="edit" />
          EDIT
        </button>

        <button
          type="button"
          className="btn btn--sm"
          onClick={() => onOpenSpecimen(font)}
          title="Type specimen and waterfall"
        >
          <Icon name="type" />
          SPECIMEN
        </button>

        <button
          type="button"
          className="btn btn--sm"
          onClick={() => onOpenCharacterMap(font)}
          disabled={!font.parsedFont}
          title={font.parsedFont ? 'Character map' : 'Outlines could not be parsed for this font'}
        >
          <Icon name="eye" />
          GLYPHS
        </button>

        {font.isEdited ? (
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => onRevert(font.id)}
            title="Restore the metadata this file was loaded with"
          >
            <Icon name="undo" />
            REVERT
          </button>
        ) : null}

        <button
          type="button"
          className="btn btn--sm btn--icon btn--danger"
          onClick={() => onDelete(font.id)}
          aria-label={`Remove ${font.family}`}
          title="Remove"
        >
          <Icon name="trash" />
        </button>
      </div>
    </div>
  );
};
