import React from 'react';
import Icon from '../common/Icon';

function StatCards({ stats = { total_logs: 0, pending_logs: 0, anchored_logs: 0 } }) {
  const totalLogs = stats.total_logs || 0;
  const pendingLogs = stats.pending_logs || 0;
  const anchoredLogs = stats.anchored_logs || 0;
  const anchoredRate = totalLogs > 0 ? Math.round((anchoredLogs / totalLogs) * 100) : 0;

  return (
    <section className="ac-stats-grid">
      <div className="ac-stat-card">
        <div className="ac-stat-card__icon ac-stat-card__icon--blue">
          <Icon name="list" size={26} />
        </div>
        <div>
          <div className="ac-stat-card__label">Total Logs</div>
          <div className="ac-stat-card__value">{totalLogs.toLocaleString()}</div>
          <div className="ac-stat-card__sub ac-stat-card__sub--blue">Live ingestion stream</div>
        </div>
        <span className="ac-stat-card__meter ac-stat-card__meter--blue">Live</span>
      </div>
      <div className="ac-stat-card">
        <div className="ac-stat-card__icon ac-stat-card__icon--amber">
          <Icon name="clock" size={26} />
        </div>
        <div>
          <div className="ac-stat-card__label">Pending Verification</div>
          <div className="ac-stat-card__value">{pendingLogs.toLocaleString()}</div>
          <div className="ac-stat-card__sub ac-stat-card__sub--amber">
            {pendingLogs > 0 ? 'Requires attention' : 'All clear'}
          </div>
        </div>
        <span className={`ac-stat-card__meter${pendingLogs > 0 ? ' ac-stat-card__meter--amber' : ' ac-stat-card__meter--quiet'}`}>
          {pendingLogs > 0 ? 'Queue' : 'Clear'}
        </span>
      </div>
      <div className="ac-stat-card">
        <div className="ac-stat-card__icon ac-stat-card__icon--teal">
          <Icon name="link" size={26} />
        </div>
        <div>
          <div className="ac-stat-card__label">Anchored (Blockchain)</div>
          <div className="ac-stat-card__value">{anchoredLogs.toLocaleString()}</div>
          <div className="ac-stat-card__sub ac-stat-card__sub--teal">{anchoredRate}% secured coverage</div>
        </div>
        <span className="ac-stat-card__meter ac-stat-card__meter--teal">On-chain</span>
      </div>
    </section>
  );
}

const MemoizedStatCards = React.memo(StatCards);

export { StatCards };
export default MemoizedStatCards;
