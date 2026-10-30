import React from 'react';
import { render, screen } from '@testing-library/react';
import ClientStatisticsVisual from './ClientStatisticsVisual';

test('full anchoring still shows tampered findings and every integrity status', () => {
  render(<ClientStatisticsVisual metrics={{ total: 100, anchored: 100, pending: 0, anchor_percentage: 100, valid: 70, tampered: 17, verify_pending: 5, unavailable: 3, not_checked: 5 }} />);
  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.getByText('17%')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Komposisi integrity: Valid 70 log, Tampered 17 log, Menunggu verifikasi 5 log, Pemeriksaan gagal 3 log, Belum diperiksa 5 log' })).toBeInTheDocument();
  expect(screen.getByText('Ada temuan perubahan. Tinjau detail integrity.')).toBeInTheDocument();
});

test('missing integrity counts stay unclassified rather than becoming valid', () => {
  render(<ClientStatisticsVisual metrics={{ total: 20, anchored: 15, pending: 5, tampered: 2 }} />);
  expect(screen.getByText('75%')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Komposisi integrity: Tampered 2 log, Belum terklasifikasi 18 log' })).toBeInTheDocument();
  expect(screen.queryByText('Valid')).not.toBeInTheDocument();
});

test.each([{}, { total: 0, anchored: 0, pending: 0, tampered: 0 }])('empty or missing metrics have no implied complete coverage', metrics => {
  render(<ClientStatisticsVisual metrics={metrics} />);
  expect(screen.getByRole('img', { name: 'Komposisi integrity belum tersedia' })).toBeInTheDocument();
  expect(screen.queryByText('100%')).not.toBeInTheDocument();
  expect(screen.queryByText('0%')).not.toBeInTheDocument();
});
