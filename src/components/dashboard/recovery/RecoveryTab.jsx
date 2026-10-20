import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../common/Icon';
import ActionBadge from '../../common/ActionBadge';
import { formatTimestamp } from '../../../utils/formatters';
import { recoveryApi } from '../../../services/recoveryApi';
import RecoveryStatusBadge from './RecoveryStatusBadge';
import RecoveryConfirmationDialog from './RecoveryConfirmationDialog';

const EXECUTABLE_REQUEST_STATUSES = new Set(['PENDING_EXECUTION']);
const ACTIVE_REQUEST_STATUSES = new Set(['EXECUTING', 'APPLIED_AWAITING_CDC']);
const CLOSED_INCIDENT_STATUSES = new Set(['RESOLVED', 'RECOVERED']);
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

const formatDisplayValue = value => {
  const parsed = parseJsonValue(value);
  if (parsed === null || parsed === undefined || parsed === '') return '—';
  if (typeof parsed === 'boolean') return parsed ? 'True' : 'False';
  if (Array.isArray(parsed)) return parsed.map(item => formatDisplayValue(item)).join(', ');
  if (typeof parsed === 'object') {
    return Object.entries(parsed)
      .map(([key, item]) => `${key}: ${formatDisplayValue(item)}`)
      .join(' · ');
  }
  return String(parsed);
};

const isRecord = value => Boolean(
  value
  && typeof value === 'object'
  && !Array.isArray(value)
);

const areValuesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const getComparisonRows = (tampered, trusted) => {
  const tamperedValue = parseJsonValue(tampered);
  const trustedValue = parseJsonValue(trusted);

  if (!isRecord(tamperedValue) && !isRecord(trustedValue)) {
    if (tamperedValue === null && trustedValue === null) return [];
    return [{
      field: 'value',
      tampered: tamperedValue,
      trusted: trustedValue,
      changed: !areValuesEqual(tamperedValue, trustedValue),
    }];
  }

  const keys = [...new Set([
    ...Object.keys(isRecord(tamperedValue) ? tamperedValue : {}),
    ...Object.keys(isRecord(trustedValue) ? trustedValue : {}),
  ])];

  return keys.map(field => ({
    field,
    tampered: isRecord(tamperedValue) ? tamperedValue[field] : null,
    trusted: isRecord(trustedValue) ? trustedValue[field] : null,
    changed: !areValuesEqual(
      isRecord(tamperedValue) ? tamperedValue[field] : null,
      isRecord(trustedValue) ? trustedValue[field] : null
    ),
  }));
};

const getStructuredEntries = value => {
  const parsed = parseJsonValue(value);
  if (isRecord(parsed)) return Object.entries(parsed);
  if (parsed === null || parsed === undefined || parsed === '') return [];
  return [['value', parsed]];
};

const firstValue = (...values) => values.find(value => (
  value !== undefined
  && value !== null
  && String(value).trim() !== ''
));

function StructuredValueList({ value, emptyLabel = 'No data available.' }) {
  const entries = getStructuredEntries(value);

  if (entries.length === 0) {
    return <div className="ac-recovery-structured-empty">{emptyLabel}</div>;
  }

  return (
    <dl className="ac-recovery-structured-list">
      {entries.map(([field, fieldValue]) => (
        <div className="ac-recovery-structured-list__row" key={field}>
          <dt>{field}</dt>
          <dd>{formatDisplayValue(fieldValue)}</dd>
        </div>
      ))}
    </dl>
  );
}

const sortNewest = (items = [], field = 'detected_at') => [...items].sort((a, b) => (
  new Date(b?.[field] || 0).getTime() - new Date(a?.[field] || 0).getTime()
));

const hasTamperEvidence = log => {
  const status = String(log?.integrity_status || log?.verification_status || log?.verify_status || '').toUpperCase();
  return ['TAMPERED', 'INVALID', 'FAILED', 'FAILED_LOCAL', 'FAILED_ONCHAIN', 'FAILED_SOURCE'].includes(status)
    || Boolean(log?.incident_type);
};

const sameId = (left, right) => String(left ?? '').trim() !== ''
  && String(left).trim() === String(right ?? '').trim();

const hasVerifiedSnapshotCandidate = candidate => Boolean(
  candidate?.eligible === true
  && String(candidate?.snapshot_object_key || '').trim()
  && String(candidate?.snapshot_version_id || '').trim()
  && String(candidate?.snapshot_checksum || '').trim()
  && String(candidate?.snapshot_plaintext_hash || '').trim()
);

const hasTrustedAuditTrailCandidate = candidate => Boolean(
  candidate?.eligible === true
  && String(candidate?.recovery_source || '').toUpperCase() === 'CLIENT_AUDIT_TRAIL'
  && String(candidate?.reference_log_hash || '').trim()
  && String(candidate?.reference_merkle_root || '').trim()
  && String(candidate?.reference_anchor_id || '').trim()
);

const hasVerifiedSnapshotPreflight = (incident, candidate, preflight) => Boolean(
  preflight?.recoverable === true
  && String(preflight?.status || '').toUpperCase() === 'VALID'
  && sameId(preflight?.log_id, incident?.log_id)
  && sameId(candidate?.log_id, incident?.log_id)
  && sameId(preflight?.object_version_id, candidate?.snapshot_version_id)
  && String(preflight?.current_hash || '').trim()
  && String(preflight?.snapshot_hash || '').trim()
  && String(preflight?.anchor_id || '').trim()
  && String(preflight?.merkle_root || '').trim()
);

const hasTrustedAuditTrailPreflight = (incident, candidate, preflight) => Boolean(
  preflight?.recoverable === true
  && String(preflight?.status || '').toUpperCase() === 'VALID'
  && String(preflight?.recovery_source || '').toUpperCase() === 'CLIENT_AUDIT_TRAIL'
  && String(preflight?.recovery_source || '').toUpperCase() === String(candidate?.recovery_source || '').toUpperCase()
  && sameId(preflight?.log_id, incident?.log_id)
  && sameId(candidate?.log_id, incident?.log_id)
  && String(preflight?.current_hash || '').trim()
  && sameId(preflight?.reference_log_hash, candidate?.reference_log_hash)
  && sameId(preflight?.reference_merkle_root, candidate?.reference_merkle_root)
  && sameId(preflight?.reference_anchor_id, candidate?.reference_anchor_id)
  && String(preflight?.fabric_root || '').trim()
);

const hasGatewayRecoveryCandidate = candidate => (
  hasTrustedAuditTrailCandidate(candidate) || hasVerifiedSnapshotCandidate(candidate)
);

const hasGatewayRecoveryPreflight = (incident, candidate, preflight) => (
  hasTrustedAuditTrailPreflight(incident, candidate, preflight)
  || hasVerifiedSnapshotPreflight(incident, candidate, preflight)
);

const getTamperedData = (activeLog, incident) => {
  const preservedTamperedData = incident?.tampered_payload
    ?? incident?.tampered_metadata;

  const incidentScope = String(incident?.incident_scope || '').toUpperCase();
  if (incidentScope === 'CLIENT_SOURCE') {
    // Client source incidents expose hashes and changed field names. The
    // audit-log event metadata is not a safe substitute for the live row.
    return null;
  }

  const incidentStatus = String(incident?.status || '').trim().toUpperCase();

  // After recovery, activeLog.metadata is the trusted value currently stored
  // in the audit log. Closed incidents must use the encrypted before-image
  // returned by the incident detail endpoint instead.
  if (CLOSED_INCIDENT_STATUSES.has(incidentStatus)) return preservedTamperedData ?? null;

  // For Gateway integrity incidents the audit log row itself is the tampered
  // object, so compare it with the validated source event preview.
  return activeLog?.metadata ?? preservedTamperedData ?? null;
};

const getEventList = value => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];

const friendlyRecoveryReason = value => {
  const reason = String(value || '').trim();
  const messages = {
    client_source_incident_required: 'This Gateway incident cannot be recovered in direct client mode.',
    gateway_snapshot_recovery_disabled: 'Gateway audit-log recovery is not available for this incident.',
    audit_trail_reference_missing: 'The original source audit event is not linked to this Gateway log.',
    audit_trail_timestamp_missing: 'This Gateway log has no timestamp to match against the source audit history.',
    audit_trail_lookup_ambiguous: 'Too many source events match this time window. Recovery is blocked until the source event can be identified uniquely.',
    audit_trail_reference_ambiguous: 'More than one source audit event matches this log. Recovery is blocked because the source is ambiguous.',
    audit_trail_reference_hash_mismatch: 'Nearby source audit events do not reproduce the original anchored log hash.',
    audit_trail_record_not_found: 'The original audit event could not be found in the client database.',
    agent_audit_trail_lookup_database_unavailable: 'The client Agent cannot access its source database. Check the Agent database connection and logs.',
    agent_audit_trail_lookup_failed: 'The client Agent could not run the audit-history lookup. Check its logs for the database query error.',
    agent_audit_trail_table_not_found: 'The configured audit_trail table was not found by the client Agent.',
    agent_audit_trail_lookup_http_404: 'The client Agent needs the audit-history lookup update before this log can be recovered.',
    agent_audit_trail_lookup_http_503: 'The client Agent reported that its source audit-history lookup is unavailable. Check the Agent database connection and logs.',
    agent_audit_trail_lookup_unreachable: 'The client Agent could not search the source audit history.',
    agent_not_configured: 'The client Agent is not configured for this source system.',
    agent_audit_trail_unavailable: 'The client Agent could not read the source audit history.',
    reference_local_hash_mismatch: 'The source audit event does not match the hash recorded before tampering.',
    reference_merkle_proof_mismatch: 'The source event could not be proven against its Merkle root.',
    reference_fabric_root_mismatch: 'The source event does not match the Fabric anchor.',
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
  const [verificationResult, setVerificationResult] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const loadSeqRef = useRef(0);

  const runPreflight = useCallback(async (incidentId = incident?.id) => {
    const scope = String(incident?.incident_scope || '').toUpperCase();
    if (!incidentId || !['CLIENT_SOURCE', 'GATEWAY_INTEGRITY'].includes(scope)) return null;
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
  }, [incident?.id, incident?.incident_scope]);

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

    const incidents = Array.isArray(incidentResult.value) ? incidentResult.value : [];
    const exactLogMatches = incidents.filter(item => sameId(item.log_id, activeLog.log_id));
    const referenceMatches = incidents.filter(item => sameId(item.reference_log_id, activeLog.log_id));
    let nextIncident = sortNewest(exactLogMatches.length ? exactLogMatches : referenceMatches)[0] || null;

    // The list projection intentionally omits the protected tampered payload.
    // Load the detail projection for closed incidents so the contextual tab
    // can compare the before-image with the recorded recovery result.
    if (
      nextIncident
      && CLOSED_INCIDENT_STATUSES.has(String(nextIncident.status || '').toUpperCase())
      && typeof recoveryApi.getIncident === 'function'
    ) {
      try {
        const detail = await recoveryApi.getIncident({ incidentId: nextIncident.id });
        if (seq !== loadSeqRef.current) return;
        if (detail) nextIncident = { ...nextIncident, ...detail };
      } catch {
        // The list projection remains usable; the UI will show that the
        // preserved before-image is unavailable if detail loading fails.
      }
    }

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

    const nextRequestStatus = String(nextRequest?.status || '').toUpperCase();
    if (
      !nextIncident
      || String(nextIncident.status || '').toUpperCase() !== 'OPEN'
      || !['CLIENT_SOURCE', 'GATEWAY_INTEGRITY'].includes(String(nextIncident.incident_scope || '').toUpperCase())
      || ACTIVE_REQUEST_STATUSES.has(nextRequestStatus)
      || ['APPLIED_CDC_TIMEOUT', 'SUCCEEDED'].includes(nextRequestStatus)
    ) return;

    try {
      const candidates = await recoveryApi.listCandidates({ incidentId: nextIncident.id });
      if (seq !== loadSeqRef.current) return;
      const scope = String(nextIncident.incident_scope || '').toUpperCase();
      const targetLogId = scope === 'CLIENT_SOURCE'
        ? (nextIncident.reference_log_id || nextIncident.log_id)
        : nextIncident.log_id;
      const availableCandidates = (Array.isArray(candidates) ? candidates : [candidates]).filter(Boolean);
      const nextCandidate = availableCandidates.find(item => sameId(item.log_id, targetLogId))
        || (scope === 'CLIENT_SOURCE' ? availableCandidates[0] : null);
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
    setVerificationResult(null);
    loadContext();
    return () => {
      loadSeqRef.current += 1;
    };
  }, [loadContext]);

  const verifyAndRefresh = useCallback(async () => {
    if (!activeLog?.log_id || !selectedClient) return;
    setChecking(true);
    setError('');
    try {
      const result = await recoveryApi.verifyLog({ logId: activeLog.log_id, clientId: selectedClient });
      setVerificationResult(result);
      await loadContext();
    } catch (verificationError) {
      setError(getErrorText(verificationError, 'Integrity check failed.'));
    } finally {
      setChecking(false);
    }
  }, [activeLog?.log_id, loadContext, selectedClient]);

  const requestStatus = String(existingRequest?.status || '').toUpperCase();
  const shouldPollRequest = Boolean(
    existingRequest?.id
    && (
      ACTIVE_REQUEST_STATUSES.has(requestStatus)
      || requestStatus === 'APPLIED_CDC_TIMEOUT'
      || (requestStatus === 'SUCCEEDED' && !latestEvent)
      || (requestStatus === 'SUCCEEDED' && latestEvent && !['SUCCEEDED', 'FAILED_EXECUTION', 'FAILED_VERIFICATION', 'APPLIED_CDC_TIMEOUT'].includes(String(latestEvent.result_status || '').toUpperCase()))
    )
  );

  useEffect(() => {
    if (!shouldPollRequest) return undefined;
    let active = true;
    const poll = async () => {
      try {
        const nextRequest = await recoveryApi.getRequest({ requestId: existingRequest.id });
        let nextEvent = latestEvent;
        const eventId = nextRequest?.recovery_event_id || nextEvent?.id;
        if (eventId) {
          try {
            nextEvent = await recoveryApi.getEvent({ eventId });
          } catch {
            // The request can become visible before its event projection.
          }
        }
        if (!active) return;
        setExistingRequest(nextRequest || existingRequest);
        if (nextEvent) setLatestEvent(nextEvent);
        setExecutionResult(current => current ? { ...current, request: nextRequest || current.request, executed: nextRequest || current.executed, event: nextEvent || current.event } : current);
      } catch {
        // Keep the last known status visible and retry on the next interval.
      }
    };
    const timer = window.setInterval(() => void poll(), 4000);
    void poll();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [shouldPollRequest, existingRequest?.id, requestStatus, latestEvent?.id, latestEvent?.integrity_status]);

  const executeRecovery = async () => {
    const incidentStatus = String(incident?.status || '').toUpperCase();
    const scope = String(incident?.incident_scope || '').toUpperCase();
    const preflightValid = preflight?.recoverable === true
      && String(preflight?.status || '').toUpperCase() === 'VALID';
    const canRecoverGateway = scope === 'GATEWAY_INTEGRITY'
      && hasGatewayRecoveryCandidate(candidate)
      && hasGatewayRecoveryPreflight(incident, candidate, preflight);
    const recoveryScopeAllowed = scope === 'CLIENT_SOURCE' ? preflightValid : canRecoverGateway;
    if (!incident?.id || !recoveryScopeAllowed || incidentStatus !== 'OPEN' || !candidate?.eligible || !preflightValid || CLOSED_INCIDENT_STATUSES.has(incidentStatus) || executing) return;

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
  const incidentScope = String(incident?.incident_scope || '').toUpperCase();
  const isClientSource = incidentScope === 'CLIENT_SOURCE';
  const isGatewayIntegrity = incidentScope === 'GATEWAY_INTEGRITY';
  const candidateEligible = Boolean(candidate?.eligible);
  const preflightReady = Boolean(preflight?.recoverable && String(preflight?.status || '').toUpperCase() === 'VALID');
  const gatewayRecoveryReady = Boolean(
    isGatewayIntegrity
    && hasGatewayRecoveryCandidate(candidate)
    && hasGatewayRecoveryPreflight(incident, candidate, preflight)
  );
  const requestExecuting = ACTIVE_REQUEST_STATUSES.has(requestStatus);
  const requestTimedOut = requestStatus === 'APPLIED_CDC_TIMEOUT';
  const requestSucceeded = requestStatus === 'SUCCEEDED';
  const shownEvent = executionResult?.event || latestEvent;
  const recoverySucceeded = Boolean(
    shownEvent?.incident_id === incident?.id
    && String(shownEvent?.result_status || '').toUpperCase() === 'SUCCEEDED'
  );
  const canExecute = Boolean(
    incident
    && (isClientSource || gatewayRecoveryReady)
    && incidentStatus === 'OPEN'
    && !CLOSED_INCIDENT_STATUSES.has(incidentStatus)
    && candidateEligible
    && preflightReady
    && !requestExecuting
    && !requestTimedOut
    && !requestSucceeded
    && !recoverySucceeded
  );
  const tamperedData = getTamperedData(activeLog, incident);
  const recoveredData = shownEvent?.recovered_metadata;
  const trustedPreview = preflight?.trusted_reference_preview || preflight?.snapshot_preview || {};
  const trustedData = recoveredData ?? trustedPreview.metadata;
  const hasTrustedData = trustedData !== undefined && trustedData !== null && trustedData !== '';
  const hasTamperedData = tamperedData !== undefined && tamperedData !== null && tamperedData !== '';
  const comparisonRows = hasTrustedData && hasTamperedData ? getComparisonRows(tamperedData, trustedData) : [];
  const changedFields = comparisonRows.filter(row => row.changed).map(row => row.field);
  const tamperedAction = String(firstValue(
    activeLog?.action,
    incident?.target_action,
    shownEvent?.target_action,
    trustedPreview.action
  ) || '').trim().toUpperCase();
  const tamperedActor = firstValue(
    activeLog?.actor,
    incident?.target_actor,
    shownEvent?.target_actor,
    trustedPreview.actor
  ) || 'Unknown actor';
  const sourceSystem = firstValue(
    activeLog?.source_system,
    incident?.source_system,
    shownEvent?.source_system,
    shownEvent?.target_source_system,
    trustedPreview.source_system
  ) || 'Unknown source';
  const looksTampered = hasTamperEvidence(activeLog) || Boolean(incident?.incident_type);
  const checkedAsTampered = String(verificationResult?.status || verificationResult?.data?.status || '').toLowerCase() === 'failed';

  let actionTitle = 'Checking recovery availability...';
  let actionDescription = 'The gateway is checking the trusted recovery data.';
  if (recoverySucceeded) {
    actionTitle = 'Recovery completed';
    actionDescription = shownEvent.executed_at
      ? `${isClientSource ? 'Client record' : 'Gateway audit log'} restored ${formatTimestamp(shownEvent.executed_at)}.`
      : `${isClientSource ? 'Client record' : 'Gateway audit log'} recovery is verified.`;
  } else if (executing || requestExecuting) {
    actionTitle = 'Recovery is in progress';
    actionDescription = isClientSource
      ? 'The Agent write is applied or processing. The gateway is waiting for CDC and recovery evidence verification.'
      : 'The Gateway is restoring the audit-log metadata from its validated source audit event.';
  } else if (requestTimedOut) {
    actionTitle = 'CDC confirmation timed out';
    actionDescription = 'The Agent write may have applied. Review client state and recovery history before another attempt.';
  } else if (requestSucceeded && !recoverySucceeded) {
    actionTitle = 'Recovery evidence is loading';
    actionDescription = 'The gateway marked the request successful and is loading its verified recovery event.';
  } else if (candidate && !candidateEligible) {
    actionTitle = 'Recovery unavailable';
    actionDescription = friendlyRecoveryReason(candidate.reason);
  } else if (preflight?.status === 'NO_RECOVERY_REQUIRED') {
    actionTitle = 'Recovery is not required';
    actionDescription = 'The current log already matches the trusted data.';
  } else if (gatewayRecoveryReady) {
    actionTitle = 'Ready to restore Gateway audit log';
    actionDescription = 'The backend matched the source audit event to the original log hash, Merkle proof, and Fabric anchor. Review the original data before restoring this audit-log record.';
  } else if (isGatewayIntegrity && hasGatewayRecoveryCandidate(candidate)) {
    actionTitle = checking ? 'Checking trusted source event' : 'Recovery check required';
    actionDescription = checking
      ? 'The gateway is validating the source audit event, Merkle proof, and Fabric anchor.'
      : 'A source audit event is available. Run the recovery check again before restoring this audit-log record.';
  } else if (!isClientSource) {
    actionTitle = 'Gateway integrity incident';
    actionDescription = 'This incident can be restored only when the original source audit event and its Fabric-anchored proof are available.';
  } else if (preflightReady) {
    actionTitle = 'Ready to recover';
    actionDescription = 'Review the client state hashes and event evidence, then execute recovery.';
  } else if (!checking && candidateEligible) {
    actionTitle = 'Recovery check required';
    actionDescription = 'Check the trusted data again before recovery.';
  }

  return (
    <div className="ac-recovery-tab ac-recovery-tab--simple">
      <div className="ac-recovery-tab__intro">
        <div>
          <span className="ac-recovery-eyebrow"><Icon name="shield" size={14} /> Recovery</span>
          <h2>{isClientSource ? 'Recover client record' : gatewayRecoveryReady ? 'Restore Gateway audit log' : 'Review recovery incident'}</h2>
          <p>{isClientSource
            ? 'Review the incident evidence and restore the client record from a verified AuditChain event.'
            : gatewayRecoveryReady
              ? 'Review the tampered audit-log data and restore it from the original source audit event verified against Fabric.'
            : incident
              ? 'The original source audit event must match the anchored log hash and Fabric proof before this audit log can be restored.'
              : 'Click Verify and refresh to create or refresh the backend incident. Recovery requires a trusted source event and its Fabric-anchored proof.'}</p>
        </div>
        {incident && <RecoveryStatusBadge status={recoverySucceeded ? 'SUCCEEDED' : requestStatus || incident.status} />}
      </div>

      {error && <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={16} /><span>{error}</span><button type="button" onClick={loadContext} aria-label="Retry recovery data"><Icon name="refresh" size={15} /></button></div>}

      {loading ? (
        <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading recovery data...</div>
      ) : !incident ? (
        <div className="ac-recovery-empty">
          <span className={`ac-recovery-empty__icon${looksTampered ? ' ac-recovery-empty__icon--warning' : ''}`}><Icon name={looksTampered ? 'alertTriangle' : 'checkCircle'} size={25} /></span>
          <strong>{looksTampered ? (checkedAsTampered ? 'Tampering confirmed, incident missing' : 'Tamper detected') : 'No recovery needed'}</strong>
          <p>{looksTampered
            ? (checkedAsTampered
              ? 'The integrity check failed, but the backend did not return a matching recovery incident. The incident must be persisted and visible to this tenant before this tab can load it.'
              : 'Click Verify and refresh to run the backend check and create or refresh the incident.')
            : 'This log has no confirmed tamper incident.'}</p>
          <button type="button" className="ac-btn-ghost-action" onClick={looksTampered ? verifyAndRefresh : loadContext} disabled={checking}>
            <Icon name={checking ? 'spinner' : looksTampered ? 'search' : 'refresh'} size={14} /> {checking ? 'Checking integrity...' : looksTampered ? 'Verify and refresh' : 'Refresh'}
          </button>
        </div>
      ) : (
        <>
          <section className="ac-recovery-card ac-recovery-simple-summary">
            <div className="ac-recovery-simple-summary__content">
              <span className="ac-recovery-eyebrow"><Icon name="alertTriangle" size={13} /> {isClientSource ? 'Client source incident' : 'Gateway integrity incident'}</span>
              <h3>{incident.resource || activeLog.resource || activeLog.source_table || activeLog.log_id}</h3>
              <p>{incident.incident_type || 'Integrity mismatch'} · {incident.detected_at ? formatTimestamp(incident.detected_at) : 'Detection time unavailable'}</p>
              <div className="ac-recovery-facts ac-recovery-simple-summary__facts">
                <span>
                  <strong>Action</strong>
                  {tamperedAction ? <ActionBadge action={tamperedAction} /> : '—'}
                </span>
                <span>
                  <strong>Actor affected</strong>
                  <span className="ac-recovery-simple-summary__fact-value">
                    <Icon name="user" size={12} />
                    {tamperedActor}
                  </span>
                </span>
                <span>
                  <strong>Source system</strong>
                  <span className="ac-recovery-simple-summary__fact-value">{sourceSystem}</span>
                </span>
              </div>
            </div>
            <code title={incident.log_id}>{incident.log_id}</code>
          </section>

          <section className={`ac-recovery-card ac-recovery-context-data-card${recoverySucceeded ? ' ac-recovery-context-data-card--recovered' : ' ac-recovery-context-data-card--tampered'}`}>
            <div className="ac-recovery-card__header ac-recovery-card__header--compact">
              <div>
                <span className="ac-recovery-eyebrow"><Icon name="code" size={13} /> Data review</span>
                <h3>{isClientSource ? (recoverySucceeded ? 'Client state hash and recovery result' : 'Client state hash and trusted reference') : (recoverySucceeded ? 'Tampered data and recovery result' : 'Tampered data and original data')}</h3>
              </div>
              {recoverySucceeded && <RecoveryStatusBadge status="SUCCEEDED" compact />}
            </div>
            {isClientSource && <div className="ac-recovery-evidence-grid">
              <div><span>Live client state hash</span><code>{preflight?.client_state_hash || shownEvent?.client_before_hash || existingRequest?.before_hash || '—'}</code></div>
              <div><span>Trusted desired state hash</span><code>{preflight?.desired_state_hash || shownEvent?.client_after_hash || existingRequest?.after_hash || '—'}</code></div>
              <div><span>Source status</span><RecoveryStatusBadge status={preflight?.source_status || incident.source_status} compact /></div>
              <div><span>Agent status</span><RecoveryStatusBadge status={preflight?.agent_status} compact /></div>
              <div><span>CDC status</span><RecoveryStatusBadge status={shownEvent?.cdc_status || existingRequest?.cdc_status || 'PENDING'} compact /></div>
              <div><span>Recovery event integrity</span><RecoveryStatusBadge status={shownEvent?.integrity_status || 'NOT_CHECKED'} compact /></div>
              <div><span>Client event hash</span><code>{preflight?.reference_log_hash || candidate?.reference_log_hash || '—'}</code></div>
              <div><span>Merkle root / anchor</span><code>{preflight?.reference_merkle_root || preflight?.reference_anchor_id || candidate?.reference_merkle_root || candidate?.reference_anchor_id || '—'}</code></div>
            </div>}
            {hasTrustedData && hasTamperedData && comparisonRows.length > 0 ? (
              <div className="ac-recovery-comparison">
                <div className="ac-recovery-comparison__table-wrap">
                  <table className="ac-diff ac-recovery-diff-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th className="before">Tampered data</th>
                        <th className="after">{recoverySucceeded ? 'Recovered data' : 'Original trusted data'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map(row => (
                        <tr key={row.field} className={!row.changed ? 'ac-recovery-diff-row--unchanged' : ''}>
                          <td className="field">
                            <span>{row.field}</span>
                            {!row.changed && <small>unchanged</small>}
                          </td>
                          <td className={row.changed ? 'val-before' : 'val-unchanged'}>{formatDisplayValue(row.tampered)}</td>
                          <td className={row.changed ? 'val-after' : 'val-unchanged'}>{formatDisplayValue(row.trusted)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="ac-recovery-context-data-grid">
                <div className="ac-recovery-simple-data ac-recovery-simple-data--danger">
                  <span className="ac-recovery-data-label ac-recovery-data-label--danger">{isClientSource ? 'Live client data' : 'Tampered data'}</span>
                  <StructuredValueList value={tamperedData} emptyLabel={isClientSource ? 'The recovery API does not expose live client row values.' : 'Tampered data is protected or unavailable.'} />
                </div>
                <div className="ac-recovery-simple-data ac-recovery-simple-data--success">
                  <span className="ac-recovery-data-label ac-recovery-data-label--success">{recoverySucceeded ? (isClientSource ? 'Recovery event result (redacted)' : 'Recovered data') : (isClientSource ? 'Trusted event reference (redacted)' : 'Original trusted data')}</span>
                  {hasTrustedData ? <StructuredValueList value={trustedData} /> : <div className="ac-recovery-simple-placeholder">{checking ? <><Icon name="spinner" size={16} /> Checking trusted data...</> : isClientSource ? 'Trusted reference values are not exposed by this API; compare the state hashes and recovery event.' : friendlyRecoveryReason(candidate?.reason)}</div>}
                </div>
              </div>
            )}
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
                <button type="button" className="ac-btn-primary" onClick={() => setConfirmationOpen(true)} disabled={executing}><Icon name={executing ? 'spinner' : 'refresh'} size={15} /> {executing ? 'Recovering...' : gatewayRecoveryReady ? 'Restore audit log' : 'Execute recovery'}</button>
              ) : (isClientSource || (isGatewayIntegrity && hasGatewayRecoveryCandidate(candidate))) && candidateEligible && !CLOSED_INCIDENT_STATUSES.has(incidentStatus) && !requestTimedOut && !requestExecuting && !requestSucceeded ? (
                <button type="button" className="ac-btn-primary" onClick={() => runPreflight()} disabled={checking}><Icon name={checking ? 'spinner' : 'search'} size={15} /> {checking ? 'Checking...' : 'Check recovery data'}</button>
              ) : candidate && !candidateEligible ? (
                <button type="button" className="ac-btn-ghost-action" onClick={loadContext}><Icon name="refresh" size={14} /> Check again</button>
              ) : !isClientSource ? (
                <span className="ac-recovery-readonly-note"><Icon name="shield" size={14} /> Read-only incident</span>
              ) : (
                <button type="button" className="ac-btn-primary" disabled><Icon name="spinner" size={15} /> Checking...</button>
              )}
            </div>
          </section>
        </>
      )}

      <RecoveryConfirmationDialog
        open={confirmationOpen}
        title={gatewayRecoveryReady ? 'Restore Gateway audit log?' : 'Execute client recovery?'}
        message={gatewayRecoveryReady
          ? 'The gateway will reread the source audit event, verify its original log hash, Merkle proof, and Fabric anchor, then restore this audit-log metadata.'
          : 'The gateway will verify the client event and Agent state, then ask the Agent to restore the selected client record. Completion waits for CDC and recovery evidence verification.'}
        confirmLabel={gatewayRecoveryReady ? 'Restore audit log' : 'Execute recovery'}
        busy={executing}
        onClose={() => !executing && setConfirmationOpen(false)}
        onConfirm={executeRecovery}
      />
    </div>
  );
}

export default RecoveryTab;
