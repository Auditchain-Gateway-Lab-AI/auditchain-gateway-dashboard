import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import api from '../../api';
import { MonitoringOverview, ClientMonitoringDashboard, monitoringTime } from './MonitoringDashboard';

jest.mock('../../api', () => ({ __esModule: true, default: { get: jest.fn() } }));
const metrics = { total: 12, anchored: 10, pending: 2, logs_24h: 4, valid: 9, tampered: 1, verify_pending: 0, unavailable: 0, not_checked: 2, checked_at: '2026-10-22T01:00:00Z', last_log_at: '2026-10-22T02:00:00Z', oldest_pending_at: null, anchor_percentage: 83.33 };
const client = { id: 'a', company_name: 'Alpha', administrative_status: 'active', condition: 'critical', reasons: [{ code: 'TAMPERED', message: 'Ditemukan log dengan integrity TAMPERED', section: 'integrity' }], metrics, agent_configured: true, agent_active: true, kafka_configured: false, connector_status: 'running' };
const overview = { fetched_at: '2026-10-22T02:00:00Z', summary: { total: 3, critical: 1, attention: 0, unknown: 1 }, attention: [client], clients: [client], total: 1, page: 1, pages: 1 };
const detail = { fetched_at: overview.fetched_at, client, trend: { points: [{ bucket_start: overview.fetched_at, total_logs: 4 }], bucket_seconds: 86400 }, tables: [], pending_threshold_minutes: 15 };
const clients = [{ id: 'a', company_name: 'Alpha' }, { id: 'b', company_name: 'Beta' }];
function Probe() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>; }
function DetailRoute() { const { clientId } = useParams(); return <ClientMonitoringDashboard key={clientId} clientId={clientId} clients={clients} />; }
function renderMonitoring(initial = '/admin') {
  return render(<MemoryRouter initialEntries={[initial]}><Routes><Route path="/admin" element={<MonitoringOverview />} /><Route path="/admin/clients/:clientId/dashboard" element={<DetailRoute />} /></Routes><Probe /></MemoryRouter>);
}
beforeEach(() => { jest.clearAllMocks(); api.get.mockImplementation(url => Promise.resolve({ data: url.startsWith('/admin/monitoring') ? overview : detail })); });
afterEach(() => { jest.useRealTimers(); });

test('filters live in the URL while global summary stays visible', async () => {
  renderMonitoring('/admin?q=Alpha&sort=name&page=2');
  await screen.findByText('Monitoring Client');
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(expect.stringContaining('q=Alpha&sort=name&page=2'), expect.anything()));
  fireEvent.click(screen.getByRole('button', { name: 'Kondisi' }));
  fireEvent.click(screen.getByRole('option', { name: 'Critical' }));
  expect(screen.getByTestId('location')).toHaveTextContent('condition=critical');
  expect(screen.getByTestId('location')).not.toHaveTextContent('page=2');
  await screen.findByText('1 hasil · ringkasan di atas mencakup seluruh client');
  expect(screen.getByRole('button', { name: /Seluruh Client 3/ })).toBeInTheDocument();
});

test('drills into a reason and returns to the exact overview filters', async () => {
  renderMonitoring('/admin?tab=monitoring&q=Alpha&condition=critical');
  fireEvent.click((await screen.findAllByRole('link', { name: 'Ditemukan log dengan integrity TAMPERED' }))[0]);
  await screen.findByRole('heading', { name: 'Integrity Terkini' });
  expect(screen.getByTestId('location')).toHaveTextContent('#integrity');
  expect(screen.getByRole('link', { name: 'Kelola Client' })).toHaveAttribute('href', '/admin?tab=clients&clientId=a');
  fireEvent.click(screen.getByRole('link', { name: 'Client Monitoring' }));
  await screen.findByRole('heading', { name: 'Monitoring Client' });
  expect(screen.getByTestId('location')).toHaveTextContent('/admin?tab=monitoring&q=Alpha&condition=critical');
});

test('keeps last data on refresh failure and supports retry', async () => {
  renderMonitoring();
  await screen.findByRole('link', { name: 'Buka Dashboard →' });
  api.get.mockRejectedValueOnce(new Error('network'));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('link', { name: 'Buka Dashboard →' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Menampilkan data terakhir');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

test('initial load failure can be retried and missing client has a return link', async () => {
  api.get.mockRejectedValueOnce({ response: { status: 404, data: { error: 'Client tidak ditemukan' } } });
  renderMonitoring('/admin/clients/missing/dashboard');
  await screen.findByRole('heading', { name: 'Client tidak ditemukan' });
  expect(screen.getByRole('link', { name: 'Kembali ke monitoring' })).toHaveAttribute('href', '/admin?tab=monitoring');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('heading', { name: 'Integrity Terkini' });
});

test('stale client response cannot overwrite the newly selected client', async () => {
  let resolveAlpha;
  api.get.mockImplementation(url => url.includes('/a/monitoring') ? new Promise(resolve => { resolveAlpha = resolve; }) : Promise.resolve({ data: { ...detail, client: { ...client, id: 'b', company_name: 'Beta' } } }));
  renderMonitoring('/admin/clients/a/dashboard');
  fireEvent.click(screen.getByRole('button', { name: 'Client aktif' }));
  fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
  await screen.findByRole('heading', { name: 'Beta' });
  await act(async () => { resolveAlpha({ data: detail }); });
  expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Alpha' })).not.toBeInTheDocument();
});

test('refreshes at 60 seconds, pauses hidden tabs, and refreshes on visibility', async () => {
  jest.useFakeTimers();
  renderMonitoring();
  await act(async () => {});
  expect(api.get).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(api.get).toHaveBeenCalledTimes(2);
  const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(api.get).toHaveBeenCalledTimes(2);
  hidden.mockReturnValue(false);
  await act(async () => { fireEvent(document, new Event('visibilitychange')); });
  expect(api.get).toHaveBeenCalledTimes(3);
  hidden.mockRestore();
});

test('client selector supports search and detail ranges only fetch read endpoints', async () => {
  renderMonitoring('/admin/clients/a/dashboard');
  await screen.findByRole('heading', { name: 'Integrity Terkini' });
  fireEvent.change(screen.getByLabelText('Cari client lain'), { target: { value: 'Beta' } });
  fireEvent.click(screen.getByRole('button', { name: 'Client aktif' }));
  expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('option', { name: 'Alpha' }), { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Rentang' }));
  expect(screen.getByRole('option', { name: '7 hari' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('option', { name: '24 jam' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/admin/clients/a/monitoring?range=24H', expect.anything()));
  expect(api.get.mock.calls.every(([url]) => url.includes('/monitoring'))).toBe(true);
});

test('shows explicit empty and unchecked states with WIB timestamps', async () => {
  expect(monitoringTime('2026-10-22T01:00:00Z')).toContain('08.00 WIB');
  api.get.mockResolvedValue({ data: { ...overview, clients: [], attention: [], total: 0, summary: { total: 0, critical: 0, attention: 0, unknown: 0 } } });
  renderMonitoring();
  expect(await screen.findByText(/Belum ada client terdaftar/)).toBeInTheDocument();
});
