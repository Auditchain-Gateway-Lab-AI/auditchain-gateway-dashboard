import React from 'react';
import { render, screen } from '@testing-library/react';
import SnapshotViewer from './SnapshotViewer';

describe('SnapshotViewer provenance', () => {
  test('labels prior-event comparison as unverified before-state', () => {
    render(
      <SnapshotViewer
        currentLog={{ action: 'UPDATE', metadata: { status: 'new' } }}
        previousLog={{ action: 'UPDATE', metadata: { status: 'old' } }}
      />
    );

    expect(screen.getByRole('note')).toHaveTextContent('not an independently verified before-state');
    expect(screen.getByText('Prior event')).toBeInTheDocument();
    expect(screen.getByText('Current event')).toBeInTheDocument();
  });
});
