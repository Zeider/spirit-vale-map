import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GearProgression from './GearProgression.jsx';
import { StoreProvider } from '../state/store.jsx';

describe('GearProgression', () => {
  it('shows an add-stage prompt when there are no stages', () => {
    render(<StoreProvider init={{ view: 'builds', build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [] } }}><GearProgression /></StoreProvider>);
    expect(screen.getByText(/gear stages/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
  });
  it('renders the loadout when a stage exists', () => {
    render(<StoreProvider init={{ view: 'builds', selectedStage: 0, build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [{ toLevel: 10, changes: {} }], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } } }}><GearProgression /></StoreProvider>);
    expect(screen.getAllByTestId('gear-slot')).toHaveLength(10);
  });
});
