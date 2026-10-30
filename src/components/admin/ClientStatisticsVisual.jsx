import React from 'react';
import Icon from '../common/Icon';
import { monitoringNumber as number, monitoringPercent as percent } from './monitoringFormatters';

const integrityStatuses = [
  ['valid', 'Valid'],
  ['tampered', 'Tampered'],
  ['verify_pending', 'Menunggu verifikasi'],
  ['unavailable', 'Pemeriksaan gagal'],
  ['not_checked', 'Belum diperiksa'],
];

const knownCount = value => Number.isFinite(value) && value >= 0;

export default function ClientStatisticsVisual({ metrics }) {
  const total = knownCount(metrics.total) ? metrics.total : null;
  const coverage = total > 0 ? Math.min(100, Math.max(0,
    Number.isFinite(metrics.anchor_percentage) ? metrics.anchor_percentage
      : knownCount(metrics.anchored) ? metrics.anchored / total * 100 : NaN)) : null;
  const segments = integrityStatuses.map(([key, label]) => ({ key, label, value: knownCount(metrics[key]) ? metrics[key] : 0 }));
  const classified = segments.reduce((sum, item) => sum + item.value, 0);
  // Missing verification results must never be inferred to be valid.
  if (total > classified) segments.push({ key: 'other', label: 'Belum terklasifikasi', value: total - classified });
  const denominator = Math.max(total || 0, classified);
  const visibleSegments = segments.filter(item => item.value > 0);
  const tamperedShare = total > 0 && knownCount(metrics.tampered) ? metrics.tampered / total * 100 : null;
  let offset = 0;

  return <div className="client-statistics-visual">
    <div className="client-statistics-visual-heading"><span>Status anchoring</span><strong>{percent(coverage)} <small>tercakup</small></strong></div>
    <div className="client-statistics-flow" role="group" aria-label="Distribusi status anchoring">
      <div className="client-statistics-source"><Icon name="database" size={18} /><span>Total Log</span><strong>{number(total)}</strong></div>
      <div className="client-statistics-branches">
        {[['anchored', 'Anchored', 'link'], ['pending', 'Pending Anchoring', 'clock']].map(([key, label, icon]) => <div className={`client-statistics-flow-node client-statistics-flow-node--${key}`} key={key}>
          <Icon name={icon} size={15} /><span>{label}</span><strong>{number(metrics[key])}</strong>
        </div>)}
      </div>
    </div>
    <div className="client-statistics-integrity">
      <div className="client-statistics-visual-heading"><span>Komposisi integrity</span><Icon name="shield" size={14} /></div>
      <div className="client-statistics-integrity-body">
        <div className="client-statistics-ring" role="img" aria-label={denominator ? `Komposisi integrity: ${visibleSegments.map(item => `${item.label} ${number(item.value)} log`).join(', ')}` : 'Komposisi integrity belum tersedia'}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="41" fill="none" stroke="var(--monitor-track)" strokeWidth="9" />
            {visibleSegments.map(item => {
              const share = item.value / denominator * 100;
              const start = offset;
              offset += share;
              return <circle key={item.key} className={`monitoring-status-${item.key}`} cx="50" cy="50" r="41" fill="none" stroke="var(--status-color)" strokeWidth="9" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 50 50)"><title>{item.label}: {percent(share)}</title></circle>;
            })}
          </svg>
          <div><strong className={metrics.tampered > 0 ? 'has-findings' : ''}>{percent(tamperedShare)}</strong><span>tampered</span></div>
        </div>
        {denominator ? <dl className="client-statistics-legend">{segments.filter(item => item.value > 0 || item.key === 'tampered').map(item => <div className={`monitoring-status-${item.key}`} key={item.key}><dt><i />{item.label}</dt><dd>{item.key === 'tampered' && !knownCount(metrics.tampered) ? number(null) : number(item.value)}</dd></div>)}</dl> : <span className="client-statistics-no-results">{total === 0 ? 'Belum ada log untuk diperiksa.' : 'Hasil pemeriksaan belum tersedia.'}</span>}
      </div>
      <p className={`client-statistics-insight${metrics.tampered > 0 ? ' has-findings' : ''}`}><Icon name={metrics.tampered > 0 ? 'alertTriangle' : 'eye'} size={13} /><span>{metrics.tampered > 0 ? 'Ada temuan perubahan. Tinjau detail integrity.' : 'Integrity mengikuti hasil pemeriksaan log terkini.'}</span></p>
    </div>
  </div>;
}
