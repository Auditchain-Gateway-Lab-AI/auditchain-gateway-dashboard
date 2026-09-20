import api from '../api';
import { recoveryApi } from './recoveryApi';

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
