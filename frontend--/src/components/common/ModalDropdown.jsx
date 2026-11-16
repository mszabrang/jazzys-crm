import { useEffect, useRef, useState } from 'react';

// Same props as before, so AddOrderModal does not need to change:
// items = [{ id, first_name, last_name }], onChange receives an event-like { target: { value } }
//
// Looks the same as the normal dropdown (it reuses its styles), with a search box at the top of
// the list so a name can be typed instead of scrolling. Typing "ada obi" finds "Ada Obi".
export default function ModalDropdown({ items, onChange, value, placeholder }) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  const options = (items || []).map((item) => ({
    value: item.id,
    label: `${item.first_name} ${item.last_name}`,
  }));

  const selected = options.find((o) => String(o.value) === String(value));

  // Every word typed must appear somewhere in the name (any order, any capitals)
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = terms.length
    ? options.filter((o) => {
        const label = o.label.toLowerCase();
        return terms.every((t) => label.includes(t));
      })
    : options;

  function close() {
    setOpen(false);
    setQuery('');
  }

  // Close when tapping/clicking outside, or pressing Escape
  useEffect(() => {
    if (!open) return;

    function handlePointer(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
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

  // On a computer, start typing straight away. On a phone we do not pop the keyboard open
  // (it would cover the list); tap the search box when you want it.
  useEffect(() => {
    if (!open || !searchRef.current) return;
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!isTouch) searchRef.current.focus();
  }, [open]);

  // Keep the highlighted name in view when moving with the arrow keys
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${active}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function toggle() {
    if (open) {
      close();
      return;
    }
    // Open upwards if there is not enough room below (inside the modal)
    const rect = wrapRef.current.getBoundingClientRect();
    const container = wrapRef.current.closest('.modal__form');
    const cRect = container ? container.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const spaceBelow = cRect.bottom - rect.bottom;
    const spaceAbove = rect.top - cRect.top;
    setOpenUp(spaceBelow < 260 && spaceAbove > spaceBelow);
    setActive(Math.max(0, options.findIndex((o) => String(o.value) === String(value))));
    setOpen(true);
  }

  function choose(option) {
    onChange({ target: { value: option.value } });
    close();
  }

  function moveActive(key) {
    setActive((i) => {
      const next = key === 'ArrowDown' ? i + 1 : i - 1;
      return Math.min(filtered.length - 1, Math.max(0, next));
    });
  }

  // Keys while the button itself has focus
  function handleTriggerKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return toggle();
      moveActive(e.key);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) return toggle();
      if (filtered[active]) choose(filtered[active]);
    }
  }

  // Keys while typing in the search box
  function handleSearchKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(e.key);
    } else if (e.key === 'Enter') {
      e.preventDefault(); // never submit the order form from here
      if (filtered[active]) choose(filtered[active]);
    }
  }

  function handleSearchChange(e) {
    setQuery(e.target.value);
    setActive(0);
  }

  const filled = Boolean(selected);

  return (
    <div
      ref={wrapRef}
      className={`dropdown ${open ? 'dropdown--open' : ''} ${filled ? 'dropdown--filled' : ''}`}
    >
      <button
        type="button"
        className="dropdown__trigger"
        onClick={toggle}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dropdown__value">{selected ? selected.label : ''}</span>
        <span className="dropdown__label">{placeholder}</span>
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
          <li
            role="presentation"
            style={{ position: 'sticky', top: 0, zIndex: 1, padding: '0 0 6px', background: 'var(--white)' }}
          >
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={(e) => { e.target.style.borderColor = 'var(--black)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--grey-300)'; }}
              placeholder="Search name…"
              aria-label="Search name"
              autoComplete="off"
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                border: '1.5px solid var(--grey-300)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: "'Lora', serif",
                fontSize: 16,
                color: 'var(--black)',
                background: 'var(--white)',
                outline: 'none',
              }}
            />
          </li>

          {options.length === 0 && <li className="dropdown__empty">Nothing to choose from yet.</li>}
          {options.length > 0 && filtered.length === 0 && (
            <li className="dropdown__empty">No name matches “{query.trim()}”.</li>
          )}

          {filtered.map((o, i) => {
            const isSelected = String(o.value) === String(value);
            return (
              <li
                key={o.value}
                data-index={i}
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