import React from 'react';
import api from '../../api';
import Icon from '../common/Icon';
import StatCards from './StatCards';

const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' }
];

const formatDateLabel = (date) => (
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
);

const formatTimeLabel = (value) => (
  value
    ? new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    : 'No activity yet'
);

const getLogTime = (log) => {
  if (!log?.timestamp) return 0;
  const normalized = String(log.timestamp).includes('T')
    ? String(log.timestamp)
    : String(log.timestamp).replace(' ', 'T');
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getLogBucket = (log) => {
  const raw = String(
    log?.verification_status ||
    log?.verify_status ||
    log?.integrity_status ||
    log?.status ||
    ''
  ).toLowerCase();

  if (raw.includes('pending') || raw.includes('loading')) return 'pending';
  if (raw.includes('invalid') || raw.includes('failed') || raw.includes('tampered') || raw.includes('error')) return 'invalid';
  if (raw.includes('success') || raw.includes('valid')) return 'valid';
  if (log?.log_id && log?.hash_value) return 'valid';
  return 'pending';
};

const getRangeLogs = (logs = [], rangeDays) => {
  const sorted = [...logs]
    .filter(log => getLogTime(log))
    .sort((a, b) => getLogTime(a) - getLogTime(b));

  if (!sorted.length) return [];

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const rangeStart = new Date(today);
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));

  const rangeStartTime = rangeStart.getTime();
  const rangeEndTime = today.getTime();

  return sorted.filter(log => {
    const time = getLogTime(log);
    return time >= rangeStartTime && time <= rangeEndTime;
  });
};

const buildDailyRows = (logs = [], rangeDays = 30) => {
  const rangeLogs = getRangeLogs(logs, rangeDays);
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const grouped = new Map();
  for (let index = rangeDays - 1; index >= 0; index -= 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    grouped.set(key, {
      key,
      label: formatDateLabel(date),
      valid: 0,
      pending: 0,
      invalid: 0,
      total: 0
    });
  }

  rangeLogs.forEach(log => {
    const date = new Date(getLogTime(log));
    date.setHours(0, 0, 0, 0);
    const row = grouped.get(date.toISOString().slice(0, 10));
    if (!row) return;
    const bucket = getLogBucket(log);
    row[bucket] += 1;
    row.total += 1;
  });

  return Array.from(grouped.values());
};

const getActionDistribution = (logs = []) => {
  const initial = { insert: 0, update: 0, delete: 0, other: 0, total: 0 };

  return logs.reduce((result, log) => {
    const action = String(log.action || '').toUpperCase();
    if (action.includes('INSERT') || action.includes('CREATE') || action.includes('ADD')) result.insert += 1;
    else if (action.includes('UPDATE') || action.includes('MODIFY') || action.includes('EDIT')) result.update += 1;
    else if (action.includes('DELETE') || action.includes('REMOVE') || action.includes('DROP')) result.delete += 1;
    else result.other += 1;
    result.total += 1;
    return result;
  }, initial);
};

const getTableActivity = (logs = []) => {
  const grouped = new Map();

  logs.forEach(log => {
    const name = String(log.source_table || log.resource || 'unknown').split(':')[0] || 'unknown';
    grouped.set(name, (grouped.get(name) || 0) + 1);
  });

  return Array.from(grouped.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
};

const getLatestLog = (logs = []) => (
  [...logs]
    .filter(log => getLogTime(log))
    .sort((a, b) => getLogTime(b) - getLogTime(a))[0] || null
);

const getRangeSummary = (rows) => rows.reduce((summary, row) => ({
  total: summary.total + row.total,
  valid: summary.valid + row.valid,
  pending: summary.pending + row.pending,
  invalid: summary.invalid + row.invalid
}), { total: 0, valid: 0, pending: 0, invalid: 0 });

const getPercent = (value, total) => (
  total > 0 ? Math.round((value / total) * 100) : 0
);

const getActivityRange = (rangeDays) => {
  const to = new Date();
  const from = new Date(to);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (rangeDays - 1));

  return {
    fromISO: from.toISOString(),
    toISO: to.toISOString()
  };
};

const normalizeLogsResponse = (data) => ({
  logs: Array.isArray(data) ? data : (data?.data || []),
  totalPages: Array.isArray(data) ? 1 : (data?.pagination?.total_pages || 1)
});

const fetchDashboardActivityLogs = async ({ rangeDays, selectedClient }) => {
  const pageSize = 200;
  const { fromISO, toISO } = getActivityRange(rangeDays);
  const baseParams = {
    page_size: pageSize,
    sort_order: 'asc',
    from: fromISO,
    to: toISO
  };

  if (selectedClient) baseParams.client_id = selectedClient;

  const firstRes = await api.get('/dashboard/logs', {
    params: { ...baseParams, page: 1 }
  });
  const firstPage = normalizeLogsResponse(firstRes.data);

  if (firstPage.totalPages <= 1) return firstPage.logs;

  const restResponses = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) => (
      api.get('/dashboard/logs', {
        params: { ...baseParams, page: index + 2 }
      })
    ))
  );

  return restResponses.reduce((allLogs, response) => (
    allLogs.concat(normalizeLogsResponse(response.data).logs)
  ), firstPage.logs);
};

function AuditDashboardOverview({ stats = {}, selectedClient = '', onOpenAuditLogs }) {
  const [rangeDays, setRangeDays] = React.useState(30);
  const [hoveredIndex, setHoveredIndex] = React.useState(null);
  const [activityLogs, setActivityLogs] = React.useState([]);
  const [isActivityLoading, setIsActivityLoading] = React.useState(false);
  const [activityError, setActivityError] = React.useState('');
  const activityRequestSeq = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    const requestId = activityRequestSeq.current + 1;
    activityRequestSeq.current = requestId;

    setIsActivityLoading(true);
    setActivityError('');

    fetchDashboardActivityLogs({ rangeDays, selectedClient })
      .then(nextLogs => {
        if (cancelled || requestId !== activityRequestSeq.current) return;
        setActivityLogs(nextLogs);
      })
      .catch(err => {
        if (cancelled || requestId !== activityRequestSeq.current) return;
        console.error('Failed to load dashboard activity logs:', err);
        setActivityLogs([]);
        setActivityError('Daily activity could not be loaded');
      })
      .finally(() => {
        if (!cancelled && requestId === activityRequestSeq.current) {
          setIsActivityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rangeDays, selectedClient]);

  const dailyRows = React.useMemo(() => buildDailyRows(activityLogs, rangeDays), [activityLogs, rangeDays]);
  const rangeLogs = React.useMemo(() => getRangeLogs(activityLogs, rangeDays), [activityLogs, rangeDays]);
  const summary = React.useMemo(() => getRangeSummary(dailyRows), [dailyRows]);
  const actionDist = React.useMemo(() => getActionDistribution(rangeLogs), [rangeLogs]);
  const tableActivity = React.useMemo(() => getTableActivity(rangeLogs), [rangeLogs]);
  const latestLog = React.useMemo(() => getLatestLog(rangeLogs), [rangeLogs]);

  const totalLogs = stats.total_logs ?? 0;
  const pendingLogs = stats.pending_logs ?? summary.pending;
  const anchoredLogs = stats.anchored_logs ?? summary.valid;
  const invalidLogs = summary.invalid;
  const coverageRate = totalLogs > 0 ? Math.round((anchoredLogs / totalLogs) * 100) : 0;
  const dailyMax = Math.max(...dailyRows.map(row => row.total), 1);
  const hoveredRow = hoveredIndex === null ? null : dailyRows[hoveredIndex];
  const topTable = tableActivity[0];
  const chartSampleLabel = summary.total > 0
    ? `${summary.total.toLocaleString()} recent log${summary.total === 1 ? '' : 's'} in this view`
    : 'No logs found in this range';

  const statPayload = {
    ...stats,
    total_logs: totalLogs,
    pending_logs: pendingLogs,
    anchored_logs: anchoredLogs
  };

  return (
    <>
      <section className="ac-dashboard-head">
        <div>
          <span className="ac-page-kicker">Analytics & Reports</span>
          <h1 className="ac-dashboard-head__title">Dashboard</h1>
          <p className="ac-dashboard-head__subtitle">
            Fokus utama: log masuk, antrean anchoring, dan coverage blockchain. Grafik di bawah membaca aktivitas harian, bukan angka kumulatif.
          </p>
        </div>
        <div className="ac-dashboard-head__actions">
          <select
            className="ac-select ac-dashboard-range-select"
            value={rangeDays}
            onChange={event => {
              setRangeDays(Number(event.target.value));
              setHoveredIndex(null);
            }}
          >
            {RANGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="button" className="ac-btn-ghost-action" onClick={onOpenAuditLogs}>
            <Icon name="history" size={14} />
            View Audit Logs
          </button>
        </div>
      </section>

      <StatCards stats={statPayload} />

      <section className="ac-card ac-chart-card ac-chart-card--wide ac-daily-chart-card">
        <div className="ac-chart-card__header">
          <div>
            <h2>Daily Audit Activity</h2>
            <p>
              {isActivityLoading ? 'Loading daily activity...' : activityError || chartSampleLabel}.
              {' '}Green is anchored, amber is waiting, red needs review.
            </p>
          </div>
          <div className="ac-chart-legend">
            <span><i className="ac-dot-status ac-dot-status--valid" />Anchored</span>
            <span><i className="ac-dot-status ac-dot-status--pending" />Pending</span>
            <span><i className="ac-dot-status ac-dot-status--invalid" />Issue</span>
          </div>
        </div>

        <div className="ac-daily-chart" onMouseLeave={() => setHoveredIndex(null)}>
          <div className="ac-daily-chart__plot" style={{ '--chart-days': dailyRows.length }}>
            {dailyRows.map((row, index) => {
              const totalHeight = Math.max((row.total / dailyMax) * 100, row.total > 0 ? 8 : 0);
              const validPct = getPercent(row.valid, row.total);
              const pendingPct = getPercent(row.pending, row.total);
              const invalidPct = getPercent(row.invalid, row.total);

              return (
                <button
                  type="button"
                  key={row.key}
                  className={`ac-daily-chart__bar${hoveredIndex === index ? ' ac-daily-chart__bar--active' : ''}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onFocus={() => setHoveredIndex(index)}
                  aria-label={`${row.label}: ${row.total} logs`}
                >
                  <span className="ac-daily-chart__bar-stack" style={{ height: `${totalHeight}%` }}>
                    {row.invalid > 0 && <i className="ac-daily-chart__segment ac-daily-chart__segment--invalid" style={{ height: `${invalidPct}%` }} />}
                    {row.pending > 0 && <i className="ac-daily-chart__segment ac-daily-chart__segment--pending" style={{ height: `${pendingPct}%` }} />}
                    {row.valid > 0 && <i className="ac-daily-chart__segment ac-daily-chart__segment--valid" style={{ height: `${validPct}%` }} />}
                  </span>
                </button>
              );
            })}
          </div>

          {hoveredRow && (
            <div
              className={`ac-daily-chart-tooltip${hoveredIndex > dailyRows.length - 5 ? ' ac-daily-chart-tooltip--left' : ''}`}
              style={{ left: `${((hoveredIndex + 0.5) / dailyRows.length) * 100}%` }}
            >
              <strong>{hoveredRow.label}</strong>
              <span>Total: {hoveredRow.total.toLocaleString()}</span>
              <span className="ac-line-chart-tooltip__valid">Anchored: {hoveredRow.valid.toLocaleString()}</span>
              <span className="ac-line-chart-tooltip__pending">Pending: {hoveredRow.pending.toLocaleString()}</span>
              <span className="ac-line-chart-tooltip__invalid">Issue: {hoveredRow.invalid.toLocaleString()}</span>
            </div>
          )}

          <div className="ac-daily-chart-axis">
            {dailyRows
              .filter((_, index) => index === 0 || index === Math.floor(dailyRows.length / 2) || index === dailyRows.length - 1)
              .map(row => <span key={row.key}>{row.label}</span>)}
          </div>
        </div>
      </section>

      <section className="ac-card ac-dashboard-insights">
        <div className="ac-dashboard-insights__head">
          <div>
            <h2>Dashboard Insight</h2>
            <p>Snapshot singkat dari data yang sedang terlihat di dashboard.</p>
          </div>
          <button type="button" onClick={onOpenAuditLogs}>
            <Icon name="search" size={14} />
            Inspect Logs
          </button>
        </div>

        <div className="ac-dashboard-insights__grid">
          <div className="ac-dashboard-insights__section">
            <span className={`ac-dashboard-health-dot${pendingLogs || invalidLogs ? ' ac-dashboard-health-dot--warn' : ''}`} />
            <div>
              <h3>{pendingLogs || invalidLogs ? 'Needs Attention' : 'Healthy'}</h3>
              <p>
                {pendingLogs || invalidLogs
                  ? `${pendingLogs.toLocaleString()} pending and ${invalidLogs.toLocaleString()} issue log in the selected sample.`
                  : 'No pending queue or issue log in the selected sample.'}
              </p>
            </div>
          </div>

          <div className="ac-dashboard-insights__facts">
            <div>
              <span>Coverage</span>
              <strong>{coverageRate}%</strong>
            </div>
            <div>
              <span>Latest Activity</span>
              <strong>{formatTimeLabel(getLogTime(latestLog))}</strong>
            </div>
            <div>
              <span>Top Source Table</span>
              <strong>{topTable ? `${topTable.name} (${topTable.total})` : 'No source yet'}</strong>
            </div>
          </div>

          <div className="ac-dashboard-action-mix">
            {[
              { key: 'insert', label: 'Insert', value: actionDist.insert, tone: 'blue' },
              { key: 'update', label: 'Update', value: actionDist.update, tone: 'amber' },
              { key: 'delete', label: 'Delete', value: actionDist.delete, tone: 'red' }
            ].map(item => (
              <div className="ac-dashboard-action-mix__row" key={item.key}>
                <span>{item.label}</span>
                <i>
                  <b
                    className={`ac-dashboard-action-mix__fill ac-dashboard-action-mix__fill--${item.tone}`}
                    style={{ width: `${getPercent(item.value, actionDist.total)}%` }}
                  />
                </i>
                <strong>{item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const MemoizedAuditDashboardOverview = React.memo(AuditDashboardOverview);

export { AuditDashboardOverview };
export default MemoizedAuditDashboardOverview;
