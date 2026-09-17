import React from 'react';

function IntegrationCode({ t, activeTab, setActiveTab, renderCodeSnippet }) {
  const tabs = [
    { key: 'go', label: 'Golang SDK' },
    { key: 'node', label: 'Node.js SDK' },
    { key: 'curl', label: 'Raw CURL API' },
  ];

  return (
    <section id="integration" className="lp-integ">
      <div className="lp-integ-grid">
        <div>
          <span className="lp-integ-tag">{t.integTag}</span>
          <h2 className="lp-integ-title">{t.integTitle}</h2>
          <p className="lp-integ-desc">{t.integDesc}</p>
          <div className="lp-integ-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`lp-integ-tab ${activeTab === tab.key ? 'lp-integ-tab--active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="lp-code-block">
            <div className="lp-code-header">
              <div className="lp-code-dots">
                <div className="lp-code-dot lp-code-dot--red" />
                <div className="lp-code-dot lp-code-dot--cyan" />
                <div className="lp-code-dot lp-code-dot--green" />
              </div>
              <span className="lp-code-filename">auditchain_integration_demo</span>
              <button
                className="lp-code-copy material-symbols-outlined"
                onClick={() => navigator.clipboard.writeText(renderCodeSnippet())}
              >
                content_copy
              </button>
            </div>
            <div className="lp-code-body">
              <pre>{renderCodeSnippet()}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { IntegrationCode };
export default IntegrationCode;
