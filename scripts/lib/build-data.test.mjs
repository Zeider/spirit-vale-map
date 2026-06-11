import { describe, it, expect } from 'vitest';
import { slugify, toNameMap, buildLookups, aggregateDrops, buildZones } from './build-data.mjs';

const lookups = {
  equipment: { 'Bunny Cap': 'Bunny Cap', NoviceFeet: 'Novice Boots' },
  materials: { 'Tree Bark': 'Tree Bark' },
  consumables: { 'Lure Hare': 'Hare Lure' },
  gems: { 'Firebolt Gem': 'Firebolt Gem' },
  cards: { Bunny: 'Bunny Card' },
  artifacts: { Novice: 'Novice Scroll' },
};
const monsters = {
  Bunny: {
    GameId: 'Bunny', IsBoss: 0,
    EquipDrops: [{ Id: 'Bunny Cap', DropChance: 1 }, { Id: 'NoviceFeet', DropChance: 12 }],
    MaterialDrops: [{ Id: 'Tree Bark', DropChance: 100 }],
    ConsumableDrops: [{ Id: 'Lure Hare', DropChance: 0.3 }],
    GemDrops: [{ Id: 'Firebolt Gem', DropChance: 0.1 }],
    Card: { Id: 'Bunny', DropChance: 1 },
    Artifact: { Id: 'Novice', DropChance: 15 },
  },
  Hare: { GameId: 'Hare', IsBoss: 1, MaterialDrops: [{ Id: 'Tree Bark', DropChance: 50 }], EquipDrops: [{ Id: 'Bunny Cap', DropChance: 9 }] },
};

describe('slugify', () => {
  it('lowercases and dashes', () => {
    expect(slugify('Labyrinth 1')).toBe('labyrinth-1');
    expect(slugify("Demon's Maw")).toBe('demon-s-maw');
  });
});

describe('toNameMap', () => {
  it('handles dict and list shapes', () => {
    expect(toNameMap({ A: { GameId: 'A', DisplayName: 'Alpha' } })).toEqual({ A: 'Alpha' });
    expect(toNameMap([{ GameId: 'B', DisplayName: 'Beta' }])).toEqual({ B: 'Beta' });
  });
});

describe('aggregateDrops', () => {
  const drops = aggregateDrops(['Bunny'], 'Hare', monsters, lookups);
  it('resolves names and types', () => {
    const bark = drops.find((d) => d.id === 'Tree Bark');
    expect(bark).toMatchObject({ name: 'Tree Bark', type: 'material' });
  });
  it('keeps the max chance across monsters', () => {
    const bark = drops.find((d) => d.id === 'Tree Bark');
    expect(bark.chance).toBe(100);
    expect(bark.sources.sort()).toEqual(['Bunny', 'Hare']);
  });
  it('marks boss-only drops', () => {
    const cap = drops.find((d) => d.id === 'Bunny Cap');
    expect(cap.bossOnly).toBe(false);
  });
  it('falls back to raw id when unresolved', () => {
    const d2 = aggregateDrops(['X'], null, { X: { MaterialDrops: [{ Id: 'Unknown', DropChance: 5 }] } }, lookups);
    expect(d2[0]).toMatchObject({ id: 'Unknown', name: 'Unknown', type: 'material' });
  });
  it('sorts by descending chance', () => {
    for (let i = 1; i < drops.length; i++) expect(drops[i - 1].chance).toBeGreaterThanOrEqual(drops[i].chance);
  });
});

describe('buildZones', () => {
  const raw = {
    info: { gameVersion: '0.13.1' },
    maps: {
      'Labyrinth 1': { Slug: 'forest-labyrinth', GameId: 'Labyrinth 1', DisplayName: 'Forest Labyrinth', MonsterMinLevel: 6, MonsterMaxLevel: 10, MonsterPool: ['Bunny'], BossMonster: 'Hare' },
      'Labyrinth 2': { Slug: 'forest-labyrinth', GameId: 'Labyrinth 2', DisplayName: 'Forest Labyrinth', MonsterMinLevel: 11, MonsterMaxLevel: 15, MonsterPool: ['Bunny'], BossMonster: null },
      Nevaris: { Slug: 'nevaris', GameId: 'Nevaris', DisplayName: 'Nevaris', MonsterMinLevel: 0, MonsterMaxLevel: 0, MonsterPool: [], BossMonster: null },
    },
    monsters,
    equipment: lookups.equipment, materials: lookups.materials, consumables: lookups.consumables,
    gems: lookups.gems, cards: lookups.cards, artifacts: [{ GameId: 'Novice', DisplayName: 'Novice Scroll' }],
  };
  const out = buildZones(raw);
  it('groups sub-zones under a region by Slug', () => {
    const region = out.regions.find((r) => r.id === 'forest-labyrinth');
    expect(region.subZones.map((s) => s.id)).toEqual(['labyrinth-1', 'labyrinth-2']);
    expect(region.minLevel).toBe(6);
    expect(region.maxLevel).toBe(15);
  });
  it('flags hubs and gives them no drops', () => {
    const hub = out.regions.find((r) => r.id === 'nevaris').subZones[0];
    expect(hub.isHub).toBe(true);
    expect(hub.drops).toEqual([]);
  });
  it('passes through gameVersion', () => {
    expect(out.gameVersion).toBe('0.13.1');
  });
});
