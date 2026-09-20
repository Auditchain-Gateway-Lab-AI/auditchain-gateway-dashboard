import React from 'react';
import { render } from '@testing-library/react';
import Icon from './Icon';

test('forwards animation classes to the rendered svg', () => {
  const { container } = render(<Icon name="spinner" className="ac-spin" />);

  expect(container.querySelector('svg')).toHaveClass('ac-spin');
});
