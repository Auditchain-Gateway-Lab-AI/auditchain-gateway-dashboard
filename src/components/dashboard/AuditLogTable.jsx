import React from 'react';
import Icon from '../common/Icon';
import ActionBadge from '../common/ActionBadge';
import { formatTimestamp, renderMetadataCell } from '../../utils/formatters';

function AuditLogTable({
  paginatedLogs = [],
  searchQuery = '',
  setSearchQuery,
  filterAction = 'ALL',
  setFilterAction,
  filterVerification = 'ALL',
  setFilterVerification,
  rowsPerPage = 10,
  setRowsPerPage,
  tempDateFrom = '',
  setTempDateFrom,
  tempDateTo = '',
  setTempDateTo,
  filterDateFrom = '',
  filterDateTo = '',
  setFilterDateFrom,
  setFilterDateTo,
  handleApplyLogsRange,
  handleClearRange,
  isLogsLoading = false,
  handleVerifyRange,
  rangeVerifyResult = null,
  setRangeVerifyResult,
  isVerifyRangeLoading = false,
  onSelectResource,
  renderStatusBadge,
  displayTotal = 0,
  currentPage = 1,
  setCurrentPage,
  totalPages = 1,
  renderPageNumbers
}) {
  const [copyState, setCopyState] = React.useState('');

  const handleCopyResults = async () => {
    if (!rangeVerifyResult || !rangeVerifyResult.results) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(rangeVerifyResult.results, null, 2));
      setCopyState('Copied!');
      setTimeout(() => setCopyState(''), 2000);
    } catch {
      setCopyState('Failed');
      setTimeout(() => setCopyState(''), 2000);
    }
  };

  // Range verify lookup map per log_id
  const rangeVerifyMap = React.useMemo(() => {
    const map = {};
    if (rangeVerifyResult?.results) {
      rangeVerifyResult.results.forEach(r => {
        map[r.log_id] = r;
      });
    }
    return map;
  }, [rangeVerifyResult]);

  return (
    <section className="ac-card">
      <div className="ac-card__header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
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

        {/* Date Filter Range Toolbar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: '1px solid var(--color-outline-variant)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-on-surface-variant)' }}>📅 From:</span>
            <input
              type="datetime-local"
              className="ac-select"
              style={{ padding: '6px 10px', height: '36px', minWidth: '200px' }}
              value={tempDateFrom || ''}
              onChange={e => setTempDateFrom(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-on-surface-variant)' }}>📅 To:</span>
            <input
              type="datetime-local"
              className="ac-select"
              style={{ padding: '6px 10px', height: '36px', minWidth: '200px' }}
              value={tempDateTo || ''}
              onChange={e => setTempDateTo(e.target.value)}
            />
          </div>
          <button
            className="ac-btn-primary"
            style={{ padding: '0 16px', height: '36px', minWidth: 'auto', fontSize: '13px' }}
            disabled={!tempDateFrom || !tempDateTo || isLogsLoading}
            onClick={() => {
              if (handleApplyLogsRange) {
                handleApplyLogsRange(tempDateFrom, tempDateTo);
              } else {
                setFilterDateFrom(tempDateFrom);
                setFilterDateTo(tempDateTo);
                setCurrentPage(1);
              }
            }}
          >
            {isLogsLoading ? '⏳ Loading...' : 'Apply Range'}
          </button>
          {(tempDateFrom || tempDateTo || filterDateFrom || filterDateTo) && (
            <button
              className="ac-btn-ghost-action"
              style={{ padding: '0 12px', height: '36px', minWidth: 'auto', fontSize: '13px' }}
              onClick={() => {
                if (handleClearRange) {
                  handleClearRange();
                } else {
                  setTempDateFrom('');
                  setTempDateTo('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setCurrentPage(1);
                }
              }}
            >
              Clear Range
            </button>
          )}
          {filterDateFrom && filterDateTo && (
            <button
              className="ac-btn-primary"
              style={{
                padding: '0 16px',
                height: '36px',
                minWidth: 'auto',
                fontSize: '13px',
                backgroundColor: '#2c3e50',
                border: 'none',
                marginLeft: 'auto'
              }}
              disabled={isVerifyRangeLoading}
              onClick={handleVerifyRange}
            >
              {isVerifyRangeLoading ? '⏳ Verifying...' : '⚡ Verify Range'}
            </button>
          )}
          {rangeVerifyResult && (
            <button
              type="button"
              className="ac-btn-ghost-action"
              style={{ padding: '0 12px', height: '36px', minWidth: 'auto', fontSize: '12px' }}
              onClick={handleCopyResults}
            >
              📋 Copy Results {copyState && `(${copyState})`}
            </button>
          )}
        </div>

        {/* Integrated Range Verification Summary Banner (Opsi A - Single View) */}
        {rangeVerifyResult && rangeVerifyResult.summary && (
          <div style={{
            background: 'var(--color-surface-container-high, #f4f6f9)',
            border: '1px solid var(--color-outline-variant, #e0e0e0)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '16px',
            marginTop: '8px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📊</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-on-surface)' }}>
                    Range Verification Inspection Summary
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                    Checked logs from {formatTimestamp(rangeVerifyResult.range.from)} to {formatTimestamp(rangeVerifyResult.range.to)}
                  </div>
                </div>
              </div>
              <button
                className="ac-btn-ghost-action"
                style={{ padding: '4px 8px', fontSize: '12px' }}
                onClick={() => setRangeVerifyResult && setRangeVerifyResult(null)}
                title="Dismiss Inspection Banner"
              >
                ✕ Close Inspection
              </button>
            </div>

            {/* 4 Summary Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{rangeVerifyResult.summary.total}</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Total Checked</div>
              </div>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{rangeVerifyResult.summary.valid}</div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>✅ Valid</div>
              </div>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>{rangeVerifyResult.summary.invalid}</div>
                <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>🚨 Mismatch</div>
              </div>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d97706' }}>{rangeVerifyResult.summary.pending}</div>
                <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '600' }}>⏱️ Pending</div>
              </div>
            </div>
          </div>
        )}
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
                <td colSpan={7}>
                  <div className="ac-empty">
                    <div className="ac-empty__icon">📅</div>
                    {!filterDateFrom || !filterDateTo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--color-on-surface)' }}>
                          Please select a date range (From & To) to view transaction history
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                          Transactions are not loaded automatically to ensure optimal performance.
                        </span>
                      </div>
                    ) : (
                      "No transactions match the selected filter."
                    )}
                  </div>
                </td>
              </tr>
            ) : paginatedLogs.map(log => {
              const rangeMatch = rangeVerifyMap[log.log_id];
              return (
                <tr key={log.log_id} onClick={() => onSelectResource(log.source_table || log.resource)}>
                  <td className="ac-table__time">{formatTimestamp(log.timestamp)}</td>
                  <td className="ac-table__actor">{log.actor}</td>
                  <td><ActionBadge action={log.action} /></td>
                  <td className="ac-table__mono">{log.source_table || log.resource || '—'}</td>
                  <td onClick={e => e.stopPropagation()}>{renderMetadataCell(log.metadata)}</td>
                  <td className="ac-table__source-system">{log.source_system || '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {renderStatusBadge(log)}
                      {rangeMatch && (
                        <span
                          className={`ac-chain-badge ${rangeMatch.hash_match ? 'ac-status--valid' : 'ac-status--invalid'}`}
                          style={{ fontSize: '10px', padding: '2px 6px' }}
                        >
                          {rangeMatch.hash_match ? '✓ Match' : '✕ Mismatch'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
  );
}

export { AuditLogTable };
export default AuditLogTable;
