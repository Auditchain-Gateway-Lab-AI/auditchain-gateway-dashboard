import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';

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
  const cleanDisplayText = (value) => String(value || '')
    .replace(/^[^\w]+/, '')
    .replace(/â€”/g, '-')
    .replace(/âœ…/g, '')
    .replace(/âŒ/g, '')
    .replace(/ðŸš¨/g, '')
    .trim();

  const headerClass = isScanning ? 'ac-verify__header--pending'
    : isSuccess ? 'ac-verify__header--success'
      : isPending ? 'ac-verify__header--pending'
        : 'ac-verify__header--failed';

  const statusLabel = isScanning ? 'Menjalankan verifikasi kriptografi...' : isSuccess ? 'Verifikasi Berhasil' : isPending ? 'Menunggu Blockchain' : 'Verifikasi Gagal';
  const statusMsg = isScanning
    ? 'Membaca data, menghitung ulang hash, dan mencocokkan root ledger.'
    : cleanDisplayText(data.message || result.message || '');
  const statusIcon = isScanning ? 'search' : isSuccess ? 'checkCircle' : isPending ? 'clock' : 'alert';

  const getAgentStatusLabel = (status) => {
    if (status === 'matched') return 'Data sumber cocok';
    if (status === 'mismatch') return 'Data sumber berbeda';
    if (status === 'unreachable') return 'Agent tidak terhubung';
    if (status === 'not_configured') return 'Agent belum dikonfigurasi';
    return status;
  };

  const getDiscrepancyFieldLabel = (field) => {
    if (field === 'existence') return 'Keberadaan data';
    return field;
  };

  const getLayerStatus = (id) => {
    if (id === 1) {
      if (scanStep < 1) return { status: 'inactive', icon: 'clock', label: 'Inactive', class: 'ac-verify__layer--inactive' };
      if (scanStep === 1) return { status: 'scanning', icon: 'spinner', label: 'Scanning DB', class: 'ac-verify__layer--scanning' };
      return { status: 'pass', icon: 'checkCircle', label: 'Verified', class: 'ac-verify__layer--pass' };
    }
    if (id === 2) {
      if (scanStep < 2) return { status: 'inactive', icon: 'clock', label: 'Inactive', class: 'ac-verify__layer--inactive' };
      if (scanStep === 2) return { status: 'scanning', icon: 'spinner', label: 'Re-Hashing Data', class: 'ac-verify__layer--scanning' };
      const passed = result.status !== 'failed_local';
      return passed
        ? { status: 'pass', icon: 'checkCircle', label: 'Matching', class: 'ac-verify__layer--pass' }
        : { status: 'fail', icon: 'xCircle', label: 'Tampered', class: 'ac-verify__layer--fail' };
    }
    if (id === 3) {
      if (scanStep < 3) return { status: 'inactive', icon: 'clock', label: 'Inactive', class: 'ac-verify__layer--inactive' };
      if (scanStep === 3) return { status: 'scanning', icon: 'spinner', label: 'Consensus', class: 'ac-verify__layer--scanning' };
      if (isSuccess) return { status: 'pass', icon: 'checkCircle', label: 'Anchored', class: 'ac-verify__layer--pass' };
      if (isPending) return { status: 'pending', icon: 'clock', label: 'Pending', class: 'ac-verify__layer--inactive' };
      return { status: 'fail', icon: 'xCircle', label: 'Mismatch', class: 'ac-verify__layer--fail' };
    }
  };

  const l1 = getLayerStatus(1);
  const l2 = getLayerStatus(2);
  const l3 = getLayerStatus(3);

  return (
    <div className="ac-verify ac-verify__scanning-container">
      {isScanning && <div className="ac-verify__scanning-laser" />}
      <div className={`ac-verify__header ${headerClass}`}>
        <div className="ac-verify__header-main">
          <span className={`ac-verify__header-icon ${isScanning ? 'ac-verify__header-icon--spin' : ''}`}>
            <Icon name={statusIcon} size={20} />
          </span>
          <div>
            <span className="ac-verify__header-title">{statusLabel}</span>
            <div className="ac-verify__header-msg">{statusMsg}</div>
          </div>
        </div>
        <button className="ac-verify__header-close" onClick={onClose} aria-label="Close verification result">
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Layer indicators */}
      <div className="ac-verify__layers">
        <div className="ac-verify__layers-label">Lapisan Verifikasi Kriptografi</div>
        <div className="ac-verify__layers-row">
          <div className={`ac-verify__layer ${l1.class}`}>
            <div className="ac-verify__layer-name">
              <Icon name={l1.icon} size={14} />
              {l1.label}
            </div>
            <div className="ac-verify__layer-sub">Data gateway</div>
          </div>
          <div className="ac-verify__arrow"><Icon name="chevronRight" size={15} /></div>

          <div className={`ac-verify__layer ${l2.class}`}>
            <div className="ac-verify__layer-name">
              <Icon name={l2.icon} size={14} />
              {l2.label}
            </div>
            <div className="ac-verify__layer-sub">Hash lokal</div>
          </div>
          <div className="ac-verify__arrow"><Icon name="chevronRight" size={15} /></div>

          <div className={`ac-verify__layer ${l3.class}`}>
            <div className="ac-verify__layer-name">
              <Icon name={l3.icon} size={14} />
              {l3.label}
            </div>
            <div className="ac-verify__layer-sub">Konsensus blockchain</div>
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

          {/* Agent Verification Status (Layer 3) */}
          {data.agent_status && data.agent_status !== 'skipped_historical' && (
            <div className="ac-verify__detail-row">
              <span className="ac-verify__detail-label">Pengecekan Data Sumber</span>
              <span className={`ac-status ${
                data.agent_status === 'matched' ? 'ac-status--valid' :
                data.agent_status === 'mismatch' ? 'ac-status--invalid' :
                data.agent_status === 'unreachable' ? 'ac-status--pending' :
                ''
              }`} style={{ fontSize: '11px', padding: '2px 8px', marginLeft: '4px' }}>
                <Icon
                  name={
                    data.agent_status === 'matched' ? 'checkCircle' :
                    data.agent_status === 'mismatch' ? 'xCircle' :
                    data.agent_status === 'unreachable' ? 'alert' :
                    data.agent_status === 'not_configured' ? 'settings' :
                    'activity'
                  }
                  size={12}
                />
                {getAgentStatusLabel(data.agent_status)}
              </span>
            </div>
          )}

          {/* Live source check details */}
          {data.agent_discrepancies && data.agent_discrepancies.length > 0 && (
            <div className="ac-verify__mismatch ac-verify__source-check">
              <div className="ac-verify__mismatch-title">Catatan Data Sumber</div>
              <p className="ac-verify__mismatch-note">
                Hash dan blockchain valid, tetapi Agent tidak menemukan data yang sama di database sumber saat ini.
              </p>
              {data.agent_discrepancies.map((d, i) => (
                <div key={i} className="ac-verify__detail-row" style={{ marginBottom: '4px' }}>
                  <span className="ac-verify__detail-label">{getDiscrepancyFieldLabel(d.field)}</span>
                  <code className="ac-verify__detail-code" style={{ fontSize: '11px' }}>
                    Log: {cleanDisplayText(d.in_log)} | Data sumber: {cleanDisplayText(d.in_agent)}
                  </code>
                </div>
              ))}
            </div>
          )}

          {/* Hash mismatch — Lapis 2 failed */}
          {result.status === 'failed_local' && (
            <div className="ac-verify__mismatch">
              <div className="ac-verify__mismatch-title">Detail Perubahan Hash</div>
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
              <div className="ac-verify__mismatch-title">Detail Perbedaan Blockchain</div>
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
