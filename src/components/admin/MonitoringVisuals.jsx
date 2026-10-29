import React, { useId, useRef, useState } from 'react';
import Icon from '../common/Icon';
import { monitoringCount as count, monitoringNumber as number, monitoringPercent as percent, monitoringTime } from './monitoringFormatters';

const statuses = [
  { key: 'valid', label: 'Valid', description: 'Lolos pemeriksaan', icon: 'check' },
  { key: 'tampered', label: 'Tampered', description: 'Terindikasi berubah', icon: 'alertTriangle' },
  { key: 'verify_pending', label: 'Menunggu verifikasi', description: 'Hasil belum selesai', icon: 'clock' },
  { key: 'unavailable', label: 'Pemeriksaan gagal', description: 'Hasil tidak tersedia', icon: 'alertTriangle' },
  { key: 'not_checked', label: 'Belum diperiksa', description: 'Belum memiliki hasil', icon: 'eye' },
];

function distribution(metrics = {}) {
  const segments = statuses.map(status => ({ ...status, value: count(metrics[status.key]) }));
  const classified = segments.reduce((sum, segment) => sum + segment.value, 0);
  const total = Math.max(count(metrics.total), classified);
  if (total > classified) segments.push({ key: 'other', label: 'Status lainnya', description: 'Belum terklasifikasi', value: total - classified, icon: 'eye' });
  return { segments, total };
}

function bucketLabel(value, range) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Belum tersedia';
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ...(range === '24H' ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' }) }).format(new Date(value));
}

function axisStep(maximum) {
  const rough = Math.max(1, maximum / 4);
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 2.5, 5, 10].map(multiplier => multiplier * power).find(step => step >= rough && Number.isInteger(step)) || Math.ceil(rough);
}

function activityPath(samples) {
  if (!samples.length) return '';
  return samples.reduce((path, sample, index) => {
    if (!index) return `M ${sample.x} ${sample.y}`;
    const previous = samples[index - 1];
    const midpoint = (previous.x + sample.x) / 2;
    // Horizontal control points keep each curve within its two observed values.
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${sample.y}, ${sample.x} ${sample.y}`;
  }, '');
}

export function ActivityTrend({ points = [], range, bucketSeconds, metrics = {} }) {
  const chartId = useId().replace(/:/g, '');
  const [selected, setSelected] = useState(null);
  const pointButtons = useRef([]);
  const values = points.map(point => ({ ...point, value: count(point.total_logs) }));
  const maximum = Math.max(0, ...values.map(point => point.value));
  const ceiling = axisStep(maximum) * 4;
  const samples = values.map((point, index) => ({ ...point, x: values.length === 1 ? 500 : 16 + index / (values.length - 1) * 968, y: 216 - point.value / ceiling * 196 }));
  const activeIndex = Math.min(selected ?? Math.max(0, samples.length - 1), Math.max(0, samples.length - 1));
  const active = samples[activeIndex];
  const peak = values.find(point => point.value === maximum);
  const total = values.reduce((sum, point) => sum + point.value, 0);
  const line = activityPath(samples);
  const area = samples.length > 1 ? `${line} L ${samples[samples.length - 1].x} 216 L ${samples[0].x} 216 Z` : '';
  const movePoint = (event, index) => {
    let next;
    if (event.key === 'ArrowRight') next = Math.min(samples.length - 1, index + 1);
    if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = samples.length - 1;
    if (next != null) { event.preventDefault(); setSelected(next); pointButtons.current[next]?.focus(); }
  };

  return <div className="monitoring-trend">
    <div className="monitoring-trend-summary">
      <div><span>24 jam terakhir</span><strong>{number(metrics.logs_24h)} <small>log</small></strong><small>Aktivitas terbaru {monitoringTime(metrics.last_log_at)}</small></div>
      <div><span>Total pada rentang ini</span><strong>{samples.length ? number(total) : '—'} <small>log</small></strong><small>{range === '24H' ? '24 jam' : range === '30D' ? '30 hari' : '7 hari'} berjalan</small></div>
      <div><span>Puncak aktivitas</span><strong>{samples.length ? number(maximum) : '—'} <small>log</small></strong><small>{maximum > 0 ? bucketLabel(peak?.bucket_start, range) : 'Belum ada aktivitas tercatat'}</small></div>
    </div>
    {!samples.length ? <div className="monitoring-empty"><Icon name="activity" size={22} /><p>Belum ada data aktivitas pada rentang ini.</p></div> : <figure className="monitoring-trend-figure" aria-label={`Tren aktivitas ${range}`}>
      <div className="monitoring-trend-caption"><span><i />Volume audit log</span><div className="monitoring-trend-readout" aria-live="polite"><span>{monitoringTime(active.bucket_start)}</span><strong>{number(active.value)} log</strong></div></div>
      <div className="monitoring-trend-plot">
        <div className="monitoring-trend-canvas">
          {[0, 1, 2, 3, 4].map(tick => <div className="monitoring-trend-gridline" key={tick} style={{ top: `${(20 + tick * 49) / 240 * 100}%` }}><span>{number(ceiling - tick * ceiling / 4)}</span></div>)}
          <svg className="monitoring-trend-svg" viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--monitor-chart)" stopOpacity=".24" /><stop offset="100%" stopColor="var(--monitor-chart)" stopOpacity=".015" /></linearGradient></defs>
            {area && <path d={area} fill={`url(#${chartId}-fill)`} />}
            <path d={line} fill="none" stroke="var(--monitor-chart)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <line x1={active.x} x2={active.x} y1="12" y2="216" stroke="var(--monitor-chart)" strokeOpacity=".35" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="monitoring-trend-points" role="group" aria-label="Pilih titik aktivitas">
            {samples.map((point, index) => <button key={point.bucket_start} ref={element => { pointButtons.current[index] = element; }} type="button" className={`monitoring-trend-point${index === activeIndex ? ' is-active' : ''}`} style={{ left: `${point.x / 10}%`, top: `${point.y / 240 * 100}%` }} aria-label={`${monitoringTime(point.bucket_start)}: ${number(point.value)} log`} aria-pressed={index === activeIndex} onMouseEnter={() => setSelected(index)} onFocus={() => setSelected(index)} onClick={() => setSelected(index)} onKeyDown={event => movePoint(event, index)}><span /></button>)}
          </div>
        </div>
        <div className="monitoring-trend-axis" aria-hidden="true">{samples.map((point, index) => (samples.length <= 7 || index === 0 || index === samples.length - 1 || index % Math.ceil((samples.length - 1) / 4) === 0) && <span key={point.bucket_start} style={{ left: `${point.x / 10}%` }}>{bucketLabel(point.bucket_start, range)}</span>)}</div>
      </div>
      <figcaption>{maximum === 0 ? 'Belum ada log pada rentang ini. ' : 'Arahkan kursor atau pilih titik untuk melihat jumlah log. '}Waktu dalam WIB{bucketSeconds > 0 ? ` · ${number(bucketSeconds / 3600)} jam per titik` : ''}.</figcaption>
    </figure>}
  </div>;
}

export function IntegrityVisual({ metrics = {} }) {
  const { segments, total } = distribution(metrics);
  let offset = 0;
  return <>
    <div className="monitoring-integrity-visual">
      <div className="monitoring-donut" role="img" aria-label={total ? `${percent(count(metrics.valid) / total * 100)} dari seluruh log berstatus Valid` : 'Belum ada audit log'}>
        <svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="70" fill="none" stroke="var(--monitor-track)" strokeWidth="18" />{segments.filter(segment => segment.value > 0).map(segment => {
          const share = segment.value / total * 100;
          const start = offset; offset += share;
          return <circle key={segment.key} className={`monitoring-status-${segment.key}`} cx="90" cy="90" r="70" fill="none" stroke="var(--status-color)" strokeWidth="18" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 90 90)"><title>{segment.label}: {number(segment.value)} log</title></circle>;
        })}</svg>
        <div><strong>{total ? percent(count(metrics.valid) / total * 100) : '—'}</strong><span>{total ? 'log valid' : 'Belum ada log'}</span><small>{total ? `dari ${number(total)} log` : 'Menunggu data audit'}</small></div>
      </div>
      <ul className="monitoring-status-legend">{segments.map(segment => <li className={`monitoring-status-${segment.key}`} key={segment.key}><span className="monitoring-status-dot" /><div><strong>{segment.label}</strong><small>{segment.description}</small></div><div className="monitoring-status-value"><strong>{number(segment.value)}</strong><small>{total ? percent(segment.value / total * 100) : '—'}</small></div></li>)}</ul>
    </div>
    <div className={`monitoring-visual-note${count(metrics.tampered) > 0 ? ' monitoring-visual-note--critical' : ''}`}><Icon name={count(metrics.tampered) > 0 ? 'alertTriangle' : 'eye'} size={16} /><span>{count(metrics.tampered) > 0 ? `${number(metrics.tampered)} log berstatus Tampered perlu ditinjau.` : total ? 'Belum diperiksa berarti log belum memiliki hasil verifikasi.' : 'Komposisi integrity akan muncul setelah ada audit log.'}</span></div>
  </>;
}

export function AnchoringVisual({ metrics = {}, threshold = 15 }) {
  const total = count(metrics.total);
  const anchored = count(metrics.anchored);
  const pending = count(metrics.pending);
  const coverage = total > 0 ? Math.min(100, Math.max(0, Number.isFinite(metrics.anchor_percentage) ? metrics.anchor_percentage : anchored / total * 100)) : null;
  const complete = coverage === 100 && pending === 0;
  return <>
    <div className="monitoring-anchor-headline"><div><strong>{percent(coverage)}</strong><span>log tercatat di blockchain</span></div><span className={`monitoring-anchor-state${complete ? ' is-complete' : ''}`}><Icon name={complete ? 'check' : 'clock'} size={14} />{!total ? 'Menunggu data' : complete ? 'Seluruh log tercatat' : 'Proses anchoring'}</span></div>
    <div className="monitoring-anchor-progress" role="meter" aria-label="Persentase log yang sudah di-anchor" aria-valuemin={0} aria-valuemax={100} aria-valuenow={coverage ?? 0} aria-valuetext={coverage == null ? 'Belum ada log' : `${percent(coverage)} sudah tercatat`}><span style={{ width: `${coverage ?? 0}%` }} /></div>
    <div className="monitoring-anchor-flow">
      {[{ icon: 'database', label: 'Log Gateway', value: total, tone: 'source' }, { icon: 'clock', label: 'Menunggu', value: pending, tone: 'pending' }, { icon: 'shield', label: 'Tercatat', value: anchored, tone: 'anchored' }].map(step => <div className={`monitoring-anchor-step monitoring-anchor-step--${step.tone}`} key={step.tone}><span className="monitoring-anchor-node"><Icon name={step.icon} size={21} /></span><span>{step.label}</span><strong>{number(step.value)}</strong><small>log</small></div>)}
    </div>
    <div className={`monitoring-visual-note${pending > 0 ? ' monitoring-visual-note--pending' : ''}`}><Icon name={pending > 0 ? 'clock' : total ? 'check' : 'database'} size={16} /><span>{pending > 0 ? <>Antrean tertua sejak <strong>{monitoringTime(metrics.oldest_pending_at)}</strong>. Peringatan setelah {number(threshold)} menit.</> : total ? 'Tidak ada log yang menunggu anchoring.' : 'Belum ada audit log untuk di-anchor.'}</span></div>
    <p className="monitoring-anchor-explanation">Anchoring menunjukkan log sudah tercatat. Hasil pemeriksaan log dapat dilihat pada Integrity Terkini.</p>
  </>;
}

function StatusStrip({ metrics }) {
  const { segments, total } = distribution(metrics);
  return <div className="monitoring-status-strip" role="img" aria-label={total ? segments.map(segment => `${segment.label}: ${number(segment.value)}`).join(', ') : 'Belum ada log'}>{segments.filter(segment => segment.value > 0).map(segment => <span key={segment.key} className={`monitoring-status-${segment.key}`} title={`${segment.label}: ${number(segment.value)} log`} style={{ width: `${segment.value / total * 100}%` }} />)}</div>;
}

function tableCondition(table) {
  if (count(table.tampered) > 0) return { tone: 'critical', icon: 'alertTriangle', label: `${number(table.tampered)} tampered`, rank: 0 };
  if (count(table.unavailable) > 0) return { tone: 'attention', icon: 'alertTriangle', label: `${number(table.unavailable)} gagal diperiksa`, rank: 1 };
  if (!count(table.total)) return { tone: 'unknown', icon: 'database', label: 'Belum ada log', rank: 3 };
  if (count(table.valid) !== count(table.total)) return { tone: 'unknown', icon: 'clock', label: 'Belum selesai', rank: 2 };
  return { tone: 'normal', icon: 'check', label: 'Semua valid', rank: 4 };
}

export function TableHealth({ tables = [] }) {
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [expanded, setExpanded] = useState([]);
  const detailId = useId();
  const issueCount = tables.filter(table => count(table.tampered) > 0 || count(table.unavailable) > 0).length;
  const visible = tables.filter(table => !issuesOnly || count(table.tampered) > 0 || count(table.unavailable) > 0).sort((left, right) => tableCondition(left).rank - tableCondition(right).rank || left.table_name.localeCompare(right.table_name, 'id'));
  const toggle = name => setExpanded(current => current.includes(name) ? current.filter(value => value !== name) : [...current, name]);
  return <div className="monitoring-health-content">
    <div className="monitoring-health-toolbar"><div className="monitoring-health-tabs" role="group" aria-label="Filter tabel"><button type="button" aria-pressed={!issuesOnly} onClick={() => setIssuesOnly(false)}>Semua tabel <span>{number(tables.length)}</span></button><button type="button" aria-pressed={issuesOnly} onClick={() => setIssuesOnly(true)}>Perlu perhatian <span className={issueCount ? 'has-issues' : ''}>{number(issueCount)}</span></button></div><small>Temuan ditampilkan lebih dulu</small></div>
    <div className="monitoring-strip-legend">{statuses.map(status => <span className={`monitoring-status-${status.key}`} key={status.key}><i />{status.label}</span>)}</div>
    {visible.length > 0 ? <div className="monitoring-table-wrap monitoring-health-wrap"><table className="monitoring-table monitoring-health-table"><thead><tr><th>Tabel / total log</th><th>Komposisi integrity</th><th>Kondisi</th><th>Pemeriksaan terakhir</th><th><span className="monitoring-sr-only">Rincian status</span></th></tr></thead><tbody>{visible.map((table, index) => {
      const condition = tableCondition(table);
      const open = expanded.includes(table.table_name);
      const { segments, total } = distribution(table);
      return <React.Fragment key={table.table_name}><tr className={`monitoring-health-row${open ? ' is-expanded' : ''}`} data-expanded={open} onClick={() => toggle(table.table_name)}>
        <th scope="row" className="monitoring-health-name"><strong>{table.table_name}</strong><small>{number(table.total)} log</small></th>
        <td className="monitoring-health-composition"><StatusStrip metrics={table} /><div><span>{total ? `${percent(count(table.valid) / total * 100)} valid` : 'Belum ada data'}</span><small>{count(table.not_checked) > 0 ? `${number(table.not_checked)} belum diperiksa` : count(table.verify_pending) > 0 ? `${number(table.verify_pending)} menunggu verifikasi` : 'Status pemeriksaan terkini'}</small></div></td>
        <td className="monitoring-health-state"><span className={`monitoring-table-state monitoring-table-state--${condition.tone}`}><Icon name={condition.icon} size={13} />{condition.label}</span>{count(table.tampered) > 0 && count(table.unavailable) > 0 && <small>{number(table.unavailable)} gagal diperiksa</small>}</td>
        <td className="monitoring-health-time"><span>{monitoringTime(table.checked_at)}</span></td>
        <td className="monitoring-health-action"><button type="button" onClick={event => { event.stopPropagation(); toggle(table.table_name); }} aria-label={`${open ? 'Tutup' : 'Detail'} status tabel ${table.table_name}`} aria-expanded={open} aria-controls={open ? `${detailId}-${index}` : undefined}>{open ? 'Tutup' : 'Detail'}<Icon name="chevronDown" size={14} /></button></td>
      </tr>{open && <tr className="monitoring-health-details" id={`${detailId}-${index}`}><td colSpan={5}><div role="group" aria-label={`Rincian status ${table.table_name}`}>{segments.map(segment => <div className={`monitoring-status-${segment.key}`} key={segment.key}><span><i className="monitoring-status-dot" />{segment.label}</span><strong>{number(segment.value)} <small>log</small></strong></div>)}</div></td></tr>}</React.Fragment>;
    })}</tbody></table></div> : <div className="monitoring-empty"><Icon name={issuesOnly ? 'check' : 'database'} size={22} /><p>{issuesOnly ? 'Tidak ada tabel dengan status Tampered atau pemeriksaan gagal.' : 'Belum ada tabel atau audit log yang tersedia.'}</p></div>}
    <p className="monitoring-health-help">Klik baris tabel atau pilih Detail untuk melihat jumlah log pada setiap status. Warna menunjukkan proporsi log dalam satu tabel.</p>
  </div>;
}
