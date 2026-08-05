import React from 'react';
import Icon from '../common/Icon';
import ActionBadge from '../common/ActionBadge';
import VerificationModal from './VerificationModal';
import { formatTimestamp, renderMetadataCell } from '../../utils/formatters';
import DBEngineBadge from '../common/DBEngineBadge';

function AuditLogTable({
  paginatedLogs = [],
  searchQuery = '',
  setSearchQuery,
  filterAction = 'ALL',
  setFilterAction,
  filterVerification = 'ALL',
  setFilterVerification,
  sortOrder = 'desc',
  setSortOrder,
  filterTable = '',
  setFilterTable,
  filterDbEngine = 'ALL',
  setFilterDbEngine,
  tableNames = [],
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
  handleClearRange,
  isLogsLoading = false,
  handleVerifyRange,
  rangeVerifyResult = null,
  setRangeVerifyResult,
  isVerifyRangeLoading = false,
  selectedVerifyResult = null,
  setSelectedVerifyResult,
  onSelectResource,
  renderStatusBadge,
  displayTotal = 0,
  currentPage = 1,
  setCurrentPage,
  totalPages = 1,
  renderPageNumbers
}) {
  const [copyState, setCopyState] = React.useState('');
  const [isTablePickerOpen, setIsTablePickerOpen] = React.useState(false);
  const [tableSearch, setTableSearch] = React.useState('');
  const tablePickerRef = React.useRef(null);
  const isSortEnabled = Boolean(filterDateFrom && filterDateTo);

  const filteredTableNames = React.useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return tableNames;
    return tableNames.filter(name => name.toLowerCase().includes(query));
  }, [tableNames, tableSearch]);

  React.useEffect(() => {
    const handleOutsideClick = (event) => {
      if (tablePickerRef.current && !tablePickerRef.current.contains(event.target)) {
        setIsTablePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleTableSelect = (nextTable) => {
    if (setFilterTable) setFilterTable(nextTable);
    if (setCurrentPage) setCurrentPage(1);
    setIsTablePickerOpen(false);
    setTableSearch('');
  };

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

  return (
    <section className="ac-card">
      <div className="ac-card__header ac-audit-card-header">
        <div className="ac-audit-card-header__top">
          <div className="ac-card__header-left">
            <span className="ac-card__icon ac-card__icon--soft">
              <Icon name="history" size={18} />
            </span>
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

            <div className="ac-combobox" ref={tablePickerRef}>
              <button
                type="button"
                className={`ac-combobox__trigger${isTablePickerOpen ? ' ac-combobox__trigger--open' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={isTablePickerOpen}
                onClick={() => setIsTablePickerOpen(open => !open)}
                title={filterTable || 'All Tables'}
              >
                <Icon name="database" size={15} />
                <span className="ac-combobox__value">{filterTable || 'All Tables'}</span>
                <Icon name="chevronDown" size={15} />
              </button>

              {isTablePickerOpen && (
                <div className="ac-combobox__menu" role="listbox">
                  <div className="ac-combobox__search">
                    <Icon name="search" size={14} />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={e => setTableSearch(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') setIsTablePickerOpen(false);
                      }}
                      placeholder="Filter tables..."
                      autoFocus
                    />
                  </div>
                  <div className="ac-combobox__list">
                    <button
                      type="button"
                      className={`ac-combobox__option${!filterTable ? ' ac-combobox__option--active' : ''}`}
                      onClick={() => handleTableSelect('')}
                      role="option"
                      aria-selected={!filterTable}
                    >
                      <span className="ac-combobox__option-main">All Tables</span>
                      <span className="ac-combobox__option-meta">{tableNames.length} detected</span>
                    </button>
                    {filteredTableNames.length > 0 ? (
                      filteredTableNames.map(name => (
                        <button
                          type="button"
                          key={name}
                          className={`ac-combobox__option${filterTable === name ? ' ac-combobox__option--active' : ''}`}
                          onClick={() => handleTableSelect(name)}
                          role="option"
                          aria-selected={filterTable === name}
                          title={name}
                        >
                          <span className="ac-combobox__option-main">{name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="ac-combobox__empty">No table found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="ac-filter-select">
              <select className="ac-select ac-select--filter" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                <option value="ALL">All Actions</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
              <span className="ac-filter-select__chevron">
                <Icon name="chevronDown" size={15} />
              </span>
            </div>

            <div className="ac-filter-select">
              <select className="ac-select ac-select--filter" value={filterDbEngine} onChange={e => setFilterDbEngine && setFilterDbEngine(e.target.value)}>
                <option value="ALL">All Engines</option>
                <option value="postgres">Postgres</option>
                <option value="mongodb">MongoDB</option>
                <option value="mysql">MySQL</option>
              </select>
              <span className="ac-filter-select__chevron">
                <Icon name="chevronDown" size={15} />
              </span>
            </div>

            <div className="ac-filter-select">
              <select className="ac-select ac-select--filter" value={filterVerification} onChange={e => setFilterVerification(e.target.value)}>
                <option value="ALL">All Status</option>
                <option value="VALID">VALID</option>
                <option value="INVALID">INVALID</option>
              </select>
              <span className="ac-filter-select__chevron">
                <Icon name="chevronDown" size={15} />
              </span>
            </div>

            <button
              type="button"
              className={`ac-btn-ghost ac-sort-toggle${isSortEnabled && sortOrder === 'desc' ? ' ac-btn-ghost--active' : ''}`}
              disabled={!isSortEnabled || isLogsLoading}
              onClick={() => {
                if (!isSortEnabled || isLogsLoading) return;
                if (setSortOrder) setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              title={
                isSortEnabled
                  ? (sortOrder === 'desc' ? 'Sort selected range by newest logs first' : 'Sort selected range by oldest logs first')
                  : 'Select From and To date range before sorting logs'
              }
            >
              <Icon name={sortOrder === 'desc' ? 'arrowDown' : 'arrowUp'} size={14} />
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </button>

            <div className="ac-filter-select ac-filter-select--rows">
              <select className="ac-select ac-select--filter" value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                <option value={5}>5 Rows</option>
                <option value={10}>10 Rows</option>
                <option value={20}>20 Rows</option>
                <option value={50}>50 Rows</option>
              </select>
              <span className="ac-filter-select__chevron">
                <Icon name="chevronDown" size={15} />
              </span>
            </div>
          </div>
        </div>

        <div className="ac-date-panel">
          <div className="ac-date-panel__title">
            <span className="ac-date-panel__icon">
              <Icon name="calendar" size={17} />
            </span>
            <div>
              <div className="ac-date-panel__label">Date Range</div>
              <div className="ac-date-panel__sub">Transaction window</div>
            </div>
          </div>

          <div className="ac-date-range">
            <label className="ac-date-field">
              <span className="ac-date-field__label">From</span>
              <span className="ac-date-input-shell">
                <Icon name="calendar" size={14} />
                <input
                  type="datetime-local"
                  className="ac-date-input"
                  value={tempDateFrom || ''}
                  onChange={e => setTempDateFrom(e.target.value)}
                />
              </span>
            </label>
            <label className="ac-date-field">
              <span className="ac-date-field__label">To</span>
              <span className="ac-date-input-shell">
                <Icon name="calendar" size={14} />
                <input
                  type="datetime-local"
                  className="ac-date-input"
                  value={tempDateTo || ''}
                  onChange={e => setTempDateTo(e.target.value)}
                />
              </span>
            </label>
          </div>

          {isLogsLoading && (
            <span className="ac-date-panel__loading">
              <Icon name="spinner" size={14} />
              Loading logs...
            </span>
          )}

          <div className="ac-date-actions">
            {(tempDateFrom || tempDateTo || filterDateFrom || filterDateTo) && (
              <button
                className="ac-btn-ghost-action ac-date-action-btn"
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
                <Icon name="x" size={14} />
                Clear Range
              </button>
            )}
            {filterDateFrom && filterDateTo && (
              <button
                className="ac-btn-primary ac-date-action-btn ac-date-action-btn--primary"
                disabled={isVerifyRangeLoading}
                onClick={handleVerifyRange}
              >
                <Icon name={isVerifyRangeLoading ? 'spinner' : 'zap'} size={14} />
                {isVerifyRangeLoading ? 'Verifying...' : 'Verify Range'}
              </button>
            )}
            {rangeVerifyResult && (
              <button
                type="button"
                className="ac-btn-ghost-action ac-date-action-btn"
                onClick={handleCopyResults}
              >
                <Icon name="copy" size={14} />
                Copy Results {copyState && `(${copyState})`}
              </button>
            )}
          </div>
        </div>

        {/* Inline Verification Animation — Single Log Verification */}
        {selectedVerifyResult && !selectedVerifyResult.range && (
          <div style={{ marginTop: '12px' }}>
            <VerificationModal
              result={selectedVerifyResult}
              onClose={() => setSelectedVerifyResult && setSelectedVerifyResult(null)}
            />
          </div>
        )}

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
                <span className="ac-card__icon ac-card__icon--soft">
                  <Icon name="chart" size={17} />
                </span>
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
                <Icon name="x" size={13} />
                Close Inspection
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>{rangeVerifyResult.summary.total}</div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Total Checked</div>
              </div>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>{rangeVerifyResult.summary.valid}</div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>Valid</div>
              </div>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>{rangeVerifyResult.summary.invalid}</div>
                <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>Invalid</div>
              </div>
              <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d97706' }}>{rangeVerifyResult.summary.pending}</div>
                <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '600' }}>Pending</div>
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
              <th>DB Engine</th>
              <th>Metadata</th>
              <th>Source System</th>
              <th>Verification</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="ac-empty">
                    <div className="ac-empty__icon">
                      <Icon name="calendar" size={30} />
                    </div>
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
                      'No transactions match the selected filter.'
                    )}
                  </div>
                </td>
              </tr>
            ) : paginatedLogs.map(log => {
              return (
                <tr key={log.log_id} onClick={() => onSelectResource(log.source_table || log.resource)}>
                  <td className="ac-table__time">{formatTimestamp(log.timestamp)}</td>
                  <td className="ac-table__actor">{log.actor}</td>
                  <td><ActionBadge action={log.action} /></td>
                  <td className="ac-table__mono">{log.source_table || log.resource || '-'}</td>
                  <td><DBEngineBadge engine={log.db_engine} /></td>
                  <td onClick={e => e.stopPropagation()}>{renderMetadataCell(log.metadata)}</td>
                  <td className="ac-table__source-system">{log.source_system || '-'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {renderStatusBadge(log)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
            Prev
          </button>
          {renderPageNumbers().map((p, i) =>
            p === '...'
              ? <span key={`dots-${i}`} className="ac-pagination__dots">...</span>
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
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

export { AuditLogTable };
export default AuditLogTable;
