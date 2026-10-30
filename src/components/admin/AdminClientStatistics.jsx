import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FilterDropdown from '../common/FilterDropdown';
import { Condition, SectionTitle, StatCard, UpdateStatus, useMonitoring } from './MonitoringDashboard';
import { ActivityTrend, AnchoringVisual, IntegrityVisual } from './MonitoringVisuals';
import ClientStatisticsComparison from './ClientStatisticsComparison';
import { monitoringNumber as number } from './monitoringFormatters';
import './AdminClientStatistics.css';

export default function AdminClientStatistics({ onLogout }) {
  const [range, setRange] = useState('7D');
  const navigate = useNavigate();
  const state = useMonitoring(`/admin/monitoring/statistics?range=${range}`, onLogout, { keepPreviousData: true });
  const { data } = state;
  const metrics = data?.metrics;
  const detailURL = client => `/admin/clients/${encodeURIComponent(client.id)}/dashboard?returnTo=${encodeURIComponent('/admin')}`;

  return <section className="monitoring admin-client-statistics" aria-labelledby="all-client-statistics-title">
    <SectionTitle id="all-client-statistics-title" title="Statistik Seluruh Client" icon="activity" description="Gabungan seluruh client terdaftar, termasuk inactive dan pending setup." />
    <UpdateStatus {...state} />
    <div className="monitoring-kpis" aria-busy={state.busy}>
      {[
        ['Total Log', 'total', 'database', 'blue', 'Seluruh audit log tersimpan'],
        ['Anchored', 'anchored', 'shield', 'teal', 'Tercatat di blockchain'],
        ['Pending Anchoring', 'pending', 'clock', 'amber', 'Menunggu anchoring'],
        ['Temuan Tampered', 'tampered', 'alertTriangle', 'coral', 'Hasil integrity terkini'],
      ].map(([label, key, icon, tone, hint]) => <StatCard key={key} label={label} value={metrics?.[key]} icon={icon} tone={tone} hint={hint} />)}
    </div>
    {data && <>
      <ClientStatisticsComparison clients={data.clients} detailURL={detailURL} />
      <section className="monitoring-panel">
        <SectionTitle title="Kondisi Seluruh Client" description="Kondisi terkini berdasarkan hasil monitoring tersimpan. Normal tidak berarti seluruh log telah diperiksa." />
        <div className="admin-client-statistics-conditions">
          {['normal', 'critical', 'attention', 'unknown'].map(condition => <button type="button" key={condition} onClick={() => navigate(`/admin?tab=monitoring&condition=${condition}`)} aria-label={`Lihat client ${condition}`}>
            <Condition value={condition} /><strong>{number(data.summary[condition])}</strong>
          </button>)}
        </div>
      </section>
      <section className="monitoring-panel">
        <SectionTitle title="Tren Aktivitas Seluruh Client" icon="activity" description="Rentang hanya mengubah grafik tren. Angka ringkasan dan kondisi tetap mencakup seluruh data terkini.">
          <div className="monitoring-range"><span>Rentang grafik</span><FilterDropdown ariaLabel="Rentang grafik" className="monitoring-range-dropdown" value={range} options={[{ value: '24H', label: '24 jam' }, { value: '7D', label: '7 hari' }, { value: '30D', label: '30 hari' }]} onChange={setRange} /></div>
        </SectionTitle>
        {state.isPreviousData && <p role="status">Menampilkan tren rentang sebelumnya sampai pembaruan tersedia.</p>}
        <ActivityTrend key={data.trend?.range || range} points={data.trend?.points} range={data.trend?.range || range} bucketSeconds={data.trend?.bucket_seconds} metrics={metrics} />
      </section>
      <div className="monitoring-detail-grid">
        <section className="monitoring-panel monitoring-visual-panel"><SectionTitle title="Integrity Seluruh Log" description="Komposisi hasil pemeriksaan terkini seluruh client." /><IntegrityVisual metrics={metrics} /></section>
        <section className="monitoring-panel monitoring-visual-panel"><SectionTitle title="Cakupan Anchoring" icon="link" description="Persentase berdasarkan total log seluruh client." /><AnchoringVisual metrics={metrics} threshold={data.pending_threshold_minutes} /></section>
      </div>
      <section className="monitoring-panel">
        <SectionTitle title="Client Perlu Perhatian" icon="alertTriangle" description="Maksimal lima client, diprioritaskan berdasarkan kondisi terkini."><Link className="ac-admin-detail-button" to="/admin?tab=monitoring">Lihat Client Monitoring</Link></SectionTitle>
        {data.attention.length === 0 ? <div className="monitoring-empty"><p>{data.summary.total === 0 ? 'Belum ada client terdaftar.' : 'Tidak ada client yang perlu perhatian berdasarkan data tersedia.'}</p></div> : <div className="monitoring-attention">{data.attention.map(client => <article key={client.id} className={`monitoring-attention-item monitoring-attention-item--${client.condition}`}>
          <Link to={detailURL(client)}><strong>{client.company_name}</strong></Link>
          <ul className="monitoring-reasons">{client.reasons.map(reason => <li key={reason.code}><Link to={`${detailURL(client)}#${reason.section}`}>{reason.message}</Link></li>)}</ul>
          <Condition value={client.condition} />
          <Link className="ac-admin-detail-button" to={detailURL(client)} aria-label={`Buka dashboard ${client.company_name}`}>Buka Dashboard</Link>
        </article>)}</div>}
      </section>
    </>}
  </section>;
}
