import React from 'react';
import Icon from '../../common/Icon';

const STATUS_META = {
  OPEN: { label: 'Incident open', tone: 'danger', icon: 'alertTriangle' },
  RESOLVED: { label: 'Resolved', tone: 'success', icon: 'checkCircle' },
  PENDING_EXECUTION: { label: 'Ready to execute', tone: 'warning', icon: 'clock' },
  PENDING_APPROVAL: { label: 'Legacy request', tone: 'warning', icon: 'clock' },
  APPROVED: { label: 'Ready to execute', tone: 'info', icon: 'checkCircle' },
  REJECTED: { label: 'Rejected', tone: 'muted', icon: 'xCircle' },
  EXECUTING: { label: 'Executing', tone: 'info', icon: 'spinner' },
  SUCCEEDED: { label: 'Succeeded', tone: 'success', icon: 'checkCircle' },
  FAILED_VERIFICATION: { label: 'Verification failed', tone: 'danger', icon: 'alertTriangle' },
  FAILED_EXECUTION: { label: 'Execution failed', tone: 'danger', icon: 'alertTriangle' },
  BLOCKED: { label: 'Recovery blocked', tone: 'danger', icon: 'alertTriangle' },
  RECOVERED: { label: 'Recovered', tone: 'success', icon: 'checkCircle' },
  SKIPPED: { label: 'Skipped', tone: 'muted', icon: 'xCircle' },
  VALID: { label: 'Valid', tone: 'success', icon: 'checkCircle' },
  PREVIEW_READY: { label: 'Trusted snapshot verified', tone: 'success', icon: 'checkCircle' },
  NO_RECOVERY_REQUIRED: { label: 'No recovery required', tone: 'success', icon: 'checkCircle' },
  TAMPERED: { label: 'Tampered', tone: 'danger', icon: 'alertTriangle' },
  UNREACHABLE: { label: 'Unreachable', tone: 'warning', icon: 'wifi' },
  NOT_CHECKED: { label: 'Auto verification pending', tone: 'warning', icon: 'clock' },
  PENDING: { label: 'Verification pending', tone: 'warning', icon: 'clock' },
};

function RecoveryStatusBadge({ status, compact = false }) {
  const normalized = String(status || 'UNKNOWN').trim().toUpperCase();
  const meta = STATUS_META[normalized] || {
    label: normalized.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, match => match.toUpperCase()) || 'Unknown',
    tone: 'muted',
    icon: 'clock',
  };

  return (
    <span className={`ac-recovery-status ac-recovery-status--${meta.tone}${compact ? ' ac-recovery-status--compact' : ''}`} title={normalized}>
      <Icon name={meta.icon} size={compact ? 12 : 14} />
      <span>{meta.label}</span>
    </span>
  );
}

export { STATUS_META };
export default RecoveryStatusBadge;
