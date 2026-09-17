import React from 'react';
import Icon from './Icon';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light mode', icon: 'sun' },
  { value: 'dark', label: 'Dark mode', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' }
];

function AppearanceMenu({ themePreference = 'system', resolvedTheme = 'light', onThemeChange }) {
  const [open, setOpen] = React.useState(false);

  const activeLabel = THEME_OPTIONS.find(option => option.value === themePreference)?.label || 'System';

  return (
    <div className="ac-appearance-menu">
      <button
        type="button"
        className={`ac-profile-menu__item ac-appearance-menu__trigger${open ? ' ac-appearance-menu__trigger--open' : ''}`}
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="palette" size={15} />
        <span className="ac-profile-menu__item-copy">
          <span>Appearance</span>
          <small>{themePreference === 'system' ? `System (${resolvedTheme})` : activeLabel}</small>
        </span>
        <Icon name="chevronRight" size={14} />
      </button>

      {open && (
        <div className="ac-appearance-menu__panel" role="menu" aria-label="Appearance">
          {THEME_OPTIONS.map(option => {
            const selected = themePreference === option.value;
            return (
              <button
                type="button"
                key={option.value}
                className={`ac-appearance-menu__option${selected ? ' ac-appearance-menu__option--active' : ''}`}
                onClick={() => onThemeChange && onThemeChange(option.value)}
                role="menuitemradio"
                aria-checked={selected}
              >
                <Icon name={option.icon} size={15} />
                <span>{option.label}</span>
                {selected && <Icon name="check" size={15} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { AppearanceMenu };
export default AppearanceMenu;
