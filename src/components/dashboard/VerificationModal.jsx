import React, { useState, useEffect, useMemo } from 'react';
import ActionBadge from '../common/ActionBadge';
import { formatTimestamp } from '../../utils/formatters';

// ================================================================
// KOMPONEN: Detail Verifikasi — 3-layer indicator
// ================================================================
function VerificationModal({ result, onClose }) {
  const [scanStep, setScanStep] = useState(0);
  const [modalFilterStatus, setModalFilterStatus] = useState('ALL');
  const [modalFilterAction, setModalFilterAction] = useState('ALL');
  const [modalSortOrder, setModalSortOrder] = useState('NEWEST');
  const [modalSearch, setModalSearch] = useState('');
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [copyState, setCopyState] = useState('');

  useEffect(() => {
    // Each result is a fresh verification session. Keep modal controls local
    // to that session so a previous search/filter cannot hide a new result.
    setModalSearch('');
    setModalFilterStatus('ALL');
    setModalFilterAction('ALL');
    setModalSortOrder('NEWEST');
    setShowOnlyIssues(false);
    setCopyState('');
  }, [result]);

  useEffect(() => {
    if (!result || result.range) {
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

  const rangeResults = useMemo(
    () => (Array.isArray(result?.results) ? result.results : []),
    [result]
  );

  const getVerificationCategory = (item) => {
    const status = String(item?.verify_status || item?.status || '').toLowerCase();
    if (status === 'success' || status === 'valid') return 'VALID';
    if (status === 'pending') return 'PENDING';
    return 'TAMPERED';
  };

  const filteredResults = useMemo(() => {
    const query = modalSearch.trim().toLowerCase();

    return [...rangeResults]
      .filter((item) => {
        if (!query) return true;
        return [item.resource, item.actor]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .filter((item) => {
        const category = getVerificationCategory(item);
        return modalFilterStatus === 'ALL' || category === modalFilterStatus;
      })
      .filter((item) => modalFilterAction === 'ALL' || item.action === modalFilterAction)
      .filter((item) => !showOnlyIssues || getVerificationCategory(item) === 'TAMPERED')
      .sort((a, b) => {
        const first = new Date(a.timestamp).getTime() || 0;
        const second = new Date(b.timestamp).getTime() || 0;
        return modalSortOrder === 'OLDEST' ? first - second : second - first;
      });
  }, [rangeResults, modalSearch, modalFilterStatus, modalFilterAction, modalSortOrder, showOnlyIssues]);

  const handleCopyResults = async () => {
    if (!navigator.clipboard) {
      setCopyState('Clipboard unavailable');
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(filteredResults, null, 2));
      setCopyState('Copied');
    } catch {
      setCopyState('Copy failed');
    }
  };

  if (!result) return null;

  if (result.range) {
    return (
      <div className="ac-verify ac-verify__scanning-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
        <div className="ac-verify__header ac-verify__header--info" style={{ backgroundColor: 'var(--color-primary, #005ea4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="ac-verify__header-icon">📊</span>
              <span className="ac-verify__header-title" style={{ color: '#fff' }}>Range Verification Results</span>
            </div>
            <div className="ac-verify__header-msg" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Checked logs from {formatTimestamp(result.range.from)} to {formatTimestamp(result.range.to)}
            </div>
          </div>
          <button className="ac-verify__header-close" onClick={onClose}>×</button>
        </div>

        <div className="ac-verify__details" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: '20px', backgroundColor: 'var(--color-surface-container-high)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{result.summary.total}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Total Checked</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>{result.summary.valid}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-outline)' }}>✅ Valid</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c62828' }}>{result.summary.invalid}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-outline)' }}>🚨 Mismatch</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f57f17' }}>{result.summary.pending}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-outline)' }}>⏱️ Pending</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-on-surface)' }}>
              Log Items checked
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
              Showing {filteredResults.length} of {rangeResults.length} logs
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <input
              type="search"
              className="ac-select"
              style={{ minWidth: '180px', flex: '1 1 180px' }}
              placeholder="Search resource or actor..."
              value={modalSearch}
              onChange={(event) => setModalSearch(event.target.value)}
              aria-label="Search verification results"
            />
            <select
              className="ac-select"
              value={modalFilterStatus}
              onChange={(event) => setModalFilterStatus(event.target.value)}
              aria-label="Filter verification status"
            >
              <option value="ALL">All Status</option>
              <option value="VALID">Valid</option>
              <option value="TAMPERED">Tampered / Invalid</option>
              <option value="PENDING">Pending</option>
            </select>
            <select
              className="ac-select"
              value={modalFilterAction}
              onChange={(event) => setModalFilterAction(event.target.value)}
              aria-label="Filter transaction action"
            >
              <option value="ALL">All Actions</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
            <select
              className="ac-select"
              value={modalSortOrder}
              onChange={(event) => setModalSortOrder(event.target.value)}
              aria-label="Sort verification results"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
            </select>
            <button
              type="button"
              className={showOnlyIssues ? 'ac-btn-primary' : 'ac-btn-ghost-action'}
              style={{ padding: '7px 10px', minWidth: 'auto', fontSize: '12px' }}
              onClick={() => setShowOnlyIssues((active) => !active)}
              aria-pressed={showOnlyIssues}
            >
              ⚠️ Show Only Issues
            </button>
            <button
              type="button"
              className="ac-btn-ghost-action"
              style={{ padding: '7px 10px', minWidth: 'auto', fontSize: '12px' }}
              onClick={handleCopyResults}
            >
              📋 Copy Results
            </button>
            {copyState && (
              <span role="status" style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                {copyState}
              </span>
            )}
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius-sm)' }}>
            <table className="ac-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 10px' }}>Timestamp</th>
                  <th style={{ padding: '6px 10px' }}>Resource</th>
                  <th style={{ padding: '6px 10px' }}>Action</th>
                  <th style={{ padding: '6px 10px' }}>Status</th>
                  <th style={{ padding: '6px 10px' }}>Hash Match</th>
                </tr>
              </thead>
              <tbody>
                {rangeResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '12px', color: 'var(--color-outline)' }}>
                      No log entries found in this range.
                    </td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '12px', color: 'var(--color-outline)' }}>
                      No results match your filter. Try adjusting the filter above.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((item) => {
                    const category = getVerificationCategory(item);
                    const statusClass = category === 'VALID' ? 'ac-status--valid'
                      : category === 'PENDING' ? 'ac-status--pending'
                        : 'ac-status--invalid';
                    return (
                      <tr key={item.log_id}>
                        <td style={{ padding: '6px 10px', fontSize: '11px' }}>{formatTimestamp(item.timestamp)}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{item.resource}</td>
                        <td style={{ padding: '6px 10px' }}><ActionBadge action={item.action} /></td>
                        <td style={{ padding: '6px 10px' }}>
                          <span className={`ac-status ${statusClass}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {category}
                          </span>
                        </td>
                        <td style={{ padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {item.hash_match ? '✅ Match' : '❌ Mismatch'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

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
