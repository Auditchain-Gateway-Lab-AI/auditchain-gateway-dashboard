import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecoveryCenterView from './RecoveryCenterView';
import { recoveryApi } from '../../../services/recoveryApi';

jest.mock('../../../services/recoveryApi', () => ({
  recoveryApi: {
    listIncidents: jest.fn(),
    listRequests: jest.fn(),
    executeRequest: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  recoveryApi.listIncidents.mockResolvedValue([]);
  recoveryApi.listRequests.mockResolvedValue([{
    id: 'request-1',
    incident_id: 'incident-1',
    target_log_id: 'log-1',
    reason: 'Restore trusted snapshot',
    status: 'PENDING_EXECUTION',
    requested_at: '2026-09-19T06:00:00Z',
  }]);
  recoveryApi.executeRequest.mockResolvedValue({ id: 'request-1', status: 'SUCCEEDED' });
});

test('lets a client user execute a pending request without approval controls', async () => {
  render(
    <MemoryRouter>
      <RecoveryCenterView selectedClient="client-1" />
    </MemoryRouter>
  );

  await waitFor(() => expect(recoveryApi.listRequests).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /Requests/ }));

  expect(screen.getAllByText('Ready to execute')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Reject/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Execute' }));
  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery' }));

  await waitFor(() => expect(recoveryApi.executeRequest).toHaveBeenCalledWith({ requestId: 'request-1' }));
});
