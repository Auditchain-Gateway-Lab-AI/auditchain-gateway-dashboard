import { mapRangeItemToVerifyStatus } from './formatters';

describe('mapRangeItemToVerifyStatus', () => {
  test('keeps source reachability separate from cryptographic validity', () => {
    const mapped = mapRangeItemToVerifyStatus({
      log_id: 'log-1',
      verify_status: 'success',
      message: 'Gateway and Fabric are valid.',
      agent_status: 'unreachable',
      agent_discrepancies: [{ field: 'name' }],
    });

    expect(mapped.status).toBe('success');
    expect(mapped.data.is_valid).toBe(true);
    expect(mapped.data.agent_status).toBe('unreachable');
    expect(mapped.data.agent_discrepancies).toEqual([{ field: 'name' }]);
  });
});
