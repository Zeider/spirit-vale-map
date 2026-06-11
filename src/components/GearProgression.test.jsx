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
    render(<StoreProvider init={{ view: 'builds', selectedStage: 0, build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [{ fromLevel: 1, changes: {} }] } }}><GearProgression /></StoreProvider>);
    expect(screen.getAllByTestId('gear-slot')).toHaveLength(10);
  });
});
