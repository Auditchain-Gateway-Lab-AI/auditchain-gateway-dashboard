import React from 'react';
import AuditLogTable from './AuditLogTable';
import StatCards from './StatCards';
import Icon from '../common/Icon';

function AuditLogsView(props) {
  return (
    <>
      <section className="ac-hero">
        <div className="ac-hero__pattern" />
        <div className="ac-hero__content">
          <div className="ac-hero__left">
            <span className="ac-page-kicker">Audit Trail</span>
            <h1 className="ac-hero__title">Audit Logs</h1>
            <p className="ac-hero__subtitle">
              Inspect transaction history, filter source tables, and verify blockchain integrity on demand.
            </p>
          </div>
          {props.onOpenRecovery && (
            <div className="ac-hero__actions">
              <button type="button" className="ac-hero__btn-secondary ac-recovery-header-action" onClick={props.onOpenRecovery}>
                <span className="ac-recovery-header-action__icon"><Icon name="shield" size={18} /></span>
                <span className="ac-recovery-header-action__copy">
                  <strong>Recovery Center</strong>
                  <small>Review and restore incidents</small>
                </span>
                <Icon name="chevronRight" size={16} className="ac-recovery-header-action__arrow" />
              </button>
            </div>
          )}
        </div>
      </section>

      {props.stats && <StatCards stats={props.stats} />}

      <AuditLogTable {...props} />
    </>
  );
}

const MemoizedAuditLogsView = React.memo(AuditLogsView);

export { AuditLogsView };
export default MemoizedAuditLogsView;
