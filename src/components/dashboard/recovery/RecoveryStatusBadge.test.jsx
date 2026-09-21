import React from 'react';
import { render, screen } from '@testing-library/react';
import RecoveryStatusBadge from './RecoveryStatusBadge';

test('presents an open incident as an actionable status with a warning icon', () => {
  const { container } = render(<RecoveryStatusBadge status="OPEN" />);

  expect(screen.getByText('Incident open')).toBeInTheDocument();
  expect(container.querySelector('.ac-recovery-status--danger svg path')).toBeInTheDocument();
});
