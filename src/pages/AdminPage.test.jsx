import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import api from '../api';
import AdminPage from './AdminPage';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    defaults: { baseURL: 'http://localhost:8080/api' },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation(url => {
    if (url === '/admin/summary') return Promise.resolve({ data: { total_clients: 0 } });
    return Promise.resolve({ data: [] });
  });
});

test('redirects legacy Kafka URL to the unified Client Registry', async () => {
  render(
    <MemoryRouter initialEntries={['/admin?tab=kafka']}>
      <Routes>
        <Route path="/admin" element={<><AdminPage onLogout={jest.fn()} /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=clients'));
  expect(screen.getByRole('heading', { name: 'Client Registry' })).toBeInTheDocument();
  expect(screen.queryByText('Client Users CDC')).not.toBeInTheDocument();
  expect(screen.queryByText('Kafka Configuration')).not.toBeInTheDocument();
});

const bulkClients = [
  { id: 'one', company_name: 'Client One', status: 'active' },
  { id: 'two', company_name: 'Client Two', status: 'active' },
  { id: 'three', company_name: 'Client Three', status: 'active' },
];

function renderClientRegistry() {
  api.get.mockImplementation(url => Promise.resolve({ data: url === '/admin/clients' ? bulkClients : url === '/admin/summary' ? {} : [] }));
  render(<MemoryRouter initialEntries={['/admin?tab=clients']}><AdminPage onLogout={jest.fn()} /></MemoryRouter>);
}

afterEach(() => jest.restoreAllMocks());

test('bulk deletion requires confirmation and only deletes selected clients', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  renderClientRegistry();
  fireEvent.click(await screen.findByLabelText('Select Client One'));
  fireEvent.click(screen.getByLabelText('Select Client Three'));
  fireEvent.click(screen.getByRole('button', { name: 'Delete selected (2)' }));
  expect(api.delete).not.toHaveBeenCalled();
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Client Three'));
  confirm.mockReturnValue(true);
  api.delete.mockResolvedValue({});
  fireEvent.click(screen.getByRole('button', { name: 'Delete selected (2)' }));
  await screen.findByText('2 client(s) deleted.');
  expect(api.delete.mock.calls).toEqual([['/admin/clients/one'], ['/admin/clients/three']]);
  expect(screen.getByRole('button', { name: 'Delete selected (0)' })).toBeDisabled();
});

test('select all supports partial selection and retains failed clients for retry', async () => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  api.delete.mockImplementation(url => url.endsWith('/two') ? Promise.reject({ response: { data: { error: 'Server unavailable' } } }) : Promise.resolve({}));
  renderClientRegistry();
  fireEvent.click(await screen.findByLabelText('Select Client One'));
  expect(screen.getByLabelText('Select all clients').indeterminate).toBe(true);
  fireEvent.click(screen.getByLabelText('Select all clients'));
  expect(screen.getByLabelText('Select Client Three')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Delete selected (3)' }));
  await screen.findByText(/2 client\(s\) deleted. 1 failed: Client Two: Server unavailable/);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Delete selected (1)' })).toBeEnabled());
  expect(screen.getByLabelText('Select Client Two')).toBeChecked();
  expect(screen.getByLabelText('Select Client One')).not.toBeChecked();
});
