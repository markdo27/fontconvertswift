import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/primitives';
import { SAMPLE_PANGRAMS } from '../lib/glyphUtils';
import type { FontItem } from '../types/font';

const WATERFALL_SIZES = [12, 14, 16, 20, 24, 32, 40, 48, 64, 80, 96];

type Ground = 'paper' | 'ink';

interface SpecimenModalProps {
  font: FontItem;
  onClose: () => void;
}

export const SpecimenModal: React.FC<SpecimenModalProps> = ({ font, onClose }) => {
  const [text, setText] = useState('Sphinx of black quartz, judge my vow.');
  const [size, setSize] = useState(56);
  const [lineHeight, setLineHeight] = useState(1.25);
  const [tracking, setTracking] = useState(0);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
  const [transform, setTransform] = useState<'none' | 'uppercase' | 'lowercase'>('none');
  const [ground, setGround] = useState<Ground>('paper');
  const [mode, setMode] = useState<'specimen' | 'waterfall'>('specimen');

  const family = font.fontFaceFamily ? `'${font.fontFaceFamily}'` : undefined;

  const stage: React.CSSProperties = {
    background: ground === 'ink' ? 'var(--ink-deep)' : 'var(--cell)',
    color: ground === 'ink' ? 'var(--on-ink)' : 'var(--ink-deep)',
    borderRadius: 'var(--r-sm)',
    padding: 26,
    textTransform: 'none',
    letterSpacing: 0
  };

  const type: React.CSSProperties = {
    ...(family ? { fontFamily: family } : {}),
    fontSize: size,
    lineHeight,
    letterSpacing: `${tracking}px`,
    textAlign: align,
    textTransform: transform,
    wordBreak: 'break-word'
  };

  return (
    <Modal
      index="C"
      title="TYPE SPECIMEN"
      subtitle={`${font.family} ${font.subfamily} · ${font.weight}${font.isItalic ? ' ITALIC' : ''}`}
      onClose={onClose}
    >
      <div className="cell">
        <div className="spread">
          <div className="seg">
            <button type="button" aria-pressed={mode === 'specimen'} onClick={() => setMode('specimen')}>
              SPECIMEN
            </button>
            <button type="button" aria-pressed={mode === 'waterfall'} onClick={() => setMode('waterfall')}>
              WATERFALL
            </button>
          </div>

          <div className="seg">
            <button type="button" aria-pressed={ground === 'paper'} onClick={() => setGround('paper')}>
              PAPER
            </button>
            <button type="button" aria-pressed={ground === 'ink'} onClick={() => setGround('ink')}>
              INK
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="field">
            <span className="sr-only">Specimen text</span>
            <textarea
              className="textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type anything"
              style={{ minHeight: 64 }}
            />
          </label>
        </div>

        <div className="inline" style={{ marginTop: 12, gap: 6 }}>
          {SAMPLE_PANGRAMS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              className="btn btn--sm"
              onClick={() => setText(sample.text)}
              title={sample.text}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'specimen' ? (
        <>
          <div className="cell">
            <div className="grid-fields">
              <label className="field">
                <span>SIZE — {size}PX</span>
                <input
                  type="range"
                  min={8}
                  max={180}
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span>LINE HEIGHT — {lineHeight.toFixed(2)}</span>
                <input
                  type="range"
                  min={0.8}
                  max={2.5}
                  step={0.05}
                  value={lineHeight}
                  onChange={(event) => setLineHeight(Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span>TRACKING — {tracking}PX</span>
                <input
                  type="range"
                  min={-8}
                  max={24}
                  step={0.5}
                  value={tracking}
                  onChange={(event) => setTracking(Number(event.target.value))}
                />
              </label>
            </div>

            <div className="spread" style={{ marginTop: 18 }}>
              <div className="seg">
                {(['left', 'center', 'right'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={align === value}
                    onClick={() => setAlign(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="seg">
                {(['none', 'uppercase', 'lowercase'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={transform === value}
                    onClick={() => setTransform(value)}
                  >
                    {value === 'none' ? 'AS TYPED' : value}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  setSize(56);
                  setLineHeight(1.25);
                  setTracking(0);
                  setAlign('left');
                  setTransform('none');
                }}
              >
                <Icon name="undo" /> RESET
              </button>
            </div>
          </div>

          <div className="cell">
            <div style={stage}>
              <div style={type}>{text || 'Sphinx of black quartz, judge my vow.'}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="cell">
          <div style={stage}>
            {WATERFALL_SIZES.map((step) => (
              <div key={step} style={{ display: 'flex', gap: 18, alignItems: 'baseline', marginBottom: 14 }}>
                <span
                  className="faint"
                  style={{ fontSize: 9, letterSpacing: '0.12em', width: 34, flexShrink: 0 }}
                >
                  {step}
                </span>
                <span
                  style={{
                    ...(family ? { fontFamily: family } : {}),
                    fontSize: step,
                    lineHeight: 1.2,
                    textTransform: transform,
                    letterSpacing: `${tracking}px`,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {text || 'Sphinx of black quartz, judge my vow.'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};
