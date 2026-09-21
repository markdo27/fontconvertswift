import React, { useMemo, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Modal, Notice } from '../ui/primitives';
import { UNICODE_CATEGORIES, extractGlyphsFromFont } from '../lib/glyphUtils';
import type { FontItem, GlyphDetail } from '../types/font';

interface CharacterMapModalProps {
  font: FontItem;
  onClose: () => void;
  onNotify: (message: string) => void;
}

export const CharacterMapModal: React.FC<CharacterMapModalProps> = ({
  font,
  onClose,
  onNotify
}) => {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GlyphDetail | null>(null);

  const glyphs = useMemo(
    () => (font.parsedFont ? extractGlyphsFromFont(font.parsedFont) : []),
    [font.parsedFont]
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: glyphs.length };
    for (const glyph of glyphs) {
      result[glyph.category] = (result[glyph.category] || 0) + 1;
    }
    return result;
  }, [glyphs]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return glyphs.filter((glyph) => {
      if (category !== 'all' && glyph.category !== category) return false;
      if (!needle) return true;
      return (
        glyph.char?.toLowerCase() === needle ||
        glyph.name.toLowerCase().includes(needle) ||
        (glyph.unicodeHex || '').toLowerCase().includes(needle) ||
        String(glyph.unicode ?? '').includes(needle)
      );
    });
  }, [glyphs, category, query]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotify(`Copied ${what}`);
    } catch {
      onNotify(`Could not reach the clipboard`);
    }
  };

  const previewFamily = font.fontFaceFamily ? `'${font.fontFaceFamily}'` : undefined;
  const upm = font.unitsPerEm || 1000;

  /**
   * `glyph.getPath()` already returns screen coordinates — y grows downward and
   * the glyph sits above the baseline at negative y — so the path needs a
   * viewBox in those coordinates, not a second flip. The box is the glyph's own
   * bounding box, padded, falling back to the em square for blank glyphs.
   */
  const viewBox = useMemo(() => {
    if (!selected) return null;

    const hasBox =
      selected.xMin !== undefined &&
      selected.xMax !== undefined &&
      selected.yMin !== undefined &&
      selected.yMax !== undefined &&
      selected.xMax > selected.xMin &&
      selected.yMax > selected.yMin;

    const x = hasBox ? selected.xMin! : 0;
    const width = hasBox ? selected.xMax! - selected.xMin! : selected.advanceWidth || upm;
    // Screen-space y: the top of the glyph is -yMax, the bottom is -yMin.
    const y = hasBox ? -selected.yMax! : -upm * 0.75;
    const height = hasBox ? selected.yMax! - selected.yMin! : upm;

    const pad = Math.max(width, height) * 0.14;

    return {
      x: x - pad,
      width: width + pad * 2,
      box: `${x - pad} ${y - pad} ${width + pad * 2} ${height + pad * 2}`,
      hairline: Math.max(width, height) / 260
    };
  }, [selected, upm]);

  return (
    <Modal
      index="B"
      title="CHARACTER & GLYPH MAP"
      subtitle={`${font.family} ${font.subfamily} · ${glyphs.length} GLYPHS · UPM ${upm}`}
      onClose={onClose}
    >
      <div className="cell">
        <div className="spread">
          <label className="field grow" style={{ maxWidth: 320 }}>
            <span className="sr-only">Search glyphs</span>
            <input
              className="input input--plain"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by character, name or U+0041"
              spellCheck={false}
            />
          </label>
          <span className="count faint">
            {filtered.length} / {glyphs.length}
          </span>
        </div>

        <div className="inline" style={{ marginTop: 16, gap: 6 }}>
          {UNICODE_CATEGORIES.map((item) => {
            const count = counts[item.id] || 0;
            if (count === 0 && item.id !== 'all') return null;
            return (
              <button
                key={item.id}
                type="button"
                className="btn btn--sm"
                aria-pressed={category === item.id}
                style={
                  category === item.id
                    ? { background: 'var(--ink-deep)', borderColor: 'var(--ink-deep)', color: 'var(--on-ink)' }
                    : undefined
                }
                onClick={() => setCategory(item.id)}
              >
                {item.name} <span className="faint">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="cell">
          <div className="fieldset-title">
            <Icon name="ruler" /> GLYPH INSPECTOR
          </div>

          <div className="grid-fields" style={{ gridTemplateColumns: 'minmax(200px,1fr) 2fr' }}>
            <div className="glyph-stage">
              {selected.pathSvg && viewBox ? (
                <svg viewBox={viewBox.box} role="img" aria-label={`Outline of ${selected.name}`}>
                  {/* Baseline and origin, drawn in the same font units as the path. */}
                  <line
                    x1={viewBox.x}
                    y1={0}
                    x2={viewBox.x + viewBox.width}
                    y2={0}
                    stroke="var(--hair-strong)"
                    strokeWidth={viewBox.hairline}
                  />
                  <path d={selected.pathSvg} fill="var(--ink-deep)" />
                </svg>
              ) : (
                <span className="faint">NO OUTLINE</span>
              )}
            </div>

            <div>
              <div className="stats" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                <div>
                  NAME
                  <b className="plain truncate">{selected.name}</b>
                </div>
                <div>
                  UNICODE
                  <b>{selected.unicodeHex || '—'}</b>
                </div>
                <div>
                  INDEX
                  <b>{selected.index}</b>
                </div>
                <div>
                  ADVANCE
                  <b>{selected.advanceWidth}</b>
                </div>
                <div>
                  LSB
                  <b>{selected.leftSideBearing ?? '—'}</b>
                </div>
                <div>
                  X RANGE
                  <b>
                    {selected.xMin ?? '—'} … {selected.xMax ?? '—'}
                  </b>
                </div>
                <div>
                  Y RANGE
                  <b>
                    {selected.yMin ?? '—'} … {selected.yMax ?? '—'}
                  </b>
                </div>
              </div>

              <div className="inline" style={{ marginTop: 18 }}>
                {selected.char ? (
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => copy(selected.char!, 'character')}
                  >
                    <Icon name="copy" /> COPY CHARACTER
                  </button>
                ) : null}
                {selected.pathSvg ? (
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => copy(selected.pathSvg, 'SVG path')}
                  >
                    <Icon name="code" /> COPY SVG PATH
                  </button>
                ) : null}
                <button type="button" className="btn btn--sm" onClick={() => setSelected(null)}>
                  <Icon name="close" /> CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="cell">
        {filtered.length === 0 ? (
          <div className="empty">NO GLYPHS MATCH</div>
        ) : (
          <div className="glyphs">
            {filtered.map((glyph) => (
              <button
                key={`${glyph.index}-${glyph.unicode ?? 'x'}`}
                type="button"
                className="glyph"
                aria-selected={selected?.index === glyph.index}
                onClick={() => setSelected(glyph)}
                title={`${glyph.name}${glyph.unicodeHex ? ` · ${glyph.unicodeHex}` : ''}`}
              >
                <span
                  className="glyph-char"
                  style={previewFamily ? { fontFamily: previewFamily } : undefined}
                >
                  {glyph.char || '·'}
                </span>
                <span className="glyph-code">{glyph.unicodeHex || `#${glyph.index}`}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {glyphs.length === 0 ? (
        <Notice kind="warn">
          THE OUTLINES IN THIS FONT COULD NOT BE PARSED FOR INSPECTION. CONVERSION AND METADATA
          EDITING STILL WORK — THEY DO NOT DEPEND ON THE GLYPH PARSER.
        </Notice>
      ) : null}
    </Modal>
  );
};
