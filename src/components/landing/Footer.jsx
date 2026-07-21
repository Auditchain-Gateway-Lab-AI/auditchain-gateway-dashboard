import React from 'react';
import { Link } from 'react-router-dom';

function Footer({ t, waLink }) {
  const techList = [
    { icon: 'terminal', label: 'Go Backend' },
    { icon: 'database', label: 'PostgreSQL' },
    { icon: 'memory', label: 'Redis Queue' },
    { icon: 'lan', label: 'Kafka CDC' },
    { icon: 'account_tree', label: 'Merkle Tree' },
    { icon: 'verified', label: 'Fabric Ledger' },
  ];

  return (
    <>
      {/* Tech Stack Grid */}
      <section className="lp-tech">
        <div className="lp-tech-inner">
          <p className="lp-tech-label">{t.techLabel}</p>
          <div className="lp-tech-grid">
            {techList.map((tech) => (
              <div key={tech.label} className="lp-tech-item">
                <span className="material-symbols-outlined lp-tech-item-icon">{tech.icon}</span>
                <span className="lp-tech-item-label">{tech.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="lp-cta">
        <div className="lp-cta-card">
          <div className="lp-cta-glow1" />
          <div className="lp-cta-glow2" />

          <div className="lp-cta-content">
            <h2 className="lp-cta-title">{t.ctaTitle}</h2>
            <p className="lp-cta-subtitle">{t.ctaSubtitle}</p>
            <div className="lp-cta-btns">
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="lp-cta-btn-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>chat</span>
                {t.ctaBtn}
              </a>
              <Link to="/login" className="lp-cta-btn-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>login</span>
                {t.navLogin}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-logo">
              <img alt="Auditchain Logo" src="/logo/Group 1000009984.png" />
              <span>Auditchain Gateway</span>
            </div>
            <div className="lp-footer-links">
              <a href="#features">{t.footerPlatform}</a>
              <a href="#threat-model">{t.footerCompliance}</a>
              <a href="#integration">{t.footerDocs}</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>{t.footerCopyright}</span>
            <div className="lp-footer-status">
              <span className="lp-footer-status-dot" />
              <span>{t.footerStatus}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button (Mobile Only) */}
      <a href={waLink} target="_blank" rel="noopener noreferrer" className="lp-wa-float" aria-label="Chat WhatsApp">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.554 4.095 1.522 5.813L.057 23.854a.5.5 0 00.61.61l6.04-1.465A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.853 0-3.593-.502-5.096-1.381l-.366-.214-3.788.919.933-3.678-.232-.38A9.961 9.961 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      </a>
    </>
  );
}

export { Footer };
export default Footer;
