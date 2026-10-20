import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../common/Icon';
import ActionBadge from '../../common/ActionBadge';
import { formatTimestamp } from '../../../utils/formatters';
import RecoveryStatusBadge from './RecoveryStatusBadge';
import RecoveryConfirmationDialog from './RecoveryConfirmationDialog';
import { recoveryApi } from '../../../services/recoveryApi';

const INCIDENT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses', description: 'Show every incident', tone: 'all' },
  { value: 'OPEN', label: 'Open', description: 'Detected and waiting for recovery', tone: 'danger' },
  { value: 'RESOLVED', label: 'Resolved', description: 'Trusted data has been restored', tone: 'success' },
  { value: 'RECOVERED', label: 'Recovered', description: 'Recovery result is recorded', tone: 'success' },
];

const EVENT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses', description: 'Show every recovery event', tone: 'all' },
  { value: 'APPLIED_AWAITING_CDC', label: 'Waiting for CDC', description: 'Agent write is applied and awaiting CDC plus evidence verification', tone: 'info' },
  { value: 'SUCCEEDED', label: 'Succeeded', description: 'Recovery completed successfully', tone: 'success' },
  { value: 'APPLIED_CDC_TIMEOUT', label: 'CDC timed out', description: 'Check the applied write before starting another attempt', tone: 'danger' },
  { value: 'FAILED_VERIFICATION', label: 'Verification failed', description: 'Integrity check did not pass', tone: 'danger' },
  { value: 'FAILED_EXECUTION', label: 'Execution failed', description: 'Recovery could not be completed', tone: 'danger' },
];

const NON_REEXECUTABLE_REQUEST_STATUSES = new Set([
  'PENDING_APPROVAL',
  'APPROVED',
  'EXECUTING',
  'APPLIED_AWAITING_CDC',
  'APPLIED_CDC_TIMEOUT',
  'SUCCEEDED',
]);
const ACTIVE_REQUEST_STATUSES = new Set(['PENDING_EXECUTION', 'EXECUTING', 'APPLIED_AWAITING_CDC']);
const CLOSED_INCIDENT_STATUSES = new Set(['RESOLVED', 'RECOVERED']);
const PREVIEW_BATCH_SIZE = 20;

const isClosedIncident = incident => CLOSED_INCIDENT_STATUSES.has(
  String(incident?.status || '').trim().toUpperCase()
);

const hasValue = value => value !== undefined && value !== null && value !== '';

const mergeIncidentLists = (previous, incoming) => {
  const previousById = new Map(
    previous.filter(item => item?.id).map(item => [item.id, item])
  );
  const incomingIds = new Set();

  const merged = incoming
    .filter(item => item?.id)
    .map(item => {
      incomingIds.add(item.id);
      const previousItem = previousById.get(item.id);
      if (!previousItem) return item;

      const next = { ...previousItem, ...item };
      // A just-completed recovery can race the next list request.  During
      // that window an older gateway may still return the incident as OPEN.
      // Do not let that stale response undo the closed state we already
      // recorded locally (or make the row executable again).
      if (isClosedIncident(previousItem) && !isClosedIncident(item)) {
        next.status = previousItem.status;
        if (hasValue(previousItem.resolved_at)) next.resolved_at = previousItem.resolved_at;
      }
      ['tampered_metadata', 'tampered_data', 'tampered_payload', 'auditLog'].forEach(field => {
        if (!hasValue(item[field]) && hasValue(previousItem[field])) next[field] = previousItem[field];
      });
      return next;
    });

  // Some gateway deployments return only active incidents after execution.
  // Keep a locally known closed incident visible until the backend includes it
  // again, so recovery does not erase the incident history from the UI.
  previous.forEach(item => {
    if (item?.id && !incomingIds.has(item.id) && isClosedIncident(item)) merged.push(item);
  });

  return merged;
};

const getAvailableStatusOptions = (items, field, options, selectedValue) => {
  const availableStatuses = new Set(
    items
      .map(item => String(item?.[field] || '').trim().toUpperCase())
      .filter(Boolean)
  );

  return options.filter(option => option.value === 'ALL'
    || availableStatuses.has(option.value)
    || option.value === selectedValue);
};

function RecoveryStatusFilter({ activeSection, options, value, onChange }) {
  const selected = options.find(option => option.value === value) || options[0];
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [activeSection]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        rootRef.current?.querySelector('[aria-haspopup="listbox"]')?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`ac-recovery-filter ac-recovery-status-filter${open ? ' is-open' : ''}`} ref={rootRef}>
      <Icon name="filter" size={14} />
      <span className="ac-recovery-filter__label">Status</span>
      <div className="ac-recovery-status-filter__control">
        <button
          type="button"
          className="ac-recovery-status-filter__trigger"
          aria-label="Filter recovery data"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(current => !current)}
        >
          <span className={`ac-recovery-status-dot ac-recovery-status-dot--${selected.tone}`} aria-hidden="true" />
          <span className="ac-recovery-status-filter__value">{selected.label}</span>
          <Icon name="chevronDown" size={14} />
        </button>
        {open && (
          <div className="ac-recovery-status-filter__menu" role="listbox" aria-label="Recovery status options">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === selected.value}
                className={`ac-recovery-status-filter__option${option.value === selected.value ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className={`ac-recovery-status-dot ac-recovery-status-dot--${option.tone}`} aria-hidden="true" />
                <span className="ac-recovery-status-filter__option-text">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                {option.value === selected.value && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

const isRecord = value => Boolean(
  value
  && typeof value === 'object'
  && !Array.isArray(value)
);

const formatDisplayValue = value => {
  const parsed = parseJsonValue(value);
  if (parsed === null || parsed === undefined || parsed === '') return '—';
  if (typeof parsed === 'boolean') return parsed ? 'True' : 'False';
  if (Array.isArray(parsed)) return parsed.map(item => formatDisplayValue(item)).join(', ');
  if (isRecord(parsed)) {
    return Object.entries(parsed)
      .map(([key, item]) => `${key}: ${formatDisplayValue(item)}`)
      .join(' · ');
  }
  return String(parsed);
};

const valuesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const getComparisonRows = (tampered, trusted) => {
  const tamperedValue = parseJsonValue(tampered);
  const trustedValue = parseJsonValue(trusted);

  if (!isRecord(tamperedValue) && !isRecord(trustedValue)) {
    if (tamperedValue === null && trustedValue === null) return [];
    return [{
      field: 'value',
      tampered: tamperedValue,
      trusted: trustedValue,
      changed: !valuesEqual(tamperedValue, trustedValue),
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
    changed: !valuesEqual(
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

const formatRecoveryDateTime = value => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}, ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

function StructuredValueList({ value, emptyLabel = 'No data available.' }) {
  const entries = getStructuredEntries(value);

  if (entries.length === 0) return <div className="ac-recovery-structured-empty">{emptyLabel}</div>;

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

function ComparisonTable({ tampered, trusted, trustedLabel = 'Original trusted data' }) {
  const rows = getComparisonRows(tampered, trusted);
  if (rows.length === 0) return null;

  return (
    <div className="ac-recovery-comparison">
      <div className="ac-recovery-comparison__table-wrap">
        <table className="ac-diff ac-recovery-diff-table">
          <thead>
            <tr><th>Field</th><th className="before">Tampered data</th><th className="after">{trustedLabel}</th></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.field} className={!row.changed ? 'ac-recovery-diff-row--unchanged' : ''}>
                <td className="field"><span>{row.field}</span>{!row.changed && <small>unchanged</small>}</td>
                <td className={row.changed ? 'val-before' : 'val-unchanged'}>{formatDisplayValue(row.tampered)}</td>
                <td className={row.changed ? 'val-after' : 'val-unchanged'}>{formatDisplayValue(row.trusted)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecoveryContextFacts({ context, showRecoveryAt = false }) {
  return (
    <div className="ac-recovery-preview-context">
      <div className="ac-recovery-preview-context__fact">
        <span><Icon name="refresh" size={13} /> Action</span>
        {context.action && context.action !== '—' ? <ActionBadge action={context.action} /> : <strong>—</strong>}
      </div>
      <div className="ac-recovery-preview-context__fact">
        <span><Icon name="user" size={13} /> Actor affected</span>
        <strong>{context.actor}</strong>
      </div>
      <div className="ac-recovery-preview-context__fact">
        <span><Icon name="database" size={13} /> Source system</span>
        <strong>{context.sourceSystem}</strong>
      </div>
      <div className="ac-recovery-preview-context__fact">
        <span><Icon name="clock" size={13} /> Tampered at</span>
        <strong>{formatRecoveryDateTime(context.tamperedAt)}</strong>
      </div>
      {showRecoveryAt && <div className="ac-recovery-preview-context__fact ac-recovery-preview-context__fact--recovered">
        <span><Icon name="checkCircle" size={13} /> Recovered at</span>
        <strong>{formatRecoveryDateTime(context.recoveryAt)}</strong>
      </div>}
    </div>
  );
}

function RecoveryDataReview({ tampered, trusted, tamperedHash, trustedHash, trustedLabel, emptyTrustedLabel, emptyTamperedLabel = 'Tampered payload is protected or unavailable.', tamperedHashLabel = 'Tampered hash', trustedHashLabel }) {
  const hasTrusted = trusted !== undefined && trusted !== null && trusted !== '';
  const hasTampered = tampered !== undefined && tampered !== null && tampered !== '';

  return (
    <div className="ac-recovery-data-review">
      <div className="ac-recovery-data-review__hashes">
        <div className="ac-recovery-data-review__hash ac-recovery-data-review__hash--danger">
          <span>{tamperedHashLabel}</span>
          <code>{tamperedHash || '—'}</code>
        </div>
        <div className="ac-recovery-data-review__hash ac-recovery-data-review__hash--success">
          <span>{trustedHashLabel || `${trustedLabel} hash`}</span>
          <code>{trustedHash || '—'}</code>
        </div>
      </div>
      {hasTrusted && hasTampered ? (
        <ComparisonTable tampered={tampered} trusted={trusted} trustedLabel={trustedLabel} />
      ) : (
        <div className="ac-recovery-data-columns">
          <div className="ac-recovery-data-block ac-recovery-data-block--danger">
            <span className="ac-recovery-data-label ac-recovery-data-label--danger">Tampered data</span>
            <StructuredValueList value={tampered} emptyLabel={emptyTamperedLabel} />
          </div>
          <div className="ac-recovery-data-block ac-recovery-data-block--success">
            <span className="ac-recovery-data-label ac-recovery-data-label--success">{trustedLabel}</span>
            {hasTrusted ? <StructuredValueList value={trusted} /> : <div className="ac-recovery-blocked-note"><Icon name="alertTriangle" size={16} /><span>{emptyTrustedLabel}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}

const getPreviewStatus = item => {
  const eventStatus = String(item.recoveryEvent?.result_status || '').toUpperCase();
  if (eventStatus) return eventStatus;
  const requestStatus = String(item.request?.status || '').toUpperCase();
  if (requestStatus) return requestStatus;
  if (item.ready) return 'PREVIEW_READY';
  if (item.incidentClosed) return String(item.incident?.status || 'RESOLVED').toUpperCase();
  if (item.preflight?.status) return item.preflight.status;
  return item.candidate?.eligible ? 'FAILED_VERIFICATION' : 'BLOCKED';
};

function RecoveryPreviewItem({ item }) {
  const incident = item.incident || {};
  const recoveryEvent = item.recoveryEvent;
  const recoverySucceeded = String(recoveryEvent?.result_status || '').toUpperCase() === 'SUCCEEDED';
  const awaitingCDC = String(recoveryEvent?.result_status || item.request?.status || '').toUpperCase() === 'APPLIED_AWAITING_CDC';
  const directRecovery = String(incident.incident_scope || '').toUpperCase() === 'CLIENT_SOURCE';
  const trustedData = recoverySucceeded ? recoveryEvent?.recovered_metadata : item.preflight?.snapshot_preview?.metadata;
  const context = getRecoveryContext(item);
  const tamperedData = getTamperedData(incident, item.auditLog);
  const changedFields = directRecovery ? [] : getChangedFields(tamperedData, trustedData);
  const previewStatus = getPreviewStatus(item);
  const emptyTrustedLabel = recoverySucceeded
    ? 'The recovery event did not include recovered metadata.'
    : item.incidentClosed
      ? 'This incident is already closed. Open Recovery history to inspect the recorded outcome.'
      : item.error || item.candidate?.reason || 'Trusted snapshot is not available.';

  return (
    <article className={`ac-recovery-preview-item${recoverySucceeded ? ' ac-recovery-preview-item--recovered' : item.ready ? ' ac-recovery-preview-item--ready' : ' ac-recovery-preview-item--blocked'}`}>
      <div className="ac-recovery-preview-item__header">
        <div><code>{incident.log_id || '—'}</code><span>{incident.resource || 'Unknown resource'} · {incident.incident_type || 'Integrity mismatch'}</span></div>
        <RecoveryStatusBadge status={previewStatus} compact />
      </div>
      <RecoveryContextFacts context={context} showRecoveryAt={recoverySucceeded} />
      <div className={`ac-recovery-preview-state${recoverySucceeded ? ' ac-recovery-preview-state--success' : item.ready ? ' ac-recovery-preview-state--ready' : ' ac-recovery-preview-state--blocked'}`}>
        <Icon name={recoverySucceeded ? 'checkCircle' : item.ready ? 'shield' : 'alertTriangle'} size={15} />
        <span>{recoverySucceeded ? 'Recovery has completed and its recorded result is shown below.' : awaitingCDC ? 'The Agent write was applied. The gateway is waiting for CDC and evidence verification.' : item.ready ? 'The client event reference passed preflight. This client row is ready to recover.' : item.incidentClosed ? 'This incident is already closed, so a new recovery cannot be executed.' : (item.error || item.candidate?.reason || 'Recovery is not currently available.')}</span>
      </div>
      <RecoveryDataReview
        tampered={tamperedData}
        trusted={trustedData}
        tamperedHash={directRecovery ? item.preflight?.client_state_hash || incident.detected_state_hash || incident.detected_hash : item.preflight?.current_hash || incident.detected_hash}
        trustedHash={directRecovery ? item.preflight?.desired_state_hash || recoveryEvent?.client_after_hash : item.preflight?.snapshot_hash || recoveryEvent?.after_hash || incident.expected_hash}
        tamperedHashLabel={directRecovery ? 'Live client state hash' : 'Tampered hash'}
        trustedHashLabel={directRecovery ? 'Trusted desired state hash' : undefined}
        trustedLabel={recoverySucceeded ? 'Recovery result' : directRecovery ? 'Trusted reference data (redacted)' : 'Original trusted data'}
        emptyTamperedLabel={directRecovery ? 'Gateway does not return the live client row values. State hash and changed field names are shown above.' : undefined}
        emptyTrustedLabel={emptyTrustedLabel}
      />
      {changedFields.length > 0 && <div className="ac-recovery-changed-fields"><strong>Fields with changes</strong><div>{changedFields.map(field => <span key={field}><Icon name="alertTriangle" size={12} /><em>{field}</em></span>)}</div></div>}
      {item.error && !item.incidentClosed && <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={15} /><span>{item.error}</span></div>}
    </article>
  );
}

function RecoveryResultCard({ item }) {
  const incident = item.incident || {};
  const recoveryEvent = item.event || {};
  const resultStatus = String(item.status || '').toUpperCase();
  const awaitingCDC = resultStatus === 'APPLIED_AWAITING_CDC';
  const cdcTimedOut = resultStatus === 'APPLIED_CDC_TIMEOUT';
  const requestInProgress = ACTIVE_REQUEST_STATUSES.has(resultStatus);
  const directRecovery = String(incident.incident_scope || '').toUpperCase() === 'CLIENT_SOURCE';
  const tamperedData = getTamperedData(incident, item.auditLog);
  const trustedData = recoveryEvent.recovered_metadata;
  const context = getRecoveryContext({
    incident,
    auditLog: item.auditLog,
    preflight: item.preflight,
    recoveryEvent,
  });
  const changedFields = directRecovery ? [] : getChangedFields(tamperedData, trustedData);

  return (
    <article className="ac-recovery-result-card">
      <div className="ac-recovery-result-card__header"><div><code>{incident.log_id || '—'}</code><span>{incident.resource || 'Unknown resource'}</span></div><div className="ac-recovery-event-status-row"><RecoveryStatusBadge status={item.status} compact /><RecoveryStatusBadge status={eventIntegrityStatus(recoveryEvent)} compact /></div></div>
      <RecoveryContextFacts context={context} showRecoveryAt={item.status === 'SUCCEEDED'} />
      <RecoveryDataReview
        tampered={tamperedData}
        trusted={trustedData}
        tamperedHash={directRecovery ? item.preflight?.client_state_hash || item.request?.client_before_hash || item.request?.before_hash || incident.detected_state_hash || incident.detected_hash : item.request?.before_hash || incident.detected_hash}
        trustedHash={directRecovery ? item.preflight?.desired_state_hash || item.request?.client_after_hash || item.request?.after_hash || recoveryEvent.client_after_hash || recoveryEvent.after_hash : item.request?.after_hash || recoveryEvent.after_hash}
        tamperedHashLabel={directRecovery ? 'Live client state hash' : 'Before recovery hash'}
        trustedHashLabel={directRecovery ? 'Recovered client state hash' : 'After recovery hash'}
        trustedLabel={directRecovery ? 'Recovered reference data' : 'Recovery result'}
        emptyTamperedLabel={directRecovery ? 'The recovery API does not expose live client values.' : undefined}
        emptyTrustedLabel={item.error || 'Recovery result metadata is not available.'}
      />
      {changedFields.length > 0 && <div className="ac-recovery-changed-fields"><strong>Fields with changes</strong><div>{changedFields.map(field => <span key={field}><Icon name="alertTriangle" size={12} /><em>{field}</em></span>)}</div></div>}
      {item.status !== 'SUCCEEDED' && <p className="ac-recovery-result-card__message"><Icon name={awaitingCDC || requestInProgress ? 'clock' : 'alertTriangle'} size={14} /> {item.error || (awaitingCDC ? 'The client record was written. Waiting for CDC and recovery evidence verification.' : cdcTimedOut ? 'CDC confirmation timed out. Review client state before attempting another recovery.' : requestInProgress ? 'The gateway is processing this recovery request.' : String(item.status || '').startsWith('FAILED') ? 'Recovery did not complete for this item.' : `Recovery is ${String(item.status || 'pending').toLowerCase().replaceAll('_', ' ')}.`)}</p>}
    </article>
  );
}

const getTamperedData = (incident, auditLog) => {
  const preservedTamperedData = incident?.tampered_metadata
    ?? incident?.tampered_data
    ?? incident?.tampered_payload;

  if (incident?.incident_scope) {
    // Scoped direct incidents expose hashes and changed field names. Event or
    // audit metadata must not be presented as a live source before image.
    return null;
  }

  if (isClosedIncident(incident)) {
    // Once recovery succeeds, the live audit row contains the trusted value.
    // Never reuse it as the "before" side of a resolved comparison.
    return preservedTamperedData !== undefined && preservedTamperedData !== null && preservedTamperedData !== ''
      ? preservedTamperedData
      : null;
  }

  return auditLog?.metadata
    ?? incident?.auditLog?.metadata
    ?? preservedTamperedData
    ?? incident?.current_metadata
    ?? incident?.metadata
    ?? null;
};

const getRecoveryContext = ({ incident, auditLog, preflight, recoveryEvent }) => {
  const trustedPreview = preflight?.snapshot_preview || {};
  return {
    action: firstValue(
      auditLog?.action,
      incident?.target_action,
      recoveryEvent?.target_action,
      trustedPreview.action
    ) || '—',
    actor: firstValue(
      auditLog?.actor,
      incident?.target_actor,
      recoveryEvent?.target_actor,
      trustedPreview.actor
    ) || 'Unknown actor',
    sourceSystem: firstValue(
      auditLog?.source_system,
      incident?.source_system,
      recoveryEvent?.source_system,
      recoveryEvent?.target_source_system,
      trustedPreview.source_system
    ) || 'Unknown source',
    tamperedAt: firstValue(incident?.detected_at, auditLog?.timestamp),
    recoveryAt: firstValue(recoveryEvent?.executed_at),
  };
};

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

const listAllEvents = async () => {
  const firstPage = normalizeEventPage(await recoveryApi.listEvents({ page: 1, pageSize: 100, includeLegacy: false }));
  const totalPages = Math.max(1, Number(firstPage.totalPages) || 1);
  if (totalPages === 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => recoveryApi.listEvents({
      page: index + 2,
      pageSize: 100,
      includeLegacy: false,
    }))
  );
  const pages = [firstPage, ...remainingPages.map(normalizeEventPage)];
  return {
    ...firstPage,
    data: pages.flatMap(page => page.data),
  };
};

const eventIntegrityStatus = event => event?.integrity_status || 'NOT_CHECKED';

const eventNeedsAutomaticVerification = event => {
  const integrity = String(eventIntegrityStatus(event)).toUpperCase();
  const snapshot = String(event?.snapshot_status || '').toUpperCase();
  const directEvent = Boolean(event?.operation);
  if (directEvent) {
    return ['NOT_CHECKED', 'PENDING'].includes(integrity)
      && ['CONFIRMED', 'TIMEOUT', 'CONFLICT'].includes(String(event?.cdc_status || '').toUpperCase());
  }
  return ['NOT_CHECKED', 'PENDING'].includes(integrity)
    && !['FAILED', 'LEGACY_MISSING'].includes(snapshot);
};

function RecoveryEventDetail({ eventDetail, loading, onClose }) {
  const resultStatus = String(eventDetail?.result_status || '').toUpperCase();
  const succeeded = resultStatus === 'SUCCEEDED';
  const awaitingCDC = resultStatus === 'APPLIED_AWAITING_CDC';
  const cdcTimedOut = resultStatus === 'APPLIED_CDC_TIMEOUT';
  const integrityStatus = eventIntegrityStatus(eventDetail);
  const directRecovery = Boolean(eventDetail?.operation);
  const resource = eventDetail?.resource || eventDetail?.target_log_id || 'Recovery target';
  const resultTitle = succeeded ? 'Client record recovery completed' : awaitingCDC ? 'Waiting for CDC confirmation' : cdcTimedOut ? 'CDC confirmation timed out' : 'Recovery needs attention';
  const resultDescription = succeeded
    ? 'The Agent write, CDC event, and recovery evidence verification completed.'
    : awaitingCDC
      ? 'The Agent applied the client write. The gateway is waiting for CDC and recovery event verification.'
      : eventDetail?.failure_reason || 'The recovery event needs review before another attempt.';

  return (
    <div className="ac-recovery-preview-overlay" role="presentation" onClick={() => !loading && onClose()}>
      <section className="ac-recovery-preview-dialog ac-recovery-event-dialog ac-recovery-event-dialog--improved" role="dialog" aria-modal="true" aria-labelledby="recovery-event-title" onClick={event => event.stopPropagation()}>
        <header className="ac-recovery-preview-dialog__header ac-recovery-event-dialog__header">
          <div>
            <span className={`ac-recovery-eyebrow${succeeded ? ' ac-recovery-eyebrow--success' : ' ac-recovery-eyebrow--danger'}`}>
              <Icon name={succeeded ? 'checkCircle' : 'alertTriangle'} size={14} /> {succeeded ? 'RECOVERY COMPLETE' : 'RECOVERY EVENT'}
            </span>
            <h2 id="recovery-event-title">{resultTitle}</h2>
            <p><strong>{resource}</strong> · {eventDetail?.executed_at ? formatRecoveryDateTime(eventDetail.executed_at) : 'Execution time unavailable'}</p>
          </div>
          <div className="ac-recovery-event-dialog__header-status">
            <RecoveryStatusBadge status={eventDetail?.result_status} />
            <RecoveryStatusBadge status={integrityStatus} />
          </div>
          <button type="button" className="ac-modal__close" onClick={onClose} disabled={loading} aria-label="Close recovery event"><Icon name="x" size={18} /></button>
        </header>

        <div className="ac-recovery-preview-dialog__body ac-recovery-event-dialog__body">
          {loading ? (
            <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading recovery result...</div>
          ) : (
            <>
              <section className={`ac-recovery-event-result ac-recovery-event-result--${succeeded ? 'success' : 'danger'}`}>
                <span className="ac-recovery-event-result__icon"><Icon name={succeeded ? 'checkCircle' : 'alertTriangle'} size={25} /></span>
                <div className="ac-recovery-event-result__copy">
                  <span>RECOVERY RESULT</span>
                  <h3>{resultTitle}</h3>
                  <p>{resultDescription}</p>
                </div>
                <div className="ac-recovery-event-result__time">
                  <span>Executed at</span>
                  <strong>{eventDetail?.executed_at ? formatRecoveryDateTime(eventDetail.executed_at) : '—'}</strong>
                </div>
              </section>

              <section className="ac-recovery-event-summary-card">
                <div className="ac-recovery-event-section-heading">
                  <div>
                    <span className="ac-recovery-eyebrow"><Icon name="database" size={13} /> Recovery target</span>
                    <h3>{resource}</h3>
                  </div>
                  <span className="ac-recovery-event-id">Event ID <code>{eventDetail?.id || '—'}</code></span>
                </div>
                <div className="ac-recovery-event-summary-grid">
                  <span><strong>Action</strong>{eventDetail?.target_action ? <ActionBadge action={eventDetail.target_action} /> : '—'}</span>
                  <span><strong>Actor affected</strong>{eventDetail?.target_actor || 'Unknown actor'}</span>
                  <span><strong>Source system</strong>{eventDetail?.source_system || eventDetail?.target_source_system || 'Unknown source'}</span>
                  <span><strong>Executed by</strong>{eventDetail?.executed_by || '—'}</span>
                  <span><strong>Target log</strong><code>{eventDetail?.target_log_id || eventDetail?.selected_log_id || '—'}</code></span>
                  <span><strong>Original event time</strong>{eventDetail?.target_timestamp ? formatRecoveryDateTime(eventDetail.target_timestamp) : '—'}</span>
                </div>
              </section>

              <section className={`ac-recovery-event-recovered-card ac-recovery-event-recovered-card--${succeeded ? 'success' : 'danger'}`}>
                <div className="ac-recovery-event-section-heading">
                  <div>
                    <span className="ac-recovery-eyebrow"><Icon name={succeeded ? 'checkCircle' : 'database'} size={13} /> Recovered data</span>
                    <h3>{succeeded ? 'Trusted snapshot applied' : 'Recovery result data'}</h3>
                  </div>
                  <span className="ac-recovery-event-current-badge">{succeeded ? 'Current trusted value' : 'Recorded event'}</span>
                </div>
                {eventDetail?.recovered_metadata ? (
                  <StructuredValueList value={eventDetail.recovered_metadata} emptyLabel="No recovered data recorded." />
                ) : (
                  <div className="ac-recovery-event-empty-result"><Icon name="alertTriangle" size={16} /><span>{resultDescription}</span></div>
                )}
              </section>

              <details className="ac-recovery-event-technical" open={!succeeded}>
                <summary><span><Icon name="shield" size={14} /> Technical evidence</span><small>{directRecovery ? 'Client state, CDC, Merkle, and event details' : 'Hash, snapshot, Merkle, and pipeline details'}</small><Icon name="chevronDown" size={15} /></summary>
                <div className="ac-recovery-event-technical__body">
                  <div className="ac-recovery-event-hash-grid">
                    <div className="ac-recovery-event-hash ac-recovery-event-hash--danger"><span>{directRecovery ? 'Client before state hash' : 'Before recovery hash'}</span><code>{eventDetail?.client_before_hash || eventDetail?.before_hash || '—'}</code></div>
                    <div className="ac-recovery-event-hash ac-recovery-event-hash--success"><span>{directRecovery ? 'Client after state hash' : 'Recovered data hash'}</span><code>{eventDetail?.client_after_hash || eventDetail?.after_hash || '—'}</code></div>
                  </div>
                  <div className="ac-recovery-event-facts">
                    {directRecovery
                      ? <span><strong>Direct client event / CDC</strong>{eventDetail?.operation || '—'} · {eventDetail?.cdc_status || 'PENDING'}</span>
                      : <span><strong>Snapshot</strong>{eventDetail?.snapshot_status || '—'} · {eventDetail?.snapshot_version_id || eventDetail?.source_snapshot_version_id || '—'}</span>}
                    <span><strong>Pipeline</strong>{eventDetail?.pipeline_status || '—'} · {eventDetail?.merkle_root || '—'}</span>
                    <span><strong>Event hash</strong>{eventDetail?.event_hash || '—'}</span>
                    <span><strong>Failure / integrity note</strong>{eventDetail?.failure_reason || eventDetail?.integrity_error || 'No issue recorded'}</span>
                  </div>
                </div>
              </details>
            </>
          )}
        </div>

        <footer className="ac-recovery-preview-dialog__footer">
          <span><Icon name="shield" size={13} /> Integrity verification runs automatically after the recovery evidence is anchored.</span>
          <div><button type="button" className="ac-btn-primary" onClick={onClose}>Close</button></div>
        </footer>
      </section>
    </div>
  );
}

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
  const [previewTotal, setPreviewTotal] = useState(0);
  const [resultItems, setResultItems] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [eventDetail, setEventDetail] = useState(null);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [resourceScanSummary, setResourceScanSummary] = useState('');
  const [scanningResource, setScanningResource] = useState(false);
  const executionInFlight = useRef(false);
  const refreshInFlight = useRef(false);
  const incidentRefreshInFlight = useRef(false);
  const resultPollInFlight = useRef(false);
  const previewRun = useRef(0);
  const resultItemsRef = useRef(resultItems);

  useEffect(() => {
    resultItemsRef.current = resultItems;
  }, [resultItems]);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (!silent) setLoading(true);
    setError('');

    try {
      const [incidentResult, eventResult, requestResult] = await Promise.allSettled([
        recoveryApi.listIncidents(),
        listAllEvents(),
        recoveryApi.listRequests(),
      ]);

      const failures = [];
      if (incidentResult.status === 'fulfilled') {
        setIncidents(current => mergeIncidentLists(current, normalizeList(incidentResult.value)));
      }
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
    } finally {
      refreshInFlight.current = false;
      if (!silent) setLoading(false);
    }
  }, [selectedClient]);

  const refreshIncidents = useCallback(async () => {
    if (incidentRefreshInFlight.current) return;
    incidentRefreshInFlight.current = true;
    try {
      const result = await recoveryApi.listIncidents();
      const rows = normalizeList(result);
      setIncidents(current => mergeIncidentLists(current, rows));
      return rows;
    } catch {
      // Keep the last known list on transient polling errors. The manual
      // Refresh button still reports failures through the page-level alert.
      return null;
    } finally {
      incidentRefreshInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    previewRun.current += 1;
    setSelectedIds(new Set());
    setPreviewItems([]);
    setPreviewTotal(0);
    setResultItems([]);
    setPreviewOpen(false);
    setEventDetail(null);
    loadData();
  }, [loadData]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshIncidents();
    };
    const timer = window.setInterval(refreshWhenVisible, 30000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshIncidents]);

  const awaitingAutomaticVerification = useMemo(
    () => events.some(eventNeedsAutomaticVerification),
    [events]
  );
  const awaitingRecoveryCompletion = useMemo(
    () => requests.some(request => ACTIVE_REQUEST_STATUSES.has(String(request?.status || '').toUpperCase())),
    [requests]
  );

  useEffect(() => {
    if (!awaitingAutomaticVerification && !awaitingRecoveryCompletion) return undefined;
    const timer = window.setInterval(() => loadData({ silent: true }), 4000);
    return () => window.clearInterval(timer);
  }, [awaitingAutomaticVerification, awaitingRecoveryCompletion, loadData]);

  const pendingResultSignature = resultItems
    .filter(item => item?.request?.id && ACTIVE_REQUEST_STATUSES.has(String(item.request.status || '').toUpperCase()))
    .map(item => `${item.request.id}:${item.request.status}`)
    .join('|');

  useEffect(() => {
    if (!pendingResultSignature) return undefined;
    let active = true;
    const poll = async () => {
      if (resultPollInFlight.current) return;
      resultPollInFlight.current = true;
      try {
        const pending = resultItemsRef.current.filter(item => item?.request?.id && ACTIVE_REQUEST_STATUSES.has(String(item.request.status || '').toUpperCase()));
        const updates = await Promise.all(pending.map(async item => {
          try {
            const request = await recoveryApi.getRequest({ requestId: item.request.id });
            let event = item.event;
            const eventId = request.recovery_event_id || event?.id;
            if (eventId) {
              try { event = await recoveryApi.getEvent({ eventId }); } catch { /* Event projection may lag the request update. */ }
            }
            return { request, event };
          } catch {
            return { request: item.request, event: item.event };
          }
        }));
        if (!active) return;
        setResultItems(current => current.map(item => {
          const update = updates.find(value => value.request?.id === item.request?.id);
          if (!update) return item;
          return { ...item, request: update.request, event: update.event, status: update.request?.status || item.status };
        }));
        await loadData({ silent: true });
      } finally {
        resultPollInFlight.current = false;
      }
    };
    const timer = window.setInterval(() => void poll(), 4000);
    void poll();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pendingResultSignature, loadData]);

  const requestByIncident = useMemo(() => {
    const map = new Map();
    requests.forEach(request => {
      if (!request?.incident_id) return;
      const current = map.get(request.incident_id);
      if (!current || new Date(request.requested_at || 0).getTime() > new Date(current.requested_at || 0).getTime()) {
        map.set(request.incident_id, request);
      }
    });
    return map;
  }, [requests]);

  const normalizedSearch = search.trim().toLowerCase();
  const resourceScanTarget = useMemo(() => {
    const value = search.trim();
    if (!/^[a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)?$/.test(value)) return '';
    const [table, recordId] = value.split(':');
    return recordId ? `${table.toUpperCase()}:${recordId}` : table.toUpperCase();
  }, [search]);
  const incidentStatusOptions = useMemo(() => getAvailableStatusOptions(incidents, 'status', INCIDENT_STATUS_OPTIONS, incidentFilter), [incidents, incidentFilter]);
  const eventStatusOptions = useMemo(() => getAvailableStatusOptions(events, 'result_status', EVENT_STATUS_OPTIONS, eventFilter), [events, eventFilter]);
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

  // Selection is for review. Recovery eligibility is checked separately by
  // loadPreviewItem and must not prevent selecting closed/read-only incidents.
  const isSelectable = useCallback(incident => Boolean(incident?.id), []);

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

  const bulkSelectionLabel = incidentFilter === 'ALL'
    ? 'Select all incidents'
    : 'Select matching incidents';
  const bulkClearLabel = incidentFilter === 'ALL'
    ? 'Clear all selected incidents'
    : 'Clear matching incident selection';

  const stats = useMemo(() => ({
    openIncidents: incidents.filter(item => String(item?.status || '').toUpperCase() === 'OPEN').length,
    readyIncidents: incidents.filter(item => String(item?.incident_scope || '').toUpperCase() === 'CLIENT_SOURCE' && String(item?.status || '').toUpperCase() === 'OPEN').length,
    gatewayIntegrityIncidents: incidents.filter(item => String(item?.incident_scope || '').toUpperCase() === 'GATEWAY_INTEGRITY' && String(item?.status || '').toUpperCase() === 'OPEN').length,
    recoveredEvents: events.filter(item => String(item.result_status || '').toUpperCase() === 'SUCCEEDED').length,
    selected: selectedIncidents.length,
    verifiedEvents: events.filter(item => String(eventIntegrityStatus(item)).toUpperCase() === 'VALID').length,
  }), [events, incidents, selectedIncidents]);

  const runResourceScan = async () => {
    if (!resourceScanTarget || !selectedClient || scanningResource) return;
    setScanningResource(true);
    setResourceScanSummary('');
    setError('');
    try {
      const result = await recoveryApi.verifyResource({ resource: resourceScanTarget, clientId: selectedClient });
      const incidentsAfterScan = await refreshIncidents();
      const checked = Number(result?.total_logs ?? result?.logs?.length ?? 0);
      const chainStatus = String(result?.chain_status || '').toLowerCase();
      const tamperedLogs = (Array.isArray(result?.logs) ? result.logs : []).filter(item => (
        ['TAMPERED', 'INVALID'].includes(String(item?.integrity_status || item?.chain_status || '').toUpperCase())
      ));
      const detected = chainStatus === 'tampered' || tamperedLogs.length > 0;
      const detectedLogIds = new Set(tamperedLogs.map(item => String(item?.log_id || '')).filter(Boolean));
      const persisted = Array.isArray(incidentsAfterScan) && incidentsAfterScan.some(item => (
        detectedLogIds.has(String(item?.log_id || ''))
        || detectedLogIds.has(String(item?.reference_log_id || ''))
      ));
      const outcome = !detected
        ? 'No integrity mismatch was reported.'
        : persisted
          ? 'Integrity issues were found and matching incidents are listed.'
          : 'Integrity issues were found, but no matching incident was returned. Check gateway incident persistence and tenant scope.';
      setResourceScanSummary(`Checked ${checked} audit record${checked === 1 ? '' : 's'} for ${resourceScanTarget}. ${outcome}`);
    } catch (scanError) {
      setError(getErrorMessage(scanError));
    } finally {
      setScanningResource(false);
    }
  };

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
    const incidentStatus = String(incident?.status || '').toUpperCase();
    const incidentOpen = incidentStatus === 'OPEN';
    const clientSourceIncident = String(incident?.incident_scope || '').toUpperCase() === 'CLIENT_SOURCE';
    const incidentClosed = CLOSED_INCIDENT_STATUSES.has(incidentStatus);
    const relatedRequest = requestByIncident.get(incident?.id);
    const existingEvent = incidentClosed || relatedRequest?.recovery_event_id
      ? events.find(item => item?.incident_id === incident?.id)
        || (relatedRequest?.recovery_event_id ? { id: relatedRequest.recovery_event_id, incident_id: incident.id } : null)
      : null;
    const [detailResult, auditLogsResult] = await Promise.allSettled([
      incidentOpen && clientSourceIncident
        ? recoveryApi.getIncident({ incidentId: incident.id })
        : Promise.resolve(incident),
      incident?.incident_scope
        ? Promise.resolve([])
        : recoveryApi.listAuditLogsByResource({ resource: incident.resource }),
    ]);

    let recoveryEvent = existingEvent;
    if (existingEvent?.id && !existingEvent.result_status) {
      try {
        recoveryEvent = await recoveryApi.getEvent({ eventId: existingEvent.id }) || existingEvent;
      } catch {
        recoveryEvent = existingEvent;
      }
    }

    const detail = detailResult.status === 'fulfilled' ? detailResult.value : incident;
    let candidate = null;
    let preflight = null;
    let candidateError = null;
    let preflightError = null;
    if (incidentOpen && clientSourceIncident) {
      try {
        const candidates = normalizeList(await recoveryApi.listCandidates({ incidentId: incident.id }));
        const targetLogId = detail.reference_log_id || incident.reference_log_id || incident.log_id;
        candidate = candidates.find(item => item.log_id === targetLogId) || candidates[0] || null;
        if (candidate?.eligible && !['APPLIED_CDC_TIMEOUT', 'FAILED_EXECUTION', 'FAILED_VERIFICATION'].includes(String(relatedRequest?.status || '').toUpperCase())) {
          preflight = await recoveryApi.runPreflight({ incidentId: incident.id });
        }
      } catch (previewError) {
        if (!candidate) candidateError = previewError;
        else preflightError = previewError;
      }
    }
    const auditLogs = auditLogsResult.status === 'fulfilled' ? normalizeList(auditLogsResult.value) : [];
    const targetLogId = detail.reference_log_id || incident.reference_log_id || incident.log_id;
    const auditLog = auditLogs.find(item => item?.log_id === targetLogId) || null;
    const previewIncident = auditLog ? { ...detail, auditLog } : detail;
    const requestStatus = String(relatedRequest?.status || '').toUpperCase();
    const failures = [detailResult.status === 'rejected' ? detailResult.reason : null, candidateError, preflightError].filter(Boolean);
    const ready = Boolean(
      incidentOpen
      && clientSourceIncident
      && !NON_REEXECUTABLE_REQUEST_STATUSES.has(requestStatus)
      && candidate?.eligible
      && preflight?.recoverable
      && String(preflight?.status || '').toUpperCase() === 'VALID'
    );

    let blockedReason = '';
    if (!clientSourceIncident) blockedReason = 'This is a Gateway integrity incident. It is read only in agent direct recovery.';
    else if (requestStatus === 'APPLIED_CDC_TIMEOUT') blockedReason = 'The previous Agent write may have applied. Review its event and client state before another attempt.';
    else if (ACTIVE_REQUEST_STATUSES.has(requestStatus) && requestStatus !== 'PENDING_EXECUTION') blockedReason = 'Recovery is already waiting for CDC or event verification.';
    else if (!incidentOpen) blockedReason = 'This incident is closed; review its recorded recovery result.';

    return {
      incident: previewIncident,
      auditLog,
      auditLogError: auditLogsResult.status === 'rejected' ? getErrorMessage(auditLogsResult.reason) : '',
      candidate,
      preflight,
      recoveryEvent,
      request: relatedRequest,
      incidentClosed,
      ready,
      error: blockedReason || (failures.length ? getErrorMessage(failures[0]) : candidate?.reason || ''),
    };
  };

  const openPreview = async (records = selectedIncidents) => {
    if (!records.length) return;
    const runId = previewRun.current + 1;
    previewRun.current = runId;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewItems([]);
    setPreviewTotal(records.length);
    const loadedItems = [];
    try {
      for (let start = 0; start < records.length; start += PREVIEW_BATCH_SIZE) {
        const batch = await Promise.all(records.slice(start, start + PREVIEW_BATCH_SIZE).map(loadPreviewItem));
        if (previewRun.current !== runId) return;
        loadedItems.push(...batch);
        setPreviewItems([...loadedItems]);
      }
    } catch (previewLoadError) {
      if (previewRun.current === runId) setPreviewError(getErrorMessage(previewLoadError));
    } finally {
      if (previewRun.current === runId) setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (executing) return;
    previewRun.current += 1;
    setPreviewOpen(false);
    setConfirmationOpen(false);
  };

  const executeOne = async (item) => {
    const incident = item.incident;
    const request = String(item.request?.status || '').toUpperCase() === 'PENDING_EXECUTION'
      ? item.request
      : await recoveryApi.createRequest({
        incidentId: incident.id,
        selectedLogId: item.candidate?.log_id || incident.reference_log_id || incident.log_id,
        // Backend keeps this field for the immutable request record; the user
        // is not asked to supply an explanation in the direct recovery flow.
        reason: INTERNAL_RECOVERY_REASON,
        idempotencyKey: createIdempotencyKey(),
      });
    const executed = String(request.status || '').toUpperCase() === 'PENDING_EXECUTION'
      ? await recoveryApi.executeRequest({ requestId: request.id })
      : request;
    let event = null;
    const eventId = executed?.recovery_event_id || request?.recovery_event_id;
    if (eventId) {
      try {
        event = await recoveryApi.getEvent({ eventId });
      } catch {
        // The request result remains useful even if event detail is briefly unavailable.
      }
    }
    return { ...item, incident, request: executed || request, executed, event, status: executed?.status || request?.status || 'UNKNOWN' };
  };

  const executeRecovery = async () => {
    if (executionInFlight.current) return;
    const readyItems = previewItems.filter(item => item.ready);
    if (!readyItems.length) return;

    executionInFlight.current = true;
    setExecuting(true);
    const settled = [];
    for (const item of readyItems) {
      try {
        settled.push(await executeOne(item));
      } catch (executionError) {
        settled.push({ ...item, incident: item.incident, status: 'FAILED_EXECUTION', error: getErrorMessage(executionError) });
      }
    }

    const successfulByIncident = new Map(
      settled
        .filter(item => String(item.status || '').toUpperCase() === 'SUCCEEDED' && item.incident?.id)
        .map(item => [item.incident.id, item])
    );
    if (successfulByIncident.size > 0) {
      setIncidents(current => current.map(incident => {
        const result = successfulByIncident.get(incident.id);
        if (!result) return incident;

        const preservedTamperedData = getTamperedData(result.incident, result.auditLog);
        return {
          ...incident,
          status: 'RESOLVED',
          resolved_at: incident.resolved_at || new Date().toISOString(),
          ...(hasValue(preservedTamperedData) ? { tampered_metadata: preservedTamperedData } : {}),
        };
      }));
    }
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

  const readyPreviewCount = previewItems.filter(item => item.ready).length;
  const recoveredPreviewCount = previewItems.filter(item => String(item.recoveryEvent?.result_status || '').toUpperCase() === 'SUCCEEDED').length;
  const notActionablePreviewCount = previewItems.filter(item => !item.ready && String(item.recoveryEvent?.result_status || '').toUpperCase() !== 'SUCCEEDED').length;

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
            <p className="ac-hero__subtitle">Review tampered incidents and monitor recovery verification from the gateway.</p>
            <span className="ac-recovery-backend-tag"><Icon name="database" size={12} /> Live backend · recovery_events</span>
          </div>
          <div className="ac-recovery-center__hero-action"><button type="button" className="ac-btn-ghost-action" onClick={loadData} disabled={loading}><Icon name={loading ? 'spinner' : 'refresh'} size={15} /> Refresh</button></div>
        </div>
      </div>

      {error && <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={16} /><span>{error}</span><button type="button" onClick={loadData} aria-label="Retry recovery data"><Icon name="refresh" size={15} /></button></div>}

      <div className="ac-recovery-stat-grid">
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--danger"><Icon name="alertTriangle" size={17} /></span><div><strong>{stats.openIncidents}</strong><span>Open tamper incidents</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--success"><Icon name="checkCircle" size={17} /></span><div><strong>{stats.recoveredEvents}</strong><span>Recovered events</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--info"><Icon name="list" size={17} /></span><div><strong>{stats.selected}</strong><span>Selected incidents</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--warning"><Icon name="shield" size={17} /></span><div><strong>{stats.verifiedEvents}</strong><span>Verified events</span></div></div>
      </div>

      <div className="ac-recovery-center__toolbar ac-recovery-data-toolbar">
        <div className="ac-recovery-segmented ac-recovery-section-tabs" role="tablist" aria-label="Recovery data section">
          <button type="button" className={activeSection === 'incidents' ? 'is-active' : ''} onClick={() => setActiveSection('incidents')}><Icon name="alertTriangle" size={13} /> Recovery incidents <span>{incidents.length}</span></button>
          <button type="button" className={activeSection === 'events' ? 'is-active' : ''} onClick={() => setActiveSection('events')}><Icon name="database" size={13} /> Recovery history <span>{eventPage.totalItems}</span></button>
        </div>
        <label className="ac-recovery-search"><Icon name="search" size={15} /><input aria-label="Search recovery data" value={search} onChange={event => { setSearch(event.target.value); setResourceScanSummary(''); }} placeholder="Search incident, log, resource, or event" /></label>
        <RecoveryStatusFilter
          activeSection={activeSection}
          options={activeSection === 'incidents' ? incidentStatusOptions : eventStatusOptions}
          value={activeSection === 'incidents' ? incidentFilter : eventFilter}
          onChange={value => activeSection === 'incidents' ? setIncidentFilter(value) : setEventFilter(value)}
        />
        {activeSection === 'incidents' && <div className="ac-recovery-data-toolbar__actions">{resourceScanTarget && selectedClient && <button type="button" className="ac-btn-ghost-action" onClick={runResourceScan} disabled={scanningResource} title="Verify this resource through the gateway and refresh recovery incidents"><Icon name={scanningResource ? 'spinner' : 'shield'} size={14} /> {scanningResource ? 'Verifying...' : `Verify ${resourceScanTarget}`}</button>}<button type="button" className="ac-btn-ghost-action" onClick={toggleSelectAll} disabled={!visibleSelectableIds.length} title="Select every incident matching the active status and search filters"><Icon name={allVisibleSelected ? 'check' : 'list'} size={14} /> {allVisibleSelected ? bulkClearLabel : `${bulkSelectionLabel} (${visibleSelectableIds.length})`}</button><button type="button" className="ac-btn-ghost-action" onClick={() => setSelectedIds(new Set())} disabled={!selectedIncidents.length}><Icon name="x" size={14} /> Clear selection</button><button type="button" className="ac-btn-primary" onClick={() => openPreview()} disabled={!selectedIncidents.length}><Icon name="eye" size={15} /> Preview selected ({selectedIncidents.length})</button></div>}
      </div>

      {resourceScanSummary && <div className="ac-recovery-alert ac-recovery-alert--success" role="status"><Icon name="checkCircle" size={15} /><span>{resourceScanSummary}</span></div>}

      {activeSection === 'incidents' ? (
        <section className="ac-recovery-center__panel ac-recovery-data-panel">
           <div className="ac-recovery-center__panel-head"><div className="ac-recovery-center__panel-title"><div className="ac-recovery-center__panel-title-row"><h2>Recovery incidents</h2><span>{visibleIncidents.length} of {incidents.length}</span></div><p>Only open Client Source incidents can run preflight and recovery. Gateway Integrity incidents remain read only. Select any row to inspect its evidence and status.</p></div><div className="ac-recovery-data-selection-note"><Icon name="shield" size={14} /> {stats.readyIncidents} open Client Source recoverable · {stats.gatewayIntegrityIncidents} open Gateway Integrity read only · {incidents.filter(isClosedIncident).length} closed incidents</div></div>
          {loading ? <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading tampered incidents...</div> : visibleIncidents.length === 0 ? <div className="ac-recovery-empty"><Icon name="inbox" size={25} /><strong>No tampered incidents found</strong><p>The backend returned no records for this workspace and filter.</p></div> : (
            <div className="ac-recovery-table-wrap"><table className="ac-recovery-table ac-recovery-data-table"><thead><tr><th className="ac-recovery-checkbox-cell"><input type="checkbox" aria-label="Select all incidents matching current filters" checked={allVisibleSelected} onChange={toggleSelectAll} disabled={!visibleSelectableIds.length} /></th><th>Incident</th><th>Target log / resource</th><th>Detected</th><th>Integrity evidence</th><th>Status</th></tr></thead><tbody>
              {visibleIncidents.map(item => {
                const request = requestByIncident.get(item.id);
                const selectable = isSelectable(item);
                return <tr key={item.id} className={selectedIds.has(item.id) ? 'is-selected' : ''} data-previewable="true" tabIndex={0} aria-label={`Preview ${item.log_id}`} onClick={() => openPreview([item])} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPreview([item]); } }}>
                  <td className="ac-recovery-checkbox-cell" onClick={event => event.stopPropagation()}><input type="checkbox" aria-label={`Select ${item.log_id}`} checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item)} disabled={!selectable} /></td>
                  <td><code>{item.id}</code><small>{item.incident_scope || 'Scope unavailable'} · {item.incident_type || 'Integrity mismatch'}</small></td>
                  <td><code>{item.reference_log_id || item.log_id}</code><small>{item.resource || '-'}</small></td>
                  <td>{item.detected_at ? formatTimestamp(item.detected_at) : '-'}<small>{item.client_id || selectedClient || '-'}</small></td>
                  <td><strong>{item.expected_hash ? 'Expected hash available' : 'Hash evidence pending'}</strong><small>{item.detected_hash || 'Detected hash unavailable'}</small></td>
                  <td><RecoveryStatusBadge status={request && ACTIVE_REQUEST_STATUSES.has(String(request.status || '').toUpperCase()) ? request.status : item.status} compact /></td>
                </tr>;
              })}
            </tbody></table></div>
          )}
        </section>
      ) : (
        <section className="ac-recovery-center__panel ac-recovery-data-panel">
          <div className="ac-recovery-center__panel-head"><div className="ac-recovery-center__panel-title"><div className="ac-recovery-center__panel-title-row"><h2>Recovery history</h2><span>{visibleEvents.length} of {events.length}</span></div><p>Read-only recovery evidence from the backend. Verification runs automatically after execution; click a row to inspect its details.</p></div><div className="ac-recovery-data-selection-note"><Icon name="database" size={14} /> {eventPage.totalItems} total recovery event{eventPage.totalItems === 1 ? '' : 's'}</div></div>
          {loading ? <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading recovery history...</div> : visibleEvents.length === 0 ? <div className="ac-recovery-empty"><Icon name="inbox" size={25} /><strong>No recovery history found</strong><p>Successful or failed recovery executions will appear here after the backend records them.</p></div> : (
            <div className="ac-recovery-table-wrap"><table className="ac-recovery-table ac-recovery-event-table"><thead><tr><th>Event</th><th>Target log / resource</th><th>Result</th><th>Integrity</th><th>Pipeline</th><th>Executed</th></tr></thead><tbody>
              {visibleEvents.map(event => <tr key={event.id} data-previewable="true" tabIndex={0} aria-label={`View recovery history ${event.id}`} onClick={() => openEvent(event)} onKeyDown={keyboardEvent => { if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') { keyboardEvent.preventDefault(); openEvent(event); } }}><td><code>{event.id}</code><small>{event.event_type || 'RECOVERY_EXECUTION'} · {event.legacy ? 'Legacy' : event.storage_kind || 'RECOVERY_EVENT'}</small></td><td><code>{event.target_log_id || event.selected_log_id || '-'}</code><small>{event.resource || '-'}</small></td><td><RecoveryStatusBadge status={event.result_status} compact /><small>{event.failure_reason || event.executed_by || '-'}</small></td><td><RecoveryStatusBadge status={eventIntegrityStatus(event)} compact /></td><td><strong>{event.pipeline_status || '-'}</strong><small>{event.operation ? `CDC ${event.cdc_status || 'PENDING'}` : event.snapshot_status || 'Snapshot status unavailable'}</small></td><td>{event.executed_at ? formatTimestamp(event.executed_at) : '-'}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
      )}

      {!!resultItems.length && <section className="ac-recovery-center__panel ac-recovery-results-panel"><div className="ac-recovery-center__panel-head"><div className="ac-recovery-center__panel-title"><div className="ac-recovery-center__panel-title-row"><h2>Latest recovery results</h2><span>{resultItems.filter(item => item.status === 'SUCCEEDED').length} succeeded · {resultItems.filter(item => item.status !== 'SUCCEEDED').length} other</span></div><p>Each item keeps the tampered data beside the recovery result for audit review.</p></div><button type="button" className="ac-btn-ghost-action" onClick={() => setResultItems([])}><Icon name="x" size={14} /> Clear results</button></div><div className="ac-recovery-results-list">{resultItems.map(item => <RecoveryResultCard key={`${item.incident?.id}-${item.request?.id || item.status}`} item={item} />)}</div></section>}

      {previewOpen && <div className="ac-recovery-preview-overlay" role="presentation" onClick={closePreview}><section className="ac-recovery-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-preview-title" onClick={event => event.stopPropagation()}><header className="ac-recovery-preview-dialog__header"><div><span className="ac-recovery-eyebrow"><Icon name="eye" size={14} /> Backend preflight preview</span><h2 id="recovery-preview-title">Review recovery data</h2><p>{previewLoading ? `${previewItems.length} of ${previewTotal || '...'} incidents loaded` : `${previewItems.length} incident${previewItems.length === 1 ? '' : 's'}`} · {readyPreviewCount} ready · {recoveredPreviewCount} recovered · {notActionablePreviewCount} not actionable</p></div><button type="button" className="ac-modal__close" onClick={closePreview} disabled={executing} aria-label="Close preview"><Icon name="x" size={18} /></button></header><div className="ac-recovery-preview-dialog__body">{previewError ? <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={16} /><span>{previewError}</span></div> : <>{previewItems.map(item => <RecoveryPreviewItem item={item} key={item.incident?.id || item.incident?.log_id} />)}{previewLoading && <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading preview data ({previewItems.length} of {previewTotal})...</div>}</>}</div><footer className="ac-recovery-preview-dialog__footer"><span><Icon name="checkCircle" size={13} /> Preflight validates the client event reference. Recovery completes after CDC and recovery evidence verification.</span><div><button type="button" className="ac-btn-ghost-action" onClick={closePreview} disabled={executing}>Close</button><button type="button" className="ac-btn-primary" onClick={() => setConfirmationOpen(true)} disabled={!readyPreviewCount || previewLoading || executing}><Icon name={executing ? 'spinner' : 'refresh'} size={15} /> Execute recovery ({readyPreviewCount})</button></div></footer></section></div>}

      {eventDetail && <RecoveryEventDetail eventDetail={eventDetail} loading={eventDetailLoading} onClose={() => setEventDetail(null)} />}

      <RecoveryConfirmationDialog open={confirmationOpen} title="Execute recovery?" message={`The backend will process ${readyPreviewCount} selected tampered incident${readyPreviewCount === 1 ? '' : 's'} using the trusted recovery source. No message is required from you.`} confirmLabel="Execute recovery" busy={executing} onClose={() => !executing && setConfirmationOpen(false)} onConfirm={executeRecovery} />
    </section>
  );
}

export default RecoveryDataView;
