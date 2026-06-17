import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatSheet from './StatSheet.jsx';
import { StoreProvider } from '../state/store.jsx';
import { items } from '../data/gear-index.js';

const weaponWithAtk = Object.values(items).find((i) => i.slot === 'weapon' && i.parsedStats.some((s) => s.label === 'Atk' && !s.raw));

describe('StatSheet', () => {
  it('shows summed gear stats for the active stage and an attribute allocator', () => {
    render(
      <StoreProvider init={{ view: 'gear', selectedStage: 0, build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [{ toLevel: 10, changes: { weapon: weaponWithAtk.slug } }], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } } }}>
        <StatSheet />
      </StoreProvider>,
    );
    expect(screen.getByText(/total stats/i)).toBeInTheDocument();
    expect(screen.getByText('Atk')).toBeInTheDocument();
    expect(screen.getByText(/attributes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /increase str/i }));
    expect(screen.getByTestId('attr-str').textContent).toMatch(/2/);
  });
});
