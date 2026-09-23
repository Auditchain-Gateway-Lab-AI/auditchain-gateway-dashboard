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
];

const EVENT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses', description: 'Show every recovery event', tone: 'all' },
  { value: 'SUCCEEDED', label: 'Succeeded', description: 'Recovery completed successfully', tone: 'success' },
  { value: 'FAILED_VERIFICATION', label: 'Verification failed', description: 'Integrity check did not pass', tone: 'danger' },
  { value: 'FAILED_EXECUTION', label: 'Execution failed', description: 'Recovery could not be completed', tone: 'danger' },
];

const REVIEWABLE_INCIDENT_STATUSES = new Set(['OPEN', 'RESOLVED']);
const NON_REEXECUTABLE_REQUEST_STATUSES = new Set([
  'PENDING_EXECUTION',
  'PENDING_APPROVAL',
  'APPROVED',
  'EXECUTING',
  'SUCCEEDED',
]);
const PREVIEW_BATCH_SIZE = 20;

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

function RecoveryDataReview({ tampered, trusted, tamperedHash, trustedHash, trustedLabel, emptyTrustedLabel }) {
  const hasTrusted = trusted !== undefined && trusted !== null && trusted !== '';

  return (
    <div className="ac-recovery-data-review">
      <div className="ac-recovery-data-review__hashes">
        <div className="ac-recovery-data-review__hash ac-recovery-data-review__hash--danger">
          <span>Tampered hash</span>
          <code>{tamperedHash || '—'}</code>
        </div>
        <div className="ac-recovery-data-review__hash ac-recovery-data-review__hash--success">
          <span>{trustedLabel} hash</span>
          <code>{trustedHash || '—'}</code>
        </div>
      </div>
      {hasTrusted ? (
        <ComparisonTable tampered={tampered} trusted={trusted} trustedLabel={trustedLabel} />
      ) : (
        <div className="ac-recovery-data-columns">
          <div className="ac-recovery-data-block ac-recovery-data-block--danger">
            <span className="ac-recovery-data-label ac-recovery-data-label--danger">Tampered data</span>
            <StructuredValueList value={tampered} emptyLabel="Tampered payload is protected or unavailable." />
          </div>
          <div className="ac-recovery-data-block ac-recovery-data-block--success">
            <span className="ac-recovery-data-label ac-recovery-data-label--success">{trustedLabel}</span>
            <div className="ac-recovery-blocked-note"><Icon name="alertTriangle" size={16} /><span>{emptyTrustedLabel}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

const getPreviewStatus = item => {
  const eventStatus = String(item.recoveryEvent?.result_status || '').toUpperCase();
  if (eventStatus) return eventStatus;
  if (item.ready) return 'PREVIEW_READY';
  if (item.incidentClosed) return String(item.incident?.status || 'RESOLVED').toUpperCase();
  if (item.preflight?.status) return item.preflight.status;
  return item.candidate?.eligible ? 'FAILED_VERIFICATION' : 'BLOCKED';
};

function RecoveryPreviewItem({ item }) {
  const incident = item.incident || {};
  const recoveryEvent = item.recoveryEvent;
  const recoverySucceeded = String(recoveryEvent?.result_status || '').toUpperCase() === 'SUCCEEDED';
  const trustedData = recoverySucceeded ? recoveryEvent?.recovered_metadata : item.preflight?.snapshot_preview?.metadata;
  const context = getRecoveryContext(item);
  const tamperedData = getTamperedData(incident, item.auditLog);
  const changedFields = getChangedFields(tamperedData, trustedData);
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
        <span>{recoverySucceeded ? 'This incident has already been recovered. The trusted result is shown below.' : item.ready ? 'Trusted snapshot verified. This incident is ready to recover.' : item.incidentClosed ? 'This incident is already closed, so a new recovery cannot be executed.' : (item.error || item.candidate?.reason || 'Recovery is not currently available.')}</span>
      </div>
      <RecoveryDataReview
        tampered={tamperedData}
        trusted={trustedData}
        tamperedHash={item.preflight?.current_hash || incident.detected_hash}
        trustedHash={item.preflight?.snapshot_hash || recoveryEvent?.after_hash || incident.expected_hash}
        trustedLabel={recoverySucceeded ? 'Recovery result' : 'Original trusted data'}
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
  const tamperedData = getTamperedData(incident, item.auditLog);
  const trustedData = recoveryEvent.recovered_metadata;
  const context = getRecoveryContext({
    incident,
    auditLog: item.auditLog,
    preflight: item.preflight,
    recoveryEvent,
  });
  const changedFields = getChangedFields(tamperedData, trustedData);

  return (
    <article className="ac-recovery-result-card">
      <div className="ac-recovery-result-card__header"><div><code>{incident.log_id || '—'}</code><span>{incident.resource || 'Unknown resource'}</span></div><div className="ac-recovery-event-status-row"><RecoveryStatusBadge status={item.status} compact /><RecoveryStatusBadge status={eventIntegrityStatus(recoveryEvent)} compact /></div></div>
      <RecoveryContextFacts context={context} showRecoveryAt={item.status === 'SUCCEEDED'} />
      <RecoveryDataReview
        tampered={tamperedData}
        trusted={trustedData}
        tamperedHash={item.request?.before_hash || incident.detected_hash}
        trustedHash={item.request?.after_hash || recoveryEvent.after_hash}
        trustedLabel="Recovery result"
        emptyTrustedLabel={item.error || 'Recovery result metadata is not available.'}
      />
      {changedFields.length > 0 && <div className="ac-recovery-changed-fields"><strong>Fields with changes</strong><div>{changedFields.map(field => <span key={field}><Icon name="alertTriangle" size={12} /><em>{field}</em></span>)}</div></div>}
      {item.status !== 'SUCCEEDED' && <p className="ac-recovery-result-card__message"><Icon name="alertTriangle" size={14} /> {item.error || 'Recovery did not complete for this item.'}</p>}
    </article>
  );
}

// TamperIncident currently omits TamperedPayload from JSON. The current audit
// row is therefore loaded from the tenant-scoped resource endpoint for the
// before-recovery view, with incident projections kept as a fallback.
const getTamperedData = (incident, auditLog) => {
  const resolved = String(incident?.status || '').toUpperCase() === 'RESOLVED';
  const preservedTamperedData = incident?.tampered_metadata
    ?? incident?.tampered_data
    ?? incident?.tampered_payload;

  if (resolved) {
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
  return ['NOT_CHECKED', 'PENDING'].includes(integrity)
    && !['FAILED', 'LEGACY_MISSING'].includes(snapshot);
};

function RecoveryEventDetail({ eventDetail, loading, onClose }) {
  const resultStatus = String(eventDetail?.result_status || '').toUpperCase();
  const succeeded = resultStatus === 'SUCCEEDED';
  const integrityStatus = eventIntegrityStatus(eventDetail);
  const resource = eventDetail?.resource || eventDetail?.target_log_id || 'Recovery target';
  const resultTitle = succeeded ? 'Trusted data restored' : 'Recovery needs attention';
  const resultDescription = succeeded
    ? 'The original trusted snapshot is now active on the target log.'
    : eventDetail?.failure_reason || 'The recovery event was recorded without restoring the target data.';

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
                <summary><span><Icon name="shield" size={14} /> Technical evidence</span><small>Hash, snapshot, Merkle, and pipeline details</small><Icon name="chevronDown" size={15} /></summary>
                <div className="ac-recovery-event-technical__body">
                  <div className="ac-recovery-event-hash-grid">
                    <div className="ac-recovery-event-hash ac-recovery-event-hash--danger"><span>Before recovery hash</span><code>{eventDetail?.before_hash || '—'}</code></div>
                    <div className="ac-recovery-event-hash ac-recovery-event-hash--success"><span>Recovered data hash</span><code>{eventDetail?.after_hash || '—'}</code></div>
                  </div>
                  <div className="ac-recovery-event-facts">
                    <span><strong>Snapshot</strong>{eventDetail?.snapshot_status || '—'} · {eventDetail?.snapshot_version_id || eventDetail?.source_snapshot_version_id || '—'}</span>
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
  const executionInFlight = useRef(false);
  const refreshInFlight = useRef(false);
  const previewRun = useRef(0);

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
    } finally {
      refreshInFlight.current = false;
      if (!silent) setLoading(false);
    }
  }, [selectedClient]);

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

  const awaitingAutomaticVerification = useMemo(
    () => events.some(eventNeedsAutomaticVerification),
    [events]
  );

  useEffect(() => {
    if (!awaitingAutomaticVerification) return undefined;
    const timer = window.setInterval(() => loadData({ silent: true }), 5000);
    return () => window.clearInterval(timer);
  }, [awaitingAutomaticVerification, loadData]);

  const requestByIncident = useMemo(() => {
    const map = new Map();
    requests.forEach(request => {
      if (request?.incident_id) map.set(request.incident_id, request);
    });
    return map;
  }, [requests]);

  const normalizedSearch = search.trim().toLowerCase();
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

  const isSelectable = useCallback((incident) => {
    const status = String(incident?.status || '').toUpperCase();
    return REVIEWABLE_INCIDENT_STATUSES.has(status);
  }, []);

  const isReadyForRecovery = useCallback((incident) => {
    const status = String(incident?.status || '').toUpperCase();
    const requestStatus = String(requestByIncident.get(incident?.id)?.status || '').toUpperCase();
    return status === 'OPEN' && !NON_REEXECUTABLE_REQUEST_STATUSES.has(requestStatus);
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

  const selectedIncidentStatus = incidentStatusOptions.find(option => option.value === incidentFilter);
  const bulkSelectionLabel = incidentFilter === 'ALL'
    ? 'Select all reviewable'
    : `Select all ${selectedIncidentStatus?.label?.toLowerCase() || 'matching'}`;
  const bulkClearLabel = incidentFilter === 'ALL'
    ? 'Clear reviewable selection'
    : `Clear ${selectedIncidentStatus?.label?.toLowerCase() || 'matching'} selection`;

  const stats = useMemo(() => ({
    readyIncidents: incidents.filter(isReadyForRecovery).length,
    recoveredEvents: events.filter(item => String(item.result_status || '').toUpperCase() === 'SUCCEEDED').length,
    selected: selectedIncidents.length,
    verifiedEvents: events.filter(item => String(eventIntegrityStatus(item)).toUpperCase() === 'VALID').length,
  }), [events, incidents, isReadyForRecovery, selectedIncidents]);

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
    const incidentClosed = incidentStatus === 'RESOLVED';
    const relatedRequest = requestByIncident.get(incident?.id);
    const existingEvent = incidentClosed
      ? events.find(item => item?.incident_id === incident?.id)
        || (relatedRequest?.recovery_event_id ? { id: relatedRequest.recovery_event_id, incident_id: incident.id } : null)
      : null;
    const [detailResult, candidateResult, preflightResult, auditLogsResult] = await Promise.allSettled([
      recoveryApi.getIncident({ incidentId: incident.id }),
      incidentClosed ? Promise.resolve([]) : recoveryApi.listCandidates({ incidentId: incident.id }),
      incidentClosed ? Promise.resolve(null) : recoveryApi.runPreflight({ incidentId: incident.id }),
      recoveryApi.listAuditLogsByResource({ resource: incident.resource }),
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
    const candidates = candidateResult.status === 'fulfilled' ? normalizeList(candidateResult.value) : [];
    const candidate = candidates.find(item => item.log_id === incident.log_id) || candidates[0] || null;
    const preflight = preflightResult.status === 'fulfilled' ? preflightResult.value : null;
    const auditLogs = auditLogsResult.status === 'fulfilled' ? normalizeList(auditLogsResult.value) : [];
    const auditLog = auditLogs.find(item => item?.log_id === incident.log_id) || null;
    const previewIncident = auditLog ? { ...detail, auditLog } : detail;
    const requestStatus = String(relatedRequest?.status || '').toUpperCase();
    const failures = [detailResult, candidateResult, preflightResult]
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);
    const ready = Boolean(
      !incidentClosed
      && !NON_REEXECUTABLE_REQUEST_STATUSES.has(requestStatus)
      && candidate?.eligible
      && preflight?.recoverable
      && String(preflight?.status || '').toUpperCase() === 'VALID'
    );

    return {
      incident: previewIncident,
      auditLog,
      auditLogError: auditLogsResult.status === 'rejected' ? getErrorMessage(auditLogsResult.reason) : '',
      candidate,
      preflight,
      recoveryEvent,
      incidentClosed,
      ready,
      error: failures.length ? getErrorMessage(failures[0]) : '',
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
    setActiveSection('events');
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
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--danger"><Icon name="alertTriangle" size={17} /></span><div><strong>{stats.readyIncidents}</strong><span>Ready to recover</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--success"><Icon name="checkCircle" size={17} /></span><div><strong>{stats.recoveredEvents}</strong><span>Recovered events</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--info"><Icon name="list" size={17} /></span><div><strong>{stats.selected}</strong><span>Selected incidents</span></div></div>
        <div className="ac-recovery-stat"><span className="ac-recovery-stat__icon ac-recovery-stat__icon--warning"><Icon name="shield" size={17} /></span><div><strong>{stats.verifiedEvents}</strong><span>Verified events</span></div></div>
      </div>

      <div className="ac-recovery-center__toolbar ac-recovery-data-toolbar">
        <div className="ac-recovery-segmented ac-recovery-section-tabs" role="tablist" aria-label="Recovery data section">
          <button type="button" className={activeSection === 'incidents' ? 'is-active' : ''} onClick={() => setActiveSection('incidents')}><Icon name="alertTriangle" size={13} /> Tampered incidents <span>{incidents.length}</span></button>
          <button type="button" className={activeSection === 'events' ? 'is-active' : ''} onClick={() => setActiveSection('events')}><Icon name="database" size={13} /> Recovery history <span>{eventPage.totalItems}</span></button>
        </div>
        <label className="ac-recovery-search"><Icon name="search" size={15} /><input aria-label="Search recovery data" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search incident, log, resource, or event" /></label>
        <RecoveryStatusFilter
          activeSection={activeSection}
          options={activeSection === 'incidents' ? incidentStatusOptions : eventStatusOptions}
          value={activeSection === 'incidents' ? incidentFilter : eventFilter}
          onChange={value => activeSection === 'incidents' ? setIncidentFilter(value) : setEventFilter(value)}
        />
        {activeSection === 'incidents' && <div className="ac-recovery-data-toolbar__actions"><button type="button" className="ac-btn-ghost-action" onClick={toggleSelectAll} disabled={!visibleSelectableIds.length} title="Only incidents matching the active status and search filters are selected"><Icon name={allVisibleSelected ? 'check' : 'list'} size={14} /> {allVisibleSelected ? bulkClearLabel : `${bulkSelectionLabel} (${visibleSelectableIds.length})`}</button><button type="button" className="ac-btn-ghost-action" onClick={() => setSelectedIds(new Set())} disabled={!selectedIncidents.length}><Icon name="x" size={14} /> Clear selection</button><button type="button" className="ac-btn-primary" onClick={() => openPreview()} disabled={!selectedIncidents.length}><Icon name="eye" size={15} /> Preview selected ({selectedIncidents.length})</button></div>}
      </div>

      {activeSection === 'incidents' ? (
        <section className="ac-recovery-center__panel ac-recovery-data-panel">
          <div className="ac-recovery-center__panel-head"><div className="ac-recovery-center__panel-title"><div className="ac-recovery-center__panel-title-row"><h2>Tampered incidents</h2><span>{visibleIncidents.length} of {incidents.length}</span></div><p>Use the status filter to scope bulk selection. Open incidents can be recovered; resolved incidents can be selected to compare the original tampered data with the recovery result.</p></div><div className="ac-recovery-data-selection-note"><Icon name="shield" size={14} /> {stats.readyIncidents} ready to recover · {incidents.filter(item => String(item.status || '').toUpperCase() === 'RESOLVED').length} available for review</div></div>
          {loading ? <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading tampered incidents...</div> : visibleIncidents.length === 0 ? <div className="ac-recovery-empty"><Icon name="inbox" size={25} /><strong>No tampered incidents found</strong><p>The backend returned no records for this workspace and filter.</p></div> : (
            <div className="ac-recovery-table-wrap"><table className="ac-recovery-table ac-recovery-data-table"><thead><tr><th className="ac-recovery-checkbox-cell"><input type="checkbox" aria-label="Select all incidents matching current filters" checked={allVisibleSelected} onChange={toggleSelectAll} disabled={!visibleSelectableIds.length} /></th><th>Incident</th><th>Target log / resource</th><th>Detected</th><th>Integrity evidence</th><th>Status</th></tr></thead><tbody>
              {visibleIncidents.map(item => {
                const request = requestByIncident.get(item.id);
                const selectable = isSelectable(item);
                return <tr key={item.id} className={selectedIds.has(item.id) ? 'is-selected' : ''} data-previewable="true" tabIndex={0} aria-label={`Preview ${item.log_id}`} onClick={() => openPreview([item])} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPreview([item]); } }}>
                  <td className="ac-recovery-checkbox-cell" onClick={event => event.stopPropagation()}><input type="checkbox" aria-label={`Select ${item.log_id}`} checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item)} disabled={!selectable} /></td>
                  <td><code>{item.id}</code><small>{item.incident_type || 'Integrity mismatch'}</small></td>
                  <td><code>{item.log_id}</code><small>{item.resource || '-'}</small></td>
                  <td>{item.detected_at ? formatTimestamp(item.detected_at) : '-'}<small>{item.client_id || selectedClient || '-'}</small></td>
                  <td><strong>{item.expected_hash ? 'Expected hash available' : 'Hash evidence pending'}</strong><small>{item.detected_hash || 'Detected hash unavailable'}</small></td>
                  <td><RecoveryStatusBadge status={request?.status === 'EXECUTING' ? 'EXECUTING' : item.status} compact /></td>
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
              {visibleEvents.map(event => <tr key={event.id} data-previewable="true" tabIndex={0} aria-label={`View recovery history ${event.id}`} onClick={() => openEvent(event)} onKeyDown={keyboardEvent => { if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') { keyboardEvent.preventDefault(); openEvent(event); } }}><td><code>{event.id}</code><small>{event.event_type || 'RECOVERY_EXECUTION'} · {event.legacy ? 'Legacy' : event.storage_kind || 'RECOVERY_EVENT'}</small></td><td><code>{event.target_log_id || event.selected_log_id || '-'}</code><small>{event.resource || '-'}</small></td><td><RecoveryStatusBadge status={event.result_status} compact /><small>{event.failure_reason || event.executed_by || '-'}</small></td><td><RecoveryStatusBadge status={eventIntegrityStatus(event)} compact /></td><td><strong>{event.pipeline_status || '-'}</strong><small>{event.snapshot_status || 'Snapshot status unavailable'}</small></td><td>{event.executed_at ? formatTimestamp(event.executed_at) : '-'}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
      )}

      {!!resultItems.length && <section className="ac-recovery-center__panel ac-recovery-results-panel"><div className="ac-recovery-center__panel-head"><div className="ac-recovery-center__panel-title"><div className="ac-recovery-center__panel-title-row"><h2>Latest recovery results</h2><span>{resultItems.filter(item => item.status === 'SUCCEEDED').length} succeeded · {resultItems.filter(item => item.status !== 'SUCCEEDED').length} other</span></div><p>Each item keeps the tampered data beside the recovery result for audit review.</p></div><button type="button" className="ac-btn-ghost-action" onClick={() => setResultItems([])}><Icon name="x" size={14} /> Clear results</button></div><div className="ac-recovery-results-list">{resultItems.map(item => <RecoveryResultCard key={`${item.incident?.id}-${item.request?.id || item.status}`} item={item} />)}</div></section>}

      {previewOpen && <div className="ac-recovery-preview-overlay" role="presentation" onClick={closePreview}><section className="ac-recovery-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-preview-title" onClick={event => event.stopPropagation()}><header className="ac-recovery-preview-dialog__header"><div><span className="ac-recovery-eyebrow"><Icon name="eye" size={14} /> Backend preflight preview</span><h2 id="recovery-preview-title">Review recovery data</h2><p>{previewLoading ? `${previewItems.length} of ${previewTotal || '...'} incidents loaded` : `${previewItems.length} incident${previewItems.length === 1 ? '' : 's'}`} · {readyPreviewCount} ready · {recoveredPreviewCount} recovered · {notActionablePreviewCount} not actionable</p></div><button type="button" className="ac-modal__close" onClick={closePreview} disabled={executing} aria-label="Close preview"><Icon name="x" size={18} /></button></header><div className="ac-recovery-preview-dialog__body">{previewError ? <div className="ac-recovery-alert ac-recovery-alert--error" role="alert"><Icon name="alertTriangle" size={16} /><span>{previewError}</span></div> : <>{previewItems.map(item => <RecoveryPreviewItem item={item} key={item.incident?.id || item.incident?.log_id} />)}{previewLoading && <div className="ac-recovery-empty ac-recovery-empty--loading"><Icon name="spinner" size={25} /> Loading preview data ({previewItems.length} of {previewTotal})...</div>}</>}</div><footer className="ac-recovery-preview-dialog__footer"><span><Icon name="checkCircle" size={13} /> Snapshot verified means the trusted data passed preflight; recovery is completed only after execution.</span><div><button type="button" className="ac-btn-ghost-action" onClick={closePreview} disabled={executing}>Close</button><button type="button" className="ac-btn-primary" onClick={() => setConfirmationOpen(true)} disabled={!readyPreviewCount || previewLoading || executing}><Icon name={executing ? 'spinner' : 'refresh'} size={15} /> Execute recovery ({readyPreviewCount})</button></div></footer></section></div>}

      {eventDetail && <RecoveryEventDetail eventDetail={eventDetail} loading={eventDetailLoading} onClose={() => setEventDetail(null)} />}

      <RecoveryConfirmationDialog open={confirmationOpen} title="Execute recovery?" message={`The backend will process ${readyPreviewCount} selected tampered incident${readyPreviewCount === 1 ? '' : 's'} using the trusted recovery source. No message is required from you.`} confirmLabel="Execute recovery" busy={executing} onClose={() => !executing && setConfirmationOpen(false)} onConfirm={executeRecovery} />
    </section>
  );
}

export default RecoveryDataView;
