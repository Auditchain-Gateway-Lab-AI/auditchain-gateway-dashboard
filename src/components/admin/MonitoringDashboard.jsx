import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import Icon from '../common/Icon';
import FilterDropdown from '../common/FilterDropdown';
import './MonitoringDashboard.css';

export const monitoringTime = value => value ? `${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))} WIB` : 'Belum tersedia';
const number = value => value == null ? '—' : new Intl.NumberFormat('id-ID').format(value);
const labels = { critical: 'Critical', attention: 'Attention', unknown: 'Unknown', normal: 'Normal' };
const safeReturn = value => value === '/admin' || value?.startsWith('/admin?') ? value : '/admin?tab=monitoring';
export const Condition = ({ value }) => <span className={`monitoring-badge monitoring-badge--${value}`}>{labels[value] || 'Unknown'}</span>;

function StatCard({ label, value, hint, icon, tone = 'blue', onClick, selected }) {
  const Tag = onClick ? 'button' : 'div';
  return <Tag className={`monitoring-panel monitoring-kpi monitoring-kpi--${tone}`} {...(onClick ? { type: 'button', onClick, 'aria-pressed': selected } : {})}>
    <span className="monitoring-kpi-icon" aria-hidden="true"><Icon name={icon} size={20} /></span>
    <span className="monitoring-kpi-body"><span>{label}</span><strong>{number(value)}</strong>{hint && <small>{hint}</small>}</span>
    {onClick && <span className="monitoring-kpi-arrow" aria-hidden="true"><Icon name="chevronRight" size={16} /></span>}
  </Tag>;
}

function SectionTitle({ id, title, description, icon = 'shield', children }) {
  return <div className="monitoring-section-head"><div className="monitoring-section-title"><span className="monitoring-section-icon" aria-hidden="true"><Icon name={icon} size={18} /></span><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div></div>{children}</div>;
}

// Each URL owns its response. Old requests never replace a newer request, and
// polling failures keep the last successful snapshot visible.
export function useMonitoring(url, onLogout) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const sequence = useRef(0);
  const controller = useRef(null);
  const logout = useRef(onLogout);
  logout.current = onLogout;
  const refresh = useCallback(async () => {
    if (document.hidden) return;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const id = ++sequence.current;
    setBusy(true);
    try {
      const response = await api.get(url, { signal: request.signal });
      if (sequence.current !== id) return;
      setSnapshot({ url, data: response.data }); setError(''); setNotFound(false);
    } catch (err) {
      if (sequence.current !== id || request.signal.aborted) return;
      if (err.response?.status === 401) logout.current?.();
      setNotFound(err.response?.status === 404);
      setError(err.response?.data?.error || 'Pembaruan gagal. Coba lagi.');
    } finally { if (sequence.current === id) setBusy(false); }
  }, [url]);
  useEffect(() => {
    setError(''); setNotFound(false); refresh();
    const timer = setInterval(refresh, 60000);
    const visible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); sequence.current++; controller.current?.abort(); };
  }, [refresh]);
  return { data: snapshot?.url === url ? snapshot.data : null, error, busy, notFound, refresh };
}

function UpdateStatus({ data, error, busy, refresh }) {
  return <div className="monitoring-update">
    <div className="monitoring-update-copy"><span className={`monitoring-update-dot${error ? ' monitoring-update-dot--error' : ''}`} aria-hidden="true" /><span aria-live="polite">{data ? `Diperbarui ${monitoringTime(data.fetched_at)}` : busy ? 'Memuat monitoring…' : 'Data belum tersedia'}</span><span className="monitoring-refresh-note">Refresh otomatis · 60 detik</span></div>
    <button type="button" className="ac-admin-detail-button" disabled={busy} onClick={refresh}><Icon name="refresh" size={14} />{busy ? 'Memuat…' : error ? 'Retry' : 'Refresh'}</button>
    {error && <p role="alert">{error}{data ? ' Menampilkan data terakhir.' : ''}</p>}
  </div>;
}

function Reasons({ client, to }) {
  return <ul className="monitoring-reasons">{client.reasons.map(reason => <li key={reason.code}>{to ? <Link to={`${to}#${reason.section}`}>{reason.message}</Link> : <a href={`#${reason.section}`}>{reason.message}</a>}</li>)}</ul>;
}

export function MonitoringOverview({ onLogout }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams();
  ['q', 'condition', 'status', 'sort', 'page'].forEach(key => { if (params.get(key)) query.set(key, params.get(key)); });
  const state = useMonitoring(`/admin/monitoring/overview?${query}`, onLogout);
  const { data } = state;
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params); next.delete('page');
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: key === 'q' });
  };
  const detailURL = client => `/admin/clients/${encodeURIComponent(client.id)}/dashboard?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
  return <div className="monitoring">
    <UpdateStatus {...state} />
    <div className="monitoring-kpis">{[['total', 'Seluruh Client', 'database', 'blue', 'Seluruh client terdaftar'], ['critical', 'Temuan Kritis', 'alertTriangle', 'coral', 'Critical'], ['attention', 'Perlu Perhatian', 'clock', 'amber', 'Attention'], ['unknown', 'Belum Dinilai', 'eye', 'slate', 'Unknown']].map(([key, label, icon, tone, hint]) => <StatCard key={key} label={label} value={data?.summary[key]} hint={hint} icon={icon} tone={tone} selected={key === 'total' ? !params.get('condition') : params.get('condition') === key} onClick={() => setFilter('condition', key === 'total' ? '' : key)} />)}</div>
    {data && <section className="monitoring-panel" aria-labelledby="monitoring-attention"><SectionTitle id="monitoring-attention" title="Perlu Ditangani" description="Prioritas pemeriksaan untuk tim internal." icon="alertTriangle"><span className="monitoring-count">{data.attention.length} client ditampilkan</span></SectionTitle>{data.attention.length === 0 ? <div className="monitoring-empty"><Icon name="check" size={22} /><p>Tidak ada temuan kritis atau peringatan pada data yang tersedia.</p></div> : <div className="monitoring-attention">{data.attention.map(client => <article key={client.id} className={`monitoring-attention-item monitoring-attention-item--${client.condition}`}><div className="monitoring-attention-identity"><span className="ac-admin-client-cell__avatar" aria-hidden="true">{client.company_name?.charAt(0)?.toUpperCase()}</span><div><Link to={detailURL(client)}><strong>{client.company_name}</strong></Link><small>{client.administrative_status}</small></div></div><Reasons client={client} to={detailURL(client)} /><Condition value={client.condition} /><Link className="monitoring-icon-link" to={detailURL(client)} aria-label={`Buka detail ${client.company_name}`}><Icon name="chevronRight" size={18} /></Link></article>)}</div>}</section>}
    <section className="monitoring-panel monitoring-registry" aria-labelledby="monitoring-clients"><SectionTitle id="monitoring-clients" title="Monitoring Client" description="Integrity, anchoring, dan aktivitas dalam satu tampilan." icon="database"><span className="monitoring-count">{number(data?.summary.total)} terdaftar</span></SectionTitle>
      <div className="monitoring-controls">
        <label>Cari client<input type="search" value={params.get('q') || ''} onChange={e => setFilter('q', e.target.value)} placeholder="Nama perusahaan" /></label>
        <label>Kondisi<FilterDropdown ariaLabel="Kondisi" value={params.get('condition') || ''} onChange={value => setFilter('condition', value)} options={[{ value: '', label: 'Semua kondisi' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} /></label>
        <label>Status administrasi<FilterDropdown ariaLabel="Status administrasi" value={params.get('status') || ''} onChange={value => setFilter('status', value)} options={[{ value: '', label: 'Semua status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'pending_setup', label: 'Pending setup' }]} /></label>
        <label>Urutkan<FilterDropdown ariaLabel="Urutkan" value={params.get('sort') || 'condition'} onChange={value => setFilter('sort', value)} options={[{ value: 'condition', label: 'Prioritas kondisi' }, { value: 'name', label: 'Nama client' }, { value: 'logs_desc', label: 'Aktivitas tertinggi' }]} /></label>
      </div>
      {data && <><p>{number(data.total)} hasil · ringkasan di atas mencakup seluruh client</p><div className="monitoring-table-wrap"><table className="monitoring-table"><thead><tr>{['Client', 'Kondisi', 'Integrity', 'Anchoring', 'Aktivitas', 'Pemeriksaan', 'Aksi'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{data.clients.map(client => <tr key={client.id} onClick={event => { if (!event.target.closest('a,button')) navigate(detailURL(client)); }}>
        <td><div className="monitoring-table-identity"><span className="ac-admin-client-cell__avatar" aria-hidden="true">{client.company_name?.charAt(0)?.toUpperCase()}</span><div><Link to={detailURL(client)}><strong>{client.company_name}</strong></Link><small>{client.administrative_status}</small></div></div></td>
        <td><Condition value={client.condition} /><Reasons client={client} to={detailURL(client)} /></td>
        <td>{number(client.metrics?.tampered)} tampered<small>{number(client.metrics?.not_checked)} belum diperiksa</small></td>
        <td><strong>{number(client.metrics?.pending)}</strong> pending<small>{client.metrics?.anchor_percentage == null ? '—' : `${number(Math.round(client.metrics.anchor_percentage * 10) / 10)}%`} anchored</small><div className="monitoring-coverage" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, client.metrics?.anchor_percentage || 0))}%` }} /></div></td>
        <td>{number(client.metrics?.logs_24h)} log / 24 jam<small>{monitoringTime(client.metrics?.last_log_at)}</small></td>
        <td>{monitoringTime(client.metrics?.checked_at)}</td><td><Link className="ac-admin-detail-button monitoring-open" aria-label="Buka Dashboard →" to={detailURL(client)}>Buka Dashboard <Icon name="chevronRight" size={14} /></Link></td>
      </tr>)}</tbody></table></div>{data.clients.length === 0 && <p className="monitoring-empty">{data.summary.total === 0 ? 'Belum ada client terdaftar. Tambahkan melalui Client Registry.' : 'Tidak ada client sesuai filter.'}</p>}<div className="monitoring-pagination"><button disabled={data.page <= 1} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(data.page - 1)); setParams(next); }}>Sebelumnya</button><span>Halaman {data.page} / {data.pages} · 20 per halaman</span><button disabled={data.page >= data.pages} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(data.page + 1)); setParams(next); }}>Berikutnya</button></div></>}
    </section>
  </div>;
}

export function ClientMonitoringDashboard({ clientId, clients, onLogout }) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const range = ['24H', '7D', '30D'].includes(params.get('range')) ? params.get('range') : '7D';
  const state = useMonitoring(`/admin/clients/${encodeURIComponent(clientId)}/monitoring?range=${range}`, onLogout);
  const { data } = state;
  const returnTo = safeReturn(params.get('returnTo'));
  useEffect(() => {
    if (data && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [data, location.hash]);
  const client = data?.client;
  const clientName = client?.company_name || clients.find(item => item.id === clientId)?.company_name || clientId;
  const metrics = client?.metrics;
  const filtered = clients.filter(item => item.id === clientId || item.company_name?.toLowerCase().includes(search.toLowerCase()));
  const points = data?.trend?.points || [];
  const max = Math.max(1, ...points.map(point => point.total_logs));
  return <div className="monitoring">
    <nav className="monitoring-breadcrumb" aria-label="Breadcrumb"><Link to={returnTo}>Client Monitoring</Link><Icon name="chevronRight" size={13} /><span>{clientName}</span></nav>
    <section className="monitoring-panel monitoring-workspace"><div className="monitoring-client-header"><div className="monitoring-client-identity"><span className="ac-admin-client-cell__avatar" aria-hidden="true">{clientName.charAt(0).toUpperCase()}</span><div><span className="monitoring-eyebrow">CLIENT WORKSPACE</span><h2>{clientName}</h2><p>Monitoring internal · hasil pemeriksaan tersimpan</p></div></div><Link className="ac-admin-detail-button" to={`/admin?tab=clients&clientId=${encodeURIComponent(clientId)}`}><Icon name="settings" size={15} />Kelola Client</Link></div>
    <div className="monitoring-controls monitoring-switcher"><label>Cari client lain<input type="search" placeholder="Nama perusahaan" value={search} onChange={event => setSearch(event.target.value)} /></label><label>Client aktif<FilterDropdown ariaLabel="Client aktif" value={clientId} onChange={value => navigate(`/admin/clients/${encodeURIComponent(value)}/dashboard?returnTo=${encodeURIComponent(returnTo)}`)} options={[...(!clients.some(item => item.id === clientId) ? [{ value: clientId, label: client?.company_name || clientId }] : []), ...filtered.map(item => ({ value: item.id, label: item.company_name }))]} /></label><span className="monitoring-switcher-note"><Icon name="lock" size={14} />Akses monitoring internal</span></div></section>
    <UpdateStatus {...state} />
    {state.notFound && <section className="monitoring-panel"><h2>Client tidak ditemukan</h2><Link to={returnTo}>Kembali ke monitoring</Link></section>}
    {data && <>
      <section className={`monitoring-panel monitoring-condition-panel monitoring-condition-panel--${client.condition}`}><div className="monitoring-condition-top"><span className="monitoring-eyebrow">KONDISI CLIENT</span><Condition value={client.condition} /><span className="monitoring-admin-status">Administrasi: {client.administrative_status}</span></div><Reasons client={client} /><p>Pemeriksaan terakhir: {monitoringTime(metrics?.checked_at)}. Tidak ada aktivitas baru tidak otomatis berarti offline. Kondisi Normal tidak menjamin semua log telah diperiksa.</p></section>
      <div className="monitoring-kpis">{[['Total Log', metrics?.total, 'database', 'blue', 'Audit log tersimpan'], ['Anchored', metrics?.anchored, 'shield', 'teal', 'Tercatat di blockchain'], ['Pending Anchoring', metrics?.pending, 'clock', 'amber', 'Menunggu anchoring'], ['Temuan Tampered', metrics?.tampered, 'alertTriangle', 'coral', 'Hasil integrity terkini']].map(([label, value, icon, tone, hint]) => <StatCard key={label} label={label} value={value} icon={icon} tone={tone} hint={hint} />)}</div>
      <section className="monitoring-panel" id="activity"><SectionTitle title="Tren Aktivitas" icon="activity" description="Volume audit log pada rentang yang dipilih."><div className="monitoring-range"><span>Rentang</span><FilterDropdown ariaLabel="Rentang" className="monitoring-range-dropdown" value={range} options={[{ value: '24H', label: '24 jam' }, { value: '7D', label: '7 hari' }, { value: '30D', label: '30 hari' }]} onChange={value => { const next = new URLSearchParams(params); next.set('range', value); setParams(next); }} /></div></SectionTitle><p>{number(metrics?.logs_24h)} log dalam 24 jam berjalan · aktivitas terakhir {monitoringTime(metrics?.last_log_at)}</p>
      <div className="monitoring-chart" role="img" aria-label={`Tren aktivitas ${range}, ${points.map(point => `${monitoringTime(point.bucket_start)}: ${point.total_logs} log`).join('; ')}`}>{points.map(point => <div className="monitoring-chart-column" key={point.bucket_start}><span>{number(point.total_logs)}</span><div title={`${monitoringTime(point.bucket_start)}: ${number(point.total_logs)} log`} style={{ height: `${Math.max(2, point.total_logs / max * 130)}px` }} /><small>{new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ...(range === '24H' ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' }) }).format(new Date(point.bucket_start))}</small></div>)}</div><small>Awal bucket ditampilkan dalam WIB · {data.trend.bucket_seconds / 3600} jam per bucket</small></section>
      <div className="monitoring-detail-grid"><section className="monitoring-panel" id="integrity"><SectionTitle title="Integrity Terkini" description="Status terakhir per log, bukan jumlah pemeriksaan historis." /><dl>{[['Valid', 'valid'], ['Tampered', 'tampered'], ['Pending verification', 'verify_pending'], ['Unavailable / error', 'unavailable'], ['Belum diperiksa', 'not_checked']].map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{number(metrics?.[key])}</dd></div>)}</dl></section>
      <section className="monitoring-panel" id="anchoring"><SectionTitle title="Anchoring" icon="link" description="Coverage pencatatan audit log di blockchain." /><dl><div><dt>Pending</dt><dd>{number(metrics?.pending)}</dd></div><div><dt>Coverage anchored</dt><dd>{metrics?.anchor_percentage == null ? '—' : `${number(Math.round(metrics.anchor_percentage * 10) / 10)}%`}</dd></div><div><dt>Pending tertua sejak</dt><dd>{monitoringTime(metrics?.oldest_pending_at)}</dd></div></dl><p>Peringatan setelah {data.pending_threshold_minutes} menit sejak log masuk.</p></section></div>
      <section className="monitoring-panel monitoring-registry"><SectionTitle title="Tabel yang Dipantau" icon="database" description="Ringkasan audit dan hasil pemeriksaan per tabel."><span className="monitoring-count">{data.tables.length} tabel</span></SectionTitle><div className="monitoring-table-wrap"><table className="monitoring-table"><thead><tr><th>Tabel</th><th>Log</th><th>Valid</th><th>Tampered</th><th>Pending verifikasi</th><th>Unavailable</th><th>Belum diperiksa</th><th>Pemeriksaan terakhir</th></tr></thead><tbody>{data.tables.map(table => <tr key={table.table_name}><th scope="row">{table.table_name}</th>{['total', 'valid', 'tampered', 'verify_pending', 'unavailable', 'not_checked'].map(key => <td key={key}>{number(table[key])}</td>)}<td>{monitoringTime(table.checked_at)}</td></tr>)}</tbody></table></div>{data.tables.length === 0 && <p className="monitoring-empty">Belum ada tabel atau audit log yang tersedia.</p>}</section>
      <section className="monitoring-panel" id="integration"><SectionTitle title="Kesiapan Integrasi" icon="settings" description="Konfigurasi akses dan laporan connector terakhir." /><dl><div><dt>Agent</dt><dd>{client.agent_configured ? client.agent_active ? 'Dikonfigurasi · aktif' : 'Dikonfigurasi · nonaktif' : 'Belum dikonfigurasi'}</dd></div><div><dt>Kafka</dt><dd>{client.kafka_configured ? client.kafka_active ? 'Dikonfigurasi · aktif' : 'Dikonfigurasi · nonaktif' : 'Belum dikonfigurasi'}</dd></div><div><dt>Connector · terakhir dilaporkan</dt><dd>{client.connector_status || 'Belum tersedia'}</dd></div><div><dt>Konfigurasi Agent diperbarui</dt><dd>{monitoringTime(client.integration_reported_at)}</dd></div></dl><p>Konfigurasi dan laporan terakhir belum membuktikan koneksi saat ini. Dashboard tidak menjalankan ping atau verifikasi otomatis.</p></section>
    </>}
  </div>;
}
