import React from 'react';

// ================================================================
// KOMPONEN: Action badge
// ================================================================
function ActionBadge({ action }) {
  const cls = action === 'INSERT' ? 'ac-badge--insert'
    : action === 'DELETE' ? 'ac-badge--delete'
      : 'ac-badge--update';
  return <span className={`ac-badge ${cls}`}>{action}</span>;
}

export { ActionBadge };
export default ActionBadge;
