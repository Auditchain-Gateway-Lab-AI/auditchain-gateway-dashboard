import React, { useEffect } from 'react';
import Icon from '../../common/Icon';

function RecoveryConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'primary',
  busy = false,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="ac-recovery-confirm-overlay" role="presentation" onClick={() => !busy && onClose()}>
      <section
        className="ac-recovery-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-confirm-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="ac-recovery-confirm__icon">
          <Icon name={tone === 'danger' ? 'alertTriangle' : 'shield'} size={22} />
        </div>
        <div className="ac-recovery-confirm__content">
          <h3 id="recovery-confirm-title">{title}</h3>
          <p>{message}</p>
        </div>
        <div className="ac-recovery-confirm__actions">
          <button type="button" className="ac-btn-ghost-action" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`ac-btn-primary${tone === 'danger' ? ' ac-btn-primary--danger' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            <Icon name={busy ? 'spinner' : 'checkmark'} size={15} />
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default RecoveryConfirmationDialog;

