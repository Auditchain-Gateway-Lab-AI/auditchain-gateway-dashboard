import React from 'react';
import Icon from '../../common/Icon';

const shorten = (value) => {
  if (!value) return '-';
  const text = String(value);
  return text.length > 28 ? `${text.slice(0, 14)}…${text.slice(-10)}` : text;
};

function RecoveryHashComparison({ expected, detected, before, after }) {
  const hasExpectedPair = expected || detected;
  const hasBeforeAfter = before || after;

  if (!hasExpectedPair && !hasBeforeAfter) return null;

  return (
    <div className="ac-recovery-hash-grid">
      {hasExpectedPair && (
        <>
          <div className="ac-recovery-hash-card ac-recovery-hash-card--expected">
            <span><Icon name="checkCircle" size={14} /> Expected hash</span>
            <code title={expected || '-'}>{shorten(expected)}</code>
          </div>
          <div className="ac-recovery-hash-card ac-recovery-hash-card--detected">
            <span><Icon name="alertTriangle" size={14} /> Detected hash</span>
            <code title={detected || '-'}>{shorten(detected)}</code>
          </div>
        </>
      )}
      {hasBeforeAfter && (
        <>
          <div className="ac-recovery-hash-card ac-recovery-hash-card--before">
            <span>Before recovery</span>
            <code title={before || '-'}>{shorten(before)}</code>
          </div>
          <div className="ac-recovery-hash-card ac-recovery-hash-card--after">
            <span>After recovery</span>
            <code title={after || '-'}>{shorten(after)}</code>
          </div>
        </>
      )}
    </div>
  );
}

export default RecoveryHashComparison;

