import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../common/Icon';
import { formatTimestamp } from '../../../utils/formatters';
import { recoveryApi } from '../../../services/recoveryApi';
import RecoveryStatusBadge from './RecoveryStatusBadge';
import RecoveryConfirmationDialog from './RecoveryConfirmationDialog';

const EXECUTABLE_REQUEST_STATUSES = new Set(['PENDING_EXECUTION', 'PENDING_APPROVAL', 'APPROVED']);
const CLOSED_INCIDENT_STATUSES = new Set(['RESOLVED', 'DISMISSED']);
const INTERNAL_RECOVERY_REASON = 'Recovery initiated from the Log Details Recovery tab.';

const createIdempotencyKey = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `recovery-context-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

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

const sortNewest = (items = [], field = 'detected_at') => [...items].sort((a, b) => (
  new Date(b?.[field] || 0).getTime() - new Date(a?.[field] || 0).getTime()
));

const getTamperedData = (activeLog, incident) => activeLog?.metadata
  ?? incident?.tampered_payload
  ?? incident?.tampered_metadata
  ?? incident?.current_metadata
  ?? null;

const getChangedFields = (current, trusted) => {
  const currentValue = parseJsonValue(current);
  const trustedValue = parseJsonValue(trusted);
  if (!currentValue || !trustedValue || typeof currentValue !== 'object' || typeof trustedValue !== 'object' || Array.isArray(currentValue) || Array.isArray(trustedValue)) return [];
  const keys = new Set([...Object.keys(currentValue), ...Object.keys(trustedValue)]);
  return [...keys].filter(key => JSON.stringify(currentValue[key]) !== JSON.stringify(trustedValue[key]));
};

const getEventList = value => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];

const friendlyRecoveryReason = value => {
  const reason = String(value || '').trim();
  const messages = {
    legacy_recovery_out_of_scope: 'This log is outside the recovery scope configured by the backend.',
    snapshot_belum_verified: 'The trusted snapshot has not been verified yet.',
    snapshot_reference_missing: 'The trusted snapshot reference is not available.',
    snapshot_checksum_missing: 'The trusted snapshot checksum is not available.',
    snapshot_plaintext_hash_missing: 'The trusted snapshot hash is not available.',
    anchor_missing: 'The blockchain anchor is not available.',
    merkle_root_missing: 'The Merkle proof is not available.',
    recovery_not_required: 'This log already matches the trusted data.',
  };
  return messages[reason] || reason || 'Recovery is not available for this log.';
};

const getErrorText = (error, fallback = 'Recovery data could not be loaded.') => {
  if (!error) return fallback;
  if (error.unavailable) return 'Recovery service is not enabled on this gateway.';
  return friendlyRecoveryReason(error.message || error.code || fallback);
};

function RecoveryTab({ activeLog, selectedClient, onRefreshLogs }) {
  const [incident, setIncident] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);
  const [latestEvent, setLatestEvent] = useState(null);
  const [preflight, setPreflight] = useState(null);
  const [executionResult, setExecutionResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const loadSeqRef = useRef(0);

  const runPreflight = useCallback(async (incidentId = incident?.id) => {
    if (!incidentId) return null;
    setChecking(true);
    setError('');
    try {
      const result = await recoveryApi.runPreflight({ incidentId });
      setPreflight(result);
      return result;
    } catch (preflightError) {
      setPreflight(null);
      setError(getErrorText(preflightError, 'Recovery check failed.'));
      return null;
    } finally {
      setChecking(false);
    }
  }, [incident?.id]);

  const loadContext = useCallback(async () => {
    if (!activeLog?.log_id || !selectedClient) {
      setLoading(false);
      setIncident(null);
      return;
    }

    const seq = loadSeqRef.current + 1;
    loadSeqRef.current = seq;
    setLoading(true);
    setError('');

    const [incidentResult, requestResult, eventResult] = await Promise.allSettled([
      recoveryApi.listIncidents(),
      recoveryApi.listRequests(),
      recoveryApi.listEvents({ page: 1, pageSize: 100, includeLegacy: false }),
    ]);
    if (seq !== loadSeqRef.current) return;

    if (incidentResult.status === 'rejected') {
      setError(getErrorText(incidentResult.reason));
      setIncident(null);
      setLoading(false);
      return;
    }

    const nextIncident = sortNewest(
      (Array.isArray(incidentResult.value) ? incidentResult.value : [])
        .filter(item => item.log_id === activeLog.log_id)
    )[0] || null;
    const requests = requestResult.status === 'fulfilled' && Array.isArray(requestResult.value)
      ? requestResult.value
      : [];
    const events = eventResult.status === 'fulfilled' ? getEventList(eventResult.value) : [];
    const nextRequest = nextIncident
      ? sortNewest(requests.filter(item => item.incident_id === nextIncident.id), 'requested_at')[0] || null
      : null;
    // Recovery events must belong to the current incident. Matching only by
    // log_id can attach an older successful recovery to a new tamper incident.
    const nextEvent = nextIncident
      ? sortNewest(events.filter(item => item.incident_id === nextIncident.id), 'executed_at')[0] || null
      : null;

    setIncident(nextIncident);
    setExistingRequest(nextRequest);
    setLatestEvent(nextEvent);
    setCandidate(null);
    setPreflight(null);
    setLoading(false);

    if (!nextIncident || CLOSED_INCIDENT_STATUSES.has(String(nextIncident.status || '').toUpperCase())) return;

    try {
      const candidates = await recoveryApi.listCandidates({ incidentId: nextIncident.id });
      if (seq !== loadSeqRef.current) return;
      const nextCandidate = (Array.isArray(candidates) ? candidates : [candidates]).filter(Boolean)[0] || null;
      setCandidate(nextCandidate);

      // A valid candidate is checked immediately so the user does not need to
      // understand a separate preflight step before Execute becomes available.
      if (nextCandidate?.eligible) {
        setChecking(true);
        try {
          const result = await recoveryApi.runPreflight({ incidentId: nextIncident.id });
          if (seq === loadSeqRef.current) setPreflight(result);
        } catch (preflightError) {
          if (seq === loadSeqRef.current) setError(getErrorText(preflightError, 'Recovery check failed.'));
        } finally {
          if (seq === loadSeqRef.current) setChecking(false);
        }
      }
    } catch (candidateError) {
      if (seq === loadSeqRef.current) setError(getErrorText(candidateError, 'Recovery source could not be checked.'));
    }
  }, [activeLog?.log_id, selectedClient]);

  useEffect(() => {
    setExecutionResult(null);
    setConfirmationOpen(false);
    loadContext();
    return () => {
      loadSeqRef.current += 1;
    };
  }, [loadContext]);

  const executeRecovery = async () => {
    const incidentStatus = String(incident?.status || '').toUpperCase();
    if (!incident?.id || !candidate?.eligible || !preflight?.recoverable || CLOSED_INCIDENT_STATUSES.has(incidentStatus) || executing) return;

    setExecuting(true);
    setError('');
    try {
      const requestStatus = String(existingRequest?.status || '').toUpperCase();
      const request = EXECUTABLE_REQUEST_STATUSES.has(requestStatus)
        ? existingRequest
        : await recoveryApi.createRequest({
          incidentId: incident.id,
          selectedLogId: candidate.log_id || activeLog.log_id,
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
          // The list refresh below can pick up an event that is still being persisted.
        }
      }
      setExecutionResult({ request, executed, event });
      setConfirmationOpen(false);
      if (onRefreshLogs) onRefreshLogs();
      await loadContext();
    } catch (executionError) {
      setError(getErrorText(executionError, 'Recovery could not be executed.'));
      setConfirmationOpen(false);
    } finally {
      setExecuting(false);
    }
  };

  if (!activeLog?.log_id) return null;

  const incidentStatus = String(incident?.status || '').toUpperCase();
  const requestStatus = String(existingRequest?.status || '').toUpperCase();
  const candidateEligible = Boolean(candidate?.eligible);
  const preflightReady = Boolean(preflight?.recoverable && String(preflight?.status || '').toUpperCase() === 'VALID');
  const requestExecuting = requestStatus === 'EXECUTING';
  const shownEvent = executionResult?.event || latestEvent;
  const recoverySucceeded = Boolean(
    shownEvent?.incident_id === incident?.id
    && String(shownEvent?.result_status || '').toUpperCase() === 'SUCCEEDED'
  );
  const canExecute = Boolean(
    incident
    && !CLOSED_INCIDENT_STATUSES.has(incidentStatus)
    && candidateEligible
    && preflightReady
    && !requestExecuting
    && !recoverySucceeded
  );
  const tamperedData = getTamperedData(activeLog, incident);
  const recoveredData = shownEvent?.recovered_metadata;
  const trustedData = recoveredData ?? preflight?.snapshot_preview?.metadata;
  const changedFields = getChangedFields(tamperedData, trustedData);
  const integrityStatus = String(activeLog?.integrity_status || activeLog?.verification_status || activeLog?.verify_status || '').toUpperCase();
  const looksTampered = ['TAMPERED', 'INVALID', 'FAILED', 'FAILED_LOCAL'].includes(integrityStatus) || Boolean(incident?.incident_type);

  let actionTitle = 'Checking recovery availability...';
  let actionDescription = 'The gateway is checking the trusted recovery data.';
  if (recoverySucceeded) {
    actionTitle = 'Recovery completed';
    actionDescription = shownEvent.executed_at ? `Recovered ${formatTimestamp(shownEvent.executed_at)}.` : 'The original log data has been restored.';
  } else if (executing || requestExecuting) {
    actionTitle = 'Recovery is in progress';
    actionDescription = 'The gateway is validating and restoring this log.';
  } else if (candidate && !candidateEligible) {
    actionTitle = 'Recovery unavailable';
    actionDescription = friendlyRecoveryReason(candidate.reason);
  } else if (preflight?.status === 'NO_RECOVERY_REQUIRED') {
    actionTitle = 'Recovery is not required';
    actionDescription = 'The current log already matches the trusted data.';
  } else if (preflightReady) {
    actionTitle = 'Ready to recover';
    actionDescription = 'Review both values, then execute recovery.';
  } else if (!checking && candidateEligible) {
    actionTitle = 'Recovery check required';
    actionDescription = 'Check the trusted data again before recovery.';
  }

  return (
    <div className="ac-recovery-tab ac-recovery-tab--simple">
      <div className="ac-recovery-tab__intro">
        <div>
          <span className="ac-recovery-eyebrow"><Icon name="shield" size={14} /> Recovery</span>
          <h2>Recover tampered log</h2>
          <p>Review the changed data and restore it from the trusted snapshot.</p>
        </div>
        {incident && <RecoveryStatusBadge status={recoverySucceeded ? 'SUCCEEDED' : incident.status} />}
      </div>

      {error && <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={16} /><span>{error}</span><button type="button" onClick={loadContext} aria-label="Retry recovery data"><Icon name="refresh" size={15} /></button></div>}

      {loading ? (
        <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading recovery data...</div>
      ) : !incident ? (
        <div className="ac-recovery-empty">
          <span className={`ac-recovery-empty__icon${looksTampered ? ' ac-recovery-empty__icon--warning' : ''}`}><Icon name={looksTampered ? 'alertTriangle' : 'checkCircle'} size={25} /></span>
          <strong>{looksTampered ? 'Tamper incident is not available yet' : 'No recovery needed'}</strong>
          <p>{looksTampered ? 'Refresh after the backend creates the incident.' : 'This log has no confirmed tamper incident.'}</p>
          <button type="button" className="ac-btn-ghost-action" onClick={loadContext}><Icon name="refresh" size={14} /> Refresh</button>
        </div>
      ) : (
        <>
          <section className="ac-recovery-card ac-recovery-simple-summary">
            <div>
              <span className="ac-recovery-eyebrow"><Icon name="alertTriangle" size={13} /> Tampered log</span>
              <h3>{incident.resource || activeLog.resource || activeLog.source_table || activeLog.log_id}</h3>
              <p>{incident.incident_type || 'Integrity mismatch'} · {incident.detected_at ? formatTimestamp(incident.detected_at) : 'Detection time unavailable'}</p>
            </div>
            <code title={incident.log_id}>{incident.log_id}</code>
          </section>

          <section className="ac-recovery-card ac-recovery-context-data-card">
            <div className="ac-recovery-card__header ac-recovery-card__header--compact">
              <div>
                <span className="ac-recovery-eyebrow"><Icon name="code" size={13} /> Data review</span>
                <h3>{recoverySucceeded ? 'Tampered data and recovery result' : 'Tampered data and original data'}</h3>
              </div>
              {recoverySucceeded && <RecoveryStatusBadge status="SUCCEEDED" compact />}
            </div>
            <div className="ac-recovery-context-data-grid">
              <div className="ac-recovery-simple-data ac-recovery-simple-data--danger">
                <span className="ac-recovery-data-label ac-recovery-data-label--danger">Tampered data</span>
                <pre>{formatJson(tamperedData)}</pre>
              </div>
              <div className="ac-recovery-simple-data ac-recovery-simple-data--success">
                <span className="ac-recovery-data-label ac-recovery-data-label--success">{recoverySucceeded ? 'Recovered data' : 'Original trusted data'}</span>
                {trustedData ? <pre>{formatJson(trustedData)}</pre> : <div className="ac-recovery-simple-placeholder">{checking ? <><Icon name="spinner" size={16} /> Checking trusted data...</> : friendlyRecoveryReason(candidate?.reason)}</div>}
              </div>
            </div>
            {changedFields.length > 0 && <div className="ac-recovery-changed-fields"><strong>Changed fields</strong><div>{changedFields.map(field => <span key={field}><Icon name="alertTriangle" size={12} /><em>{field}</em></span>)}</div></div>}
          </section>

          <section className={`ac-recovery-card ac-recovery-context-actions${recoverySucceeded ? ' ac-recovery-context-actions--success' : ''}`}>
            <div>
              <span className="ac-recovery-eyebrow"><Icon name={recoverySucceeded ? 'checkCircle' : 'refresh'} size={13} /> Recovery status</span>
              <h3>{actionTitle}</h3>
              <p>{actionDescription}</p>
            </div>
            <div className="ac-recovery-context-actions__buttons">
              {recoverySucceeded ? (
                <button type="button" className="ac-btn-ghost-action" onClick={loadContext}><Icon name="refresh" size={14} /> Refresh</button>
              ) : canExecute ? (
                <button type="button" className="ac-btn-primary" onClick={() => setConfirmationOpen(true)} disabled={executing}><Icon name={executing ? 'spinner' : 'refresh'} size={15} /> {executing ? 'Recovering...' : 'Execute recovery'}</button>
              ) : candidateEligible && !checking && !CLOSED_INCIDENT_STATUSES.has(incidentStatus) ? (
                <button type="button" className="ac-btn-primary" onClick={() => runPreflight()}><Icon name="search" size={15} /> Check recovery data</button>
              ) : candidate && !candidateEligible ? (
                <button type="button" className="ac-btn-ghost-action" onClick={loadContext}><Icon name="refresh" size={14} /> Check again</button>
              ) : (
                <button type="button" className="ac-btn-primary" disabled><Icon name="spinner" size={15} /> Checking...</button>
              )}
            </div>
          </section>
        </>
      )}

      <RecoveryConfirmationDialog open={confirmationOpen} title="Execute recovery?" message="The gateway will restore this log using the original trusted data shown above." confirmLabel="Execute recovery" busy={executing} onClose={() => !executing && setConfirmationOpen(false)} onConfirm={executeRecovery} />
    </div>
  );
}

export default RecoveryTab;
