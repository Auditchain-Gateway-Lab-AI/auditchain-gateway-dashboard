import React from 'react';
import Icon from '../common/Icon';

function StatCards({ stats = { total_logs: 0, pending_logs: 0, anchored_logs: 0 } }) {
  return (
    <section className="ac-stats-grid">
      <div className="ac-stat-card">
        <div className="ac-stat-card__icon ac-stat-card__icon--blue">
          <Icon name="list" size={26} />
        </div>
        <div>
          <div className="ac-stat-card__label">Total Logs</div>
          <div className="ac-stat-card__value">{(stats.total_logs || 0).toLocaleString()}</div>
          <div className="ac-stat-card__sub ac-stat-card__sub--blue">All entries tracked</div>
        </div>
      </div>
      <div className="ac-stat-card">
        <div className="ac-stat-card__icon ac-stat-card__icon--amber">
          <Icon name="clock" size={26} />
        </div>
        <div>
          <div className="ac-stat-card__label">Pending Verification</div>
          <div className="ac-stat-card__value">{(stats.pending_logs || 0).toLocaleString()}</div>
          <div className="ac-stat-card__sub ac-stat-card__sub--amber">
            {stats.pending_logs > 0 ? 'Requires attention' : 'All clear'}
          </div>
        </div>
      </div>
      <div className="ac-stat-card">
        <div className="ac-stat-card__icon ac-stat-card__icon--teal">
          <Icon name="link" size={26} />
        </div>
        <div>
          <div className="ac-stat-card__label">Anchored (Blockchain)</div>
          <div className="ac-stat-card__value">{(stats.anchored_logs || 0).toLocaleString()}</div>
          <div className="ac-stat-card__sub ac-stat-card__sub--teal">Successfully secured</div>
        </div>
      </div>
    </section>
  );
}

export { StatCards };
export default StatCards;
