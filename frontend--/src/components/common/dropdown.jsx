import { useEffect, useRef, useState } from 'react';

// A styled dropdown that looks the same on every phone and computer
// (the normal <select> opens the device's own menu, which can't be styled).
//
// options: [{ value: 'abc', label: 'Ada Obi' }]
// onChange receives the new value (a string)
export default function dropdown({ label, options, value, onChange, id }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  // Close when tapping/clicking outside, or pressing Escape
  useEffect(() => {
    if (!open) return;

    function handlePointer(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [open]);

  // Keep the highlighted option in view when using the keyboard
  useEffect(() => {
    if (!open || active < 0 || !listRef.current) return;
    const el = listRef.current.children[active];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    // Open upwards if there is not enough room below (inside a modal or on the page)
    const rect = wrapRef.current.getBoundingClientRect();
    const container = wrapRef.current.closest('.modal__form');
    const cRect = container ? container.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const spaceBelow = cRect.bottom - rect.bottom;
    const spaceAbove = rect.top - cRect.top;
    setOpenUp(spaceBelow < 220 && spaceAbove > spaceBelow);
    setActive(Math.max(0, options.findIndex((o) => String(o.value) === String(value))));
    setOpen(true);
  }

  function choose(option) {
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return toggle();
      setActive((i) => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1;
        return Math.min(options.length - 1, Math.max(0, next));
      });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) return toggle();
      if (options[active]) choose(options[active]);
    }
  }

  const filled = Boolean(selected);

  return (
    <div
      ref={wrapRef}
      className={`dropdown ${open ? 'dropdown--open' : ''} ${filled ? 'dropdown--filled' : ''}`}
    >
      <button
        type="button"
        id={id}
        className="dropdown__trigger"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dropdown__value">{selected ? selected.label : ''}</span>
        <span className="dropdown__label">{label}</span>
        <svg className="dropdown__chevron" width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          className={`dropdown__list ${openUp ? 'dropdown__list--up' : ''}`}
          role="listbox"
        >
          {options.length === 0 && <li className="dropdown__empty">Nothing to choose from yet.</li>}
          {options.map((o, i) => {
            const isSelected = String(o.value) === String(value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                className={`dropdown__option ${i === active ? 'dropdown__option--active' : ''} ${isSelected ? 'dropdown__option--selected' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                <span>{o.label}</span>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}