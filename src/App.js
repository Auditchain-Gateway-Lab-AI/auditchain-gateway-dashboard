// src/App.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './api';
import './App.css';

// JWT payload parser helper
const parseJwt = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Formatter timestamp dengan milidetik (misal: 3/7/2026, 16.26.42.123)
const formatTimestamp = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');

  return `${day}/${month}/${year}, ${hours}.${minutes}.${seconds}.${ms}`;
};

// Formatter cell metadata (container JSON horizontal scrollable)
const renderMetadataCell = (metadata) => {
  if (!metadata) return <span style={{ color: 'var(--color-outline)', fontSize: '11px' }}>—</span>;
  let displayStr = '';
  if (typeof metadata === 'string') {
    displayStr = metadata;
  } else {
    try {
      displayStr = JSON.stringify(metadata);
    } catch (e) {
      displayStr = String(metadata);
    }
  }
  return (
    <div className="ac-metadata-box" title={displayStr}>
      {displayStr}
    </div>
  );
};



// ================================================================
// ICON — tiny inline SVG helpers (no external icon dep needed)
// ================================================================
const Icon = ({ name, size = 18, style = {} }) => {
  const icons = {
    shield: (
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="currentColor" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="12" cy="16" r="1.5" fill="currentColor" />
      </>
    ),
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    alert: (
      <>
        <circle cx="12" cy="12" r="10" fill="#ef4444" />
        <path d="M12 7v5M12 16v1" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    warn: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    menu: (
      <>
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    chevronRight: (
      <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    ),
    chart: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    trending: (
      <>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
    list: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="6" x2="3.01" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="12" x2="3.01" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="18" x2="3.01" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="2" fill="none" />
      </>
    ),
    history: (
      <>
        <polyline points="1 4 1 10 7 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M3.51 15a9 9 0 1 0 .49-4.95L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="none" rx="1" />
        <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="none" rx="1" />
        <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="none" rx="1" />
        <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" fill="none" rx="1" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </>
    ),
    checkmark: (
      <path d="M10 17l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4L10 17z" fill="rgba(255,255,255,0.9)" />
    ),
    spinner: (
      <>
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
    >
      {icons[name] || null}
    </svg>
  );
};

// ================================================================
// KOMPONEN: Action badge
// ================================================================
function ActionBadge({ action }) {
  const cls = action === 'INSERT' ? 'ac-badge--insert'
    : action === 'DELETE' ? 'ac-badge--delete'
      : 'ac-badge--update';
  return <span className={`ac-badge ${cls}`}>{action}</span>;
}

// ================================================================
// KOMPONEN: Snapshot Viewer — diff view
// ================================================================
function SnapshotViewer({ currentLog, previousLog }) {
  const SKIP = new Set(['_id', 'id', 'ogc_fid', 'fid', 'gid', 'objectid']);

  function parseMetadata(raw) {
    if (!raw) return {};
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { return {}; }
  }

  const currentData = parseMetadata(currentLog?.metadata);
  const previousData = parseMetadata(previousLog?.metadata);

  const allKeys = [...new Set([
    ...Object.keys(currentData),
    ...Object.keys(previousData)
  ])].filter(k => !SKIP.has(k));

  if (allKeys.length === 0) {
    return <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '12px' }}>Tidak ada data metadata</span>;
  }

  // INSERT — no previous, show all new values
  if (!previousLog || Object.keys(previousData).length === 0) {
    return (
      <table className="ac-diff">
        <tbody>
          {allKeys.map(k => (
            <tr key={k}>
              <td className="field">{k}</td>
              <td className="val-new">{String(currentData[k] ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // DELETE — show last data with strikethrough
  if (currentLog?.action === 'DELETE') {
    return (
      <table className="ac-diff">
        <tbody>
          {allKeys.map(k => (
            <tr key={k}>
              <td className="field">{k}</td>
              <td className="val-deleted">{String(previousData[k] ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // UPDATE — only show changed fields
  const changed = allKeys.filter(k => String(currentData[k] ?? '') !== String(previousData[k] ?? ''));
  const unchanged = allKeys.filter(k => String(currentData[k] ?? '') === String(previousData[k] ?? ''));

  if (changed.length === 0) {
    return (
      <div>
        <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '12px' }}>No column changes detected</span>
        <table className="ac-diff" style={{ marginTop: '6px' }}>
          <tbody>
            {unchanged.map(k => (
              <tr key={k}>
                <td className="field" style={{ color: 'var(--color-outline)' }}>{k}</td>
                <td className="val-unchanged">{String(currentData[k] ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <table className="ac-diff">
        <thead>
          <tr>
            <th>Column</th>
            <th className="before">Before</th>
            <th className="after">After</th>
          </tr>
        </thead>
        <tbody>
          {changed.map(k => (
            <tr key={k}>
              <td className="field">{k}</td>
              <td className="val-before">{String(previousData[k] ?? '—')}</td>
              <td className="val-after">{String(currentData[k] ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {unchanged.length > 0 && (
        <details style={{ marginTop: '6px' }}>
          <summary style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>
            {unchanged.length} columns unchanged
          </summary>
          <table className="ac-diff" style={{ marginTop: '4px' }}>
            <tbody>
              {unchanged.map(k => (
                <tr key={k}>
                  <td className="field" style={{ color: 'var(--color-outline)' }}>{k}</td>
                  <td className="val-unchanged">{String(currentData[k] ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

// ================================================================
// KOMPONEN: Detail Verifikasi — 3-layer indicator
// ================================================================
// ================================================================
// KOMPONEN: Detail Verifikasi — 3-layer indicator
// ================================================================
function VerificationDetail({ result, onClose }) {
  const [scanStep, setScanStep] = useState(0);

  useEffect(() => {
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
  const statusLabel = isScanning ? 'Executing Audit Trail Cryptography...' : isSuccess ? 'Verification Successful' : isPending ? 'Awaiting Blockchain' : 'Verification Failed';
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

// ================================================================
// KOMPONEN: Modal Detail Log per Resource (LEVEL 2)
// ================================================================
function ResourceDetailModal({ resource, logs, verifyStatus, onClose }) {
  const sortedAsc = logs
    .filter(l => (l.source_table || l.resource) === resource)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const resourceLogs = [...sortedAsc].reverse();

  const chainChip = () => {
    if (!verifyStatus) return null;
    const cls = verifyStatus.status === 'success' ? 'ac-status--valid'
      : verifyStatus.status === 'pending' ? 'ac-status--pending'
        : 'ac-status--invalid';
    const label = verifyStatus.status === 'success' ? '✅ Valid Chain'
      : verifyStatus.status === 'pending' ? '⏱️ Pending'
        : '🚨 Issue Detected';
    return <span className={`ac-status ${cls}`}>{label}</span>;
  };

  return (
    <div className="ac-modal-overlay" onClick={onClose}>
      <div className="ac-modal" onClick={e => e.stopPropagation()}>
        <div className="ac-modal__header">
          <div>
            <div className="ac-modal__title">📋 Log History</div>
            <div className="ac-modal__subtitle">{resource}</div>
          </div>
          <div className="ac-modal__header-right">
            {chainChip()}
            <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>{resourceLogs.length} logs found</span>
            <button className="ac-modal__close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="ac-modal__body">
          {resourceLogs.length === 0 ? (
            <div className="ac-empty">
              <div className="ac-empty__icon">📭</div>
              No logs found for this resource in the last 500 logs.
            </div>
          ) : (
            resourceLogs.map((log, idx) => {
              const ascIdx = sortedAsc.findIndex(l => l.log_id === log.log_id);
              const prevLog = ascIdx > 0 ? sortedAsc[ascIdx - 1] : null;
              const isFirst = idx === 0;

              return (
                <div
                  key={log.log_id}
                  className={`ac-log-card ${isFirst ? 'ac-log-card--latest' : ''}`}
                >
                  <div className={`ac-log-card__header ${isFirst ? 'ac-log-card__header--latest' : 'ac-log-card__header--normal'}`}>
                    <span className="ac-log-card__time">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <ActionBadge action={log.action} />
                    <span className="ac-log-card__actor">👤 {log.actor}</span>
                    <span className="ac-log-card__source">📡 {log.source_system}</span>
                    {isFirst && <span className="ac-log-card__latest-chip">● Latest</span>}
                  </div>

                  <div className="ac-log-card__body">
                    <div className="ac-log-card__section-label">
                      {log.action === 'INSERT' ? 'New Data'
                        : log.action === 'DELETE' ? 'Deleted Data'
                          : 'Changes (compared to previous log)'}
                    </div>
                    <SnapshotViewer currentLog={log} previousLog={prevLog} />
                  </div>

                  <div className="ac-log-card__hash">
                    <code className="ac-log-card__hash-code">🔑 {log.hash_value}</code>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// KOMPONEN: Login
// ================================================================
function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      onLogin(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ac-login-page">
      {/* ===== HERO PANEL ===== */}
      <div className="ac-login-hero">
        {/* Decorative background */}
        <div className="ac-login-hero__bg">
          <svg width="100%" height="100%" viewBox="0 0 700 900" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
            {Array.from({ length: 12 }).map((_, r) =>
              Array.from({ length: 8 }).map((_, c) => (
                <circle key={`${r}-${c}`} cx={c * 100 + 30} cy={r * 80 + 30} r="1.5" fill="rgba(255,255,255,0.15)" />
              ))
            )}
            <line x1="120" y1="180" x2="280" y2="300" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            <line x1="280" y1="300" x2="460" y2="220" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            <line x1="460" y1="220" x2="580" y2="380" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            <line x1="120" y1="180" x2="460" y2="220" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <line x1="280" y1="300" x2="580" y2="380" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <line x1="200" y1="500" x2="400" y2="560" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
            <line x1="400" y1="560" x2="560" y2="480" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
            <circle cx="120" cy="180" r="10" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            <circle cx="280" cy="300" r="14" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            <circle cx="460" cy="220" r="10" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            <circle cx="580" cy="380" r="8" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <circle cx="200" cy="500" r="12" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <circle cx="400" cy="560" r="16" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            <circle cx="560" cy="480" r="9" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <text x="274" y="305" fontSize="8" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontFamily="monospace">#</text>
            <text x="395" y="565" fontSize="9" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontFamily="monospace">#</text>
            <circle cx="620" cy="100" r="180" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="40" />
            <circle cx="-30" cy="750" r="200" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="60" />
          </svg>
        </div>

        {/* Brand */}
        <div className="ac-login-hero__brand">
          <div className="ac-login-hero__brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(255,255,255,0.9)" />
              <path d="M10 17l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4L10 17z" fill="#4f46e5" />
            </svg>
          </div>
          <div>
            <div className="ac-login-hero__brand-name">Audit Trail</div>
            <div className="ac-login-hero__brand-sub">Gateway Portal</div>
          </div>
        </div>

        {/* Headline */}
        <div>
          <h1 className="ac-login-hero__title">Secure Audit<br />Portal</h1>
          <p className="ac-login-hero__desc">
            Blockchain-based Audit Log Monitoring System.
            Ensuring absolute data integrity, immutability, and compliance across all connected environments.
          </p>
        </div>

        {/* Info box */}
        <div className="ac-login-hero__infobox">
          <div className="ac-login-hero__infobox-icon">
            <Icon name="shield" size={20} style={{ color: 'rgba(255,255,255,0.85)' }} />
          </div>
          <div>
            <div className="ac-login-hero__infobox-title">Authorized Access Only</div>
            <div className="ac-login-hero__infobox-text">
              Only authorized auditors and administrators can access this system.
              Your IP address and session are being logged.
            </div>
          </div>
        </div>
      </div>

      {/* ===== FORM PANEL ===== */}
      <div className="ac-login-form-panel">
        <div className="ac-login-card">

          {/* Mobile brand header */}
          <div className="ac-login-mobile-brand">
            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(79,70,229,.35)', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(255,255,255,.95)" />
                <path d="M10 17l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4L10 17z" fill="#4f46e5" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0d1b2e', letterSpacing: '.02em' }}>Audit Trail</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#4f46e5', letterSpacing: '.1em', textTransform: 'uppercase' }}>Gateway Portal</div>
            </div>
          </div>

          <div className="ac-login-card__heading">
            <h2 className="ac-login-card__title">Sign In</h2>
            <p className="ac-login-card__subtitle">Please authenticate to access the portal.</p>
          </div>

          {error && (
            <div className="ac-login__error">
              <Icon name="alert" size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span className="ac-login__error-text">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Username */}
            <div className="ac-field">
              <label className="ac-field__label" htmlFor="login-username">Username</label>
              <div className="ac-field__wrap">
                <span className="ac-field__icon"><Icon name="user" size={17} /></span>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className={`ac-field__input${error ? ' ac-field__input--error' : ''}`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="ac-field">
              <label className="ac-field__label" htmlFor="login-password">Password</label>
              <div className="ac-field__wrap">
                <span className="ac-field__icon"><Icon name="lock" size={17} /></span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={`ac-field__input ac-field__input--pr${error ? ' ac-field__input--error' : ''}`}
                />
                <button type="button" className="ac-field__toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="ac-login-remember">
              <input id="remember-me" type="checkbox" className="ac-login-remember__check" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
              <label htmlFor="remember-me" className="ac-login-remember__label">Remember me</label>
            </div>

            {/* Submit */}
            <button type="submit" className="ac-login__submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icon name="spinner" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>
                  <Icon name="shield" size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <hr className="ac-login__divider" />
          <div className="ac-login__security">
            <Icon name="warn" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <p className="ac-login__security-text">
              This portal is restricted to authorized personnel only. All activities are monitored and recorded for security and compliance purposes.
            </p>
          </div>

          <div className="ac-login__footer">
            © 2026 Audit Trail Gateway &nbsp;·&nbsp; Secure Log Management v2.4.1
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// KOMPONEN: Dashboard
// ================================================================
function Dashboard({ onLogout }) {
  const [stats, setStats] = useState({ total_logs: 0, pending_logs: 0, anchored_logs: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [verifyStatuses, setVerifyStatuses] = useState({});
  const [inventoryStatuses, setInventoryStatuses] = useState({});
  const [selectedVerifyResult, setSelectedVerifyResult] = useState(null);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [isServerPaginated, setIsServerPaginated] = useState(false);

  const verifyStatusesRef = useRef(verifyStatuses);
  const inventoryStatusesRef = useRef(inventoryStatuses);

  useEffect(() => {
    verifyStatusesRef.current = verifyStatuses;
  }, [verifyStatuses]);

  useEffect(() => {
    inventoryStatusesRef.current = inventoryStatuses;
  }, [inventoryStatuses]);

  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedTableModal, setSelectedTableModal] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterVerification, setFilterVerification] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Decode JWT info for Workspace Context Indicator
  const clientInfo = useMemo(() => {
    const token = localStorage.getItem('token');
    return parseJwt(token);
  }, []);



  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, invRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/logs', { params: { page: currentPage, page_size: rowsPerPage } }),
          api.get('/dashboard/inventory'),
        ]);
        setStats(statsRes.data);
        
        let logsArray = [];
        let serverTotal = 0;
        let serverPaginated = false;
        
        if (Array.isArray(logsRes.data)) {
          logsArray = logsRes.data;
          serverTotal = logsRes.data.length;
          serverPaginated = false;
        } else if (logsRes.data?.data) {
          logsArray = logsRes.data.data;
          serverTotal = logsRes.data.pagination?.total_items ?? logsRes.data.data.length;
          serverPaginated = true;
        }
        
        setRecentLogs(logsArray);
        setTotalLogsCount(serverTotal);
        setIsServerPaginated(serverPaginated);
        setInventory(invRes.data || []);
      } catch (err) {
        if (err.response?.status === 401) onLogout();
      }
    };
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [onLogout, currentPage, rowsPerPage]);

  // Grouping inventory by table name
  const groupedInventory = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const resource = item?.source_table || item?.resource || '';
      const tableName = resource.includes(':') ? resource.split(':')[0] : resource;
      if (!acc[tableName]) acc[tableName] = [];
      acc[tableName].push(item);
      return acc;
    }, {});
  }, [inventory]);

  const tableNames = Object.keys(groupedInventory).sort();

  // Filter & pagination
  const filteredLogs = recentLogs.filter(log => {
    const matchSearch =
      (log?.source_table?.toLowerCase() || log?.resource?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (log?.actor?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (log?.source_system?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (log?.metadata?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (log?.hash_value?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchAction = filterAction === 'ALL' || log?.action === filterAction;
    return matchSearch && matchAction;
  });
  const totalPages = isServerPaginated
    ? (Math.ceil(totalLogsCount / rowsPerPage) || 1)
    : (Math.ceil(filteredLogs.length / rowsPerPage) || 1);

  const paginatedLogs = isServerPaginated
    ? filteredLogs
    : filteredLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [isServerPaginated, totalLogsCount, filteredLogs.length, currentPage, totalPages]);

  const isFiltered = searchQuery || filterAction !== 'ALL';
  const displayTotal = isServerPaginated
    ? (isFiltered ? filteredLogs.length : totalLogsCount)
    : filteredLogs.length;

  // // Background verify — individual logs (Nonaktifkan dulu sampai endpoint baru siap)
  // useEffect(() => {
  //   paginatedLogs.forEach(log => {
  //     if (!log || !log.log_id) return;
  //     const logId = log.log_id;
  //     const currentStatus = verifyStatusesRef.current[logId]?.status;

  //     // Skip if already success, pending, or permanently failed
  //     if (
  //       currentStatus === 'success' ||
  //       currentStatus === 'pending' ||
  //       currentStatus === 'loading' ||
  //       currentStatus === 'failed_local' ||
  //       currentStatus === 'failed_kafka' ||
  //       currentStatus === 'failed_onchain'
  //     ) {
  //       return;
  //     }

  //     setVerifyStatuses(prev => ({
  //       ...prev,
  //       [logId]: { status: 'loading' }
  //     }));

  //     api.get(`/dashboard/verify/${logId}`)
  //       .then(res => {
  //         setVerifyStatuses(prev => ({ ...prev, [logId]: res.data }));
  //       })
  //       .catch(err => {
  //         setVerifyStatuses(prev => ({
  //           ...prev,
  //           [logId]: err.response?.data || { status: 'failed' }
  //         }));
  //       });
  //   });
  // }, [paginatedLogs]);

  // // Background verify — inventory chain (Nonaktifkan dulu sampai endpoint baru siap)
  // useEffect(() => {
  //   inventory.forEach(item => {
  //     const resource = item?.source_table || item?.resource;
  //     if (!item || !resource) return;
  //     const currentStatus = inventoryStatusesRef.current[resource]?.status;

  //     // Skip if already success, pending, or permanently failed
  //     if (
  //       currentStatus === 'success' ||
  //       currentStatus === 'pending' ||
  //       currentStatus === 'loading' ||
  //       currentStatus === 'failed_local' ||
  //       currentStatus === 'failed_kafka' ||
  //       currentStatus === 'failed_onchain'
  //     ) {
  //       return;
  //     }

  //     setInventoryStatuses(prev => ({
  //       ...prev,
  //       [resource]: { status: 'loading' }
  //     }));

  //     api.get(`/dashboard/verify-resource/${encodeURIComponent(resource)}`)
  //       .then(res => {
  //         setInventoryStatuses(prev => ({ ...prev, [resource]: res.data }));
  //       })
  //       .catch(err => {
  //         setInventoryStatuses(prev => ({
  //           ...prev,
  //           [resource]: err.response?.data || { status: 'failed' }
  //         }));
  //       });
  //   });
  // }, [inventory]);

  // Status badge for transaction table
  const renderStatusBadge = (log) => {
    if (!log || !log.log_id || !log.hash_value) return <span className="ac-status ac-status--invalid">🚨 INVALID</span>;
    const v = verifyStatuses[log.log_id];
    if (!v || v.status === 'loading')
      return <span className="ac-status ac-status--checking">⏳ Memeriksa...</span>;
    if (v.status === 'success')
      return <span className="ac-status ac-status--valid" onClick={() => setSelectedVerifyResult(v)}>✅ VALID</span>;
    if (v.status === 'pending')
      return <span className="ac-status ac-status--pending" onClick={() => setSelectedVerifyResult(v)}>⏱️ PENDING</span>;
    return <span className="ac-status ac-status--invalid" onClick={() => setSelectedVerifyResult(v)}>🚨 INVALID</span>;
  };

  // Status badge for inventory
  const renderInventoryBadge = (item) => {
    const resource = item?.source_table || item?.resource;
    const v = inventoryStatuses[resource];
    if (!v || v.status === 'loading')
      return <span className="ac-chain-badge ac-status--checking">⏳</span>;
    if (v.status === 'success')
      return <span className="ac-chain-badge ac-status--valid" style={{ cursor: 'pointer' }} onClick={() => setSelectedVerifyResult(v)}>✅ Valid</span>;
    if (v.status === 'pending')
      return <span className="ac-chain-badge ac-status--pending" style={{ cursor: 'pointer' }} onClick={() => setSelectedVerifyResult(v)}>⏱️ Pending</span>;
    return <span className="ac-chain-badge ac-status--invalid" style={{ cursor: 'pointer' }} onClick={() => setSelectedVerifyResult(v)}>🚨 Invalid</span>;
  };

  // Pagination page numbers
  const renderPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };



  return (
    <div className="ac-shell">
      {/* ======= TOP NAV ======= */}
      <header className="ac-topnav">
        <div className="ac-topnav__brand">
          <button className="ac-topnav__menu-btn" onClick={() => setSidebarOpen(o => !o)}>
            <Icon name="menu" size={22} />
          </button>
          <div className="ac-topnav__logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(255,255,255,0.95)" />
              <path d="M10 17l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4L10 17z" fill="#0077ce" />
            </svg>
          </div>
          <div>
            <div className="ac-topnav__brand-name">Audit Trail</div>
            <div className="ac-topnav__brand-sub">Gateway Portal</div>
          </div>
        </div>
        <div className="ac-topnav__right">
          {clientInfo && (
            <div className="ac-topnav__client-pill">
              <span className="ac-topnav__client-dot" />
              <span className="ac-topnav__client-label">{clientInfo.client_id}</span>
            </div>
          )}
          <div className="ac-topnav__user">
            <div className="ac-topnav__user-info">
              <div className="ac-topnav__user-name">{clientInfo?.username || 'Auditor'}</div>
              <div className="ac-topnav__user-role">{clientInfo?.role || 'System Administrator'}</div>
            </div>
            <div className="ac-topnav__avatar">
              {(clientInfo?.username || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
          <button className="ac-topnav__logout" onClick={onLogout}>
            <Icon name="logout" size={16} />
            Logout
          </button>
        </div>
      </header>

      {/* ======= SIDEBAR ======= */}
      <aside className={`ac-sidebar${sidebarOpen ? ' ac-sidebar--open' : ''}`}>
        <div className="ac-sidebar__header">
          <div className="ac-sidebar__section-label">Audit Manager</div>
          <div className="ac-sidebar__section-sub">Secure Data Integrity</div>
        </div>
        <nav className="ac-sidebar__nav">
          <button className="ac-sidebar__nav-item ac-sidebar__nav-item--active">
            <Icon name="dashboard" size={18} />
            Dashboard
          </button>
        </nav>
        <div className="ac-sidebar__footer">
          {clientInfo && (
            <div className="ac-sidebar__identity-card">
              <div className="ac-sidebar__identity-label">Session Identity</div>
              <div className="ac-sidebar__identity-user">
                <span className="ac-sidebar__identity-avatar">
                  {clientInfo.username.charAt(0).toUpperCase()}
                </span>
                <div className="ac-sidebar__identity-details">
                  <span className="ac-sidebar__identity-name" title={clientInfo.username}>
                    {clientInfo.username}
                  </span>
                  <span className="ac-sidebar__identity-role">
                    {clientInfo.role}
                  </span>
                </div>
              </div>
              <div className="ac-sidebar__identity-client">
                <span className="ac-sidebar__identity-client-title">Client Workspace</span>
                <span className="ac-sidebar__identity-client-val" title={clientInfo.client_id}>
                  {clientInfo.client_id}
                </span>
              </div>
            </div>
          )}
          <button className="ac-sidebar__nav-item" style={{ marginTop: 6 }} onClick={onLogout}>
            <Icon name="logout" size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 35, background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ======= MAIN CONTENT ======= */}
      <main className="ac-main">
        <div className="ac-main__container">

          {/* ===== CLIENT IDENTITY BANNER ===== */}
          {clientInfo && (
            <div className="ac-cib">
              {/* Animated background decoration */}
              <div className="ac-cib__bg-grid" />

              {/* TOP ROW: Client + Admin panels */}
              <div className="ac-cib__top-row">
                {/* Left — Client System Block */}
                <div className="ac-cib__client-block">
                  <div className="ac-cib__client-icon">🏢</div>
                  <div className="ac-cib__client-meta">
                    <div className="ac-cib__client-eyebrow">Audit Trail System</div>
                    <div className="ac-cib__client-name" title={clientInfo.client_id}>
                      {clientInfo.client_id}
                    </div>
                    <div className="ac-cib__client-badge">
                      <span className="ac-cib__live-dot" />
                      Active Session
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="ac-cib__divider" />

                {/* Right — Admin Identity Block */}
                <div className="ac-cib__admin-block">
                  <div className="ac-cib__admin-avatar">
                    {clientInfo.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="ac-cib__admin-meta">
                    <div className="ac-cib__admin-eyebrow">Logged in as</div>
                    <div className="ac-cib__admin-name">{clientInfo.username}</div>
                    <div className="ac-cib__admin-role">
                      <span className="ac-cib__role-chip">{clientInfo.role}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Security isolation notice */}
              <div className="ac-cib__notice-bar">
                <span className="ac-cib__notice-icon">🔒</span>
                <span className="ac-cib__notice-text">
                  <strong>Data Isolation Active</strong> — Audit logs are exclusively scoped to the{' '}
                  <span className="ac-cib__notice-highlight">{clientInfo.client_id}</span>{' '}
                  workspace. Cross-client access is blocked at the gateway level.
                </span>
              </div>
            </div>
          )}

          {/* Hero Section */}
          <section className="ac-hero">
            <div className="ac-hero__pattern" />
            <div className="ac-hero__content">
              <div className="ac-hero__left">
                <h1 className="ac-hero__title">
                  🛡️ Audit Trail Dashboard
                </h1>
                <p className="ac-hero__subtitle">
                  Monitor audit logs and verify blockchain transactions in real-time.
                  Ensure the highest data integrity across the database infrastructure network.
                </p>
              </div>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="ac-stats-grid">
            <div className="ac-stat-card">
              <div className="ac-stat-card__icon ac-stat-card__icon--blue">
                <Icon name="list" size={26} />
              </div>
              <div>
                <div className="ac-stat-card__label">Total Logs</div>
                <div className="ac-stat-card__value">{stats.total_logs.toLocaleString()}</div>
                <div className="ac-stat-card__sub ac-stat-card__sub--blue">All entries tracked</div>
              </div>
            </div>
            <div className="ac-stat-card">
              <div className="ac-stat-card__icon ac-stat-card__icon--amber">
                <Icon name="clock" size={26} />
              </div>
              <div>
                <div className="ac-stat-card__label">Pending Verification</div>
                <div className="ac-stat-card__value">{stats.pending_logs.toLocaleString()}</div>
                <div className="ac-stat-card__sub ac-stat-card__sub--amber">
                  {stats.pending_logs > 0 ? 'Requires attention' : 'All clear'}
                </div>
              </div>
            </div>
            <div className="ac-stat-card">
              <div className="ac-stat-card__icon ac-stat-card__icon--teal">
                <Icon name="link" size={26} />
              </div>
              <div>
                <div className="ac-stat-card__label">Anchored (Blockchain)</div>
                <div className="ac-stat-card__value">{stats.anchored_logs.toLocaleString()}</div>
                <div className="ac-stat-card__sub ac-stat-card__sub--teal">Successfully secured</div>
              </div>
            </div>
          </section>

          {/* Verification Detail (inline, dismissed by × button) */}
          {selectedVerifyResult && (
            <VerificationDetail
              result={selectedVerifyResult}
              onClose={() => setSelectedVerifyResult(null)}
            />
          )}

          {/* ===== DATA INVENTORY ===== */}
          <section className="ac-card">
            <div className="ac-card__header">
              <div className="ac-card__header-left">
                <span className="ac-card__icon">🗄️</span>
                <span className="ac-card__title">Data Inventory</span>
              </div>
              <span className="ac-card__subtitle">{tableNames.length} tables monitored — click to view records</span>
            </div>
            <div className="ac-table-wrap">
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Table Name</th>
                    <th>Total Monitored Records</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableNames.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        <div className="ac-empty">
                          <div className="ac-empty__icon">📦</div>
                          No inventory data available.
                        </div>
                      </td>
                    </tr>
                  ) : tableNames.map(tableName => (
                    <tr key={tableName} onClick={() => setSelectedTableModal(tableName)}>
                      <td>
                        <div className="ac-table__icon-cell">
                          <div className="ac-table__row-icon">
                            <Icon name="database" size={14} />
                          </div>
                          <strong>{tableName}</strong>
                        </div>
                      </td>
                      <td>{groupedInventory[tableName].length.toLocaleString()} Records</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="ac-btn-ghost" onClick={e => { e.stopPropagation(); setSelectedTableModal(tableName); }}>
                          View Rows
                          <Icon name="chevronRight" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ===== AUDIT TRANSACTIONS ===== */}
          <section className="ac-card">
            <div className="ac-card__header">
              <div className="ac-card__header-left">
                <span className="ac-card__icon">📜</span>
                <span className="ac-card__title">All Transaction History</span>
              </div>
              <div className="ac-toolbar">
                <div className="ac-search">
                  <span className="ac-search__icon">
                    <Icon name="search" size={15} />
                  </span>
                  <input
                    type="text"
                    className="ac-search__input"
                    placeholder="Search Actor, Resource, Hash..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <select className="ac-select" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                  <option value="ALL">All Actions</option>
                  <option value="INSERT">INSERT</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <select className="ac-select" value={filterVerification} onChange={e => setFilterVerification(e.target.value)}>
                  <option value="ALL">All Status</option>
                  <option value="VALID">VALID</option>
                  <option value="INVALID">INVALID</option>
                </select>
                <select className="ac-select" value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                  <option value={5}>5 Rows</option>
                  <option value={10}>10 Rows</option>
                  <option value={20}>20 Rows</option>
                  <option value={50}>50 Rows</option>
                </select>
              </div>
            </div>

            <div className="ac-table-wrap">
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Metadata</th>
                    <th>Source System</th>
                    <th>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="ac-empty">
                          <div className="ac-empty__icon">🔍</div>
                          No transactions match the filter.
                        </div>
                      </td>
                    </tr>
                  ) : paginatedLogs.map(log => (
                    <tr key={log.log_id} onClick={() => setSelectedResource(log.source_table || log.resource)}>
                      <td className="ac-table__time">{formatTimestamp(log.timestamp)}</td>
                      <td className="ac-table__actor">{log.actor}</td>
                      <td><ActionBadge action={log.action} /></td>
                      <td className="ac-table__mono">{log.source_table || log.resource || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>{renderMetadataCell(log.metadata)}</td>
                      <td className="ac-table__source-system">{log.source_system || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>{renderStatusBadge(log)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="ac-pagination">
              <span className="ac-pagination__info">
                Showing {paginatedLogs.length} of {displayTotal} results
              </span>
              <div className="ac-pagination__controls">
                <button
                  className="ac-pagination__btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  ← Prev
                </button>
                {renderPageNumbers().map((p, i) =>
                  p === '...'
                    ? <span key={`dots-${i}`} className="ac-pagination__dots">…</span>
                    : <button
                      key={p}
                      className={`ac-pagination__page${currentPage === p ? ' ac-pagination__page--active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >{p}</button>
                )}
                <button
                  className="ac-pagination__btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ===== MODAL LEVEL 1: Table Records ===== */}
      {selectedTableModal && (
        <div className="ac-modal-overlay" onClick={() => setSelectedTableModal(null)}>
          <div className="ac-modal ac-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="ac-modal__header">
              <div>
                <div className="ac-modal__title">🗂️ Table: {selectedTableModal}</div>
                <div className="ac-modal__subtitle">{groupedInventory[selectedTableModal]?.length} records found</div>
              </div>
              <button className="ac-modal__close" onClick={() => setSelectedTableModal(null)}>×</button>
            </div>
            <div className="ac-modal__body" style={{ padding: 0 }}>
              <div className="ac-table-wrap">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Resource ID</th>
                      <th>Last Action</th>
                      <th>Last Updated</th>
                      <th>Chain Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedInventory[selectedTableModal].map(item => {
                      const resource = item.source_table || item.resource || '';
                      const resourceID = resource.includes(':') ? resource.split(':')[1] : resource;
                      return (
                        <tr
                          key={resource}
                          onClick={() => { setSelectedResource(resource); setSelectedTableModal(null); }}
                        >
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                              🔍 {resourceID}
                            </span>
                          </td>
                          <td><ActionBadge action={item.action} /></td>
                          <td className="ac-table__time">{formatTimestamp(item.timestamp)}</td>
                          <td onClick={e => e.stopPropagation()}>{renderInventoryBadge(item)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL LEVEL 2: Resource Log Detail ===== */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          logs={recentLogs}
          verifyStatus={inventoryStatuses[selectedResource]}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}

// ================================================================
// ROUTER UTAMA
// ================================================================
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const handleLogout = () => { localStorage.removeItem('token'); setIsAuthenticated(false); };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login onLogin={setIsAuthenticated} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;