import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../common/Icon';
import { formatTimestamp } from '../../../utils/formatters';
import { recoveryApi } from '../../../services/recoveryApi';
import RecoveryStatusBadge from './RecoveryStatusBadge';
import RecoveryHashComparison from './RecoveryHashComparison';
import RecoveryPreflightPanel from './RecoveryPreflightPanel';
import RecoveryConfirmationDialog from './RecoveryConfirmationDialog';

const ACTIVE_REQUEST_STATUSES = new Set(['PENDING_EXECUTION', 'PENDING_APPROVAL', 'APPROVED', 'EXECUTING', 'SUCCEEDED']);
const EXECUTABLE_REQUEST_STATUSES = new Set(['PENDING_EXECUTION', 'PENDING_APPROVAL', 'APPROVED']);
const TERMINAL_REQUEST_STATUSES = new Set(['REJECTED', 'FAILED_VERIFICATION', 'FAILED_EXECUTION', 'SUCCEEDED']);
const CLOSED_INCIDENT_STATUSES = new Set(['RESOLVED', 'DISMISSED']);

const createIdempotencyKey = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `recovery-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getErrorText = (error, fallback = 'Recovery data could not be loaded.') => {
  if (!error) return fallback;
  if (error.unavailable) return 'Recovery service is not enabled on this gateway.';
  return error.message || fallback;
};

const sortByNewest = (items = [], field = 'requested_at') => [...items].sort((a, b) => (
  new Date(b?.[field] || 0).getTime() - new Date(a?.[field] || 0).getTime()
));

function RecoveryTab({ activeLog, selectedClient, onRefreshLogs }) {
  const [incident, setIncident] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [request, setRequest] = useState(null);
  const [preflight, setPreflight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [dialog, setDialog] = useState(null);
  const requestKeyRef = useRef(createIdempotencyKey());
  const loadSeqRef = useRef(0);

  const loadContext = useCallback(async () => {
    if (!activeLog?.log_id || !selectedClient) {
      setLoading(false);
      setIncident(null);
      setCandidate(null);
      setRequest(null);
      return;
    }

    const seq = loadSeqRef.current + 1;
    loadSeqRef.current = seq;
    setLoading(true);
    setError('');
    try {
      const [incidents, requests] = await Promise.all([
        recoveryApi.listIncidents(),
        recoveryApi.listRequests(),
      ]);
      if (seq !== loadSeqRef.current) return;

      const matches = (Array.isArray(incidents) ? incidents : []).filter(item => item.log_id === activeLog.log_id);
      const nextIncident = sortByNewest(matches, 'detected_at')[0] || null;
      const matchingRequests = nextIncident
        ? (Array.isArray(requests) ? requests : []).filter(item => item.incident_id === nextIncident.id)
        : [];
      const nextRequest = sortByNewest(matchingRequests)[0] || null;

      setIncident(nextIncident);
      setRequest(nextRequest);
      setPreflight(null);
      setCandidate(null);

      if (nextIncident) {
        setCandidateLoading(true);
        try {
          const candidates = await recoveryApi.listCandidates({ incidentId: nextIncident.id });
          if (seq === loadSeqRef.current) {
            setCandidate((Array.isArray(candidates) ? candidates : [candidates]).filter(Boolean)[0] || null);
          }
        } catch (candidateError) {
          if (seq === loadSeqRef.current) setError(getErrorText(candidateError, 'Snapshot candidates could not be loaded.'));
        } finally {
          if (seq === loadSeqRef.current) setCandidateLoading(false);
        }
      }
    } catch (loadError) {
      if (seq === loadSeqRef.current) setError(getErrorText(loadError));
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [activeLog?.log_id, selectedClient]);

  useEffect(() => {
    requestKeyRef.current = createIdempotencyKey();
    setReason('');
    setPreflight(null);
    setDialog(null);
    loadContext();
    return () => {
      loadSeqRef.current += 1;
    };
  }, [loadContext]);

  const refreshRequest = useCallback(async () => {
    if (!request?.id || !selectedClient) return null;
    try {
      const fresh = await recoveryApi.getRequest({ requestId: request.id });
      setRequest(fresh);
      return fresh;
    } catch (requestError) {
      setError(getErrorText(requestError, 'Recovery request could not be refreshed.'));
      return null;
    }
  }, [request?.id, selectedClient]);

  useEffect(() => {
    if (!request || !['EXECUTING'].includes(String(request.status || '').toUpperCase())) return undefined;
    const timer = window.setInterval(async () => {
      const fresh = await refreshRequest();
      if (fresh && TERMINAL_REQUEST_STATUSES.has(String(fresh.status || '').toUpperCase())) {
        window.clearInterval(timer);
        loadContext();
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [request, refreshRequest, loadContext]);

  const runPreflight = async () => {
    if (!incident?.id || CLOSED_INCIDENT_STATUSES.has(incident.status)) return;
    setPreflightLoading(true);
    setError('');
    try {
      const result = await recoveryApi.runPreflight({ incidentId: incident.id });
      setPreflight(result);
    } catch (preflightError) {
      setPreflight(null);
      setError(getErrorText(preflightError, 'Preflight failed. No data was changed.'));
    } finally {
      setPreflightLoading(false);
    }
  };

  const createRequest = async (event) => {
    event.preventDefault();
    if (!incident?.id || !candidate?.eligible || !preflight?.recoverable || reason.trim().length < 5) return;
    setMutationLoading(true);
    setError('');
    try {
      const created = await recoveryApi.createRequest({
        incidentId: incident.id,
        selectedLogId: candidate.log_id || activeLog.log_id,
        reason: reason.trim(),
        idempotencyKey: requestKeyRef.current,
      });
      setRequest(created);
      setReason('');
      await loadContext();
    } catch (requestError) {
      setError(getErrorText(requestError, 'Recovery request could not be created.'));
    } finally {
      setMutationLoading(false);
    }
  };

  const runMutation = async (action) => {
    if (!request?.id) return;
    setMutationLoading(true);
    setError('');
    try {
      const updated = await action({ requestId: request.id });
      setRequest(updated);
      setDialog(null);
      await loadContext();
      if (updated?.status === 'SUCCEEDED' && onRefreshLogs) onRefreshLogs();
    } catch (mutationError) {
      setError(getErrorText(mutationError, 'Recovery action could not be completed.'));
      setDialog(null);
      await refreshRequest();
    } finally {
      setMutationLoading(false);
    }
  };

  const requestStatus = String(request?.status || '').toUpperCase();
  const incidentStatus = String(incident?.status || '').toUpperCase();
  const candidateEligible = Boolean(candidate?.eligible);
  const canCreate = Boolean(
    incident && !CLOSED_INCIDENT_STATUSES.has(incidentStatus) &&
    candidateEligible && preflight?.recoverable &&
    (!request || !ACTIVE_REQUEST_STATUSES.has(requestStatus))
  );
  const canExecute = EXECUTABLE_REQUEST_STATUSES.has(requestStatus);
  const integrityStatus = String(activeLog?.integrity_status || activeLog?.verification_status || activeLog?.verify_status || '').toUpperCase();
  const looksTampered = integrityStatus === 'TAMPERED' || integrityStatus === 'INVALID' || incident?.incident_type;

  const dialogConfig = useMemo(() => {
    if (dialog === 'execute') return {
      title: 'Execute recovery?',
      message: 'The backend will revalidate PostgreSQL, the exact MinIO snapshot, and its Fabric proof before restoring this AuditChain log. The client database will not be changed.',
      confirmLabel: 'Execute recovery',
      tone: 'primary',
      action: recoveryApi.executeRequest,
    };
    return null;
  }, [dialog]);

  if (!activeLog?.log_id) return null;

  return (
    <div className="ac-recovery-tab">
      <div className="ac-recovery-tab__intro">
        <div>
          <span className="ac-recovery-eyebrow"><Icon name="shield" size={14} /> Recovery workflow</span>
          <h2>Restore from trusted evidence</h2>
          <p>Recovery can only use a verified snapshot for this exact audit log.</p>
        </div>
        {incident && <RecoveryStatusBadge status={incident.status} />}
      </div>

      {error && (
        <div className="ac-recovery-alert ac-recovery-alert--error" role="alert">
          <Icon name="alertTriangle" size={16} />
          <span>{error}</span>
          <button type="button" onClick={loadContext} aria-label="Retry recovery data"><Icon name="refresh" size={15} /></button>
        </div>
      )}

      {loading ? (
        <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading recovery context...</div>
      ) : !incident ? (
        <div className="ac-recovery-empty">
          <span className={`ac-recovery-empty__icon${looksTampered ? ' ac-recovery-empty__icon--warning' : ''}`}><Icon name={looksTampered ? 'alertTriangle' : 'checkCircle'} size={25} /></span>
          <strong>{looksTampered ? 'Tamper incident is not available yet' : 'No recovery incident for this log'}</strong>
          <p>{looksTampered
            ? 'The scanner may still be processing this log. Refresh after the backend creates an official incident.'
            : 'This log has no confirmed tamper incident, so a recovery request cannot be started.'}</p>
          <button type="button" className="ac-btn-ghost-action" onClick={loadContext}><Icon name="refresh" size={14} /> Refresh status</button>
        </div>
      ) : (
        <>
          <section className="ac-recovery-card ac-recovery-incident-card">
            <div className="ac-recovery-card__header">
              <div>
                <span className="ac-recovery-eyebrow"><Icon name="alertTriangle" size={13} /> Tamper incident</span>
                <h3>{incident.incident_type || 'Integrity mismatch detected'}</h3>
                <p>Detected {incident.detected_at ? formatTimestamp(incident.detected_at) : '-'}</p>
              </div>
              <code className="ac-recovery-id">{incident.id}</code>
            </div>
            <RecoveryHashComparison expected={incident.expected_hash} detected={incident.detected_hash} />
            <div className="ac-recovery-facts">
              <span><strong>Log ID</strong><code>{incident.log_id}</code></span>
              <span><strong>Resource</strong><code>{incident.resource || activeLog.resource || activeLog.source_table || '-'}</code></span>
              <span><strong>Client</strong><code>{incident.client_id || selectedClient}</code></span>
            </div>
          </section>

          <section className="ac-recovery-card">
            <div className="ac-recovery-card__header ac-recovery-card__header--compact">
              <div>
                <span className="ac-recovery-eyebrow"><Icon name="database" size={13} /> Snapshot candidate</span>
                <h3>MinIO recovery source</h3>
              </div>
              {candidateLoading ? <Icon name="spinner" size={17} /> : candidate && <RecoveryStatusBadge status={candidate.eligible ? 'VALID' : 'FAILED_VERIFICATION'} compact />}
            </div>
            {!candidateLoading && !candidate ? (
              <div className="ac-recovery-inline-empty">No snapshot candidate was returned for this incident.</div>
            ) : candidate && (
              <>
                <div className="ac-recovery-candidate-grid">
                  <span><strong>Eligibility</strong>{candidate.eligible ? 'Eligible for preflight' : candidate.reason || 'Not eligible'}</span>
                  <span><strong>Snapshot verified</strong>{candidate.snapshot_verified_at ? formatTimestamp(candidate.snapshot_verified_at) : '-'}</span>
                  <span><strong>Version ID</strong><code title={candidate.snapshot_version_id}>{candidate.snapshot_version_id || '-'}</code></span>
                  <span><strong>Object key</strong><code title={candidate.snapshot_object_key}>{candidate.snapshot_object_key || '-'}</code></span>
                </div>
                <div className="ac-recovery-candidate-hashes">
                  <span><strong>Checksum</strong><code title={candidate.snapshot_checksum}>{candidate.snapshot_checksum || '-'}</code></span>
                  <span><strong>Plaintext hash</strong><code title={candidate.snapshot_plaintext_hash}>{candidate.snapshot_plaintext_hash || '-'}</code></span>
                </div>
              </>
            )}
          </section>

          <RecoveryPreflightPanel
            result={preflight}
            loading={preflightLoading}
            onRun={runPreflight}
            disabled={!candidateEligible || CLOSED_INCIDENT_STATUSES.has(incidentStatus)}
          />

          {request && (
            <section className="ac-recovery-card ac-recovery-request-card">
              <div className="ac-recovery-card__header ac-recovery-card__header--compact">
                <div>
                  <span className="ac-recovery-eyebrow"><Icon name="fileText" size={13} /> Recovery request</span>
                  <h3>{request.id}</h3>
                </div>
                <RecoveryStatusBadge status={request.status} />
              </div>
              <div className="ac-recovery-request-meta">
                <span><strong>Requested by</strong>{request.requested_by || '-'}</span>
                <span><strong>Requested at</strong>{request.requested_at ? formatTimestamp(request.requested_at) : '-'}</span>
                <span><strong>Reason</strong>{request.reason || '-'}</span>
                {request.failure_reason && <span className="ac-recovery-request-meta__failure"><strong>Failure reason</strong>{request.failure_reason}</span>}
              </div>
              <RecoveryHashComparison before={request.before_hash} after={request.after_hash} />
              <div className="ac-recovery-actions">
                {canExecute && <button type="button" className="ac-btn-primary" onClick={() => setDialog('execute')}><Icon name="refresh" size={15} /> Execute recovery</button>}
                {requestStatus === 'EXECUTING' && <span className="ac-recovery-action-note"><Icon name="spinner" size={14} /> Waiting for backend verification...</span>}
                {requestStatus === 'SUCCEEDED' && <span className="ac-recovery-action-note ac-recovery-action-note--success"><Icon name="checkCircle" size={14} /> Audit log restored and incident resolved.</span>}
              </div>
            </section>
          )}

          {canCreate && (
            <form className="ac-recovery-card ac-recovery-request-form" onSubmit={createRequest}>
              <div className="ac-recovery-card__header ac-recovery-card__header--compact">
                <div>
                  <span className="ac-recovery-eyebrow"><Icon name="fileText" size={13} /> Recovery intent</span>
                  <h3>Prepare recovery</h3>
                  <p>Preflight is valid. Record a reason, then execute the recovery directly.</p>
                </div>
              </div>
              <label className="ac-recovery-field">
                <span>Reason <em>minimum 5 characters</em></span>
                <textarea value={reason} onChange={event => setReason(event.target.value)} minLength={5} rows={3} placeholder="Example: PostgreSQL metadata was changed and the verified snapshot must be restored." />
              </label>
              <div className="ac-recovery-request-form__footer">
                <span><Icon name="lock" size={13} /> The client database will not be modified.</span>
                <button type="submit" className="ac-btn-primary" disabled={mutationLoading || reason.trim().length < 5}>
                  <Icon name={mutationLoading ? 'spinner' : 'send'} size={15} />
                  {mutationLoading ? 'Preparing...' : 'Prepare recovery'}
                </button>
              </div>
            </form>
          )}

          {!request && !canCreate && preflight?.recoverable && !CLOSED_INCIDENT_STATUSES.has(incidentStatus) && (
            <div className="ac-recovery-inline-empty">A recovery request cannot be created until the snapshot candidate is eligible and preflight is valid.</div>
          )}
          {preflight?.status === 'NO_RECOVERY_REQUIRED' && (
            <div className="ac-recovery-alert ac-recovery-alert--success" role="status">
              <Icon name="checkCircle" size={16} />
              <span>This AuditChain log already matches the trusted snapshot. No recovery request is needed.</span>
            </div>
          )}
        </>
      )}

      {dialogConfig && (
        <RecoveryConfirmationDialog
          open
          title={dialogConfig.title}
          message={dialogConfig.message}
          confirmLabel={dialogConfig.confirmLabel}
          tone={dialogConfig.tone}
          busy={mutationLoading}
          onClose={() => !mutationLoading && setDialog(null)}
          onConfirm={() => runMutation(dialogConfig.action)}
        />
      )}
    </div>
  );
}

export default RecoveryTab;
