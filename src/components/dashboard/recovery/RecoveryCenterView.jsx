import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../common/Icon';
import { formatTimestamp } from '../../../utils/formatters';
import { recoveryApi } from '../../../services/recoveryApi';
import RecoveryStatusBadge from './RecoveryStatusBadge';
import RecoveryConfirmationDialog from './RecoveryConfirmationDialog';

const INCIDENT_FILTERS = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RECOVERING', 'RESOLVED', 'DISMISSED'];
const REQUEST_FILTERS = ['ALL', 'PENDING_EXECUTION', 'EXECUTING', 'SUCCEEDED', 'FAILED_VERIFICATION', 'FAILED_EXECUTION'];
const EXECUTABLE_REQUEST_STATUSES = new Set(['PENDING_EXECUTION', 'PENDING_APPROVAL', 'APPROVED']);

const sortNewest = (items = [], field) => [...items].sort((a, b) => (
  new Date(b?.[field] || 0).getTime() - new Date(a?.[field] || 0).getTime()
));

const getErrorMessage = error => error?.unavailable
  ? 'Recovery service is not enabled on this gateway.'
  : error?.message || 'Recovery data could not be loaded.';

function RecoveryCenterView({ selectedClient }) {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [incidentFilter, setIncidentFilter] = useState('ALL');
  const [requestFilter, setRequestFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('incidents');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [mutationLoading, setMutationLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedClient) return;
    setLoading(true);
    setError('');
    try {
      const [incidentData, requestData] = await Promise.all([
        recoveryApi.listIncidents(),
        recoveryApi.listRequests(),
      ]);
      setIncidents(Array.isArray(incidentData) ? sortNewest(incidentData, 'detected_at') : []);
      setRequests(Array.isArray(requestData) ? sortNewest(requestData, 'requested_at') : []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleIncidents = useMemo(() => incidents.filter(item => {
    const matchesFilter = incidentFilter === 'ALL' || String(item.status || '').toUpperCase() === incidentFilter;
    const haystack = [item.id, item.log_id, item.resource, item.incident_type].join(' ').toLowerCase();
    return matchesFilter && (!normalizedSearch || haystack.includes(normalizedSearch));
  }), [incidents, incidentFilter, normalizedSearch]);

  const visibleRequests = useMemo(() => requests.filter(item => {
    const matchesFilter = requestFilter === 'ALL' || String(item.status || '').toUpperCase() === requestFilter;
    const haystack = [item.id, item.incident_id, item.target_log_id, item.selected_log_id, item.reason].join(' ').toLowerCase();
    return matchesFilter && (!normalizedSearch || haystack.includes(normalizedSearch));
  }), [requests, requestFilter, normalizedSearch]);

  const stats = useMemo(() => ({
    open: incidents.filter(item => item.status === 'OPEN').length,
    ready: requests.filter(item => EXECUTABLE_REQUEST_STATUSES.has(String(item.status || '').toUpperCase())).length,
    recovering: requests.filter(item => item.status === 'EXECUTING').length,
    resolved: incidents.filter(item => item.status === 'RESOLVED').length,
  }), [incidents, requests]);

  const activeFilter = activeSection === 'incidents' ? incidentFilter : requestFilter;
  const visibleCount = activeSection === 'incidents' ? visibleIncidents.length : visibleRequests.length;
  const totalCount = activeSection === 'incidents' ? incidents.length : requests.length;
  const hasActiveFilters = Boolean(normalizedSearch || activeFilter !== 'ALL');

  const clearFilters = () => {
    setSearch('');
    if (activeSection === 'incidents') setIncidentFilter('ALL');
    else setRequestFilter('ALL');
  };

  const runMutation = async (action) => {
    if (!dialog?.request?.id) return;
    setMutationLoading(true);
    try {
      await action({ requestId: dialog.request.id });
      setDialog(null);
      await loadData();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
      setDialog(null);
    } finally {
      setMutationLoading(false);
    }
  };

  const requestActions = (request) => {
    const status = String(request.status || '').toUpperCase();
    if (EXECUTABLE_REQUEST_STATUSES.has(status)) {
      return <button type="button" className="ac-btn-primary ac-btn-primary--small" onClick={() => setDialog({ type: 'execute', request, action: recoveryApi.executeRequest })}><Icon name="refresh" size={13} /> Execute</button>;
    }
    return null;
  };

  return (
    <section className="ac-recovery-center">
      <div className="ac-hero ac-recovery-center__hero">
        <div className="ac-hero__pattern" />
        <div className="ac-hero__content">
          <div className="ac-recovery-center__hero-main">
            <div className="ac-recovery-center__hero-icon" aria-hidden="true">
              <Icon name="shield" size={25} />
            </div>
            <div className="ac-hero__left">
              <span className="ac-page-kicker ac-recovery-center__breadcrumb">
                <span>Audit Logs</span>
                <Icon name="chevronRight" size={13} />
                <strong>Recovery</strong>
              </span>
              <h1 className="ac-hero__title">Recovery Center</h1>
            </div>
          </div>
          <div className="ac-recovery-center__hero-copy">
            <p className="ac-hero__subtitle">Review tamper incidents and manage verified recovery requests for the active workspace.</p>
          </div>
          <div className="ac-recovery-center__hero-action">
            <button type="button" className="ac-btn-ghost-action" onClick={() => navigate('/audit-logs')}><Icon name="chevronLeft" size={15} /> Back to audit logs</button>
          </div>
        </div>
      </div>

      {error && <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={16} /><span>{error}</span><button type="button" onClick={loadData} aria-label="Retry recovery center"><Icon name="refresh" size={15} /></button></div>}

      <div className="ac-recovery-stat-grid">
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--danger"><Icon name="alertTriangle" size={17} /></span><div><strong>{stats.open}</strong><span>Open incidents</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--warning"><Icon name="clock" size={17} /></span><div><strong>{stats.ready}</strong><span>Ready to execute</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--info"><Icon name="activity" size={17} /></span><div><strong>{stats.recovering}</strong><span>Executing</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--success"><Icon name="checkCircle" size={17} /></span><div><strong>{stats.resolved}</strong><span>Resolved incidents</span></div></div>
      </div>

      <div className="ac-recovery-center__toolbar">
        <div className="ac-recovery-segmented" role="tablist" aria-label="Recovery data type">
          <button type="button" className={activeSection === 'incidents' ? 'is-active' : ''} onClick={() => setActiveSection('incidents')}><Icon name="alertTriangle" size={13} /> Incidents</button>
          <button type="button" className={activeSection === 'requests' ? 'is-active' : ''} onClick={() => setActiveSection('requests')}><Icon name="fileText" size={13} /> Requests {stats.ready > 0 && <span>{stats.ready}</span>}</button>
        </div>
        <label className="ac-recovery-search"><Icon name="search" size={15} /><input aria-label="Search recovery records" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ID, resource, or reason" /></label>
        <button type="button" className={`ac-btn-ghost-action ac-recovery-refresh${loading ? ' is-loading' : ''}`} onClick={loadData} disabled={loading}><Icon name={loading ? 'spinner' : 'refresh'} size={14} /> Refresh</button>
      </div>

      {activeSection === 'incidents' ? (
        <div className="ac-recovery-center__panel">
          <div className="ac-recovery-center__panel-head">
            <div className="ac-recovery-center__panel-title">
              <div className="ac-recovery-center__panel-title-row">
                <h2>Tamper incidents</h2>
                <span>{visibleCount} of {totalCount}</span>
              </div>
              <p>Integrity incidents detected by the gateway scanner.</p>
            </div>
            <div className="ac-recovery-filter-actions">
              <label className="ac-recovery-filter"><Icon name="filter" size={14} /><span>Status</span><select value={incidentFilter} onChange={event => setIncidentFilter(event.target.value)} aria-label="Filter incidents">
                {INCIDENT_FILTERS.map(filter => <option value={filter} key={filter}>{filter === 'ALL' ? 'All statuses' : filter.replaceAll('_', ' ')}</option>)}
              </select></label>
              {hasActiveFilters && <button type="button" className="ac-recovery-clear-filter" onClick={clearFilters}><Icon name="x" size={13} /> Clear</button>}
            </div>
          </div>
          {loading ? <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading incidents...</div> : visibleIncidents.length === 0 ? <div className="ac-recovery-empty"><Icon name="inbox" size={25} /><strong>No incidents found</strong><p>There are no incidents matching the current workspace and filter.</p></div> : (
            <div className="ac-recovery-table-wrap"><table className="ac-recovery-table"><thead><tr><th>Incident</th><th>Log / Resource</th><th>Detected</th><th>Status</th></tr></thead><tbody>
              {visibleIncidents.map(item => <tr key={item.id}>
                <td><code>{item.id}</code><small>{item.incident_type || 'Integrity mismatch'}</small></td>
                <td><code>{item.log_id}</code><small>{item.resource || '-'}</small></td>
                <td>{item.detected_at ? formatTimestamp(item.detected_at) : '-'}</td>
                <td><RecoveryStatusBadge status={item.status} compact /></td>
              </tr>)}
            </tbody></table></div>
          )}
        </div>
      ) : (
        <div className="ac-recovery-center__panel">
          <div className="ac-recovery-center__panel-head">
            <div className="ac-recovery-center__panel-title">
              <div className="ac-recovery-center__panel-title-row">
                <h2>Recovery requests</h2>
                <span>{visibleCount} of {totalCount}</span>
              </div>
              <p>Client-operated recovery queue for the active workspace.</p>
            </div>
            <div className="ac-recovery-filter-actions">
              <label className="ac-recovery-filter"><Icon name="filter" size={14} /><span>Status</span><select value={requestFilter} onChange={event => setRequestFilter(event.target.value)} aria-label="Filter recovery requests">
                {REQUEST_FILTERS.map(filter => <option value={filter} key={filter}>{filter === 'ALL' ? 'All statuses' : filter.replaceAll('_', ' ')}</option>)}
              </select></label>
              {hasActiveFilters && <button type="button" className="ac-recovery-clear-filter" onClick={clearFilters}><Icon name="x" size={13} /> Clear</button>}
            </div>
          </div>
          {loading ? <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading requests...</div> : visibleRequests.length === 0 ? <div className="ac-recovery-empty"><Icon name="inbox" size={25} /><strong>No recovery requests found</strong><p>Requests submitted for this workspace will appear here.</p></div> : (
            <div className="ac-recovery-table-wrap"><table className="ac-recovery-table"><thead><tr><th>Request</th><th>Target log</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>
              {visibleRequests.map(item => <tr key={item.id}>
                <td><code>{item.id}</code><small>{item.requested_at ? formatTimestamp(item.requested_at) : '-'}</small></td>
                <td><code>{item.target_log_id || item.selected_log_id || '-'}</code><small>Incident {item.incident_id || '-'}</small></td>
                <td><span className="ac-recovery-table__reason">{item.reason || '-'}</span></td>
                <td><RecoveryStatusBadge status={item.status} compact /></td>
                <td>{requestActions(item) || <span className="ac-recovery-table__muted">-</span>}</td>
              </tr>)}
            </tbody></table></div>
          )}
        </div>
      )}

      {dialog && (
        <RecoveryConfirmationDialog
          open
          title="Execute recovery?"
          message="The backend will revalidate PostgreSQL, the exact MinIO snapshot, and its Fabric proof before restoring this AuditChain log. The client database will not be changed."
          confirmLabel="Execute recovery"
          tone="primary"
          busy={mutationLoading}
          onClose={() => !mutationLoading && setDialog(null)}
          onConfirm={() => runMutation(dialog.action)}
        />
      )}
    </section>
  );
}

export default RecoveryCenterView;
