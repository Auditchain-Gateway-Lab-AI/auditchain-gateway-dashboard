import React from 'react';

function Simulator({
  t,
  auditLogs,
  isTampered,
  handleTamper,
  handleRestore,
  verificationState,
  integrityLayers
}) {
  return (
    <section id="simulator" className="lp-sim">
      <div className="lp-section-header">
        <h2 className="lp-section-title">{t.simTitle}</h2>
        <p className="lp-section-subtitle">{t.simSubtitle}</p>
      </div>

      <div className="lp-sim-grid">
        {/* Left: Audit Log Table */}
        <div className="lp-glass-card lp-sim-db-card">
          {verificationState.scanning && <div className="lp-scan-overlay" />}

          <div>
            <div className="lp-sim-header">
              <div className="lp-sim-header-left">
                <span className="material-symbols-outlined lp-icon-blue">storage</span>
                <h3 className="lp-sim-header-title">{t.simTableTitle}</h3>
              </div>
              <span className="lp-sim-cdc-badge">{t.simConnected}</span>
            </div>

            <div className="lp-sim-table-wrap">
              <table className="lp-sim-table">
                <thead>
                  <tr>
                    <th>{t.simColTimestamp}</th>
                    <th>{t.simColActor}</th>
                    <th>{t.simColAction}</th>
                    <th className="lp-th-hidden-sm">{t.simColResource}</th>
                    <th className="lp-th-hidden-sm">{t.simColMetadata}</th>
                    <th className="lp-th-hidden-md">{t.simColSourceSystem}</th>
                    <th>{t.simColVerification}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className={log.tampered ? 'lp-row-tampered' : ''}>
                      <td className="lp-td-timestamp">{log.timestamp}</td>
                      <td className="lp-td-actor">{log.actor}</td>
                      <td>
                        <span className={`lp-action-badge lp-action-badge--${log.action.toLowerCase()}`}>{log.action}</span>
                      </td>
                      <td className="lp-td-resource lp-td-hidden-sm">{log.resource}</td>
                      <td className="lp-td-metadata lp-td-hidden-sm">{log.metadata}</td>
                      <td className="lp-td-source lp-td-hidden-md">{log.sourceSystem}</td>
                      <td>
                        <span className={`lp-verify-badge ${log.tampered ? 'lp-verify-badge--invalid' : 'lp-verify-badge--valid'}`}>
                          {log.tampered ? '✗ INVALID' : '✓ VALID'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lp-sim-footer">
            <div className="lp-sim-db-label">
              <span className="lp-sim-db-dot" />
              <span>{t.simDbLabel}</span>
            </div>
            <div className="lp-sim-btn-group">
              {!isTampered ? (
                <button onClick={handleTamper} className="lp-btn-tamper">
                  <span className="material-symbols-outlined lp-icon-sm">edit_off</span>
                  {t.simTamperBtn}
                </button>
              ) : (
                <button onClick={handleRestore} className="lp-btn-restore">
                  <span className="material-symbols-outlined lp-icon-sm">restore</span>
                  {t.simRestoreBtn}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: 2-Layer Integrity Verification */}
        <div className="lp-glass-card lp-verify-card">
          <div>
            <div className="lp-verify-header">
              <span className="material-symbols-outlined lp-icon-cyan">verified_user</span>
              <h3 className="lp-sim-header-title">{t.simVerifyTitle}</h3>
            </div>

            <div className="lp-verify-layers">
              {['clientdb', 'localdb', 'blockchain'].map((layer) => {
                const state = verificationState[layer];
                const layerInfo = integrityLayers[layer];
                const scanLabel = layer === 'clientdb' ? t.simScanLabel : layer === 'localdb' ? t.simHashLabel : t.simSyncLabel;
                const isAnchor = layer === 'blockchain';
                return (
                  <div
                    key={layer}
                    className={`lp-layer ${
                      isAnchor ? 'lp-layer--anchor' : ''
                    } ${
                      state === 'scanning' ? 'lp-layer--scanning' :
                      state === 'secured' ? 'lp-layer--secured' :
                      'lp-layer--failed'
                    }`}
                  >
                    <div className="lp-layer-head">
                      <h4 className="lp-layer-title">
                        {isAnchor && <span className="lp-anchor-icon material-symbols-outlined">anchor</span>}
                        {layerInfo.title}
                      </h4>
                      <span className={`lp-layer-badge ${
                        state === 'scanning' ? 'lp-layer-badge--scanning' :
                        state === 'secured' ? 'lp-layer-badge--secured' :
                        'lp-layer-badge--failed'
                      }`}>
                        {state === 'scanning' ? scanLabel :
                         state === 'secured' ? (layer === 'clientdb' ? 'PASSED' : layer === 'localdb' ? 'VERIFIED' : 'ANCHORED') :
                         (layer === 'localdb' ? 'TAMPER_DETECTED' : 'HASH_MISMATCH')}
                      </span>
                    </div>
                    <p className="lp-layer-desc">{layerInfo.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`lp-verify-status ${
            verificationState.scanning ? 'lp-verify-status--scanning' :
            isTampered ? 'lp-verify-status--broken' :
            'lp-verify-status--intact'
          }`}>
            <span className="material-symbols-outlined lp-verify-status-icon">
              {verificationState.scanning ? 'refresh' : isTampered ? 'dangerous' : 'gpp_good'}
            </span>
            <div>
              <p className="lp-verify-status-title">
                {verificationState.scanning ? t.simVerifying : isTampered ? t.simBroken : t.simIntact}
              </p>
              <p className="lp-verify-status-desc">
                {verificationState.scanning ? t.simVerifyingDesc :
                 isTampered ? t.simBrokenDesc : t.simIntactDesc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { Simulator };
export default Simulator;
