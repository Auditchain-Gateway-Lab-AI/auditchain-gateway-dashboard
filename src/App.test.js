import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Auditchain landing page', async () => {
  render(<App />);
  expect(await screen.findAllByText(/Auditchain/i)).not.toHaveLength(0);
});
