import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RecoveryTab from './RecoveryTab';
import { recoveryApi } from '../../../services/recoveryApi';

jest.mock('../../../services/recoveryApi', () => ({
  recoveryApi: {
    listIncidents: jest.fn(),
    verifyLog: jest.fn(),
    getIncident: jest.fn(),
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
  incident_scope: 'CLIENT_SOURCE',
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

const gatewayIncident = {
  ...incident,
  id: 'incident-620',
  log_id: 'log-620',
  resource: 'RUANGAN:620',
  incident_scope: 'GATEWAY_INTEGRITY',
};

const gatewayLog = {
  ...activeLog,
  log_id: gatewayIncident.log_id,
  resource: gatewayIncident.resource,
  metadata: { id: 620, nama: 'tampered-room-620' },
};

const gatewayCandidate = {
  log_id: gatewayIncident.log_id,
  eligible: true,
  recovery_source: 'CLIENT_AUDIT_TRAIL',
  reference_log_hash: 'trusted-hash-620',
  reference_merkle_root: 'merkle-root-620',
  reference_anchor_id: 'anchor-620',
};

const gatewayPreflight = {
  status: 'VALID',
  recoverable: true,
  log_id: gatewayIncident.log_id,
  current_hash: 'tampered-hash-620',
  recovery_source: 'CLIENT_AUDIT_TRAIL',
  snapshot_hash: 'trusted-hash-620',
  anchor_id: 'anchor-620',
  merkle_root: 'merkle-root-620',
  reference_log_hash: 'trusted-hash-620',
  reference_merkle_root: 'merkle-root-620',
  reference_anchor_id: 'anchor-620',
  fabric_root: 'merkle-root-620',
  trusted_reference_preview: {
    actor: 'operator-620',
    action: 'DELETE',
    resource: gatewayIncident.resource,
    timestamp: '2026-09-21T07:50:00.000Z',
    source_system: 'SIMRS Morbis 1',
    metadata: { id: 620, nama: 'trusted-room-620' },
  },
};

const gatewayEvent = {
  ...event,
  id: 'event-620',
  incident_id: gatewayIncident.id,
  target_log_id: gatewayIncident.log_id,
  resource: gatewayIncident.resource,
  recovered_metadata: { id: 620, nama: 'trusted-room-620' },
  executed_at: undefined,
};

beforeEach(() => {
  jest.clearAllMocks();
  recoveryApi.listIncidents.mockResolvedValue([incident]);
  recoveryApi.verifyLog.mockResolvedValue({ status: 'success' });
  recoveryApi.getIncident.mockResolvedValue(incident);
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

test('keeps the contextual Recovery tab and shows client hashes without exposing live row values', async () => {
  recoveryApi.listEvents.mockResolvedValue({ data: [] });
  render(<RecoveryTab activeLog={activeLog} selectedClient="client-1" />);

  expect(await screen.findByText('Client state hash and trusted reference')).toBeInTheDocument();
  expect(screen.queryByText(/tampered-room/)).not.toBeInTheDocument();
  expect(screen.getByText('The recovery API does not expose live client row values.')).toBeInTheDocument();
  expect(screen.queryByText('Recovery request')).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Reason/i)).not.toBeInTheDocument();

  expect(await screen.findAllByText(/trusted-room/)).not.toHaveLength(0);
  expect(screen.getByText('Actor affected')).toBeInTheDocument();
  expect(screen.getByText('mbi')).toBeInTheDocument();
  expect(screen.getByText('UPDATE')).toBeInTheDocument();
  expect(screen.getByText('Live client state hash')).toBeInTheDocument();
  expect(screen.getByText('Trusted desired state hash')).toBeInTheDocument();
  expect(screen.queryByText(/"nama"/)).not.toBeInTheDocument();
  expect(screen.queryByText('Changed fields')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery' }));
  const confirmation = screen.getByRole('dialog', { name: 'Execute client recovery?' });
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Execute recovery' }));

  await waitFor(() => expect(recoveryApi.createRequest).toHaveBeenCalledWith(expect.objectContaining({
    incidentId: incident.id,
    selectedLogId: activeLog.log_id,
    reason: expect.any(String),
  })));
  expect(recoveryApi.executeRequest).toHaveBeenCalledWith({ requestId: 'request-161' });
  expect(await screen.findByText('Recovery completed')).toBeInTheDocument();
  expect(screen.getByText('Recovery event result (redacted)')).toBeInTheDocument();
});

test('uses the preserved before-image when a resolved incident is opened again', async () => {
  const resolvedIncident = {
    ...incident,
    incident_scope: undefined,
    status: 'RESOLVED',
    tampered_metadata: { id: 161, nama: 'tampered-before-recovery' },
  };
  const resolvedLog = {
    ...activeLog,
    metadata: { id: 161, nama: 'trusted-current-log' },
  };
  const resolvedEvent = {
    ...event,
    incident_id: resolvedIncident.id,
    recovered_metadata: { id: 161, nama: 'trusted-room' },
  };
  recoveryApi.listIncidents.mockResolvedValue([resolvedIncident]);
  recoveryApi.getIncident.mockResolvedValue(resolvedIncident);
  recoveryApi.listEvents.mockResolvedValue({ data: [resolvedEvent] });

  render(<RecoveryTab activeLog={resolvedLog} selectedClient="client-1" />);

  expect(await screen.findByText('Tampered data and recovery result')).toBeInTheDocument();
  expect(screen.getByText('tampered-before-recovery')).toBeInTheDocument();
  expect(screen.getByText('trusted-room')).toBeInTheDocument();
  expect(screen.queryByText('trusted-current-log')).not.toBeInTheDocument();
  expect(recoveryApi.getIncident).toHaveBeenCalledWith({ incidentId: resolvedIncident.id });
  expect(screen.queryByRole('button', { name: 'Execute recovery' })).not.toBeInTheDocument();
});

test('does not let an old successful request or another incident event lock the current execute action', async () => {
  recoveryApi.listRequests.mockResolvedValue([{
    id: 'old-request',
    incident_id: 'different-incident',
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

test('runs integrity verification and reloads the incident list when a tampered log has no incident yet', async () => {
  recoveryApi.listIncidents
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([gatewayIncident]);
  recoveryApi.listCandidates.mockResolvedValue([{
    log_id: gatewayIncident.log_id,
    resource: gatewayIncident.resource,
    eligible: false,
    reason: 'audit_trail_reference_missing',
  }]);
  recoveryApi.verifyLog.mockResolvedValue({
    status: 'failed',
    layer: '2_local_hash',
    data: { log_id: activeLog.log_id },
  });

  render(<RecoveryTab activeLog={gatewayLog} selectedClient="client-1" />);

  const verifyButton = await screen.findByRole('button', { name: 'Verify and refresh' });
  expect(screen.getAllByText(/Recovery requires a trusted source event/).length).toBeGreaterThan(0);
  fireEvent.click(verifyButton);

  expect(recoveryApi.verifyLog).toHaveBeenCalledWith({ logId: gatewayLog.log_id, clientId: 'client-1' });
  expect((await screen.findAllByText('Gateway integrity incident')).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/original source audit event is not linked/).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: 'Execute recovery' })).not.toBeInTheDocument();
});

test('offers Gateway audit-log restore after the source event matches its anchored proof', async () => {
  recoveryApi.listIncidents.mockResolvedValue([gatewayIncident]);
  recoveryApi.listCandidates.mockResolvedValue([gatewayCandidate]);
  recoveryApi.runPreflight.mockResolvedValue(gatewayPreflight);
  recoveryApi.executeRequest.mockResolvedValue({ status: 'SUCCEEDED', recovery_event_id: gatewayEvent.id });
  recoveryApi.getEvent.mockResolvedValue(gatewayEvent);

  render(<RecoveryTab activeLog={gatewayLog} selectedClient="client-1" />);

  expect(await screen.findByRole('button', { name: 'Restore audit log' })).toBeEnabled();
  expect(screen.getByText('tampered-room-620')).toBeInTheDocument();
  expect(screen.getByText('trusted-room-620')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Restore audit log' }));

  const confirmation = screen.getByRole('dialog', { name: 'Restore Gateway audit log?' });
  expect(within(confirmation).getByText(/reread the source audit event, verify its original log hash, Merkle proof, and Fabric anchor/)).toBeInTheDocument();
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Restore audit log' }));

  await waitFor(() => expect(recoveryApi.createRequest).toHaveBeenCalledWith(expect.objectContaining({
    incidentId: gatewayIncident.id,
    selectedLogId: gatewayIncident.log_id,
    reason: expect.any(String),
  })));
  expect(recoveryApi.executeRequest).toHaveBeenCalledWith({ requestId: 'request-161' });
  expect(await screen.findByText('Recovery completed')).toBeInTheDocument();
  expect(screen.getByText('Gateway audit log recovery is verified.')).toBeInTheDocument();
});

test('keeps Gateway incidents read only when source proof evidence is incomplete', async () => {
  recoveryApi.listIncidents.mockResolvedValue([gatewayIncident]);
  recoveryApi.listCandidates.mockResolvedValue([gatewayCandidate]);
  recoveryApi.runPreflight.mockResolvedValue({ ...gatewayPreflight, fabric_root: '' });

  render(<RecoveryTab activeLog={gatewayLog} selectedClient="client-1" />);

  expect(await screen.findByRole('button', { name: 'Check recovery data' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Execute recovery' })).not.toBeInTheDocument();
  expect(screen.getByText(/A source audit event is available/)).toBeInTheDocument();
});
