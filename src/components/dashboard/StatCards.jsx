import React from 'react';
import Icon from '../common/Icon';

function StatCards({ stats = { total_logs: 0, pending_logs: 0, anchored_logs: 0 }, trends = null }) {
  const totalLogs = stats.total_logs ?? 0;
  const pendingLogs = stats.pending_logs ?? 0;
  const anchoredLogs = stats.anchored_logs ?? 0;
  const anchoredRate = totalLogs > 0 ? Math.round((anchoredLogs / totalLogs) * 100) : 0;
  const pendingRate = totalLogs > 0 ? Math.round((pendingLogs / totalLogs) * 100) : 0;

  const renderTrend = (value) => {
    if (value === undefined || value === null) return null;
    const trendClass = value > 0 ? 'ac-trend-up' : value < 0 ? 'ac-trend-down' : 'ac-trend-neutral';
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';

    return (
      <span className={`ac-trend-indicator ${trendClass}`}>
        {sign}{Math.abs(value)}%
      </span>
    );
  };

  return (
    <section className="ac-stats-grid">
      <div className="ac-stat-card">
        <div className="ac-stat-card__icon ac-stat-card__icon--blue">
          <Icon name="list" size={26} />
        </div>
        <div>
          <div className="ac-stat-card__label">Total Logs</div>
          <div className="ac-stat-card__value">
            {totalLogs.toLocaleString()}
            {renderTrend(trends?.totalLogsTrend)}
          </div>
          <div className="ac-stat-card__sub ac-stat-card__sub--blue">All audit records received</div>
        </div>
        <span className="ac-stat-card__meter ac-stat-card__meter--blue">Live</span>
      </div>

      <div className="ac-stat-card">
        <div className="ac-stat-card__icon ac-stat-card__icon--amber">
          <Icon name="clock" size={26} />
        </div>
        <div>
          <div className="ac-stat-card__label">Pending Anchoring</div>
          <div className="ac-stat-card__value">{pendingLogs.toLocaleString()}</div>
          <div className="ac-stat-card__sub ac-stat-card__sub--amber">
            {pendingLogs > 0 ? `${pendingRate}% waiting for anchor` : 'No anchor backlog'}
          </div>
        </div>
        <span className={`ac-stat-card__meter${pendingLogs > 0 ? (pendingLogs > 100 ? ' ac-stat-card__meter--red' : ' ac-stat-card__meter--amber') : ' ac-stat-card__meter--quiet'}`}>
          {pendingLogs > 0 ? 'Queue' : 'Clear'}
        </span>
      </div>

      <div className="ac-stat-card">
        <div className="ac-stat-card__icon ac-stat-card__icon--teal">
          <Icon name="link" size={26} />
        </div>
        <div>
          <div className="ac-stat-card__label">Anchored Blockchain</div>
          <div className="ac-stat-card__value">
            {anchoredLogs.toLocaleString()}
            {renderTrend(trends?.anchoredLogsTrend)}
          </div>
          <div className="ac-stat-card__sub ac-stat-card__sub--teal">{anchoredRate}% blockchain coverage</div>
        </div>
        <span className="ac-stat-card__meter ac-stat-card__meter--teal">On-chain</span>
      </div>
    </section>
  );
}

const MemoizedStatCards = React.memo(StatCards);

export { StatCards };
export default MemoizedStatCards;
