import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkillTree from './SkillTree.jsx';
import { StoreProvider } from '../state/store.jsx';

describe('SkillTree', () => {
  it('renders the class grid and a budget of 0 / 50', () => {
    render(
      <StoreProvider init={{ view: 'builds', build: { baseClass: 'acolyte', advancedClass: null, levels: {} } }}>
        <SkillTree classSlug="acolyte" tree="base" />
      </StoreProvider>,
    );
    expect(screen.getAllByRole('button', { name: /increase/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/0\s*\/\s*50/)).toBeInTheDocument();
  });
});
