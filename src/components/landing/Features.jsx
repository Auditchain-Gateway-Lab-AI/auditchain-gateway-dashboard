import React from 'react';

function Features({ t }) {
  const cards = [
    { title: t.feat1Title, desc: t.feat1Desc, icon: 'integration_instructions', color: 'blue' },
    { title: t.feat2Title, desc: t.feat2Desc, icon: 'bolt', color: 'cyan' },
    { title: t.feat3Title, desc: t.feat3Desc, icon: 'account_tree', color: 'emerald' },
    { title: t.feat4Title, desc: t.feat4Desc, icon: 'link', color: 'blue' },
    { title: t.feat5Title, desc: t.feat5Desc, icon: 'verified_user', color: 'cyan' },
    { title: t.feat6Title, desc: t.feat6Desc, icon: 'dashboard', color: 'emerald' },
  ];

  return (
    <section id="features" className="lp-features">
      <div className="lp-features-inner">
        <div className="lp-features-header">
          <span className="lp-features-tag">{t.featuresTag}</span>
          <h2 className="lp-features-title">{t.featuresTitle}</h2>
        </div>

        <div className="lp-features-grid">
          {cards.map((card, i) => (
            <div key={i} className={`lp-feature-card lp-feature-card--${card.color}`}>
              <div>
                <div className={`lp-feature-icon lp-feature-icon--${card.color}`}>
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
                <h3 className="lp-feature-name">{card.title}</h3>
                <p className="lp-feature-desc">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { Features };
export default Features;
