import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import GearLoadout from './GearLoadout.jsx';
import { StoreProvider } from '../state/store.jsx';
import { items } from '../data/gear-index.js';

const weapon = Object.values(items).find((i) => i.slot === 'weapon');
const chest = Object.values(items).find((i) => i.slot === 'chest');

describe('GearLoadout', () => {
  it('renders 10 slots and shows changed vs carried items', () => {
    const stages = [
      { fromLevel: 1, changes: { weapon: weapon.slug, chest: chest.slug } },
      { fromLevel: 11, changes: { weapon: weapon.slug } },
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
  });
});
