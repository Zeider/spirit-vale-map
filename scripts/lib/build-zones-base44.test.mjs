import { describe, it, expect } from 'vitest';
import { buildLookupsAugmented, assignBosses } from './build-zones-base44.mjs';

describe('buildLookupsAugmented', () => {
  const v013 = {
    equipment: { OldBoots: { GameId: 'OldBoots', DisplayName: 'Old Boots' } },
    materials: { TreeBark: { GameId: 'TreeBark', DisplayName: 'Tree Bark' } },
    consumables: {}, gems: {}, cards: {},
    artifacts: [{ GameId: 'Matk', DisplayName: 'Starfire' }],
  };
  const base44 = {
    equipment: [{ GameId: 'OldBoots', DisplayName: 'Old Boots v2' }, { GameId: 'NewBlade', DisplayName: 'New Blade' }],
    gems: [{ GameId: 'FireGem', DisplayName: 'Fire Gem' }],
    cards: [{ GameId: 'BunnyCard', DisplayName: 'Bunny Card' }],
  };
  const out = buildLookupsAugmented(v013, base44);

  it('augments equipment with new base44 ids and prefers base44 names', () => {
    expect(out.equipment.NewBlade).toBe('New Blade');
    expect(out.equipment.OldBoots).toBe('Old Boots v2');
  });
  it('adds base44 gems/cards', () => {
    expect(out.gems.FireGem).toBe('Fire Gem');
    expect(out.cards.BunnyCard).toBe('Bunny Card');
  });
  it('keeps v0.13.1-only tables (materials/artifacts) intact', () => {
    expect(out.materials.TreeBark).toBe('Tree Bark');
    expect(out.artifacts.Matk).toBe('Starfire');
  });
});

describe('assignBosses', () => {
  const monsters = [
    { DisplayName: 'Grunt', IsBoss: 0, maps: [{ name: 'Cave' }], ConsumableDrops: [{ Id: 'Lure Warlord' }] },
    { DisplayName: 'Warlord', IsBoss: 1, maps: [], spawner: { GameId: 'Lure Warlord' }, ConsumableDrops: [] },
    { DisplayName: 'Loner', IsBoss: 1, maps: [], spawner: { GameId: 'Lure Nowhere' }, ConsumableDrops: [] },
  ];
  it('assigns a boss to the map whose monsters drop its lure', () => {
    const byMap = assignBosses(monsters);
    expect(byMap.Cave.DisplayName).toBe('Warlord');
  });
  it('skips bosses whose lure is dropped nowhere', () => {
    const byMap = assignBosses(monsters);
    expect(Object.values(byMap).some((b) => b.DisplayName === 'Loner')).toBe(false);
  });
});
