import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

// Modal dialog: closes on Escape and backdrop click, moves focus inside on open and back on close.
// Shown as a bottom sheet on phones (see .dialog-backdrop in index.css).
export function Dialog({ title, onClose, closeLabel, wide = false, children }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  // Parents pass inline handlers; keep the latest one without re-running the focus effect
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const focusable = dialogRef.current?.querySelector('input, select, textarea, button:not([data-close])');
    (focusable || dialogRef.current)?.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={`dialog${wide ? ' dialog-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="dialog-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn btn-quiet icon-btn" onClick={onClose} aria-label={closeLabel} data-close>
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}
