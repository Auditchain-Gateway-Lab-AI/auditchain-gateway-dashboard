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
  onSelectResource,
  renderStatusBadge,
  displayTotal = 0,
  currentPage = 1,
  setCurrentPage,
  totalPages = 1,
  renderPageNumbers
}) {
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
              onClick={handleVerifyRange}
            >
              ⚡ Verify Range
            </button>
          )}
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
            ) : paginatedLogs.map(log => (
              <tr key={log.log_id} onClick={() => onSelectResource(log.source_table || log.resource)}>
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
  );
}

export { AuditLogTable };
export default AuditLogTable;
