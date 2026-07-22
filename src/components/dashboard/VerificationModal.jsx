import React, { useState, useEffect } from 'react';

// ================================================================
// KOMPONEN: Detail Verifikasi — 3-layer indicator
// ================================================================
function VerificationModal({ result, onClose }) {
  const [scanStep, setScanStep] = useState(0);

  useEffect(() => {
    if (!result) {
      setScanStep(0);
      return undefined;
    }

    // Reset scan when result changes
    setScanStep(0);

    // Trigger sequential scanning animation
    const t1 = setTimeout(() => setScanStep(1), 100);
    const t2 = setTimeout(() => setScanStep(2), 700);
    const t3 = setTimeout(() => setScanStep(3), 1300);
    const t4 = setTimeout(() => setScanStep(4), 1900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [result]);

  if (!result) return null;

  const isScanning = scanStep < 4;
  const isSuccess = result.status === 'success' || result.data?.is_valid;
  const isPending = result.status === 'pending';
  const data = result.data || result;

  const headerClass = isScanning ? 'ac-verify__header--pending'
    : isSuccess ? 'ac-verify__header--success'
      : isPending ? 'ac-verify__header--pending'
        : 'ac-verify__header--failed';

  const statusEmoji = isScanning ? '🔍' : isSuccess ? '✅' : isPending ? '⏳' : '🚨';
  const statusLabel = isScanning ? 'Executing Auditchain Gateway Cryptography...' : isSuccess ? 'Verification Successful' : isPending ? 'Awaiting Blockchain' : 'Verification Failed';
  const statusMsg = isScanning
    ? 'Reading data, recalculating checksum hashes, and matching consensus ledger root...'
    : (data.message || result.message || '');

  const getLayerStatus = (id) => {
    if (id === 1) {
      if (scanStep < 1) return { status: 'inactive', label: '○ Inactive', class: 'ac-verify__layer--inactive' };
      if (scanStep === 1) return { status: 'scanning', label: '⏳ Scanning DB...', class: 'ac-verify__layer--scanning' };
      return { status: 'pass', label: '✅ Verified', class: 'ac-verify__layer--pass' };
    }
    if (id === 2) {
      if (scanStep < 2) return { status: 'inactive', label: '○ Inactive', class: 'ac-verify__layer--inactive' };
      if (scanStep === 2) return { status: 'scanning', label: '⏳ Re-Hashing Data...', class: 'ac-verify__layer--scanning' };
      const passed = result.status !== 'failed_local';
      return passed
        ? { status: 'pass', label: '✅ Matching', class: 'ac-verify__layer--pass' }
        : { status: 'fail', label: '❌ Tampered!', class: 'ac-verify__layer--fail' };
    }
    if (id === 3) {
      if (scanStep < 3) return { status: 'inactive', label: '○ Inactive', class: 'ac-verify__layer--inactive' };
      if (scanStep === 3) return { status: 'scanning', label: '⏳ Consensus...', class: 'ac-verify__layer--scanning' };
      if (isSuccess) return { status: 'pass', label: '✅ Anchored', class: 'ac-verify__layer--pass' };
      if (isPending) return { status: 'pending', label: '⏱️ Pending', class: 'ac-verify__layer--inactive' };
      return { status: 'fail', label: '❌ Mismatch!', class: 'ac-verify__layer--fail' };
    }
  };

  const l1 = getLayerStatus(1);
  const l2 = getLayerStatus(2);
  const l3 = getLayerStatus(3);

  return (
    <div className="ac-verify ac-verify__scanning-container">
      {isScanning && <div className="ac-verify__scanning-laser" />}
      <div className={`ac-verify__header ${headerClass}`}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="ac-verify__header-icon">{statusEmoji}</span>
            <span className="ac-verify__header-title">{statusLabel}</span>
          </div>
          <div className="ac-verify__header-msg">{statusMsg}</div>
        </div>
        <button className="ac-verify__header-close" onClick={onClose}>×</button>
      </div>

      {/* Layer indicators */}
      <div className="ac-verify__layers">
        <div className="ac-verify__layers-label">Cryptographic Verification Layers</div>
        <div className="ac-verify__layers-row">
          <div className={`ac-verify__layer ${l1.class}`}>
            <div className="ac-verify__layer-name">{l1.label}</div>
            <div className="ac-verify__layer-sub">DB Existence</div>
          </div>
          <div className="ac-verify__arrow">→</div>

          <div className={`ac-verify__layer ${l2.class}`}>
            <div className="ac-verify__layer-name">{l2.label}</div>
            <div className="ac-verify__layer-sub">Local Re-Hash</div>
          </div>
          <div className="ac-verify__arrow">→</div>

          <div className={`ac-verify__layer ${l3.class}`}>
            <div className="ac-verify__layer-name">{l3.label}</div>
            <div className="ac-verify__layer-sub">Blockchain Consensus</div>
          </div>
        </div>
      </div>

      {/* Detail info */}
      {!isScanning && (
        <div className="ac-verify__details" style={{ animation: 'fadeIn 0.3s ease' }}>
          {data.log_id && (
            <div className="ac-verify__detail-row">
              <span className="ac-verify__detail-label">Log ID: </span>
              <code className="ac-verify__detail-code">{data.log_id}</code>
            </div>
          )}
          {data.blockchain_tx_id && (
            <div className="ac-verify__detail-row">
              <span className="ac-verify__detail-label">Blockchain TxID: </span>
              <code className="ac-verify__detail-code">{data.blockchain_tx_id}</code>
            </div>
          )}
          {data.expected_hash && (
            <div className="ac-verify__detail-row">
              <span className="ac-verify__detail-label">Hash: </span>
              <code className="ac-verify__detail-code">{data.expected_hash || data.hash_value}</code>
            </div>
          )}
          {data.db_root && (
            <div className="ac-verify__detail-row">
              <span className="ac-verify__detail-label">Merkle Root: </span>
              <code className="ac-verify__detail-code">{data.db_root}</code>
            </div>
          )}

          {/* Hash mismatch — Lapis 2 failed */}
          {result.status === 'failed_local' && (
            <div className="ac-verify__mismatch">
              <div className="ac-verify__mismatch-title">Tamper Details:</div>
              <div className="ac-verify__detail-row">
                <span style={{ color: 'var(--color-error)' }}>Stored Hash: </span>
                <code className="ac-verify__detail-code">{data.expected_hash}</code>
              </div>
              <div className="ac-verify__detail-row">
                <span style={{ color: 'var(--color-error)' }}>Actual Hash: </span>
                <code className="ac-verify__detail-code">{data.actual_hash}</code>
              </div>
            </div>
          )}

          {/* Blockchain mismatch — Lapis 3 failed */}
          {result.status === 'failed_onchain' && (
            <div className="ac-verify__mismatch">
              <div className="ac-verify__mismatch-title">Blockchain Mismatch Details:</div>
              <div className="ac-verify__detail-row">
                <span style={{ color: 'var(--color-error)' }}>Merkle Root in DB: </span>
                <code className="ac-verify__detail-code">{data.db_root}</code>
              </div>
              <div className="ac-verify__detail-row">
                <span style={{ color: 'var(--color-error)' }}>Merkle Root in Chain: </span>
                <code className="ac-verify__detail-code">{data.chain_root}</code>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { VerificationModal };
export default VerificationModal;
