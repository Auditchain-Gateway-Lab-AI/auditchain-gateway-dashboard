import React from 'react';

function ConnectorStatusBadge({ status }) {
  let label = 'Unknown';
  let badgeClass = 'ac-badge--neutral';

  if (!status) {
    label = 'Unknown';
    badgeClass = 'ac-badge--neutral';
  } else {
    const s = status.toLowerCase();
    if (s === 'running') {
      label = 'Running';
      badgeClass = 'ac-badge--success';
    } else if (s.startsWith('failed')) {
      label = 'Failed';
      badgeClass = 'ac-badge--error';
    } else if (s === 'debezium_not_ready') {
      label = 'Debezium Not Ready';
      badgeClass = 'ac-badge--warning';
    } else if (s === 'skipped') {
      label = 'Skipped';
      badgeClass = 'ac-badge--neutral';
    } else {
      // e.g., 'unknown'
      label = status.charAt(0).toUpperCase() + status.slice(1);
      badgeClass = 'ac-badge--neutral';
    }
  }

  return (
    <span className={`ac-badge ${badgeClass}`} title={status}>
      {label}
    </span>
  );
}

export { ConnectorStatusBadge };
export default ConnectorStatusBadge;
