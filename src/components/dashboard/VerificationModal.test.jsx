import React from 'react';
import { act, render, screen } from '@testing-library/react';
import VerificationModal from './VerificationModal';

describe('VerificationModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('explains that source verification is skipped for a recovery event', () => {
    render(
      <VerificationModal
        result={{
          status: 'success',
          data: {
            is_valid: true,
            log_id: 'recovery-log-1',
            message: 'Data valid.',
            agent_status: 'skipped_recovery',
          },
        }}
        onClose={jest.fn()}
      />,
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText('Tidak diperiksa (event recovery)')).toBeInTheDocument();
    expect(screen.queryByText('Agent tidak terhubung')).not.toBeInTheDocument();
  });
});
