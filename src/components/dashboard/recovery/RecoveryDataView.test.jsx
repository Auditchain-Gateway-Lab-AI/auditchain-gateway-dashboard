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
    status: 'RESOLVED',
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
  fireEvent.click(screen.getByRole('button', { name: 'Filter recovery data' }));
  fireEvent.click(screen.getByRole('option', { name: /^Open/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Select all open (2)' }));
  expect(screen.getByRole('button', { name: 'Preview selected (2)' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Preview selected (2)' }));
  expect(await screen.findByRole('dialog', { name: 'Review recovery data' })).toBeInTheDocument();
  expect(await screen.findAllByText('Tampered data')).toHaveLength(2);
  expect(screen.getAllByText(/live-tampered-log/).length).toBeGreaterThan(0);
  expect(await screen.findAllByText('Original trusted data')).toHaveLength(2);
  expect(recoveryApi.runPreflight).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery (2)' }));
  expect(screen.getByRole('dialog', { name: 'Execute recovery?' })).toBeInTheDocument();
  expect(screen.getByText(/backend will process 2 selected tampered incidents/i)).toBeInTheDocument();
  expect(screen.queryByText(/recovery request/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery' }));

  await waitFor(() => expect(screen.getByRole('heading', { name: 'Latest recovery results' })).toBeInTheDocument());
  expect(recoveryApi.createRequest).toHaveBeenCalledTimes(2);
  expect(recoveryApi.executeRequest).toHaveBeenCalledTimes(2);
  expect(screen.getAllByText('Tampered hash').length).toBe(2);
  expect(screen.getAllByText('Recovery result hash').length).toBe(2);
});

test('shows recovery history as read-only and inspects an event from the full row', async () => {
  render(<RecoveryDataView selectedClient="client-1" />);

  fireEvent.click(await screen.findByRole('button', { name: /Recovery history/ }));
  expect(await screen.findByText('event-140')).toBeInTheDocument();
  fireEvent.click(screen.getByText('event-140'));
  expect(await screen.findByRole('dialog', { name: 'Trusted data restored' })).toBeInTheDocument();
  expect(await screen.findByText('Trusted data restored')).toBeInTheDocument();
  expect(await screen.findByText('Recovered data')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Technical evidence'));
  expect(await screen.findByText('Before recovery hash')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Verify event' })).not.toBeInTheDocument();
  expect(recoveryApi.verifyEvent).not.toHaveBeenCalled();
  expect(screen.getAllByText('Valid').length).toBeGreaterThan(0);
});

test('allows a resolved incident to be selected for comparison review', async () => {
  render(<RecoveryDataView selectedClient="client-1" />);

  const blockedCheckbox = await screen.findByLabelText('Select log-blocked');
  expect(blockedCheckbox).not.toBeDisabled();
  fireEvent.click(blockedCheckbox);
  expect(screen.getByRole('button', { name: 'Preview selected (1)' })).toBeEnabled();
  expect(screen.getByText('Resolved')).toBeInTheDocument();
});

test('only offers open and resolved incident statuses', async () => {
  render(<RecoveryDataView selectedClient="client-1" />);

  fireEvent.click(await screen.findByRole('button', { name: 'Filter recovery data' }));
  expect(screen.getByRole('option', { name: /Open/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /Resolved/ })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /Under review/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /Recovering/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /Dismissed/ })).not.toBeInTheDocument();
});

test('opens incident preview by clicking the full row', async () => {
  render(<RecoveryDataView selectedClient="client-1" />);

  const logCell = await screen.findByText('log-140');
  expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument();
  fireEvent.click(logCell);

  expect(await screen.findByRole('dialog', { name: 'Review recovery data' })).toBeInTheDocument();
});

test('shows the recorded recovery result for a closed incident instead of rerunning verification', async () => {
  const resolvedIncident = {
    ...incidents[0],
    status: 'RESOLVED',
    detected_at: '2026-09-22T03:08:23.793Z',
    tampered_metadata: { room: 140, owner: 'tampered-before-recovery' },
  };
  const resolvedEvent = {
    ...recoveryEvent,
    incident_id: resolvedIncident.id,
    target_action: 'UPDATE',
    target_actor: 'mbi',
    source_system: 'SIMRS Morbis',
    executed_at: '2026-09-22T03:12:00.000Z',
    recovered_metadata: { room: 140, owner: 'trusted' },
  };
  recoveryApi.listIncidents.mockResolvedValue([resolvedIncident]);
  recoveryApi.getIncident.mockResolvedValue(resolvedIncident);
  recoveryApi.listAuditLogsByResource.mockResolvedValue([{
    log_id: resolvedIncident.log_id,
    metadata: { room: 140, owner: 'current-trusted-row' },
  }]);
  recoveryApi.listEvents.mockResolvedValue({ data: [resolvedEvent], total_items: 1, total_pages: 1 });
  recoveryApi.getEvent.mockResolvedValue(resolvedEvent);

  render(<RecoveryDataView selectedClient="client-1" />);
  fireEvent.click(await screen.findByText('log-140'));

  expect(await screen.findByText('Recovery result')).toBeInTheDocument();
  expect(screen.getByText('Action')).toBeInTheDocument();
  expect(screen.getByText('Actor affected')).toBeInTheDocument();
  expect(screen.getByText('Tampered at')).toBeInTheDocument();
  expect(screen.getByText('mbi')).toBeInTheDocument();
  expect(screen.getByText('tampered-before-recovery')).toBeInTheDocument();
  expect(screen.getByText('trusted')).toBeInTheDocument();
  expect(screen.queryByText('current-trusted-row')).not.toBeInTheDocument();
  expect(screen.queryByText('Verification failed')).not.toBeInTheDocument();
  expect(recoveryApi.runPreflight).not.toHaveBeenCalled();
});

test('selects only resolved incidents when the resolved filter is active', async () => {
  const resolvedIncident = {
    ...incidents[0],
    status: 'RESOLVED',
  };
  const resolvedEvent = {
    ...recoveryEvent,
    incident_id: resolvedIncident.id,
    recovered_metadata: { room: 140, owner: 'trusted' },
  };
  recoveryApi.listIncidents.mockResolvedValue([resolvedIncident, incidents[1]]);
  recoveryApi.getIncident.mockImplementation(({ incidentId }) => Promise.resolve(
    [resolvedIncident, incidents[1]].find(item => item.id === incidentId)
  ));
  recoveryApi.listEvents.mockResolvedValue({ data: [resolvedEvent], total_items: 1, total_pages: 1 });
  recoveryApi.getEvent.mockResolvedValue(resolvedEvent);

  render(<RecoveryDataView selectedClient="client-1" />);

  fireEvent.click(await screen.findByRole('button', { name: 'Filter recovery data' }));
  fireEvent.click(screen.getByRole('option', { name: /^Resolved/ }));
  expect(screen.getByRole('button', { name: 'Select all resolved (1)' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select all resolved (1)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Preview selected (1)' }));

  expect(await screen.findByText('Recovery result')).toBeInTheDocument();
  expect(recoveryApi.runPreflight).not.toHaveBeenCalled();
});

test('keeps the current tampered log visible when backend preflight blocks recovery', async () => {
  const blockedIncident = { ...incidents[2], status: 'OPEN', tampered_metadata: undefined };
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
  fireEvent.click(await screen.findByText('log-blocked'));

  expect(await screen.findByText(/tampered-from-audit-log/)).toBeInTheDocument();
  expect(screen.getAllByText('legacy_recovery_out_of_scope').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Execute recovery (0)' })).toBeDisabled();
});
