import React from 'react';

function ThreatModel({ t }) {
  const threats = [
    { icon: 'edit_off', title: t.threat1Title, desc: t.threat1Desc },
    { icon: 'content_paste_off', title: t.threat2Title, desc: t.threat2Desc },
    { icon: 'delete_forever', title: t.threat3Title, desc: t.threat3Desc },
  ];

  return (
    <section id="threat-model" className="lp-threat">
      <div className="lp-threat-inner">
        <div className="lp-threat-header">
          <span className="lp-threat-tag">{t.threatTag}</span>
          <h2 className="lp-threat-title">{t.threatTitle}</h2>
          <p className="lp-threat-subtitle">{t.threatSubtitle}</p>
        </div>

        <div className="lp-threat-list">
          {threats.map((threat, i) => (
            <div key={i} className="lp-threat-item">
              <div className="lp-threat-item-left">
                <div className="lp-threat-icon-wrap">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>{threat.icon}</span>
                </div>
                <div>
                  <h3 className="lp-threat-item-title">{threat.title}</h3>
                  <p className="lp-threat-item-desc">{threat.desc}</p>
                </div>
              </div>
              <span className="lp-secured-badge">
                <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>shield</span> SECURED
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { ThreatModel };
export default ThreatModel;
