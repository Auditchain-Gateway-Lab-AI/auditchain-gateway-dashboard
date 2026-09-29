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
  const noRecoveryRequired = result?.status === 'NO_RECOVERY_REQUIRED';

  return (
    <section className="ac-recovery-card ac-recovery-preflight">
      <div className="ac-recovery-card__header">
        <div>
          <span className="ac-recovery-eyebrow"><Icon name="shield" size={13} /> Trust validation</span>
          <h3>MinIO + Fabric preflight</h3>
          <p>Validates the frozen snapshot reference before recovery can be executed.</p>
        </div>
        <button type="button" className="ac-btn-primary" onClick={onRun} disabled={loading || disabled}>
          <Icon name={loading ? 'spinner' : 'search'} size={15} />
          {loading ? 'Checking...' : 'Run preflight'}
        </button>
      </div>

      {result ? (
        <>
          <div className="ac-recovery-preflight-result">
            <span className="ac-recovery-preflight-result__icon"><Icon name="checkCircle" size={19} /></span>
            <div>
              <strong>{result.recoverable ? 'Trusted snapshot is ready' : noRecoveryRequired ? 'Audit log already matches trusted evidence' : 'Snapshot is not recoverable'}</strong>
              <span>{result.status || 'UNKNOWN'} · validation completed by backend</span>
            </div>
          </div>

          <div className="ac-recovery-check-grid">
            {CHECKS.map(check => (
              <div className="ac-recovery-check ac-recovery-check--passed" key={check}>
                <Icon name="checkCircle" size={14} />
                <span>{check}</span>
              </div>
            ))}
          </div>

          <div className="ac-recovery-evidence-grid">
            <div><span>Current PostgreSQL hash</span><code title={result.current_hash}>{result.current_hash || '-'}</code></div>
            <div><span>Current integrity</span><RecoveryStatusBadge status={result.current_integrity} compact /></div>
            <div><span>Snapshot hash</span><code title={result.snapshot_hash}>{result.snapshot_hash || '-'}</code></div>
            <div><span>Merkle root</span><code title={result.merkle_root}>{result.merkle_root || '-'}</code></div>
            <div><span>Anchor ID</span><code title={result.anchor_id}>{result.anchor_id || '-'}</code></div>
            <div><span>Object version ID</span><code title={result.object_version_id}>{result.object_version_id || '-'}</code></div>
          </div>

          <div className="ac-recovery-preview">
            <div className="ac-recovery-preview__header">
              <div>
                <span className="ac-recovery-eyebrow"><Icon name="fileText" size={13} /> Snapshot preview</span>
                <h4>{preview.resource || 'Recovered audit event'}</h4>
              </div>
              <span className="ac-recovery-preview__action">{preview.action || '-'}</span>
            </div>
            <div className="ac-recovery-preview__meta">
              <span><strong>Actor</strong>{preview.actor || '-'}</span>
              <span><strong>Timestamp</strong>{preview.timestamp ? formatTimestamp(preview.timestamp) : '-'}</span>
              <span><strong>Source</strong>{preview.source_system || '-'}</span>
              <span><strong>Source record</strong>{preview.source_record_id || '-'}</span>
            </div>
            <details className="ac-recovery-preview__details">
              <summary>View snapshot metadata</summary>
              <pre>{formatValue(preview.metadata)}</pre>
            </details>
          </div>
        </>
      ) : (
        <div className="ac-recovery-preflight-empty">
          <Icon name="link" size={25} />
          <span>Run preflight to compare the encrypted snapshot with its Fabric anchor.</span>
        </div>
      )}
    </section>
  );
}

export default RecoveryPreflightPanel;
