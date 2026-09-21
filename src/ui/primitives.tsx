import React, { useEffect, useRef } from 'react';
import { Icon, type IconName } from './Icon';

/* ------------------------------------------------------------------ */
/* Checkbox                                                            */
/* ------------------------------------------------------------------ */

interface CheckProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  id?: string;
}

export const Check: React.FC<CheckProps> = ({ checked, indeterminate, onChange, label, id }) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked;
  }, [indeterminate, checked]);

  return (
    <label className="check" htmlFor={id}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="box">
        <Icon name="check" />
      </span>
      <span>{label}</span>
    </label>
  );
};

/* ------------------------------------------------------------------ */
/* Text field                                                          */
/* ------------------------------------------------------------------ */

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  /** Preserve the user's own casing instead of the sheet-wide uppercase. */
  plain?: boolean;
  multiline?: boolean;
  type?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
  plain = true,
  multiline,
  type = 'text'
}) => (
  <label className="field">
    <span>
      {label}
      {hint ? <em className="faint"> — {hint}</em> : null}
    </span>
    {multiline ? (
      <textarea
        className="textarea"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        className={`input${plain ? ' input--plain' : ''}`}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    )}
  </label>
);

/* ------------------------------------------------------------------ */
/* Modal shell                                                         */
/* ------------------------------------------------------------------ */

interface ModalProps {
  /** Dot-matrix index shown at the left of the title bar, e.g. "E". */
  index: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  narrow?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Mounted only while open, so every hook inside a modal body runs on a clean
 * mount and its state starts from the font it was opened for.
 */
export const Modal: React.FC<ModalProps> = ({
  index,
  title,
  subtitle,
  onClose,
  narrow,
  children,
  footer
}) => {
  const scrimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="scrim"
      ref={scrimRef}
      onMouseDown={(event) => {
        if (event.target === scrimRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`modal${narrow ? ' modal--narrow' : ''}`}>
        <div className="modal-bar">
          <span className="dot">{index}</span>
          <div className="grow">
            <h2>{title}</h2>
            {subtitle ? <div className="sub truncate">{subtitle}</div> : null}
          </div>
          <button type="button" className="btn btn--icon" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-scroll">{children}</div>

        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Notice                                                              */
/* ------------------------------------------------------------------ */

export const Notice: React.FC<{
  kind?: 'info' | 'warn';
  icon?: IconName;
  children: React.ReactNode;
}> = ({ kind = 'info', icon, children }) => (
  <div className={`notice${kind === 'warn' ? ' notice--warn' : ''}`}>
    <Icon name={icon || (kind === 'warn' ? 'warn' : 'info')} />
    <div>{children}</div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Section bar                                                         */
/* ------------------------------------------------------------------ */

export const Bar: React.FC<{
  index: string;
  title: string;
  count?: string;
  children?: React.ReactNode;
}> = ({ index, title, count, children }) => (
  <div className="bar">
    <span className="dot">{index}</span>
    <h2>{title}</h2>
    {count ? <span className="count">/ {count}</span> : null}
    {children ? <div className="bar-end">{children}</div> : null}
  </div>
);
