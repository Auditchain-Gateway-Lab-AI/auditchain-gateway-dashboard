import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import ActionBadge from '../common/ActionBadge';
import SnapshotViewer from './SnapshotViewer';
import Icon from '../common/Icon';
import { formatTimestamp } from '../../utils/formatters';

// ================================================================
// KOMPONEN: Modal Detail Log per Resource (LEVEL 2)
// ================================================================
function ResourceDetailModal({ log: activeLog, selectedClient, onClose }) {
  const [logs, setLogs] = useState([]);
  const [chainStatus, setChainStatus] = useState(null); // hasil verify-resource
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const resource = activeLog?.source_table || activeLog?.resource || '';

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 240); // slightly less than the 250ms CSS animation
  }, [isClosing, onClose]);

  useEffect(() => {
    if (!resource || activeTab !== 'history') return;

    let cancelled = false;
    setLoading(true);
    setError('');
    setChainStatus(null);

    const encoded = encodeURIComponent(resource);
    const clientParam = selectedClient ? `?client_id=${encodeURIComponent(selectedClient)}` : '';

    Promise.all([
      api.get(`/dashboard/logs/by-resource/${encoded}${clientParam}`),
      api.get(`/dashboard/verify-resource/${encoded}${clientParam}`).catch(err => err.response), // 409/202 tetap punya body valid
    ])
      .then(([logsRes, verifyRes]) => {
        if (cancelled) return;
        setLogs(logsRes.data || []);
        setChainStatus(verifyRes?.data || null);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.response?.data?.error || 'Failed to load resource history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [resource, selectedClient, activeTab]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const sortedAsc = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const resourceLogs = [...sortedAsc].reverse();

  // Peta status per log_id (dari verify-resource)
  const logStatusMap = {};
  (chainStatus?.logs || []).forEach(item => {
    logStatusMap[item.log_id] = item;
  });

  const renderChainChip = () => {
    if (!chainStatus) return null;

    const uniqueCategories = [...new Set(
      (chainStatus.chain_issues || []).map(issue => issue.split(':')[0])
    )];

    const isClientMismatchOnly = uniqueCategories.length === 1 && uniqueCategories[0] === 'client_mismatch';
    const isIntegrityFailed = uniqueCategories.includes('log_integrity_failed');

    let cls = 'ac-status--invalid';
    let label = 'Tampered';
    let icon = 'alertTriangle';

    if (chainStatus.chain_status === 'valid') {
      cls = 'ac-status--valid';
      label = 'Valid Chain';
      icon = 'checkCircle';
    } else if (chainStatus.chain_status === 'pending') {
      cls = 'ac-status--pending';
      label = 'Pending';
      icon = 'clock';
    } else if (chainStatus.chain_status === 'unreachable') {
      cls = 'ac-status--pending';
      label = 'Unreachable';
      icon = 'alertCircle';
    } else if (isClientMismatchOnly) {
      cls = 'ac-status--sync';
      label = 'Out of Sync';
      icon = 'alertTriangle';
    } else if (isIntegrityFailed) {
      cls = 'ac-status--invalid';
      label = 'Tampered';
      icon = 'xCircle';
    }

    const issueLabels = {
      client_mismatch: 'Live data on Client Node is newer than audit log (Out of Sync)',
      log_integrity_failed: 'Log failed cryptographic integrity verification (Tampered)',
    };
    const tooltip = uniqueCategories.map(cat => issueLabels[cat] || cat).join(' • ');

    return (
      <span className={`ac-status ${cls}`} title={tooltip || undefined}>
        <Icon name={icon} size={14} style={{ marginRight: '4px' }} />
        {label}
      </span>
    );
  };

  const renderOverviewTab = () => {
    if (!activeLog) return null;

    return (
      <div className="ac-modal__body ac-drawer-tab-content">
        <div className="ac-overview-section">
          <div className="ac-overview-grid">
            <div className="ac-overview-item">
              <span className="ac-overview-label">
                <Icon name="hash" size={14} /> Audit Log ID
              </span>
              <code className="ac-overview-value ac-overview-value--code">{activeLog.log_id}</code>
            </div>

            <div className="ac-overview-item">
              <span className="ac-overview-label">
                <Icon name="clock" size={14} /> Action Time
              </span>
              <span className="ac-overview-value">{formatTimestamp(activeLog.timestamp)}</span>
            </div>

            <div className="ac-overview-item">
              <span className="ac-overview-label">
                <Icon name="user" size={14} /> Actor
              </span>
              <span className="ac-overview-value">{activeLog.actor}</span>
            </div>

            <div className="ac-overview-item">
              <span className="ac-overview-label">
                <Icon name="activity" size={14} /> Action Type
              </span>
              <span className="ac-overview-value">
                <ActionBadge action={activeLog.action} />
              </span>
            </div>

            <div className="ac-overview-item">
              <span className="ac-overview-label">
                <Icon name="database" size={14} /> Resource
              </span>
              <code className="ac-overview-value ac-overview-value--code">{activeLog.source_table || activeLog.resource}</code>
            </div>

            <div className="ac-overview-item">
              <span className="ac-overview-label">
                <Icon name="server" size={14} /> Source System
              </span>
              <span className="ac-overview-value">{activeLog.source_system || '-'}</span>
            </div>
            
            <div className="ac-overview-item" style={{ gridColumn: '1 / -1' }}>
              <span className="ac-overview-label">
                <Icon name="key" size={14} /> Cryptographic Hash
              </span>
              <code className="ac-overview-value ac-overview-value--code" style={{ wordBreak: 'break-all' }}>{activeLog.hash_value}</code>
            </div>
          </div>

          <div className="ac-overview-payload">
             <div className="ac-overview-label" style={{ marginBottom: '8px' }}>
                <Icon name="code" size={14} /> Log Payload Data
              </div>
             <SnapshotViewer currentLog={activeLog} previousLog={null} />
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryTab = () => {
    return (
      <div className="ac-modal__body ac-drawer-tab-content">
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {renderChainChip()}
          {chainStatus && (
            <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', marginLeft: '12px' }}>
              {resourceLogs.length} logs found
            </span>
          )}
        </div>

        {loading ? (
          <div className="ac-empty">
            <div className="ac-empty__icon"><Icon name="spinner" size={40} className="spin" /></div>
            Loading history and running verification...
          </div>
        ) : error ? (
          <div className="ac-empty">
            <div className="ac-empty__icon"><Icon name="alertTriangle" size={40} /></div>
            {error}
          </div>
        ) : resourceLogs.length === 0 ? (
          <div className="ac-empty">
            <div className="ac-empty__icon"><Icon name="inbox" size={40} /></div>
            No logs found for this resource.
          </div>
        ) : (
          resourceLogs.map((log, idx) => {
            const ascIdx = sortedAsc.findIndex(l => l.log_id === log.log_id);
            const prevLog = ascIdx > 0 ? sortedAsc[ascIdx - 1] : null;
            const isFirst = idx === 0;
            const logStatus = logStatusMap[log.log_id];

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
                  <span className="ac-log-card__actor">
                    <Icon name="user" size={12} style={{ marginRight: '4px' }} />
                    {log.actor}
                  </span>
                  <span className="ac-log-card__source">
                    <Icon name="server" size={12} style={{ marginRight: '4px' }} />
                    {log.source_system}
                  </span>
                  
                  {logStatus && relatedIssues.length === 0 && (
                    <span
                      className={`ac-chain-badge ${logStatus.integrity_status === 'valid' ? 'ac-status--valid'
                          : logStatus.integrity_status === 'pending' ? 'ac-status--pending'
                            : 'ac-status--invalid'
                        }`}
                      title={logStatus.is_latest ? `Agent: ${logStatus.agent_status}` : 'Historical record — not compared against Agent'}
                    >
                      {logStatus.integrity_status}
                    </span>
                  )}
                  {relatedIssues.includes('client_mismatch') && (
                    <span className="ac-chain-badge ac-status--sync" title="Live client data is newer than this log (Out of Sync)">
                      <Icon name="alertTriangle" size={12} style={{ marginRight: '4px' }} /> Client Out of Sync
                    </span>
                  )}
                  {relatedIssues.includes('log_integrity_failed') && (
                    <span className="ac-chain-badge ac-status--invalid" title="Log failed cryptographic integrity verification (rehash/Merkle)">
                      <Icon name="xCircle" size={12} style={{ marginRight: '4px' }} /> Integrity Failed
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
                  <code className="ac-log-card__hash-code">
                    <Icon name="key" size={12} style={{ marginRight: '4px' }} />
                    {log.hash_value}
                  </code>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className={`ac-drawer-overlay ${isClosing ? 'ac-drawer-overlay--closing' : ''}`} onClick={handleClose}>
      <aside
        className={`ac-detail-drawer ${isClosing ? 'ac-detail-drawer--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Log Detail Drawer"
        onClick={e => e.stopPropagation()}
      >
        <div className="ac-modal__header" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
            <div>
              <div className="ac-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="fileText" size={18} /> Log Details
              </div>
              <div className="ac-modal__subtitle">{resource}</div>
            </div>
            <div className="ac-modal__header-right">
              <button className="ac-modal__close" onClick={handleClose}>
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>
          
          <div className="ac-drawer-tabs">
            <button 
              className={`ac-drawer-tab ${activeTab === 'overview' ? 'ac-drawer-tab--active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`ac-drawer-tab ${activeTab === 'history' ? 'ac-drawer-tab--active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? renderOverviewTab() : renderHistoryTab()}

      </aside>
    </div>
  );
}

export { ResourceDetailModal };
export default ResourceDetailModal;
