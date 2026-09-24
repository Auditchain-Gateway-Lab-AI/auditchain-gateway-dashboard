import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SourceVerificationBadge from './SourceVerificationBadge';

describe('SourceVerificationBadge', () => {
  test('shows Agent offline without replacing the valid integrity result', () => {
    const onOpen = jest.fn();

    render(
      <SourceVerificationBadge
        verification={{
          status: 'success',
          data: { is_valid: true, agent_status: 'unreachable' },
        }}
        onOpen={onOpen}
      />,
    );

    const badge = screen.getByRole('button', {
      name: 'Integritas Gateway/Fabric valid, tetapi Agent sumber tidak dapat dijangkau.',
    });

    expect(badge).toHaveTextContent('AGENT OFFLINE');
    expect(badge).toHaveClass('ac-status--pending');
    fireEvent.click(badge);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('does not invent a source status for historical checks', () => {
    const { container } = render(
      <SourceVerificationBadge
        verification={{ data: { agent_status: 'skipped_historical' } }}
        onOpen={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
