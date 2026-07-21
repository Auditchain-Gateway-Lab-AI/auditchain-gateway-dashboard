import React from 'react';

function Architecture({ t, dataFlowSteps, activeStep, setActiveStep }) {
  const currentStep = dataFlowSteps.find((s) => s.id === activeStep);

  return (
    <section id="architecture" className="lp-arch">
      <div className="lp-arch-header">
        <span className="lp-arch-tag">{t.archTag}</span>
        <h2 className="lp-arch-title">{t.archTitle}</h2>
        <p className="lp-arch-subtitle">{t.archSubtitle}</p>
      </div>

      <div className="lp-arch-grid">
        <div className="lp-arch-steps">
          {dataFlowSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`lp-arch-step-btn ${activeStep === step.id ? 'lp-arch-step-btn--active' : ''}`}
            >
              <span className="material-symbols-outlined lp-arch-step-icon">{step.icon}</span>
              <p className="lp-arch-step-label">{t.archStepLabel}{step.id}</p>
              <p className="lp-arch-step-name">{step.name}</p>
            </button>
          ))}
        </div>

        <div className="lp-arch-detail">
          <div>
            <div className="lp-arch-detail-icon">
              <span className="material-symbols-outlined lp-icon-2xl">
                {currentStep?.icon}
              </span>
            </div>
            <h3 className="lp-arch-detail-title">
              {currentStep?.title}
            </h3>
            <p className="lp-arch-detail-desc">
              {currentStep?.desc}
            </p>
          </div>
          <div className="lp-arch-detail-footer">
            <span>{t.archStatusLabel}</span>
            <span className="lp-arch-status-dot" />
          </div>
        </div>
      </div>
    </section>
  );
}

export { Architecture };
export default Architecture;
