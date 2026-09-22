import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../common/Icon';
import { formatTimestamp } from '../../../utils/formatters';
import RecoveryStatusBadge from './RecoveryStatusBadge';
import RecoveryConfirmationDialog from './RecoveryConfirmationDialog';
import { recoveryApi } from '../../../services/recoveryApi';

const INCIDENT_FILTERS = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RECOVERING', 'RESOLVED', 'DISMISSED'];
const EVENT_FILTERS = ['ALL', 'SUCCEEDED', 'FAILED_VERIFICATION', 'FAILED_EXECUTION'];
// Compatibility value for the current backend contract. It is intentionally
// not exposed as a user-editable reason in the Recovery Data UI.
const INTERNAL_RECOVERY_REASON = 'Recovery initiated from the Recovery Data workspace.';

const getErrorMessage = error => error?.unavailable
  ? 'Recovery service is not available on this gateway.'
  : error?.message || 'Recovery data could not be loaded.';

const parseJsonValue = value => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const formatJson = value => {
  const parsed = parseJsonValue(value);
  if (parsed === null || parsed === undefined) return '-';
  if (typeof parsed === 'string') return parsed;
  return JSON.stringify(parsed, null, 2);
};

// TamperIncident currently omits TamperedPayload from JSON. The current audit
// row is therefore loaded from the tenant-scoped resource endpoint for the
// before-recovery view, with incident projections kept as a fallback.
const getTamperedData = (incident, auditLog) => auditLog?.metadata
  ?? incident?.auditLog?.metadata
  ?? incident?.tampered_payload
  ?? incident?.tampered_metadata
  ?? incident?.current_metadata
  ?? incident?.metadata
  ?? null;

const getChangedFields = (current, trusted) => {
  const currentValue = parseJsonValue(current);
  const trustedValue = parseJsonValue(trusted);
  if (!currentValue || !trustedValue || typeof currentValue !== 'object' || typeof trustedValue !== 'object' || Array.isArray(currentValue) || Array.isArray(trustedValue)) return [];
  const keys = new Set([...Object.keys(currentValue), ...Object.keys(trustedValue)]);
  return [...keys].filter(key => JSON.stringify(currentValue[key]) !== JSON.stringify(trustedValue[key]));
};

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `recovery-ui-${crypto.randomUUID()}`;
  }
  return `recovery-ui-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const normalizeList = value => Array.isArray(value) ? value : [];

const normalizeEventPage = value => ({
  data: Array.isArray(value) ? value : normalizeList(value?.data),
  totalItems: value?.total_items ?? (Array.isArray(value) ? value.length : 0),
  totalPages: value?.total_pages ?? 1,
});

const eventIntegrityStatus = event => event?.integrity_status || 'NOT_CHECKED';

function RecoveryDataView({ selectedClient }) {
  const [incidents, setIncidents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventPage, setEventPage] = useState({ totalItems: 0, totalPages: 1 });
  const [activeSection, setActiveSection] = useState('incidents');
  const [incidentFilter, setIncidentFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [previewItems, setPreviewItems] = useState([]);
  const [resultItems, setResultItems] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [eventDetail, setEventDetail] = useState(null);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);
  const [verifyingEventId, setVerifyingEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const executionInFlight = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    const [incidentResult, eventResult, requestResult] = await Promise.allSettled([
      recoveryApi.listIncidents(),
      recoveryApi.listEvents({ page: 1, pageSize: 100, includeLegacy: false }),
      recoveryApi.listRequests(),
    ]);

    const failures = [];
    if (incidentResult.status === 'fulfilled') setIncidents(normalizeList(incidentResult.value));
    else failures.push(incidentResult.reason);

    if (eventResult.status === 'fulfilled') {
      const page = normalizeEventPage(eventResult.value);
      setEvents(page.data);
      setEventPage(page);
    } else {
      failures.push(eventResult.reason);
      setEvents([]);
    }

    if (requestResult.status === 'fulfilled') setRequests(normalizeList(requestResult.value));
    else setRequests([]); // Request status enriches the table; incidents/events remain usable if it is unavailable.

    const criticalFailure = [incidentResult, eventResult]
      .find(result => result.status === 'rejected');
    if (criticalFailure) setError(getErrorMessage(criticalFailure.reason));
    setLoading(false);
  }, [selectedClient]);

  useEffect(() => {
    setSelectedIds(new Set());
    setPreviewItems([]);
    setResultItems([]);
    setPreviewOpen(false);
    setEventDetail(null);
    loadData();
  }, [loadData]);

  const requestByIncident = useMemo(() => {
    const map = new Map();
    requests.forEach(request => {
      if (request?.incident_id) map.set(request.incident_id, request);
    });
    return map;
  }, [requests]);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleIncidents = useMemo(() => incidents.filter(item => {
    const status = String(item.status || '').toUpperCase();
    const matchesFilter = incidentFilter === 'ALL' || status === incidentFilter;
    const haystack = [item.id, item.log_id, item.resource, item.incident_type, item.client_id].join(' ').toLowerCase();
    return matchesFilter && (!normalizedSearch || haystack.includes(normalizedSearch));
  }), [incidents, incidentFilter, normalizedSearch]);

  const visibleEvents = useMemo(() => events.filter(item => {
    const resultStatus = String(item.result_status || '').toUpperCase();
    const matchesFilter = eventFilter === 'ALL' || resultStatus === eventFilter;
    const haystack = [
      item.id,
      item.request_id,
      item.incident_id,
      item.target_log_id,
      item.selected_log_id,
      item.resource,
      item.source_system,
      item.executed_by,
      item.event_hash,
    ].join(' ').toLowerCase();
    return matchesFilter && (!normalizedSearch || haystack.includes(normalizedSearch));
  }), [events, eventFilter, normalizedSearch]);

  const isSelectable = useCallback((incident) => {
    const status = String(incident?.status || '').toUpperCase();
    const requestStatus = String(requestByIncident.get(incident?.id)?.status || '').toUpperCase();
    return status === 'OPEN' && !['PENDING_EXECUTION', 'EXECUTING', 'SUCCEEDED'].includes(requestStatus);
  }, [requestByIncident]);

  const selectedIncidents = useMemo(
    () => incidents.filter(item => selectedIds.has(item.id)),
    [incidents, selectedIds]
  );

  const visibleSelectableIds = useMemo(
    () => visibleIncidents.filter(isSelectable).map(item => item.id),
    [visibleIncidents, isSelectable]
  );

  const allVisibleSelected = visibleSelectableIds.length > 0
    && visibleSelectableIds.every(id => selectedIds.has(id));

  const stats = useMemo(() => ({
    openIncidents: incidents.filter(item => ['OPEN', 'UNDER_REVIEW', 'RECOVERING'].includes(String(item.status || '').toUpperCase())).length,
    recoveredEvents: events.filter(item => String(item.result_status || '').toUpperCase() === 'SUCCEEDED').length,
    selected: selectedIncidents.length,
    verifiedEvents: events.filter(item => String(eventIntegrityStatus(item)).toUpperCase() === 'VALID').length,
  }), [events, incidents, selectedIncidents]);

  const toggleSelection = (incident) => {
    if (!isSelectable(incident)) return;
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(incident.id)) next.delete(incident.id);
      else next.add(incident.id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (allVisibleSelected) visibleSelectableIds.forEach(id => next.delete(id));
      else visibleSelectableIds.forEach(id => next.add(id));
      return next;
    });
  };

  const loadPreviewItem = async (incident) => {
    const [detailResult, candidateResult, preflightResult, auditLogsResult] = await Promise.allSettled([
      recoveryApi.getIncident({ incidentId: incident.id }),
      recoveryApi.listCandidates({ incidentId: incident.id }),
      recoveryApi.runPreflight({ incidentId: incident.id }),
      recoveryApi.listAuditLogsByResource({ resource: incident.resource }),
    ]);

    const detail = detailResult.status === 'fulfilled' ? detailResult.value : incident;
    const candidates = candidateResult.status === 'fulfilled' ? normalizeList(candidateResult.value) : [];
    const candidate = candidates.find(item => item.log_id === incident.log_id) || candidates[0] || null;
    const preflight = preflightResult.status === 'fulfilled' ? preflightResult.value : null;
    const auditLogs = auditLogsResult.status === 'fulfilled' ? normalizeList(auditLogsResult.value) : [];
    const auditLog = auditLogs.find(item => item?.log_id === incident.log_id) || null;
    const previewIncident = auditLog ? { ...detail, auditLog } : detail;
    const failures = [detailResult, candidateResult, preflightResult]
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);
    const ready = Boolean(
      candidate?.eligible
      && preflight?.recoverable
      && String(preflight?.status || '').toUpperCase() === 'VALID'
    );

    return {
      incident: previewIncident,
      auditLog,
      auditLogError: auditLogsResult.status === 'rejected' ? getErrorMessage(auditLogsResult.reason) : '',
      candidate,
      preflight,
      ready,
      error: failures.length ? getErrorMessage(failures[0]) : '',
    };
  };

  const openPreview = async (records = selectedIncidents) => {
    if (!records.length) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewItems([]);
    try {
      const preview = await Promise.all(records.map(loadPreviewItem));
      setPreviewItems(preview);
    } catch (previewLoadError) {
      setPreviewError(getErrorMessage(previewLoadError));
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (executing) return;
    setPreviewOpen(false);
    setConfirmationOpen(false);
  };

  const executeOne = async (item) => {
    const incident = item.incident;
    const request = await recoveryApi.createRequest({
      incidentId: incident.id,
      selectedLogId: incident.log_id,
      // Backend still requires this field for the immutable request record;
      // the user is not asked to provide a message in the new UI.
      reason: INTERNAL_RECOVERY_REASON,
      idempotencyKey: createIdempotencyKey(),
    });
    const executed = await recoveryApi.executeRequest({ requestId: request.id });
    let event = null;
    const eventId = executed?.recovery_event_id || request?.recovery_event_id;
    if (eventId) {
      try {
        event = await recoveryApi.getEvent({ eventId });
      } catch {
        // The request result remains useful even if event detail is briefly unavailable.
      }
    }
    return { ...item, incident, request, executed, event, status: executed?.status || 'SUCCEEDED' };
  };

  const executeRecovery = async () => {
    if (executionInFlight.current) return;
    const readyItems = previewItems.filter(item => item.ready);
    if (!readyItems.length) return;

    executionInFlight.current = true;
    setExecuting(true);
    const settled = await Promise.all(readyItems.map(async item => {
      try {
        return await executeOne(item);
      } catch (executionError) {
        return { ...item, incident: item.incident, status: 'FAILED_EXECUTION', error: getErrorMessage(executionError) };
      }
    }));
    const skipped = previewItems.filter(item => !item.ready).map(item => ({
      ...item,
      incident: item.incident,
      status: 'SKIPPED',
      error: item.error || item.candidate?.reason || item.preflight?.status || 'Recovery is not eligible.',
    }));

    setResultItems([...settled, ...skipped]);
    setSelectedIds(new Set());
    setPreviewOpen(false);
    setConfirmationOpen(false);
    setExecuting(false);
    executionInFlight.current = false;
    await loadData();
  };

  const openEvent = async (event) => {
    setEventDetail(event);
    setEventDetailLoading(true);
    try {
      const detail = await recoveryApi.getEvent({ eventId: event.id });
      setEventDetail(detail || event);
    } catch (eventError) {
      setError(getErrorMessage(eventError));
    } finally {
      setEventDetailLoading(false);
    }
  };

  const verifyEvent = async (event) => {
    if (!event?.id || verifyingEventId) return;
    setVerifyingEventId(event.id);
    const applyVerification = verification => {
      if (!verification?.status) return;
      setEvents(current => current.map(item => item.id === event.id ? {
        ...item,
        integrity_status: verification.status,
        integrity_error: verification.message || verification.integrity_error || item.integrity_error,
        integrity_checked_at: new Date().toISOString(),
      } : item));
      setEventDetail(current => current?.id === event.id ? {
        ...current,
        integrity_status: verification.status,
        integrity_error: verification.message || verification.integrity_error || current.integrity_error,
        integrity_checked_at: new Date().toISOString(),
      } : current);
    };
    try {
      const verification = await recoveryApi.verifyEvent({ eventId: event.id });
      applyVerification(verification);
    } catch (verifyError) {
      // Verification can legitimately return 409 when the event is pending,
      // unreachable, or tampered. The response still contains the status that
      // should be rendered instead of discarding it as a generic request error.
      applyVerification(verifyError?.data);
      setError(getErrorMessage(verifyError));
    } finally {
      setVerifyingEventId('');
    }
  };

  const readyPreviewCount = previewItems.filter(item => item.ready).length;
  const blockedPreviewCount = previewItems.filter(item => !item.ready).length;

  return (
    <section className="ac-recovery-center ac-recovery-data-view">
      <div className="ac-hero ac-recovery-center__hero">
        <div className="ac-hero__pattern" />
        <div className="ac-hero__content">
          <div className="ac-recovery-center__hero-main">
            <div className="ac-recovery-center__hero-icon" aria-hidden="true"><Icon name="shield" size={25} /></div>
            <div className="ac-hero__left">
              <span className="ac-page-kicker ac-recovery-center__breadcrumb"><span>Gateway Portal</span><Icon name="chevronRight" size={13} /><strong>Recovery Data</strong></span>
              <h1 className="ac-hero__title">Recovery Data</h1>
            </div>
          </div>
          <div className="ac-recovery-center__hero-copy">
            <p className="ac-hero__subtitle">Review tampered incidents and inspect verified recovery events from the gateway.</p>
            <span className="ac-recovery-backend-tag"><Icon name="database" size={12} /> Live backend · recovery_events</span>
          </div>
          <div className="ac-recovery-center__hero-action"><button type="button" className="ac-btn-ghost-action" onClick={loadData} disabled={loading}><Icon name={loading ? 'spinner' : 'refresh'} size={15} /> Refresh</button></div>
        </div>
      </div>

      {error && <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={16} /><span>{error}</span><button type="button" onClick={loadData} aria-label="Retry recovery data"><Icon name="refresh" size={15} /></button></div>}

      <div className="ac-recovery-stat-grid">
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--danger"><Icon name="alertTriangle" size={17} /></span><div><strong>{stats.openIncidents}</strong><span>Open incidents</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--success"><Icon name="checkCircle" size={17} /></span><div><strong>{stats.recoveredEvents}</strong><span>Recovered events</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--info"><Icon name="list" size={17} /></span><div><strong>{stats.selected}</strong><span>Selected incidents</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--warning"><Icon name="shield" size={17} /></span><div><strong>{stats.verifiedEvents}</strong><span>Verified events</span></div></div>
      </div>

      <div className="ac-recovery-center__toolbar ac-recovery-data-toolbar">
        <div className="ac-recovery-segmented ac-recovery-section-tabs" role="tablist" aria-label="Recovery data section">
          <button type="button" className={activeSection === 'incidents' ? 'is-active' : ''} onClick={() => setActiveSection('incidents')}><Icon name="alertTriangle" size={13} /> Tampered incidents <span>{incidents.length}</span></button>
          <button type="button" className={activeSection === 'events' ? 'is-active' : ''} onClick={() => setActiveSection('events')}><Icon name="database" size={13} /> Recovery events <span>{eventPage.totalItems}</span></button>
        </div>
        <label className="ac-recovery-search"><Icon name="search" size={15} /><input aria-label="Search recovery data" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search incident, log, resource, or event" /></label>
        <label className="ac-recovery-filter"><Icon name="filter" size={14} /><span>Status</span><select aria-label="Filter recovery data" value={activeSection === 'incidents' ? incidentFilter : eventFilter} onChange={event => activeSection === 'incidents' ? setIncidentFilter(event.target.value) : setEventFilter(event.target.value)}>{(activeSection === 'incidents' ? INCIDENT_FILTERS : EVENT_FILTERS).map(status => <option key={status} value={status}>{status === 'ALL' ? 'All statuses' : status.replaceAll('_', ' ')}</option>)}</select></label>
        {activeSection === 'incidents' && <div className="ac-recovery-data-toolbar__actions"><button type="button" className="ac-btn-ghost-action" onClick={() => setSelectedIds(new Set())} disabled={!selectedIncidents.length}><Icon name="x" size={14} /> Clear selection</button><button type="button" className="ac-btn-primary" onClick={() => openPreview()} disabled={!selectedIncidents.length}><Icon name="eye" size={15} /> Preview selected ({selectedIncidents.length})</button></div>}
      </div>

      {activeSection === 'incidents' ? (
        <section className="ac-recovery-center__panel ac-recovery-data-panel">
          <div className="ac-recovery-center__panel-head"><div className="ac-recovery-center__panel-title"><div className="ac-recovery-center__panel-title-row"><h2>Tampered incidents</h2><span>{visibleIncidents.length} of {incidents.length}</span></div><p>Select open incidents to run a backend preflight and preview trusted recovery data.</p></div><div className="ac-recovery-data-selection-note"><Icon name="shield" size={14} /> Recovery events are shown in the adjacent section.</div></div>
          {loading ? <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading tampered incidents...</div> : visibleIncidents.length === 0 ? <div className="ac-recovery-empty"><Icon name="inbox" size={25} /><strong>No tampered incidents found</strong><p>The backend returned no records for this workspace and filter.</p></div> : (
            <div className="ac-recovery-table-wrap"><table className="ac-recovery-table ac-recovery-data-table"><thead><tr><th className="ac-recovery-checkbox-cell"><input type="checkbox" aria-label="Select all eligible incidents" checked={allVisibleSelected} onChange={toggleSelectAll} disabled={!visibleSelectableIds.length} /></th><th>Incident</th><th>Target log / resource</th><th>Detected</th><th>Integrity evidence</th><th>Status</th><th>Action</th></tr></thead><tbody>
              {visibleIncidents.map(item => {
                const request = requestByIncident.get(item.id);
                const selectable = isSelectable(item);
                return <tr key={item.id} className={selectedIds.has(item.id) ? 'is-selected' : ''}>
                  <td className="ac-recovery-checkbox-cell"><input type="checkbox" aria-label={`Select ${item.log_id}`} checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item)} disabled={!selectable} /></td>
                  <td><code>{item.id}</code><small>{item.incident_type || 'Integrity mismatch'}</small></td>
                  <td><code>{item.log_id}</code><small>{item.resource || '-'}</small></td>
                  <td>{item.detected_at ? formatTimestamp(item.detected_at) : '-'}<small>{item.client_id || selectedClient || '-'}</small></td>
                  <td><strong>{item.expected_hash ? 'Expected hash available' : 'Hash evidence pending'}</strong><small>{item.detected_hash || 'Detected hash unavailable'}</small></td>
                  <td><RecoveryStatusBadge status={request?.status === 'EXECUTING' ? 'EXECUTING' : item.status} compact /></td>
                  <td><button type="button" className="ac-btn-ghost-action ac-btn-ghost-action--small" onClick={() => openPreview([item])}><Icon name="eye" size={13} /> Preview</button></td>
                </tr>;
              })}
            </tbody></table></div>
          )}
        </section>
      ) : (
        <section className="ac-recovery-center__panel ac-recovery-data-panel">
          <div className="ac-recovery-center__panel-head"><div className="ac-recovery-center__panel-title"><div className="ac-recovery-center__panel-title-row"><h2>Recovery events</h2><span>{visibleEvents.length} of {events.length}</span></div><p>Execution evidence read directly from the backend `recovery_events` table. Legacy audit rows are excluded.</p></div><div className="ac-recovery-data-selection-note"><Icon name="database" size={14} /> {eventPage.totalItems} total backend event{eventPage.totalItems === 1 ? '' : 's'}</div></div>
          {loading ? <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading recovery events...</div> : visibleEvents.length === 0 ? <div className="ac-recovery-empty"><Icon name="inbox" size={25} /><strong>No recovery events found</strong><p>Successful or failed recovery executions will appear here after the backend records them.</p></div> : (
            <div className="ac-recovery-table-wrap"><table className="ac-recovery-table ac-recovery-event-table"><thead><tr><th>Event</th><th>Target log / resource</th><th>Result</th><th>Integrity</th><th>Pipeline</th><th>Executed</th><th>Action</th></tr></thead><tbody>
              {visibleEvents.map(event => <tr key={event.id}><td><code>{event.id}</code><small>{event.event_type || 'RECOVERY_EXECUTION'} · {event.legacy ? 'Legacy' : event.storage_kind || 'RECOVERY_EVENT'}</small></td><td><code>{event.target_log_id || event.selected_log_id || '-'}</code><small>{event.resource || '-'}</small></td><td><RecoveryStatusBadge status={event.result_status} compact /><small>{event.failure_reason || event.executed_by || '-'}</small></td><td><RecoveryStatusBadge status={eventIntegrityStatus(event)} compact /></td><td><strong>{event.pipeline_status || '-'}</strong><small>{event.snapshot_status || 'Snapshot status unavailable'}</small></td><td>{event.executed_at ? formatTimestamp(event.executed_at) : '-'}</td><td><div className="ac-recovery-table-actions"><button type="button" className="ac-btn-ghost-action ac-btn-ghost-action--small" onClick={() => openEvent(event)}><Icon name="eye" size={13} /> View</button><button type="button" className="ac-btn-ghost-action ac-btn-ghost-action--small" onClick={() => verifyEvent(event)} disabled={verifyingEventId === event.id}><Icon name={verifyingEventId === event.id ? 'spinner' : 'checkCircle'} size={13} /> Verify</button></div></td></tr>)}
            </tbody></table></div>
          )}
        </section>
      )}

      {!!resultItems.length && <section className="ac-recovery-center__panel ac-recovery-results-panel"><div className="ac-recovery-center__panel-head"><div className="ac-recovery-center__panel-title"><div className="ac-recovery-center__panel-title-row"><h2>Latest execution results</h2><span>{resultItems.filter(item => item.status === 'SUCCEEDED').length} succeeded · {resultItems.filter(item => item.status !== 'SUCCEEDED').length} other</span></div><p>Results returned by the backend recovery workflow. Refresh the Recovery events section to inspect persistent records.</p></div><button type="button" className="ac-btn-ghost-action" onClick={() => setResultItems([])}><Icon name="x" size={14} /> Clear results</button></div><div className="ac-recovery-results-list">{resultItems.map(item => { const tamperedData = getTamperedData(item.incident); return <article className="ac-recovery-result-card" key={`${item.incident?.id}-${item.request?.id || item.status}`}><div className="ac-recovery-result-card__header"><div><code>{item.incident?.log_id || '-'}</code><span>{item.incident?.resource || '-'}</span></div><RecoveryStatusBadge status={item.status} compact /></div>{item.status === 'SUCCEEDED' ? <div className="ac-recovery-before-after"><div><span className="ac-recovery-data-label ac-recovery-data-label--danger">Before recovery · tampered</span><code>{item.request?.before_hash || item.incident?.detected_hash || '-'}</code>{tamperedData ? <pre>{formatJson(tamperedData)}</pre> : <p className="ac-recovery-protected-note">Tampered payload is retained as protected backend evidence.</p>}</div><div><span className="ac-recovery-data-label ac-recovery-data-label--success">After recovery · trusted</span><code>{item.request?.after_hash || item.event?.after_hash || '-'}</code><pre>{formatJson(item.event?.recovered_metadata)}</pre></div></div> : <p className="ac-recovery-result-card__message">{item.error || 'Recovery did not complete for this item.'}</p>}</article>; })}</div></section>}

      {previewOpen && <div className="ac-recovery-preview-overlay" role="presentation" onClick={closePreview}><section className="ac-recovery-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-preview-title" onClick={event => event.stopPropagation()}><header className="ac-recovery-preview-dialog__header"><div><span className="ac-recovery-eyebrow"><Icon name="eye" size={14} /> Backend preflight preview</span><h2 id="recovery-preview-title">Review recovery data</h2><p>{previewItems.length || (previewLoading ? '...' : 0)} incident{previewItems.length === 1 ? '' : 's'} · {readyPreviewCount} ready · {blockedPreviewCount} blocked</p></div><button type="button" className="ac-modal__close" onClick={closePreview} disabled={executing} aria-label="Close preview"><Icon name="x" size={18} /></button></header><div className="ac-recovery-preview-dialog__body">{previewLoading ? <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Running backend preflight...</div> : previewError ? <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={16} /><span>{previewError}</span></div> : previewItems.map(item => { const incident = item.incident; const preview = item.preflight?.snapshot_preview; const tamperedData = getTamperedData(incident); const changedFields = getChangedFields(tamperedData, preview?.metadata); const previewStatus = item.ready ? 'VALID' : item.preflight?.status || (item.candidate?.eligible ? 'FAILED_VERIFICATION' : 'BLOCKED'); return <article className="ac-recovery-preview-item" key={incident.id}><div className="ac-recovery-preview-item__header"><div><code>{incident.log_id}</code><span>{incident.resource} · {incident.incident_type || 'Integrity mismatch'}</span></div><RecoveryStatusBadge status={previewStatus} compact /></div><div className="ac-recovery-preview-item__facts"><span><strong>Incident</strong>{incident.id}</span><span><strong>Detected</strong>{incident.detected_at ? formatTimestamp(incident.detected_at) : '-'}</span><span><strong>Current hash</strong>{item.preflight?.current_hash || incident.detected_hash || '-'}</span><span><strong>Trusted hash</strong>{item.preflight?.snapshot_hash || incident.expected_hash || '-'}</span></div><div className="ac-recovery-data-columns"><div className="ac-recovery-data-block ac-recovery-data-block--danger"><span className="ac-recovery-data-label ac-recovery-data-label--danger">Tampered evidence</span><code>{item.preflight?.current_hash || incident.detected_hash || '-'}</code>{tamperedData ? <pre>{formatJson(tamperedData)}</pre> : <p className="ac-recovery-protected-note">Backend keeps the tampered payload protected. The current/detected hash is shown here.</p>}</div><div className="ac-recovery-data-block ac-recovery-data-block--success"><span className="ac-recovery-data-label ac-recovery-data-label--success">Trusted recovery data</span>{preview ? <><code>{item.preflight?.snapshot_hash || '-'}</code><pre>{formatJson(preview.metadata)}</pre><small>{preview.source_system || '-'} · {preview.action || '-'} · {preview.timestamp ? formatTimestamp(preview.timestamp) : '-'} · {preview.resource || incident.resource || '-'}</small></> : <div className="ac-recovery-blocked-note"><Icon name="alertTriangle" size={16} /><span>{item.error || item.candidate?.reason || 'Trusted snapshot is not available.'}</span></div>}</div></div>{changedFields.length > 0 && <div className="ac-recovery-changed-fields"><strong>Fields with changes</strong><div>{changedFields.map(field => <span key={field}><Icon name="alertTriangle" size={12} /><em>{field}</em></span>)}</div></div>}{item.error && <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={15} /><span>{item.error}</span></div>}</article>; })}</div><footer className="ac-recovery-preview-dialog__footer"><span><Icon name="lock" size={13} /> Execute uses the backend recovery workflow; no reason field is shown.</span><div><button type="button" className="ac-btn-ghost-action" onClick={closePreview} disabled={executing}>Close</button><button type="button" className="ac-btn-primary" onClick={() => setConfirmationOpen(true)} disabled={!readyPreviewCount || previewLoading || executing}><Icon name={executing ? 'spinner' : 'refresh'} size={15} /> Execute recovery ({readyPreviewCount})</button></div></footer></section></div>}

      {eventDetail && <div className="ac-recovery-preview-overlay" role="presentation" onClick={() => !eventDetailLoading && setEventDetail(null)}><section className="ac-recovery-preview-dialog ac-recovery-event-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-event-title" onClick={event => event.stopPropagation()}><header className="ac-recovery-preview-dialog__header"><div><span className="ac-recovery-eyebrow"><Icon name="database" size={14} /> Recovery event</span><h2 id="recovery-event-title">{eventDetail.id}</h2><p>{eventDetail.resource || '-'} · {eventDetail.executed_at ? formatTimestamp(eventDetail.executed_at) : '-'}</p></div><button type="button" className="ac-modal__close" onClick={() => setEventDetail(null)} disabled={eventDetailLoading} aria-label="Close recovery event"><Icon name="x" size={18} /></button></header><div className="ac-recovery-preview-dialog__body">{eventDetailLoading ? <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading event detail...</div> : <><div className="ac-recovery-event-status-row"><RecoveryStatusBadge status={eventDetail.result_status} /><RecoveryStatusBadge status={eventIntegrityStatus(eventDetail)} /><span className="ac-recovery-event-storage">{eventDetail.storage_kind || 'RECOVERY_EVENT'}</span></div><div className="ac-recovery-preview-item__facts"><span><strong>Target log</strong>{eventDetail.target_log_id || eventDetail.selected_log_id || '-'}</span><span><strong>Incident</strong>{eventDetail.incident_id || '-'}</span><span><strong>Target action</strong>{eventDetail.target_action || '-'}</span><span><strong>Target actor</strong>{eventDetail.target_actor || '-'}</span><span><strong>Target timestamp</strong>{eventDetail.target_timestamp ? formatTimestamp(eventDetail.target_timestamp) : '-'}</span><span><strong>Source system</strong>{eventDetail.source_system || eventDetail.target_source_system || '-'}</span><span><strong>Source record</strong>{eventDetail.target_source_record_id || '-'}</span><span><strong>Executed by</strong>{eventDetail.executed_by || '-'}</span><span><strong>Executor system</strong>{eventDetail.executor_system || '-'}</span></div><div className="ac-recovery-data-columns"><div className="ac-recovery-data-block ac-recovery-data-block--danger"><span className="ac-recovery-data-label ac-recovery-data-label--danger">Before recovery hash</span><code>{eventDetail.before_hash || '-'}</code><p className="ac-recovery-protected-note">Tampered payload remains protected evidence.</p></div><div className="ac-recovery-data-block ac-recovery-data-block--success"><span className="ac-recovery-data-label ac-recovery-data-label--success">Recovered metadata</span><code>{eventDetail.after_hash || '-'}</code><pre>{formatJson(eventDetail.recovered_metadata)}</pre></div></div><div className="ac-recovery-event-facts"><span><strong>Snapshot</strong>{eventDetail.snapshot_status || '-'} · {eventDetail.snapshot_version_id || eventDetail.source_snapshot_version_id || '-'}</span><span><strong>Pipeline</strong>{eventDetail.pipeline_status || '-'} · {eventDetail.merkle_root || '-'}</span><span><strong>Event hash</strong>{eventDetail.event_hash || '-'}</span><span><strong>Failure</strong>{eventDetail.failure_reason || eventDetail.integrity_error || '-'}</span></div></>}</div><footer className="ac-recovery-preview-dialog__footer"><span><Icon name="shield" size={13} /> Verify checks the event snapshot, hash, Merkle proof, and Fabric anchor.</span><div><button type="button" className="ac-btn-ghost-action" onClick={() => verifyEvent(eventDetail)} disabled={verifyingEventId === eventDetail.id}><Icon name={verifyingEventId === eventDetail.id ? 'spinner' : 'checkCircle'} size={14} /> Verify event</button><button type="button" className="ac-btn-primary" onClick={() => setEventDetail(null)}>Close</button></div></footer></section></div>}

      <RecoveryConfirmationDialog open={confirmationOpen} title="Execute recovery?" message={`The backend will process ${readyPreviewCount} selected tampered incident${readyPreviewCount === 1 ? '' : 's'} using the trusted recovery source. No message is required from you.`} confirmLabel="Execute recovery" busy={executing} onClose={() => !executing && setConfirmationOpen(false)} onConfirm={executeRecovery} />
    </section>
  );
}

export default RecoveryDataView;
