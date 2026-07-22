import React, { useState, useEffect } from 'react';
import api from '../../api';
import ActionBadge from '../common/ActionBadge';
import SnapshotViewer from './SnapshotViewer';
import { formatTimestamp } from '../../utils/formatters';

// ================================================================
// KOMPONEN: Modal Detail Log per Resource (LEVEL 2)
// ================================================================
function ResourceDetailModal({ resource, onClose }) {
  const [logs, setLogs] = useState([]);
  const [chainStatus, setChainStatus] = useState(null); // hasil verify-resource
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!resource) return;

    let cancelled = false;
    setLoading(true);
    setError('');
    setChainStatus(null);

    const encoded = encodeURIComponent(resource);

    Promise.all([
      api.get(`/dashboard/logs/by-resource/${encoded}`),
      api.get(`/dashboard/verify-resource/${encoded}`).catch(err => err.response), // 409/202 tetap punya body valid
    ])
      .then(([logsRes, verifyRes]) => {
        if (cancelled) return;
        setLogs(logsRes.data || []);
        setChainStatus(verifyRes?.data || null);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.response?.data?.error || 'Gagal memuat riwayat resource.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [resource]);

  const sortedAsc = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const resourceLogs = [...sortedAsc].reverse();

  // Peta status per log_id (dari verify-resource), supaya tiap kartu log bisa
  // menampilkan status individualnya, bukan cuma status agregat di header.
  const logStatusMap = {};
  (chainStatus?.logs || []).forEach(item => {
    logStatusMap[item.log_id] = item;
  });

  const chainChip = () => {
    if (!chainStatus) return null;
    const cls = chainStatus.chain_status === 'valid' ? 'ac-status--valid'
      : chainStatus.chain_status === 'pending' ? 'ac-status--pending'
        : chainStatus.chain_status === 'unreachable' ? 'ac-status--pending'
          : 'ac-status--invalid';
    const label = chainStatus.chain_status === 'valid' ? '✅ Valid Chain'
      : chainStatus.chain_status === 'pending' ? '⏱️ Pending'
        : chainStatus.chain_status === 'unreachable' ? '⚠️ Unreachable'
          : '🚨 Tampered';

    // chain_issues berisi "category:log_id" — ambil kategorinya saja untuk
    // ringkasan tooltip, log_id sudah kelihatan di kartu log masing-masing.
    const issueLabels = {
      client_mismatch: 'Client data no longer matches latest log',
      log_integrity_failed: 'One or more logs failed integrity check',
    };
    const uniqueCategories = [...new Set(
      (chainStatus.chain_issues || []).map(issue => issue.split(':')[0])
    )];
    const tooltip = uniqueCategories.map(cat => issueLabels[cat] || cat).join(' • ');

    return (
      <span className={`ac-status ${cls}`} title={tooltip || undefined}>
        {label}
      </span>
    );
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
            <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
              {loading ? 'Memverifikasi...' : `${resourceLogs.length} logs found`}
            </span>
            <button className="ac-modal__close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="ac-modal__body">
          {loading ? (
            <div className="ac-empty">
              <div className="ac-empty__icon">⏳</div>
              Memuat riwayat dan menjalankan verifikasi...
            </div>
          ) : error ? (
            <div className="ac-empty">
              <div className="ac-empty__icon">⚠️</div>
              {error}
            </div>
          ) : resourceLogs.length === 0 ? (
            <div className="ac-empty">
              <div className="ac-empty__icon">📭</div>
              No logs found for this resource.
            </div>
          ) : (
            resourceLogs.map((log, idx) => {
              const ascIdx = sortedAsc.findIndex(l => l.log_id === log.log_id);
              const prevLog = ascIdx > 0 ? sortedAsc[ascIdx - 1] : null;
              const isFirst = idx === 0;
              const logStatus = logStatusMap[log.log_id];

              // Cek apakah log ini disebut spesifik di chain_issues (format "category:log_id")
              const relatedIssues = (chainStatus?.chain_issues || [])
                .filter(issue => issue.endsWith(`:${log.log_id}`))
                .map(issue => issue.split(':')[0]);

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
                    {logStatus && (
                      <span
                        className={`ac-chain-badge ${logStatus.integrity_status === 'valid' ? 'ac-status--valid'
                            : logStatus.integrity_status === 'pending' ? 'ac-status--pending'
                              : 'ac-status--invalid'
                          }`}
                        title={logStatus.is_latest ? `Agent: ${logStatus.agent_status}` : 'Riwayat historis — tidak dibandingkan ke Agent'}
                      >
                        {logStatus.integrity_status}
                      </span>
                    )}
                    {relatedIssues.includes('client_mismatch') && (
                      <span className="ac-chain-badge ac-status--invalid" title="Data live klien tidak cocok dengan log ini">
                        🔌 Client Mismatch
                      </span>
                    )}
                    {relatedIssues.includes('log_integrity_failed') && (
                      <span className="ac-chain-badge ac-status--invalid" title="Log ini gagal verifikasi integritas (rehash/Merkle)">
                        🔓 Integrity Failed
                      </span>
                    )}
                    {isFirst && <span className="ac-log-card__latest-chip">● Latest</span>}
                  </div>

                  <div className="ac-log-card__body">
                    <div className="ac-log-card__section-label">
                      {log.action === 'INSERT' ? 'New Data'
                        : log.action === 'DELETE' ? 'Deleted Data (compared to previous log)'
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

export { ResourceDetailModal };
export default ResourceDetailModal;
