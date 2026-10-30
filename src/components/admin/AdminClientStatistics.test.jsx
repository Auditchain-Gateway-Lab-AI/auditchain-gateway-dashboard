import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import api from '../../api';
import AdminClientStatistics from './AdminClientStatistics';

jest.mock('../../api', () => ({ __esModule: true, default: { get: jest.fn() } }));
const snapshot = {
  fetched_at: '2026-10-29T02:00:00Z',
  summary: { total: 24, normal: 20, critical: 1, attention: 2, unknown: 1 },
  metrics: { total: 1000, anchored: 900, pending: 100, tampered: 2, valid: 898, not_checked: 100, logs_24h: 15, anchor_percentage: 90 },
  trend: { range: '7D', points: [{ bucket_start: '2026-10-29T00:00:00Z', total_logs: 15 }], bucket_seconds: 86400 },
  attention: [{ id: 'a/b', company_name: 'Alpha', condition: 'critical', reasons: [{ code: 'TAMPERED', message: 'Log berubah', section: 'integrity' }] }],
  clients: [
    { id: 'a/b', company_name: 'Alpha', condition: 'critical', administrative_status: 'active', metrics: { total: 111, anchored: 80, pending: 31, tampered: 2, logs_24h: 12, anchor_percentage: 80 / 111 * 100 } },
    { id: 'b', company_name: 'Beta', condition: 'normal', administrative_status: 'inactive', metrics: { total: 222, anchored: 200, pending: 22, tampered: 0, logs_24h: 3, anchor_percentage: 200 / 222 * 100 } },
    { id: 'c', company_name: 'Gamma', condition: 'unknown', administrative_status: 'pending_setup', metrics: { total: 0, anchored: 0, pending: 0, tampered: 0, logs_24h: 0, anchor_percentage: null } },
  ],
  pending_threshold_minutes: 15,
};
function Probe() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
function mount(onLogout = jest.fn()) { return render(<MemoryRouter initialEntries={['/admin']}><AdminClientStatistics onLogout={onLogout} /><Probe /></MemoryRouter>); }
beforeEach(() => { jest.clearAllMocks(); api.get.mockImplementation(url => Promise.resolve({ data: { ...snapshot, trend: { ...snapshot.trend, range: new URL(url, 'http://test').searchParams.get('range') || '7D' } } })); });
afterEach(() => jest.useRealTimers());

test('shows global metrics, links filtered conditions and client details', async () => {
  mount();
  await screen.findAllByText('1.000');
  expect(screen.getByRole('link', { name: 'Buka dashboard Alpha' })).toHaveAttribute('href', '/admin/clients/a%2Fb/dashboard?returnTo=%2Fadmin');
  expect(screen.getByRole('link', { name: 'Log berubah' })).toHaveAttribute('href', '/admin/clients/a%2Fb/dashboard?returnTo=%2Fadmin#integrity');
  fireEvent.click(screen.getByRole('button', { name: 'Lihat client critical' }));
  expect(screen.getByTestId('location')).toHaveTextContent('/admin?tab=monitoring&condition=critical');
});

test('shows independent statistics for multiple clients together, with search and sorting', async () => {
  mount();
  const comparison = await screen.findByRole('region', { name: 'Statistik per Client' });
  await within(comparison).findByRole('article', { name: 'Statistik Alpha' });
  const alpha = within(comparison).getByRole('article', { name: 'Statistik Alpha' });
  const beta = within(comparison).getByRole('article', { name: 'Statistik Beta' });
  const gamma = within(comparison).getByRole('article', { name: 'Statistik Gamma' });
  expect(within(alpha).getByText('111')).toBeInTheDocument();
  expect(within(alpha).getByText('80')).toBeInTheDocument();
  expect(within(alpha).getByText('31')).toBeInTheDocument();
  expect(within(alpha).getByText('2')).toBeInTheDocument();
  expect(within(within(beta).getByRole('group', { name: 'Distribusi status anchoring' })).getByText('222')).toBeInTheDocument();
  expect(within(beta).getByText('200')).toBeInTheDocument();
  expect(within(gamma).getAllByText('—').length).toBeGreaterThan(0);
  expect(within(gamma).queryByText('100%')).not.toBeInTheDocument();
  expect(within(alpha).getByRole('link', { name: 'Lihat detail statistik Alpha' })).toHaveAttribute('href', '/admin/clients/a%2Fb/dashboard?returnTo=%2Fadmin');
  expect(within(comparison).getAllByRole('article').map(card => card.getAttribute('aria-label'))).toEqual(['Statistik Beta', 'Statistik Alpha', 'Statistik Gamma']);
  fireEvent.click(within(comparison).getByRole('button', { name: 'Urutkan statistik client' }));
  fireEvent.click(screen.getByRole('option', { name: 'Nama client' }));
  expect(within(comparison).getAllByRole('article')[0]).toHaveAttribute('aria-label', 'Statistik Alpha');
  const search = within(comparison).getByRole('searchbox', { name: 'Cari client' });
  fireEvent.change(search, { target: { value: ' bEtA ' } });
  expect(within(comparison).getAllByRole('article')).toHaveLength(1);
  expect(within(comparison).getAllByText('222').length).toBeGreaterThan(0);
  expect(screen.getAllByText('1.000')).toHaveLength(2);
  fireEvent.change(search, { target: { value: 'missing' } });
  expect(within(comparison).getByText('Tidak ada client sesuai pencarian.')).toBeInTheDocument();
  fireEvent.change(search, { target: { value: '' } });
  expect(within(comparison).getAllByRole('article')).toHaveLength(3);
});

test('comparison includes every client beyond a monitoring table page', async () => {
  api.get.mockResolvedValue({ data: { ...snapshot, clients: Array.from({ length: 25 }, (_, index) => ({ ...snapshot.clients[0], id: `client-${index}`, company_name: `Company ${index + 1}` })) } });
  mount();
  const comparison = await screen.findByRole('region', { name: 'Statistik per Client' });
  await within(comparison).findByText('Menampilkan 25 dari 25 client');
  expect(within(comparison).getAllByRole('article')).toHaveLength(25);
  expect(within(comparison).getByRole('article', { name: 'Statistik Company 25' })).toBeInTheDocument();
});

test('changes trend range while keeping all-time totals and ignores old responses', async () => {
  mount();
  await screen.findAllByText('1.000');
  let resolveOld;
  api.get.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rentang grafik' }));
  fireEvent.click(screen.getByRole('option', { name: '24 jam' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/admin/monitoring/statistics?range=24H', expect.anything()));
  await screen.findAllByText('1.000');
  await screen.findByRole('figure', { name: 'Tren aktivitas 24H' });
  await act(async () => resolveOld({ data: { ...snapshot, metrics: { ...snapshot.metrics, total: 99999 } } }));
  expect(screen.getAllByText('1.000')).toHaveLength(2);
  expect(screen.queryByText('99.999')).not.toBeInTheDocument();
});

test('keeps global metrics and accurately labels the previous trend when a range change fails', async () => {
  mount();
  await screen.findByRole('figure', { name: 'Tren aktivitas 7D' });
  api.get.mockRejectedValueOnce(new Error('network'));
  fireEvent.click(screen.getByRole('button', { name: 'Rentang grafik' }));
  fireEvent.click(screen.getByRole('option', { name: '30 hari' }));
  await screen.findByRole('alert');
  expect(screen.getAllByText('1.000')).toHaveLength(2);
  expect(screen.getByText('Menampilkan tren rentang sebelumnya sampai pembaruan tersedia.')).toHaveAttribute('role', 'status');
  expect(screen.getByRole('figure', { name: 'Tren aktivitas 7D' })).toBeInTheDocument();
  expect(screen.queryByRole('figure', { name: 'Tren aktivitas 30D' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('figure', { name: 'Tren aktivitas 30D' });
  expect(screen.queryByText('Menampilkan tren rentang sebelumnya sampai pembaruan tersedia.')).not.toBeInTheDocument();
});

test('retains snapshot after refresh failure and supports retry', async () => {
  mount();
  await screen.findAllByText('1.000');
  api.get.mockRejectedValueOnce(new Error('network'));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Menampilkan data terakhir');
  expect(screen.getAllByText('1.000')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

test('loading and initial failure do not fabricate zero counts or healthy charts', async () => {
  api.get.mockRejectedValueOnce(new Error('network'));
  mount();
  expect(screen.getByText('Memuat monitoring…')).toBeInTheDocument();
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'Integrity Seluruh Log' })).not.toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findAllByText('1.000');
});

test('empty data has no coverage or implied healthy clients', async () => {
  api.get.mockResolvedValue({ data: { ...snapshot, summary: { total: 0, normal: 0, critical: 0, attention: 0, unknown: 0 }, metrics: { total: 0, anchored: 0, pending: 0, tampered: 0, anchor_percentage: null }, trend: { points: [] }, attention: [], clients: [] } });
  mount();
  expect(await screen.findByText('Belum ada client terdaftar.')).toBeInTheDocument();
  expect(screen.getByText('Belum ada client untuk dibandingkan.')).toBeInTheDocument();
  expect(screen.queryByText('100%')).not.toBeInTheDocument();
});

test('polls only while visible, refreshes on visibility and cleans up', async () => {
  jest.useFakeTimers();
  let hidden = false;
  const visibility = jest.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  const view = mount();
  await act(async () => {});
  const initial = api.get.mock.calls.length;
  hidden = true;
  await act(async () => jest.advanceTimersByTime(60000));
  expect(api.get).toHaveBeenCalledTimes(initial);
  hidden = false;
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(api.get).toHaveBeenCalledTimes(initial + 1);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(api.get).toHaveBeenCalledTimes(initial + 2);
  view.unmount();
  await act(async () => jest.advanceTimersByTime(60000));
  expect(api.get).toHaveBeenCalledTimes(initial + 2);
  visibility.mockRestore();
});

test('expired authentication calls logout', async () => {
  api.get.mockRejectedValue({ response: { status: 401 } });
  const logout = jest.fn();
  mount(logout);
  await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
});
