import React from 'react';
import { render, screen } from '@testing-library/react';
import AuditLogTable from './AuditLogTable';

const baseProps = {
  setSearchQuery: jest.fn(),
  setFilterAction: jest.fn(),
  setFilterVerification: jest.fn(),
  setSortOrder: jest.fn(),
  setFilterTable: jest.fn(),
  setRowsPerPage: jest.fn(),
  setTempDateFrom: jest.fn(),
  setTempDateTo: jest.fn(),
  setFilterDateFrom: jest.fn(),
  setFilterDateTo: jest.fn(),
  handleApplyLogsRange: jest.fn(),
  handleClearRange: jest.fn(),
  handleVerifyRange: jest.fn(),
  setRangeVerifyResult: jest.fn(),
  setSelectedVerifyResult: jest.fn(),
  onSelectResource: jest.fn(),
  renderStatusBadge: jest.fn(),
  setCurrentPage: jest.fn(),
  renderPageNumbers: () => [1],
  filterDateFrom: '2026-09-24T10:00',
  filterDateTo: '2026-09-24T11:00'
};

test('shows the preflight phase while Verify Range is estimating', () => {
  render(
    <AuditLogTable
      {...baseProps}
      isVerifyRangeLoading
      verifyRangeProgress={{
        phase: 'estimating',
        message: 'Counting logs in the selected range...'
      }}
    />
  );

  expect(screen.getByRole('button', { name: /Checking Range/i })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Counting logs in the selected range');
});

test('shows an actionable warning when the synchronous limit is exceeded', () => {
  render(
    <AuditLogTable
      {...baseProps}
      verifyRangeProgress={{
        phase: 'blocked',
        message: '296 logs match this range. Synchronous verification is limited to 100; narrow the date range.'
      }}
    />
  );

  expect(screen.getByRole('alert')).toHaveTextContent('296 logs');
  expect(screen.getByRole('alert')).toHaveTextContent('limited to 100');
});
