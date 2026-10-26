import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

export default function FilterDropdown({ value, options, onChange, disabled = false, className = '', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const [position, setPosition] = useState({});
  const menuId = useId();
  const selected = options.find(option => option.value === value) || options[0];
  useEffect(() => {
    const outside = event => { if (!root.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);
  useEffect(() => {
    if (open && position.width) menu.current?.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
  }, [open, position.width]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const upwards = below < Math.min(options.length * 42 + 16, 240) && above > below;
      setPosition({ position: 'fixed', width, minWidth: 0, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)), right: 'auto', top: upwards ? 'auto' : rect.bottom + 8, bottom: upwards ? window.innerHeight - rect.top + 8 : 'auto', maxHeight: Math.max(80, Math.min(300, upwards ? above : below)), zIndex: 2100 });
    };
    place();
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true); };
  }, [open, options.length]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const move = (event, index) => {
    const keys = { ArrowDown: (index + 1) % options.length, ArrowUp: (index + options.length - 1) % options.length, Home: 0, End: options.length - 1 };
    if (event.key in keys) { event.preventDefault(); menu.current?.querySelectorAll('[role="option"]')[keys[event.key]]?.focus(); }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
      const next = options.findIndex((option, i) => i > index && option.label.toLowerCase().startsWith(event.key.toLowerCase()));
      const target = next >= 0 ? next : options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
      if (target >= 0) { event.preventDefault(); menu.current?.querySelectorAll('[role="option"]')[target]?.focus(); }
    }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === 'Tab') setOpen(false);
  };
  const blur = event => { if (!root.current?.contains(event.relatedTarget) && !menu.current?.contains(event.relatedTarget)) setOpen(false); };
  return <div className={`ac-filter-dropdown ${className}`} ref={root} onBlur={blur}>
    <button ref={trigger} type="button" className={`ac-filter-dropdown__trigger${open ? ' ac-filter-dropdown__trigger--open' : ''}`} disabled={disabled} onClick={() => setOpen(current => !current)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } if (event.key === 'Escape') close(); }} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? menuId : undefined}>
      <span>{selected?.label}</span><Icon name="chevronDown" size={15} />
    </button>
    {open && createPortal(<div ref={menu} id={menuId} className={`ac-filter-dropdown__menu ac-filter-dropdown__portal ${className}`} style={{ position: 'fixed', ...position, visibility: position.width ? 'visible' : 'hidden' }} role="listbox" aria-label={ariaLabel} onBlur={blur}>
      {options.map((option, index) => <button type="button" key={option.value} className={`ac-filter-dropdown__option${option.value === value ? ' ac-filter-dropdown__option--active' : ''}`} role="option" aria-selected={option.value === value} tabIndex={option.value === value ? 0 : -1} onKeyDown={event => move(event, index)} onClick={() => { onChange(option.value); close(); }}>
        <span>{option.label}</span>{option.value === value && <Icon name="check" size={14} />}
      </button>)}
    </div>, document.body)}
  </div>;
}
