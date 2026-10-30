import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FilterDropdown from '../common/FilterDropdown';
import { Condition, SectionTitle } from './MonitoringDashboard';
import { monitoringNumber as number, monitoringPercent as percent } from './monitoringFormatters';

export default function ClientStatisticsComparison({ clients, detailURL }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('logs_desc');
  const visibleClients = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('id-ID');
    return (clients || []).filter(client => !search || client.company_name.toLocaleLowerCase('id-ID').includes(search)).sort((a, b) => (
      (sort === 'logs_desc' ? (b.metrics?.total ?? 0) - (a.metrics?.total ?? 0) : 0)
      || a.company_name.localeCompare(b.company_name, 'id-ID')
      || a.id.localeCompare(b.id)
    ));
  }, [clients, query, sort]);

  return <section className="monitoring-panel" aria-labelledby="client-comparison-title">
    <SectionTitle id="client-comparison-title" title="Statistik per Client" icon="database" description="Bandingkan statistik masing-masing client dalam satu halaman. Angka mencakup seluruh log tersimpan.">
      <span className="monitoring-count">{number(clients?.length)} client</span>
    </SectionTitle>
    <div className="client-statistics-controls">
      <label>Cari client<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nama perusahaan" /></label>
      <label>Urutkan client<FilterDropdown ariaLabel="Urutkan statistik client" value={sort} onChange={setSort} options={[{ value: 'logs_desc', label: 'Total log tertinggi' }, { value: 'name', label: 'Nama client' }]} /></label>
    </div>
    {!clients ? <p role="status">Statistik per client belum tersedia.</p> : visibleClients.length === 0 ? <div className="monitoring-empty"><p>{clients.length === 0 ? 'Belum ada client untuk dibandingkan.' : 'Tidak ada client sesuai pencarian.'}</p></div> : <>
      <p className="client-statistics-result-count" aria-live="polite">Menampilkan {number(visibleClients.length)} dari {number(clients.length)} client</p>
      <div className="client-statistics-grid">
        {visibleClients.map(client => {
          const metrics = client.metrics || {};
          const coverage = metrics.total > 0 ? metrics.anchor_percentage : null;
          return <article key={client.id} className="client-statistics-card" aria-label={`Statistik ${client.company_name}`}>
            <div className="client-statistics-card-header">
              <div><h3><Link to={detailURL(client)}>{client.company_name}</Link></h3><small>Status administrasi: {client.administrative_status}</small></div>
              <Condition value={client.condition} />
            </div>
            <dl className="client-statistics-metrics">
              {[
                ['Total Log', 'total'], ['Anchored', 'anchored'], ['Pending Anchoring', 'pending'], ['Tampered', 'tampered'],
              ].map(([label, key]) => <div key={key} className={`client-statistics-metric client-statistics-metric--${key}`}><dt>{label}</dt><dd>{number(metrics[key])}</dd></div>)}
            </dl>
            <div className="client-statistics-coverage">
              <div><span>Cakupan anchoring</span><strong>{percent(coverage)}</strong></div>
              <div className="client-statistics-bar" aria-hidden="true"><span style={{ width: `${Number.isFinite(coverage) ? Math.min(100, Math.max(0, coverage)) : 0}%` }} /></div>
            </div>
            <div className="client-statistics-card-footer"><span><strong>{number(metrics.logs_24h)}</strong> log / 24 jam</span><Link className="ac-admin-detail-button" to={detailURL(client)} aria-label={`Lihat detail statistik ${client.company_name}`}>Lihat Detail</Link></div>
          </article>;
        })}
      </div>
    </>}
  </section>;
}
