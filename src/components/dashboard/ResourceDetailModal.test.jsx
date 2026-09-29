import {
  getIntegrityBadge,
  getSourceVerificationTitle,
  isLatestSourceEvent,
} from './ResourceDetailModal';

describe('ResourceDetailModal source verification helpers', () => {
  test('uses the latest client event when recovery is newer in the timeline', () => {
    const status = {
      is_latest: false,
      is_latest_client_event: true,
      agent_status: 'matched',
    };

    expect(isLatestSourceEvent(status)).toBe(true);
    expect(getSourceVerificationTitle(status)).toBe('Agent: matched');
  });

  test('marks recovery as not applicable for source comparison', () => {
    const status = {
      is_latest: true,
      is_latest_client_event: false,
      agent_status: 'skipped_recovery',
    };

    expect(isLatestSourceEvent(status)).toBe(false);
    expect(getSourceVerificationTitle(status)).toBe(
      'Recovery event — source comparison is not applicable',
    );
  });

  test('supports API responses created before the new field existed', () => {
    expect(isLatestSourceEvent({ is_latest: true })).toBe(true);
  });

  test('normalizes audit-log verification badges to VALID or INVALID', () => {
    expect(getIntegrityBadge('valid')).toEqual({ label: 'VALID', className: 'ac-status--valid' });
    expect(getIntegrityBadge('pending')).toEqual({ label: 'INVALID', className: 'ac-status--invalid' });
    expect(getIntegrityBadge('agent_matched')).toEqual({ label: 'INVALID', className: 'ac-status--invalid' });
  });
});
