import React from 'react';
import { render } from '@testing-library/react';
import Icon from './Icon';

test('forwards animation classes to the rendered svg', () => {
  const { container } = render(<Icon name="spinner" className="ac-spin" />);

  expect(container.querySelector('svg')).toHaveClass('ac-spin');
});

test('renders the warning triangle used by recovery incidents', () => {
  const { container } = render(<Icon name="alertTriangle" />);

  expect(container.querySelectorAll('svg path')).toHaveLength(2);
});

test('renders the recovery filter icon', () => {
  const { container } = render(<Icon name="filter" />);

  expect(container.querySelector('svg path')).toBeInTheDocument();
});
