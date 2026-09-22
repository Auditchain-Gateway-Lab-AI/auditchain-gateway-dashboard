import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecoveryDataView from './RecoveryDataView';
import { recoveryApi } from '../../../services/recoveryApi';

jest.mock('../../../services/recoveryApi', () => ({
  recoveryApi: {
    listIncidents: jest.fn(),
    listEvents: jest.fn(),
    listRequests: jest.fn(),
    getIncident: jest.fn(),
    listCandidates: jest.fn(),
    listAuditLogsByResource: jest.fn(),
    runPreflight: jest.fn(),
    createRequest: jest.fn(),
    executeRequest: jest.fn(),
    getEvent: jest.fn(),
    verifyEvent: jest.fn(),
  },
}));

const incidents = [
  {
    id: 'incident-140',
    client_id: 'client-1',
    log_id: 'log-140',
    resource: 'RUANGAN:140',
    incident_type: 'METADATA_HASH_MISMATCH',
    expected_hash: 'trusted-hash-140',
    detected_hash: 'tampered-hash-140',
    tampered_metadata: { room: 140, owner: 'tampered' },
    status: 'OPEN',
    detected_at: '2026-09-21T09:14:04.796Z',
  },
  {
    id: 'incident-141',
    client_id: 'client-1',
    log_id: 'log-141',
    resource: 'RUANGAN:141',
    incident_type: 'METADATA_HASH_MISMATCH',
    expected_hash: 'trusted-hash-141',
    detected_hash: 'tampered-hash-141',
    tampered_metadata: { room: 141, owner: 'tampered' },
    status: 'OPEN',
    detected_at: '2026-09-21T09:09:22.774Z',
  },
  {
    id: 'incident-blocked',
    client_id: 'client-1',
    log_id: 'log-blocked',
    resource: 'RUANGAN:142',
    incident_type: 'METADATA_HASH_MISMATCH',
    expected_hash: 'trusted-hash-blocked',
    detected_hash: 'tampered-hash-blocked',
    status: 'UNDER_REVIEW',
    detected_at: '2026-09-21T09:00:00.000Z',
  },
];

const recoveryEvent = {
  id: 'event-140',
  incident_id: 'incident-140',
  request_id: 'request-140',
  target_log_id: 'log-140',
  resource: 'RUANGAN:140',
  result_status: 'SUCCEEDED',
  integrity_status: 'VALID',
  pipeline_status: 'COMPLETED',
  snapshot_status: 'VERIFIED',
  before_hash: 'tampered-hash-140',
  after_hash: 'trusted-hash-140',
  recovered_metadata: { room: 140, owner: 'Auditchain' },
  executed_at: '2026-09-21T10:00:00.000Z',
  executed_by: 'operator-1',
  event_hash: 'event-hash-140',
  legacy: false,
  storage_kind: 'RECOVERY_EVENT',
};

beforeEach(() => {
  jest.clearAllMocks();
  recoveryApi.listIncidents.mockResolvedValue(incidents);
  recoveryApi.listEvents.mockResolvedValue({
    data: [recoveryEvent],
    page: 1,
    page_size: 100,
    total_items: 1,
    total_pages: 1,
  });
  recoveryApi.listRequests.mockResolvedValue([]);
  recoveryApi.getIncident.mockImplementation(({ incidentId }) => Promise.resolve(
    incidents.find(item => item.id === incidentId)
  ));
  recoveryApi.listAuditLogsByResource.mockResolvedValue([]);
  recoveryApi.listCandidates.mockResolvedValue([{
    log_id: 'log-140',
    eligible: true,
    reason: 'verified snapshot',
    object_version_id: 'version-140',
  }]);
  recoveryApi.runPreflight.mockImplementation(({ incidentId }) => Promise.resolve({
    status: 'VALID',
    recoverable: true,
    current_hash: incidents.find(item => item.id === incidentId)?.detected_hash,
    snapshot_hash: incidents.find(item => item.id === incidentId)?.expected_hash,
    snapshot_preview: {
      actor: 'operator-1',
      action: 'UPDATE',
      resource: incidents.find(item => item.id === incidentId)?.resource,
      timestamp: '2026-09-21T09:00:00.000Z',
      source_system: 'SIMRS Morbis',
      metadata: { room: incidentId === 'incident-140' ? 140 : 141 },
    },
  }));
  recoveryApi.createRequest.mockResolvedValue({
    id: 'request-140',
    before_hash: 'tampered-hash-140',
  });
  recoveryApi.executeRequest.mockResolvedValue({
    id: 'request-140',
    status: 'SUCCEEDED',
    recovery_event_id: 'event-140',
    after_hash: 'trusted-hash-140',
  });
  recoveryApi.getEvent.mockResolvedValue(recoveryEvent);
  recoveryApi.verifyEvent.mockResolvedValue({ status: 'VALID' });
});

test('loads backend incidents, previews multiple records, and executes each ready recovery', async () => {
  recoveryApi.listAuditLogsByResource.mockImplementation(({ resource }) => Promise.resolve([{
    log_id: resource.endsWith('140') ? 'log-140' : 'log-141',
    metadata: { room: resource.endsWith('140') ? 140 : 141, owner: 'live-tampered-log' },
  }]));
  render(<RecoveryDataView selectedClient="client-1" />);

  expect(await screen.findByText('log-140')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Select log-140'));
  fireEvent.click(screen.getByLabelText('Select log-141'));

  fireEvent.click(screen.getByRole('button', { name: 'Preview selected (2)' }));
  expect(await screen.findByRole('dialog', { name: 'Review recovery data' })).toBeInTheDocument();
  expect(await screen.findAllByText('Tampered evidence')).toHaveLength(2);
  expect(screen.getAllByText(/live-tampered-log/).length).toBeGreaterThan(0);
  expect(await screen.findAllByText('Trusted recovery data')).toHaveLength(2);
  expect(recoveryApi.runPreflight).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery (2)' }));
  expect(screen.getByRole('dialog', { name: 'Execute recovery?' })).toBeInTheDocument();
  expect(screen.getByText(/backend will process 2 selected tampered incidents/i)).toBeInTheDocument();
  expect(screen.queryByText(/recovery request/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery' }));

  await waitFor(() => expect(screen.getByRole('heading', { name: 'Latest execution results' })).toBeInTheDocument());
  expect(recoveryApi.createRequest).toHaveBeenCalledTimes(2);
  expect(recoveryApi.executeRequest).toHaveBeenCalledTimes(2);
  expect(screen.getAllByText('Before recovery · tampered').length).toBe(2);
  expect(screen.getAllByText('After recovery · trusted').length).toBe(2);
});

test('shows recovery_events separately and can inspect and verify an event', async () => {
  render(<RecoveryDataView selectedClient="client-1" />);

  fireEvent.click(await screen.findByRole('button', { name: /Recovery events/ }));
  expect(await screen.findByText('event-140')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View' }));
  expect(await screen.findByRole('dialog', { name: 'event-140' })).toBeInTheDocument();
  expect(await screen.findByText('Recovered metadata')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Verify event' }));
  await waitFor(() => expect(recoveryApi.verifyEvent).toHaveBeenCalledWith({ eventId: 'event-140' }));
  expect(screen.getAllByText('Valid').length).toBeGreaterThan(0);
});

test('does not allow an incident that is not open to be selected', async () => {
  render(<RecoveryDataView selectedClient="client-1" />);

  const blockedCheckbox = await screen.findByLabelText('Select log-blocked');
  expect(blockedCheckbox).toBeDisabled();
  expect(screen.getByText('UNDER REVIEW')).toBeInTheDocument();
});

test('keeps the current tampered log visible when backend preflight blocks recovery', async () => {
  const blockedIncident = { ...incidents[2], tampered_metadata: undefined };
  recoveryApi.listIncidents.mockResolvedValue([blockedIncident]);
  recoveryApi.getIncident.mockResolvedValue(blockedIncident);
  recoveryApi.listCandidates.mockResolvedValue([{
    log_id: blockedIncident.log_id,
    eligible: false,
    reason: 'legacy_recovery_out_of_scope',
  }]);
  recoveryApi.runPreflight.mockRejectedValue({ message: 'legacy_recovery_out_of_scope' });
  recoveryApi.listAuditLogsByResource.mockResolvedValue([{
    log_id: blockedIncident.log_id,
    metadata: { id: 161, nama: 'tampered-from-audit-log' },
  }]);

  render(<RecoveryDataView selectedClient="client-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Preview' }));

  expect(await screen.findByText(/tampered-from-audit-log/)).toBeInTheDocument();
  expect(screen.getAllByText('legacy_recovery_out_of_scope').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Execute recovery (0)' })).toBeDisabled();
});
