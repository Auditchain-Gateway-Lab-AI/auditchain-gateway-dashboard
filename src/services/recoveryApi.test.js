import api from '../api';
import { normalizeError, recoveryApi } from './recoveryApi';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: { data: [] } });
  api.post.mockResolvedValue({ data: { data: {} } });
});

test('uses the JWT tenant and never sends a client selector', async () => {
  await recoveryApi.listIncidents({ status: 'OPEN' });
  await recoveryApi.listRequests({ status: 'PENDING_EXECUTION' });

  expect(api.get).toHaveBeenNthCalledWith(1, '/dashboard/recovery/incidents', {
    params: { status: 'OPEN' },
  });
  expect(api.get).toHaveBeenNthCalledWith(2, '/dashboard/recovery/requests', {
    params: { status: 'PENDING_EXECUTION' },
  });
});

test('lists recovery events with the separated event endpoint and excludes legacy rows by default', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      data: [{ id: 'event-1' }],
      page: 2,
      page_size: 50,
      total_items: 1,
      total_pages: 2,
    },
  });

  const page = await recoveryApi.listEvents({ page: 2, pageSize: 50 });

  expect(api.get).toHaveBeenCalledWith('/dashboard/recovery/events', {
    params: { page: 2, page_size: 50, include_legacy: false },
  });
  expect(page.data).toEqual([{ id: 'event-1' }]);
  expect(page.total_items).toBe(1);
});

test('supports recovery event detail and integrity verification', async () => {
  await recoveryApi.getEvent({ eventId: 'event/1' });
  await recoveryApi.verifyEvent({ eventId: 'event/1' });

  expect(api.get).toHaveBeenNthCalledWith(1, '/dashboard/recovery/events/event%2F1');
  expect(api.get).toHaveBeenNthCalledWith(2, '/dashboard/recovery/events/event%2F1/verify');
});

test('loads the current audit payload separately for the tampered before view', async () => {
  api.get.mockResolvedValueOnce({
    data: [{ log_id: 'log-1', metadata: { room: 161, owner: 'tampered' } }],
  });

  const logs = await recoveryApi.listAuditLogsByResource({ resource: 'RUANGAN:161' });

  expect(api.get).toHaveBeenCalledWith('/dashboard/logs/by-resource/RUANGAN%3A161');
  expect(logs[0].metadata).toEqual({ room: 161, owner: 'tampered' });
});

test('preserves verification status when the backend returns a non-2xx integrity result', () => {
  const error = normalizeError({
    response: { status: 409, data: { status: 'PENDING', event_id: 'event-1' } },
    message: 'Request failed with status code 409',
  });

  expect(error).toMatchObject({
    status: 409,
    data: { status: 'PENDING', event_id: 'event-1' },
    message: 'Recovery verification returned PENDING.',
  });
});

test('supports the client-operated request and execute workflow', async () => {
  await recoveryApi.createRequest({
    incidentId: 'incident-1',
    selectedLogId: 'log-1',
    reason: 'Restore trusted snapshot',
    idempotencyKey: 'request-key-1',
  });
  await recoveryApi.executeRequest({ requestId: 'request/1' });

  expect(api.post).toHaveBeenNthCalledWith(1, '/dashboard/recovery/requests', {
    incident_id: 'incident-1',
    selected_log_id: 'log-1',
    reason: 'Restore trusted snapshot',
    idempotency_key: 'request-key-1',
  });
  expect(api.post).toHaveBeenNthCalledWith(2, '/dashboard/recovery/requests/request%2F1/execute');
  expect(recoveryApi.approveRequest).toBeUndefined();
  expect(recoveryApi.rejectRequest).toBeUndefined();
});
