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

import { buildZonesFromBase44 } from './build-zones-base44.mjs';

const lookups = { equipment: { Blade: 'Blade' }, materials: { Bark: 'Bark' }, consumables: {}, gems: {}, cards: {}, artifacts: {} };
const monsters = [
  { DisplayName: 'Wisp', GameId: 'Wisp', Level: 12, IsBoss: 0, maps: [{ name: 'Forest Field 1' }],
    EquipDrops: [{ Id: 'Blade', DropChance: 5 }], MaterialDrops: [{ Id: 'Bark', DropChance: 100 }],
    ConsumableDrops: [], GemDrops: [], Card: { Id: null }, Artifact: { Id: null } },
  { DisplayName: 'LabA', GameId: 'LabA', Level: 8, IsBoss: 0, maps: [{ name: 'Forest Labyrinth' }],
    EquipDrops: [{ Id: 'Blade', DropChance: 3 }], MaterialDrops: [], ConsumableDrops: [], GemDrops: [], Card: { Id: null }, Artifact: { Id: null } },
  { DisplayName: 'LabB', GameId: 'LabB', Level: 14, IsBoss: 0, maps: [{ name: 'Forest Labyrinth' }],
    EquipDrops: [{ Id: 'Blade', DropChance: 4 }], MaterialDrops: [], ConsumableDrops: [], GemDrops: [], Card: { Id: null }, Artifact: { Id: null } },
];
// Boss whose level (16) sits ABOVE the single-band Forest Field 1 (11-15).
const bossMonster = { DisplayName: 'FFBoss', GameId: 'FFBoss', Level: 16, IsBoss: 1, maps: [],
  spawner: { GameId: 'Lure FFBoss' }, ConsumableDrops: [],
  EquipDrops: [{ Id: 'Blade', DropChance: 1 }], MaterialDrops: [], GemDrops: [], Card: { Id: null }, Artifact: { Id: null } };
// A Forest Field 1 mob drops the boss's lure, so assignBosses pins FFBoss to that map.
monsters[0].ConsumableDrops = [{ Id: 'Lure FFBoss' }];
monsters.push(bossMonster);

const mapTiles = [
  { id: 'ff1', name: 'Forest Field 1', minLevel: 11, maxLevel: 15, isHub: false },
  { id: 'lab-1', name: 'Forest Labyrinth', minLevel: 6, maxLevel: 10, isHub: false },
  { id: 'lab-2', name: 'Forest Labyrinth', minLevel: 11, maxLevel: 15, isHub: false },
  { id: 'nevaris', name: 'Nevaris', minLevel: 0, maxLevel: 0, isHub: true },
];

describe('buildZonesFromBase44', () => {
  const out = buildZonesFromBase44({ monsters, mapTiles, lookups, gameVersion: '2026-06-16' });
  const sub = (id) => out.regions.flatMap((r) => r.subZones).find((s) => s.id === id);

  it('keys sub-zones by tile id and passes gameVersion', () => {
    expect(out.gameVersion).toBe('2026-06-16');
    expect(sub('ff1').name).toBe('Forest Field 1');
  });
  it('resolves drops via the lookups', () => {
    expect(sub('ff1').drops.find((d) => d.name === 'Bark').type).toBe('material');
  });
  it('splits a multi-band map by monster level', () => {
    expect(sub('lab-1').monsters).toEqual(['LabA']); // level 8 -> band 6-10
    expect(sub('lab-2').monsters).toEqual(['LabB']); // level 14 -> band 11-15
  });
  it('attaches a single-band boss even when its level exceeds the band', () => {
    expect(sub('ff1').boss).toBe('FFBoss'); // L16 boss kept on the 11-15 single-band zone
  });
  it('groups level bands under one region and emits empty hub sub-zones', () => {
    const lab = out.regions.find((r) => r.slug === 'forest-labyrinth');
    expect(lab.subZones.map((s) => s.id).sort()).toEqual(['lab-1', 'lab-2']);
    expect(sub('nevaris').isHub).toBe(true);
    expect(sub('nevaris').drops).toEqual([]);
  });
});
