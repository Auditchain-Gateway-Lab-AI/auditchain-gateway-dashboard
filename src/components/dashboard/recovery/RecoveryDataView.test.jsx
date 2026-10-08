import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import RecoveryDataView from './RecoveryDataView';
import { recoveryApi } from '../../../services/recoveryApi';

jest.mock('../../../services/recoveryApi', () => ({
  recoveryApi: {
    listIncidents: jest.fn(),
    verifyLog: jest.fn(),
    verifyResource: jest.fn(),
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
    incident_scope: 'CLIENT_SOURCE',
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
    incident_scope: 'CLIENT_SOURCE',
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
    incident_scope: 'CLIENT_SOURCE',
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

const recoveredIncident = {
  ...incidents[1],
  id: 'incident-recovered',
  log_id: 'log-recovered',
  resource: 'RUANGAN:143',
  status: 'RECOVERED',
  detected_at: '2026-09-21T08:55:00.000Z',
  tampered_metadata: { room: 143, owner: 'tampered-before-recovery' },
};

beforeEach(() => {
  jest.clearAllMocks();
  recoveryApi.listIncidents.mockResolvedValue(incidents);
  recoveryApi.verifyResource.mockResolvedValue({ resource: 'RUANGAN', chain_status: 'valid', total_logs: 3, logs: [] });
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
  recoveryApi.listCandidates.mockImplementation(({ incidentId }) => Promise.resolve([{
    log_id: incidentId === 'incident-140' ? 'log-140' : 'log-141',
    eligible: true,
    reason: 'verified client event reference',
    reference_log_hash: `reference-hash-${incidentId}`,
  }]));
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
    status: 'PENDING_EXECUTION',
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

test('previews multiple client-source incidents without exposing live row values, then executes each ready recovery', async () => {
  recoveryApi.listAuditLogsByResource.mockImplementation(({ resource }) => Promise.resolve([{
    log_id: resource.endsWith('140') ? 'log-140' : 'log-141',
    metadata: { room: resource.endsWith('140') ? 140 : 141, owner: 'live-tampered-log' },
  }]));
  render(<RecoveryDataView selectedClient="client-1" />);

  expect(await screen.findByText('log-140')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Filter recovery data' }));
  fireEvent.click(screen.getByRole('option', { name: /^Open/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Select matching incidents (2)' }));
  expect(screen.getByRole('button', { name: 'Preview selected (2)' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Preview selected (2)' }));
  expect(await screen.findByRole('dialog', { name: 'Review recovery data' })).toBeInTheDocument();
  expect(await screen.findAllByText('Live client state hash')).toHaveLength(2);
  expect(screen.queryByText(/live-tampered-log/)).not.toBeInTheDocument();
  expect(screen.getAllByText(/Gateway does not return the live client row values/)).toHaveLength(2);
  expect(await screen.findAllByText('Trusted reference data (redacted)')).toHaveLength(2);
  expect(recoveryApi.runPreflight).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery (2)' }));
  expect(screen.getByRole('dialog', { name: 'Execute recovery?' })).toBeInTheDocument();
  expect(screen.getByText(/backend will process 2 selected tampered incidents/i)).toBeInTheDocument();
  expect(screen.queryByText(/recovery request/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery' }));

  await waitFor(() => expect(screen.getByRole('heading', { name: 'Latest recovery results' })).toBeInTheDocument());
  expect(screen.getAllByText('log-140').length).toBeGreaterThan(0);
  expect(recoveryApi.createRequest).toHaveBeenCalledTimes(2);
  expect(recoveryApi.executeRequest).toHaveBeenCalledTimes(2);
  expect(screen.getAllByText('Live client state hash').length).toBe(2);
  expect(screen.getAllByText('Recovered client state hash').length).toBe(2);
});

test('selects every incident from the master checkbox, including resolved incidents', async () => {
  render(<RecoveryDataView selectedClient="client-1" />);

  const masterCheckbox = await screen.findByLabelText('Select all incidents matching current filters');
  const resolvedCheckbox = screen.getByLabelText('Select log-blocked');
  expect(resolvedCheckbox).not.toBeDisabled();

  fireEvent.click(masterCheckbox);

  expect(screen.getByRole('button', { name: 'Preview selected (3)' })).toBeEnabled();
  expect(masterCheckbox).toBeChecked();
});

test('shows open Gateway integrity incidents separately from Client Source recovery eligibility', async () => {
  recoveryApi.listIncidents.mockResolvedValue([
    ...incidents,
    {
      ...incidents[0],
      id: 'incident-gateway',
      log_id: 'log-620',
      resource: 'RUANGAN:620',
      incident_scope: 'GATEWAY_INTEGRITY',
    },
  ]);

  const { container } = render(<RecoveryDataView selectedClient="client-1" />);

  expect(await screen.findByText('RUANGAN:620')).toBeInTheDocument();
  expect(screen.getByText('Open tamper incidents')).toBeInTheDocument();
  expect(container.querySelector('.ac-recovery-data-selection-note')).toHaveTextContent('1 open Gateway Integrity read only');
});

test('scans the matching resource from Recovery Data and refreshes the incident list', async () => {
  const detectedIncident = {
    ...incidents[0],
    id: 'incident-620',
    log_id: 'log-620',
    resource: 'RUANGAN:620',
    incident_scope: 'GATEWAY_INTEGRITY',
  };
  recoveryApi.listIncidents.mockResolvedValue([...incidents, detectedIncident]);
  recoveryApi.verifyResource.mockResolvedValue({
    resource: 'RUANGAN',
    chain_status: 'tampered',
    total_logs: 1,
    logs: [{ log_id: 'log-620', integrity_status: 'TAMPERED' }],
  });

  render(<RecoveryDataView selectedClient="client-1" />);
  expect(await screen.findByText('log-140')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search recovery data' }), { target: { value: 'ruangan' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify RUANGAN' }));

  expect(recoveryApi.verifyResource).toHaveBeenCalledWith({ resource: 'RUANGAN', clientId: 'client-1' });
  expect(await screen.findByRole('status')).toHaveTextContent('Integrity issues were found and matching incidents are listed.');
  expect(await screen.findByText('incident-620')).toBeInTheDocument();
});

test('shows recovery history as read-only and inspects an event from the full row', async () => {
  render(<RecoveryDataView selectedClient="client-1" />);

  fireEvent.click(await screen.findByRole('button', { name: /Recovery history/ }));
  expect(await screen.findByText('event-140')).toBeInTheDocument();
  fireEvent.click(screen.getByText('event-140'));
  expect(await screen.findByRole('dialog', { name: 'Client record recovery completed' })).toBeInTheDocument();
  expect(await screen.findByText('Client record recovery completed')).toBeInTheDocument();
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

test('offers every incident status that is present, including recovered', async () => {
  recoveryApi.listIncidents.mockResolvedValue([...incidents, recoveredIncident]);
  recoveryApi.getIncident.mockImplementation(({ incidentId }) => Promise.resolve(
    [...incidents, recoveredIncident].find(item => item.id === incidentId)
  ));

  render(<RecoveryDataView selectedClient="client-1" />);

  fireEvent.click(await screen.findByRole('button', { name: 'Filter recovery data' }));
  expect(screen.getByRole('option', { name: /Open/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /Resolved/ })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: /Recovered/ })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /Under review/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /Recovering/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /Dismissed/ })).not.toBeInTheDocument();
});

test('previews open, resolved, and recovered incidents but executes only the open incident', async () => {
  const resolvedIncident = {
    ...incidents[2],
    tampered_metadata: { room: 142, owner: 'tampered-before-recovery' },
  };
  const records = [incidents[0], resolvedIncident, recoveredIncident];
  const resolvedEvent = {
    ...recoveryEvent,
    id: 'event-resolved',
    incident_id: resolvedIncident.id,
    target_log_id: resolvedIncident.log_id,
    resource: resolvedIncident.resource,
    recovered_metadata: { room: 142, owner: 'trusted' },
  };
  const recoveredEvent = {
    ...recoveryEvent,
    id: 'event-recovered',
    incident_id: recoveredIncident.id,
    target_log_id: recoveredIncident.log_id,
    resource: recoveredIncident.resource,
    recovered_metadata: { room: 143, owner: 'trusted' },
  };

  recoveryApi.listIncidents
    .mockResolvedValueOnce(records)
    // Simulate a stale/partial gateway response after execution. The local
    // closed row must still be merged back into the incident history.
    .mockResolvedValueOnce([resolvedIncident, recoveredIncident]);
  recoveryApi.getIncident.mockImplementation(({ incidentId }) => Promise.resolve(
    records.find(item => item.id === incidentId)
  ));
  recoveryApi.listEvents.mockResolvedValue({
    data: [recoveryEvent, resolvedEvent, recoveredEvent],
    page: 1,
    page_size: 100,
    total_items: 3,
    total_pages: 1,
  });

  render(<RecoveryDataView selectedClient="client-1" />);

  const masterCheckbox = await screen.findByLabelText('Select all incidents matching current filters');
  fireEvent.click(masterCheckbox);
  expect(screen.getByRole('button', { name: 'Preview selected (3)' })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Preview selected (3)' }));
  expect(await screen.findByRole('dialog', { name: 'Review recovery data' })).toBeInTheDocument();
  expect(await screen.findAllByText('Live client state hash')).toHaveLength(3);
  expect(screen.queryByText('tampered-before-recovery')).not.toBeInTheDocument();
  expect(await screen.findAllByText('Recovery result')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Execute recovery (1)' })).toBeEnabled();
  expect(recoveryApi.listCandidates).toHaveBeenCalledWith({ incidentId: 'incident-140' });
  expect(recoveryApi.runPreflight).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery (1)' }));
  expect(screen.getByRole('dialog', { name: 'Execute recovery?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Execute recovery' }));

  await waitFor(() => expect(recoveryApi.createRequest).toHaveBeenCalledTimes(1));
  expect(recoveryApi.executeRequest).toHaveBeenCalledTimes(1);
  expect(screen.getAllByText('log-140').length).toBeGreaterThan(0);
  await waitFor(() => {
    const recoveredRow = screen.getByRole('row', { name: /log-140/ });
    expect(within(recoveredRow).getByText('Resolved')).toBeInTheDocument();
  });
});

test('keeps a recovered incident selectable and disables execute recovery', async () => {
  const recoveredEvent = {
    ...recoveryEvent,
    id: 'event-recovered',
    incident_id: recoveredIncident.id,
    target_log_id: recoveredIncident.log_id,
    resource: recoveredIncident.resource,
    recovered_metadata: { room: 143, owner: 'trusted' },
  };
  recoveryApi.listIncidents.mockResolvedValue([recoveredIncident]);
  recoveryApi.getIncident.mockResolvedValue(recoveredIncident);
  recoveryApi.listEvents.mockResolvedValue({
    data: [recoveredEvent],
    total_items: 1,
    total_pages: 1,
  });

  render(<RecoveryDataView selectedClient="client-1" />);

  const recoveredCheckbox = await screen.findByLabelText('Select log-recovered');
  expect(recoveredCheckbox).not.toBeDisabled();
  fireEvent.click(recoveredCheckbox);
  fireEvent.click(screen.getByRole('button', { name: 'Preview selected (1)' }));

  expect(await screen.findByText('Recovery result')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Execute recovery (0)' })).toBeDisabled();
  expect(recoveryApi.listCandidates).not.toHaveBeenCalled();
  expect(recoveryApi.runPreflight).not.toHaveBeenCalled();
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
    incident_scope: undefined,
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
  expect(screen.getByRole('button', { name: 'Select matching incidents (1)' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select matching incidents (1)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Preview selected (1)' }));

  expect(await screen.findByText('Recovery result')).toBeInTheDocument();
  expect(recoveryApi.runPreflight).not.toHaveBeenCalled();
});

test('keeps a blocked client-source incident visible without exposing live row values', async () => {
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

  expect(screen.queryByText(/tampered-from-audit-log/)).not.toBeInTheDocument();
  expect(await screen.findByText(/Gateway does not return the live client row values/)).toBeInTheDocument();
  expect(screen.getAllByText('legacy_recovery_out_of_scope').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Execute recovery (0)' })).toBeDisabled();
});
