import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GearPicker from './GearPicker.jsx';
import { StoreProvider } from '../state/store.jsx';

const init = {
  openSlot: 'weapon', selectedStage: 0,
  build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [{ toLevel: 10, changes: {} }],
    notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } },
};

describe('GearPicker', () => {
  it('searches by stat (not just name) and shows the matched stat', () => {
    render(<StoreProvider init={init}><GearPicker /></StoreProvider>);
    // "venom strike" is in Bonefang's stats but not its name.
    fireEvent.change(screen.getByPlaceholderText(/search weapon/i), { target: { value: 'venom strike' } });
    expect(screen.getByText('Bonefang')).toBeInTheDocument();
    expect(screen.getAllByText(/Venom Strike/i).length).toBeGreaterThan(0);
  });
});
