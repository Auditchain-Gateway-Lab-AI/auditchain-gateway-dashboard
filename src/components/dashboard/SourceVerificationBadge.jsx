import React from 'react';
import Icon from '../common/Icon';

const SOURCE_STATUS = {
  matched: {
    className: 'ac-status--valid',
    icon: 'checkCircle',
    label: 'SOURCE MATCHED',
    title: 'Data sumber berhasil dijangkau dan cocok dengan audit log.',
  },
  mismatch: {
    className: 'ac-status--invalid',
    icon: 'xCircle',
    label: 'SOURCE MISMATCH',
    title: 'Data sumber dapat dijangkau, tetapi nilainya berbeda dari audit log.',
  },
  unreachable: {
    className: 'ac-status--pending',
    icon: 'alertTriangle',
    label: 'AGENT OFFLINE',
    title: 'Integritas Gateway/Fabric valid, tetapi Agent sumber tidak dapat dijangkau.',
  },
  not_configured: {
    className: 'ac-status--skipped',
    icon: 'settings',
    label: 'AGENT NOT SET',
    title: 'Agent sumber belum dikonfigurasi untuk pemeriksaan ini.',
  },
};

function SourceVerificationBadge({ verification, onOpen }) {
  const agentStatus = String(verification?.data?.agent_status || '').toLowerCase();
  const presentation = SOURCE_STATUS[agentStatus];

  if (!presentation) return null;

  return (
    <button
      type="button"
      className={`ac-status ${presentation.className}`}
      style={{ border: 0, fontFamily: 'inherit', fontSize: '9px' }}
      title={presentation.title}
      aria-label={presentation.title}
      onClick={onOpen}
    >
      <Icon name={presentation.icon} size={11} />
      {presentation.label}
    </button>
  );
}

export default SourceVerificationBadge;
