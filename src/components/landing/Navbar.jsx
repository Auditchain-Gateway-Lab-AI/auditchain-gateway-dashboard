import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({
  t,
  lang,
  setLang,
  navLinks,
  handleNavClick,
  activeSection,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  waLink
}) {
  return (
    <nav className="lp-nav">
      <div className="lp-nav-inner">
        {/* Logo */}
        <div className="lp-nav-logo">
          <img alt="Auditchain Logo" className="lp-nav-logo-img" src="/logo/Group 1000009984.png" />
          <div className="lp-nav-brand-text">
            <span className="lp-nav-brand-name">
              Auditchain <span className="lp-nav-gateway-badge">GATEWAY</span>
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <div className="lp-nav-links">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.id)}
              className={`lp-nav-link ${activeSection === link.id ? 'lp-nav-link--active' : ''}`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right CTA Buttons + Lang Toggle */}
        <div className="lp-nav-right">
          <button
            onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
            className="lp-nav-lang-btn"
            title="Toggle Language"
          >
            <span className="material-symbols-outlined lp-icon-lg lp-icon-blue">language</span>
            <span>{lang === 'id' ? 'EN' : 'ID'}</span>
          </button>

          <Link to="/login" className="lp-nav-login-btn">
            {t.navLogin}
          </Link>

          <a href={waLink} target="_blank" rel="noopener noreferrer" className="lp-nav-contact-btn">
            <span className="material-symbols-outlined lp-icon-lg">chat</span>
            <span>{t.navContact}</span>
          </a>
        </div>

        {/* Mobile Right: Lang Toggle + Hamburger */}
        <div className="lp-nav-mobile-right">
          <button
            onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
            className="lp-nav-mobile-lang"
          >
            {lang === 'id' ? 'EN' : 'ID'}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lp-nav-hamburger"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined lp-icon-xl">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="lp-nav-mobile-menu">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={(e) => {
                setIsMobileMenuOpen(false);
                handleNavClick(e, link.id);
              }}
              className={`lp-nav-mobile-link ${activeSection === link.id ? 'lp-nav-mobile-link--active' : ''}`}
            >
              {link.label}
            </a>
          ))}
          <div className="lp-nav-mobile-actions">
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lp-nav-mobile-login-btn"
            >
              {t.navLogin}
            </Link>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lp-nav-mobile-contact-btn"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chat</span>
              {t.navContact}
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

export { Navbar };
export default Navbar;
