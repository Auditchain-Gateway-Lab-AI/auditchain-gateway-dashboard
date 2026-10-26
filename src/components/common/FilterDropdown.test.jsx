import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FilterDropdown from './FilterDropdown';

const options = [{ value: '24H', label: '24 jam' }, { value: '7D', label: '7 hari' }, { value: '30D', label: '30 hari' }];

test('opens on the selected option, supports keyboard selection, and returns focus', () => {
  const onChange = jest.fn();
  render(<FilterDropdown value="7D" options={options} onChange={onChange} ariaLabel="Rentang" />);
  const trigger = screen.getByRole('button', { name: 'Rentang' });
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const selected = screen.getByRole('option', { name: '7 hari' });
  expect(selected).toHaveFocus();
  expect(selected).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(selected, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { name: '30 hari' })).toHaveFocus();
  fireEvent.click(screen.getByRole('option', { name: '30 hari' }));
  expect(onChange).toHaveBeenCalledWith('30D');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('Escape and outside clicks dismiss without changing the range', () => {
  const onChange = jest.fn();
  render(<FilterDropdown value="7D" options={options} onChange={onChange} ariaLabel="Rentang" />);
  const trigger = screen.getByRole('button', { name: 'Rentang' });
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole('option', { name: '7 hari' }), { key: 'Escape' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(trigger);
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});
