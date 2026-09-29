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

test('shows the filtered result count and can clear recovery filters', async () => {
  recoveryApi.listIncidents.mockResolvedValue([
    {
      id: 'incident-room-122',
      log_id: 'log-122',
      resource: 'RUANGAN:122',
      incident_type: 'METADATA_HASH_MISMATCH',
      status: 'OPEN',
      detected_at: '2026-09-20T10:00:00Z',
    },
    {
      id: 'incident-room-121',
      log_id: 'log-121',
      resource: 'RUANGAN:121',
      incident_type: 'METADATA_HASH_MISMATCH',
      status: 'RESOLVED',
      detected_at: '2026-09-19T10:00:00Z',
    },
  ]);

  render(
    <MemoryRouter>
      <RecoveryCenterView selectedClient="client-1" />
    </MemoryRouter>
  );

  await screen.findByText('RUANGAN:122');
  expect(screen.getByText('2 of 2')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Search recovery records'), { target: { value: 'RUANGAN:122' } });
  expect(screen.getByText('1 of 2')).toBeInTheDocument();
  expect(screen.queryByText('RUANGAN:121')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByText('2 of 2')).toBeInTheDocument();
  expect(screen.getByText('RUANGAN:121')).toBeInTheDocument();
});
