import { describe, it, expect } from 'vitest';
import { sortStages, stageRanges, clampCap, effectiveLoadout, stageChangedSlots, categoryOf, itemsForSlot, stageFarmTiles, itemTiles, itemFarmTiles, itemsForTile, loadoutRouteTargets } from './gear.js';
import { resolveTile } from '../data/map-tiles.js';
import { items } from '../data/gear-index.js';

describe('sortStages', () => {
  it('orders by toLevel and dedupes', () => {
    const s = sortStages([{ toLevel: 25, changes: {} }, { toLevel: 10, changes: {} }, { toLevel: 25, changes: {} }]);
    expect(s.map((x) => x.toLevel)).toEqual([10, 25]);
  });
});

describe('stageRanges', () => {
  it('derives contiguous starts anchored at 1', () => {
    const r = stageRanges([{ toLevel: 10, changes: {} }, { toLevel: 25, changes: {} }, { toLevel: 40, changes: {} }]);
    expect(r.map((x) => [x.start, x.end])).toEqual([[1, 10], [11, 25], [26, 40]]);
  });
  it('a single stage runs 1..cap (not 135)', () => {
    expect(stageRanges([{ toLevel: 10, changes: {} }])).toEqual([{ start: 1, end: 10, toLevel: 10, changes: {} }]);
  });
});

describe('clampCap', () => {
  const stages = [{ toLevel: 10, changes: {} }, { toLevel: 25, changes: {} }, { toLevel: 40, changes: {} }];
  it('clamps a middle band above its neighbor down to nextCap-1', () => {
    expect(clampCap(stages, 1, 99)).toBe(39);
  });
  it('clamps below its own start up to start', () => {
    expect(clampCap(stages, 1, 3)).toBe(11);
  });
  it('top band upper bound is 135', () => {
    expect(clampCap(stages, 2, 999)).toBe(135);
  });
});

describe('gear logic', () => {
  it('effectiveLoadout merges changes up to the index, carrying earlier pieces', () => {
    const stages = [
      { toLevel: 10, changes: { weapon: 'a', chest: 'c1' } },
      { toLevel: 25, changes: { weapon: 'b' } },
    ];
    expect(effectiveLoadout(stages, 0)).toEqual({ weapon: 'a', chest: 'c1' });
    expect(effectiveLoadout(stages, 1)).toEqual({ weapon: 'b', chest: 'c1' });
  });
  it('null change unequips a carried slot', () => {
    const stages = [{ toLevel: 10, changes: { chest: 'c1' } }, { toLevel: 25, changes: { chest: null } }];
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
    const stage = { toLevel: 10, changes: { weapon: weaponWithSource.slug } };
    const tiles = stageFarmTiles(stage);
    expect(Array.isArray(tiles)).toBe(true);
  });
  it('itemTiles resolves a dropped item to its drop zones', () => {
    const dropped = Object.values(items).find((i) => i.sources?.length > 0);
    expect(itemTiles(dropped).length).toBeGreaterThan(0);
  });
  it('itemTiles resolves a craft-only item via its craft zone (crafted items are now routable)', () => {
    const craftOnly = Object.values(items).find((i) => (!i.sources || i.sources.length === 0) && i.craft);
    expect(craftOnly).toBeTruthy();
    expect(itemTiles(craftOnly).length).toBeGreaterThan(0);
  });
  it('itemFarmTiles returns drop tiles and EXCLUDES the craft zone when the item drops elsewhere (R2-3)', () => {
    // An item whose craft zone is not one of its drop zones — the route should
    // want it only where it drops, never on its craft-only zone.
    const drift = Object.values(items).find(
      (i) => i.craft && (i.sources || []).length && !(i.sources || []).some((s) => s.zoneName === i.craft.zoneName)
    );
    expect(drift).toBeTruthy();
    const craftTile = resolveTile(drift.craft.zoneName, drift.craft.minLevel);
    const farm = itemFarmTiles(drift);
    expect(farm.length).toBeGreaterThan(0);
    expect(farm).not.toContain(craftTile.id);
    expect(itemTiles(drift)).toContain(craftTile.id); // itemTiles (display) still includes craft
  });
  it('itemFarmTiles falls back to the craft zone for a craft-only item (R2-5)', () => {
    const craftOnly = Object.values(items).find((i) => (!i.sources || i.sources.length === 0) && i.craft);
    const craftTile = resolveTile(craftOnly.craft.zoneName, craftOnly.craft.minLevel);
    expect(itemFarmTiles(craftOnly)).toEqual([craftTile.id]);
  });
  it('itemsForTile lists items obtainable in a tile, sorted, for the WANT-HERE picker (R2-6)', () => {
    const here = itemsForTile('forest-field-1'); // Sunny Meadows 1 (Lv 1-5)
    expect(here.length).toBeGreaterThan(0);
    expect(here.every((i) => itemTiles(i).includes('forest-field-1'))).toBe(true);
    const names = here.map((i) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
  it('loadoutRouteTargets emits (id, want) for every equipped item', () => {
    const dropped = Object.values(items).find((i) => i.sources?.length > 0);
    const targets = loadoutRouteTargets({ weapon: dropped.slug });
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every((t) => t.want === dropped.slug && typeof t.id === 'string')).toBe(true);
  });
});
