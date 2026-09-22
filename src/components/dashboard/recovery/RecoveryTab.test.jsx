import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RecoveryTab from './RecoveryTab';
import { recoveryApi } from '../../../services/recoveryApi';

jest.mock('../../../services/recoveryApi', () => ({
  recoveryApi: {
    listIncidents: jest.fn(),
    listRequests: jest.fn(),
    listEvents: jest.fn(),
    listCandidates: jest.fn(),
    runPreflight: jest.fn(),
    createRequest: jest.fn(),
    executeRequest: jest.fn(),
    getEvent: jest.fn(),
  },
}));

const activeLog = {
  log_id: 'log-161',
  resource: 'RUANGAN:161',
  source_table: 'RUANGAN',
  action: 'UPDATE',
  actor: 'mbi',
  source_system: 'SIMRS Morbis 1',
  integrity_status: 'TAMPERED',
  metadata: { id: 161, nama: 'tampered-room' },
};

const incident = {
  id: 'incident-161',
  client_id: 'client-1',
  log_id: 'log-161',
  resource: 'RUANGAN:161',
  incident_type: 'METADATA_HASH_MISMATCH',
  expected_hash: 'trusted-hash',
  detected_hash: 'tampered-hash',
  status: 'OPEN',
  detected_at: '2026-09-21T08:00:00.000Z',
};

const event = {
  id: 'event-161',
  incident_id: incident.id,
  target_log_id: activeLog.log_id,
  resource: activeLog.resource,
  result_status: 'SUCCEEDED',
  integrity_status: 'VALID',
  before_hash: 'tampered-hash',
  after_hash: 'trusted-hash',
  recovered_metadata: { id: 161, nama: 'trusted-room' },
  executed_at: '2026-09-21T08:05:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  recoveryApi.listIncidents.mockResolvedValue([incident]);
  recoveryApi.listRequests.mockResolvedValue([]);
  recoveryApi.listEvents.mockResolvedValue({ data: [] });
  recoveryApi.listCandidates.mockResolvedValue([{
    log_id: activeLog.log_id,
    eligible: true,
    snapshot_verified_at: '2026-09-21T07:55:00.000Z',
    snapshot_version_id: 'version-161',
    snapshot_object_key: 'production/ruangan/161',
    snapshot_checksum: 'checksum-161',
    snapshot_plaintext_hash: 'plaintext-161',
  }]);
  recoveryApi.runPreflight.mockResolvedValue({
    status: 'VALID',
    recoverable: true,
    current_hash: 'tampered-hash',
    snapshot_hash: 'trusted-hash',
    snapshot_preview: {
      actor: 'operator-1',
      action: 'UPDATE',
      resource: activeLog.resource,
      timestamp: '2026-09-21T07:50:00.000Z',
      source_system: 'SIMRS Morbis 1',
      metadata: { id: 161, nama: 'trusted-room' },
    },
  });
  recoveryApi.createRequest.mockResolvedValue({ id: 'request-161', before_hash: 'tampered-hash' });
  recoveryApi.executeRequest.mockResolvedValue({ status: 'SUCCEEDED', recovery_event_id: event.id, after_hash: 'trusted-hash' });
  recoveryApi.getEvent.mockResolvedValue(event);
});

test('keeps the contextual Recovery tab and shows tampered/trusted data without a reason form', async () => {
  render(<RecoveryTab activeLog={activeLog} selectedClient="client-1" />);

  expect(await screen.findByText('Tampered data and original data')).toBeInTheDocument();
  expect(screen.getByText(/tampered-room/)).toBeInTheDocument();
  expect(screen.queryByText('Recovery request')).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Reason/i)).not.toBeInTheDocument();

  expect(await screen.findAllByText(/trusted-room/)).not.toHaveLength(0);
  expect(screen.getByText('Actor affected')).toBeInTheDocument();
  expect(screen.getByText('mbi')).toBeInTheDocument();
  expect(screen.getByText('UPDATE')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Tampered data' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Original trusted data' })).toBeInTheDocument();
  expect(screen.queryByText(/"nama"/)).not.toBeInTheDocument();
  expect(screen.getByText('Changed fields')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery' }));
  const confirmation = screen.getByRole('dialog', { name: 'Execute recovery?' });
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Execute recovery' }));

  await waitFor(() => expect(recoveryApi.createRequest).toHaveBeenCalledWith(expect.objectContaining({
    incidentId: incident.id,
    selectedLogId: activeLog.log_id,
    reason: expect.any(String),
  })));
  expect(recoveryApi.executeRequest).toHaveBeenCalledWith({ requestId: 'request-161' });
  expect(await screen.findByText('Recovery completed')).toBeInTheDocument();
  expect(screen.getByText('Recovered data')).toBeInTheDocument();
});

test('does not let an old successful request or another incident event lock the current execute action', async () => {
  recoveryApi.listRequests.mockResolvedValue([{
    id: 'old-request',
    incident_id: incident.id,
    status: 'SUCCEEDED',
  }]);
  recoveryApi.listEvents.mockResolvedValue({
    data: [{ ...event, id: 'old-event', incident_id: 'different-incident' }],
  });

  render(<RecoveryTab activeLog={activeLog} selectedClient="client-1" />);

  expect(await screen.findByRole('button', { name: 'Execute recovery' })).toBeEnabled();
  expect(screen.queryByText('Recovery completed')).not.toBeInTheDocument();
});

test('explains a backend scope block instead of showing a dead execute button', async () => {
  recoveryApi.listCandidates.mockResolvedValue([{
    log_id: activeLog.log_id,
    eligible: false,
    reason: 'legacy_recovery_out_of_scope',
  }]);

  render(<RecoveryTab activeLog={activeLog} selectedClient="client-1" />);

  expect(await screen.findByText('Recovery unavailable')).toBeInTheDocument();
  expect(screen.getAllByText('This log is outside the recovery scope configured by the backend.').length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: 'Execute recovery' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled();
});
