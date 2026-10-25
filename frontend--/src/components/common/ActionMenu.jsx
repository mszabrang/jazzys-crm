import { useEffect, useRef, useState } from 'react';

// The "⋮" button on a card. Opens a small menu with Edit and/or Delete
// (an option is hidden when its handler is not passed).
// It stops clicks from reaching the card underneath, so the card does not also open.
export default function ActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function run(fn) {
    return (e) => {
      e.stopPropagation();
      setOpen(false);
      fn();
    };
  }

  return (
    <div
      ref={ref}
      className={`action-menu ${open ? 'action-menu--open' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="action-menu__btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <circle cx="9" cy="3.5" r="1.5" />
          <circle cx="9" cy="9" r="1.5" />
          <circle cx="9" cy="14.5" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="action-menu__list" role="menu">
          {onEdit && (
            <button type="button" role="menuitem" className="action-menu__item" onClick={run(onEdit)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M2 14l1-3.5L11.5 2 14 4.5 5.5 13 2 14z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" role="menuitem" className="action-menu__item action-menu__item--danger" onClick={run(onDelete)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}