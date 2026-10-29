import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ActivityTrend, AnchoringVisual, IntegrityVisual, TableHealth } from './MonitoringVisuals';

test('activity points expose exact values and support keyboard navigation through a zero bucket', () => {
  render(<ActivityTrend range="7D" bucketSeconds={86400} metrics={{ logs_24h: 5 }} points={[
    { bucket_start: '2026-10-21T00:00:00Z', total_logs: 0 },
    { bucket_start: '2026-10-22T00:00:00Z', total_logs: 5 },
  ]} />);
  const points = within(screen.getByRole('group', { name: 'Pilih titik aktivitas' })).getAllByRole('button');
  expect(points[1]).toHaveAttribute('aria-pressed', 'true');
  fireEvent.keyDown(points[1], { key: 'Home' });
  expect(points[0]).toHaveFocus();
  expect(points[0]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('0 log')).toBeInTheDocument();
  fireEvent.keyDown(points[0], { key: 'ArrowRight' });
  expect(points[1]).toHaveAttribute('aria-pressed', 'true');
});

test('empty and zero-only activity remain readable without inventing activity', () => {
  const { rerender } = render(<ActivityTrend range="24H" points={[]} />);
  expect(screen.getByText('Belum ada data aktivitas pada rentang ini.')).toBeInTheDocument();
  rerender(<ActivityTrend range="24H" points={[{ bucket_start: '2026-10-21T00:00:00Z', total_logs: 0 }]} />);
  expect(screen.getByText(/Belum ada log pada rentang ini/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /: 0 log$/ })).toHaveAttribute('aria-pressed', 'true');
});

test('integrity uses all logs as the denominator and keeps unchecked logs distinct from valid', () => {
  const { rerender } = render(<IntegrityVisual metrics={{ total: 100, valid: 40, tampered: 5, unavailable: 5, not_checked: 50 }} />);
  expect(screen.getByRole('img', { name: '40% dari seluruh log berstatus Valid' })).toBeInTheDocument();
  expect(screen.getByText('5 log berstatus Tampered perlu ditinjau.')).toBeInTheDocument();
  expect(screen.getByText('Belum diperiksa')).toBeInTheDocument();
  rerender(<IntegrityVisual metrics={{ total: 0 }} />);
  expect(screen.getByRole('img', { name: 'Belum ada audit log' })).toBeInTheDocument();
  expect(screen.queryByText('100%')).not.toBeInTheDocument();
});

test('anchoring distinguishes complete coverage, a pending queue, and no data', () => {
  const { rerender } = render(<AnchoringVisual metrics={{ total: 10, anchored: 10, pending: 0, anchor_percentage: 100 }} />);
  expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
  expect(screen.getByText('Seluruh log tercatat')).toBeInTheDocument();
  rerender(<AnchoringVisual metrics={{ total: 10, anchored: 8, pending: 2, anchor_percentage: 80, oldest_pending_at: '2026-10-21T00:00:00Z' }} threshold={15} />);
  expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '80');
  expect(screen.getByText(/Antrean tertua sejak/)).toHaveTextContent('Peringatan setelah 15 menit');
  rerender(<AnchoringVisual metrics={{ total: 0 }} />);
  expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Belum ada log');
  expect(screen.queryByText('Seluruh log tercatat')).not.toBeInTheDocument();
});

test('table comparison prioritizes findings, filters issues, and reveals every exact status count', () => {
  render(<TableHealth tables={[
    { table_name: 'HEALTHY', total: 20, valid: 20 },
    { table_name: 'UNCHECKED', total: 10, not_checked: 10 },
    { table_name: 'TAMPERED', total: 100, valid: 50, tampered: 30, verify_pending: 2, unavailable: 3, not_checked: 15 },
    { table_name: 'UNAVAILABLE', total: 4, unavailable: 4 },
  ]} />);
  expect(screen.getAllByRole('row')[1]).toHaveTextContent('TAMPERED');
  const detail = screen.getByRole('button', { name: 'Detail status tabel TAMPERED' });
  fireEvent.click(detail);
  expect(detail).toHaveAttribute('aria-expanded', 'true');
  const breakdown = screen.getByRole('group', { name: 'Rincian status TAMPERED' });
  expect(breakdown).toHaveTextContent('Menunggu verifikasi2 log');
  expect(breakdown).toHaveTextContent('Pemeriksaan gagal3 log');
  expect(breakdown).toHaveTextContent('Belum diperiksa15 log');
  fireEvent.click(screen.getByRole('button', { name: 'Perlu perhatian 2' }));
  expect(screen.queryByText('HEALTHY')).not.toBeInTheDocument();
  expect(screen.queryByText('UNCHECKED')).not.toBeInTheDocument();
  expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tutup status tabel TAMPERED' }));
  expect(screen.queryByRole('group', { name: 'Rincian status TAMPERED' })).not.toBeInTheDocument();
});
