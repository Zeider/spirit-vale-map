import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import GearLoadout from './GearLoadout.jsx';
import { StoreProvider } from '../state/store.jsx';
import { items } from '../data/gear-index.js';

const weapon = Object.values(items).find((i) => i.slot === 'weapon');
const chest = Object.values(items).find((i) => i.slot === 'chest');

describe('GearLoadout', () => {
  it('renders 10 slots and shows changed vs carried items', () => {
    const stages = [
      { toLevel: 10, changes: { weapon: weapon.slug, chest: chest.slug } },
      { toLevel: 20, changes: { weapon: weapon.slug } },
    ];
    render(
      <StoreProvider init={{ view: 'builds', selectedStage: 1, build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: stages } }}>
        <GearLoadout />
      </StoreProvider>,
    );
    const slotEls = screen.getAllByTestId('gear-slot');
    expect(slotEls).toHaveLength(10);
    const chestSlot = slotEls.find((e) => within(e).queryByText('Chest', { exact: true }));
    expect(chestSlot.className).toMatch(/carried/);
    expect(screen.getByText(/from Lv 1/)).toBeInTheDocument();
  });

  it('opens a card picker from a slot pip and sockets a card', () => {
    const init = { view: 'gear', selectedStage: 0,
      build: { baseClass: 'rogue', advancedClass: null, levels: {}, notes: '',
        attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
        gearStages: [{ toLevel: 10, changes: { weapon: 'bonefang' } }] } };
    render(<StoreProvider init={init}><GearLoadout /></StoreProvider>);
    // Bonefang has 3 card slots -> at least one empty pip is clickable.
    fireEvent.click(screen.getAllByRole('button', { name: /card slot/i })[0]);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });
});
