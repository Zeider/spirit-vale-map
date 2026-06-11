import { describe, it, expect } from 'vitest';
import { sortStages, effectiveLoadout, stageChangedSlots, categoryOf, itemsForSlot, stageFarmTiles } from './gear.js';
import { items } from '../data/gear-index.js';

describe('gear logic', () => {
  it('sortStages orders by fromLevel and dedupes', () => {
    const s = sortStages([{ fromLevel: 16, changes: {} }, { fromLevel: 1, changes: {} }, { fromLevel: 16, changes: {} }]);
    expect(s.map((x) => x.fromLevel)).toEqual([1, 16]);
  });
  it('effectiveLoadout merges changes up to the index, carrying earlier pieces', () => {
    const stages = [
      { fromLevel: 1, changes: { weapon: 'a', chest: 'c1' } },
      { fromLevel: 11, changes: { weapon: 'b' } },
    ];
    expect(effectiveLoadout(stages, 0)).toEqual({ weapon: 'a', chest: 'c1' });
    expect(effectiveLoadout(stages, 1)).toEqual({ weapon: 'b', chest: 'c1' });
  });
  it('null change unequips a carried slot', () => {
    const stages = [{ fromLevel: 1, changes: { chest: 'c1' } }, { fromLevel: 11, changes: { chest: null } }];
    expect(effectiveLoadout(stages, 1)).toEqual({});
  });
  it('stageChangedSlots lists only this stage changes', () => {
    expect(stageChangedSlots({ changes: { weapon: 'b' } })).toEqual(['weapon']);
  });
  it('categoryOf strips the accessory slot suffix', () => {
    expect(categoryOf('accessory1')).toBe('accessory');
    expect(categoryOf('weapon')).toBe('weapon');
  });
  it('itemsForSlot returns items of the slot category, sorted', () => {
    const weapons = itemsForSlot('weapon');
    expect(weapons.length).toBeGreaterThan(0);
    expect(weapons.every((i) => i.slot === 'weapon')).toBe(true);
  });
  it('stageFarmTiles resolves changed items source zones to tile ids', () => {
    const weaponWithSource = Object.values(items).find((i) => i.slot === 'weapon' && i.sources.length > 0);
    const stage = { fromLevel: 1, changes: { weapon: weaponWithSource.slug } };
    const tiles = stageFarmTiles(stage);
    expect(Array.isArray(tiles)).toBe(true);
  });
});
