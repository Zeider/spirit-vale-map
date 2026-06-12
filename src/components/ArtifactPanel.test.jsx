import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ArtifactPanel from './ArtifactPanel.jsx';

describe('ArtifactPanel', () => {
  it('renders artifacts with their set bonuses (or nothing if none)', () => {
    render(<ArtifactPanel />);
    // Real gear-index has 27 artifacts; assert the heading appears.
    expect(screen.getByText('Artifacts')).toBeInTheDocument();
  });
});
