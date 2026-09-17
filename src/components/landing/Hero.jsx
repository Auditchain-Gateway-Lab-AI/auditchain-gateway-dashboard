import React from 'react';

function Hero({ t, handleNavClick }) {
  return (
    <header className="lp-hero">
      <div className="lp-hero-glow1" />
      <div className="lp-hero-glow2" />

      <div className="lp-hero-content">
        <div className="lp-hero-badge">
          <span className="material-symbols-outlined lp-icon-sm" style={{ animation: 'lp-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>security</span>
          {t.heroBadge}
        </div>
        <h1 className="lp-hero-title">
          {t.heroTitle1}{' '}
          <span className="lp-hero-highlight">{t.heroTitleHighlight}</span>{' '}
          {t.heroTitle2}
        </h1>
        <p className="lp-hero-subtitle">{t.heroSubtitle}</p>

        <div className="lp-hero-tech-row">
          {['Hyperledger Fabric', 'Merkle Tree', 'SHA3-256', 'Zero-Trust'].map((badge) => (
            <span key={badge} className="lp-hero-tech-badge">{badge}</span>
          ))}
        </div>

        <div className="lp-hero-btns">
          <a href="#simulator" onClick={(e) => handleNavClick(e, 'simulator')} className="lp-hero-btn-primary">{t.heroBtn1}</a>
          <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="lp-hero-btn-secondary">{t.heroBtn2}</a>
        </div>
      </div>
    </header>
  );
}

export { Hero };
export default Hero;
