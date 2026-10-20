import React from 'react';
import Icon from '../../common/Icon';
import { formatTimestamp } from '../../../utils/formatters';
import RecoveryStatusBadge from './RecoveryStatusBadge';

const CHECKS = [
  'Exact MinIO version ID',
  'Ciphertext checksum',
  'AES-256-GCM decryption',
  'Snapshot log and client identity',
  'Snapshot plaintext hash',
  'Merkle root and Fabric anchor',
];

const formatValue = (value) => {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

function RecoveryPreflightPanel({ result, loading = false, onRun, disabled = false }) {
  const preview = result?.snapshot_preview || {};
  const directRecovery = Boolean(result?.operation);
  const noRecoveryRequired = result?.status === 'NO_RECOVERY_REQUIRED';
  const preflightPassed = result?.recoverable && String(result?.status || '').toUpperCase() === 'VALID';
  const hasPreviewMetadata = preview.metadata !== undefined && preview.metadata !== null && preview.metadata !== '';
  const hasPreviewContext = hasPreviewMetadata || ['resource', 'action', 'actor', 'timestamp', 'source_system', 'source_record_id'].some(key => preview[key] !== undefined && preview[key] !== null && preview[key] !== '');

  return (
    <section className="ac-recovery-card ac-recovery-preflight">
      <div className="ac-recovery-card__header">
        <div>
          <span className="ac-recovery-eyebrow"><Icon name="shield" size={13} /> Trust validation</span>
          <h3>{directRecovery ? 'Client event + Agent preflight' : 'MinIO + Fabric preflight'}</h3>
          <p>{directRecovery ? 'Validates the latest client event, live Agent state, and Fabric proof before recovery.' : 'Validates the frozen snapshot reference before recovery can be executed.'}</p>
        </div>
        <button type="button" className="ac-btn-primary" onClick={onRun} disabled={loading || disabled}>
          <Icon name={loading ? 'spinner' : 'search'} size={15} />
          {loading ? 'Checking...' : 'Run preflight'}
        </button>
      </div>

      {result ? (
        <>
          <div className="ac-recovery-preflight-result">
            <span className="ac-recovery-preflight-result__icon"><Icon name={preflightPassed ? 'checkCircle' : 'alertTriangle'} size={19} /></span>
            <div>
              <strong>{preflightPassed ? (directRecovery ? 'Client recovery preflight passed' : 'Trusted snapshot is ready') : noRecoveryRequired ? 'Audit log already matches trusted evidence' : directRecovery ? 'Client recovery is not ready' : 'Snapshot is not recoverable'}</strong>
              <span>{result.status || 'UNKNOWN'} · validation completed by backend</span>
            </div>
          </div>

          {directRecovery ? (
            <div className="ac-recovery-check-grid">
              <div className={`ac-recovery-check${preflightPassed ? ' ac-recovery-check--passed' : ''}`}><Icon name={preflightPassed ? 'checkCircle' : 'alertTriangle'} size={14} /><span>Latest client event and Fabric proof {preflightPassed ? 'validated' : 'not validated'}</span></div>
              <div className={`ac-recovery-check${preflightPassed ? ' ac-recovery-check--passed' : ''}`}><Icon name={preflightPassed ? 'checkCircle' : 'alertTriangle'} size={14} /><span>Live Agent state {preflightPassed ? 'checked' : 'not confirmed'}</span></div>
            </div>
          ) : (
            <div className="ac-recovery-check-grid">
              {CHECKS.map(check => (
                <div className={`ac-recovery-check${preflightPassed ? ' ac-recovery-check--passed' : ''}`} key={check}>
                  <Icon name={preflightPassed ? 'checkCircle' : 'alertTriangle'} size={14} />
                  <span>{check}</span>
                </div>
              ))}
            </div>
          )}

          <div className="ac-recovery-evidence-grid">
            {directRecovery ? <>
              <div><span>Live client state hash</span><code title={result.client_state_hash}>{result.client_state_hash || '-'}</code></div>
              <div><span>Desired state hash</span><code title={result.desired_state_hash}>{result.desired_state_hash || '-'}</code></div>
              <div><span>Source status</span><RecoveryStatusBadge status={result.source_status} compact /></div>
              <div><span>Agent status</span><RecoveryStatusBadge status={result.agent_status} compact /></div>
              <div><span>Client event hash</span><code title={result.reference_log_hash}>{result.reference_log_hash || result.log_id || '-'}</code></div>
              <div><span>Merkle root / anchor</span><code title={result.reference_merkle_root || result.reference_anchor_id}>{result.reference_merkle_root || result.fabric_root || result.reference_anchor_id || '-'}</code></div>
            </> : <>
              <div><span>Current PostgreSQL hash</span><code title={result.current_hash}>{result.current_hash || '-'}</code></div>
              <div><span>Current integrity</span><RecoveryStatusBadge status={result.current_integrity} compact /></div>
              <div><span>Snapshot hash</span><code title={result.snapshot_hash}>{result.snapshot_hash || '-'}</code></div>
              <div><span>Merkle root</span><code title={result.merkle_root}>{result.merkle_root || '-'}</code></div>
              <div><span>Anchor ID</span><code title={result.anchor_id}>{result.anchor_id || '-'}</code></div>
              <div><span>Object version ID</span><code title={result.object_version_id}>{result.object_version_id || '-'}</code></div>
            </>}
          </div>

          {hasPreviewContext && <div className="ac-recovery-preview">
            <div className="ac-recovery-preview__header">
              <div>
                <span className="ac-recovery-eyebrow"><Icon name="fileText" size={13} /> {directRecovery ? 'Trusted event reference' : 'Snapshot preview'}</span>
                <h4>{preview.resource || (directRecovery ? result.log_id || 'Trusted client event' : 'Recovered audit event')}</h4>
              </div>
              <span className="ac-recovery-preview__action">{preview.action || '-'}</span>
            </div>
            <div className="ac-recovery-preview__meta">
              <span><strong>Actor</strong>{preview.actor || '-'}</span>
              <span><strong>Timestamp</strong>{preview.timestamp ? formatTimestamp(preview.timestamp) : '-'}</span>
              <span><strong>Source</strong>{preview.source_system || '-'}</span>
              <span><strong>Source record</strong>{preview.source_record_id || '-'}</span>
            </div>
            {hasPreviewMetadata && <details className="ac-recovery-preview__details">
              <summary>{directRecovery ? 'View trusted reference metadata (redacted)' : 'View snapshot metadata'}</summary>
              <pre>{formatValue(preview.metadata)}</pre>
            </details>}
          </div>}
          {directRecovery && !hasPreviewContext && <div className="ac-recovery-preflight-empty"><Icon name="fileText" size={20} /><span>Raw client row values are not included. This view shows state hashes and recovery evidence.</span></div>}
        </>
      ) : (
        <div className="ac-recovery-preflight-empty">
          <Icon name="link" size={25} />
          <span>Run preflight to validate the trusted recovery source.</span>
        </div>
      )}
    </section>
  );
}

export default RecoveryPreflightPanel;
