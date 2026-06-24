import { describe, it, expect } from 'vitest';
import { buildGear, buildArtifacts, SLOTS, parseStat } from './build-gear.mjs';

const catalog = {
  equipment: [{
    slug: 'abyss-shard', name: 'Abyss Shard', equipmentType: 'Dagger', slots: 2,
    statsPrimary: ['Atk: <span>+20</span> <span>+2 per refine</span>'],
    statsSecondary: ['Double Attack: <span>+50%</span>', 'Special note line'],
    statsFullSet: [],
    description: 'A dagger.',
    drops: [{ monster: { name: 'Dragonfly Arrow', isBoss: 0 }, chance: 3, maps: [{ name: 'Swamp', slug: 'swamp', minLevel: 36, maxLevel: 40 }] }],
    crafting: { map: { Slug: 'swamp', DisplayName: 'Swamp' }, materials: [{ item: { DisplayName: 'Larva' }, count: 75 }] },
  }],
  cards: [{ name: 'Angel Card', slug: 'angel-card', slot: 'Weapon', affix: 'Blessed', description: 'A serene being.' }],
};

describe('parseStat', () => {
  it('parses flat + per-refine', () => {
    expect(parseStat('Atk: +20 +2 per refine')).toEqual({ label: 'Atk', value: 20, perRefine: 2, percent: false });
  });
  it('parses percent', () => {
    expect(parseStat('Double Attack: +50%')).toEqual({ label: 'Double Attack', value: 50, perRefine: 0, percent: true });
  });
  it('keeps non-matching lines as raw', () => {
    expect(parseStat('Special note line')).toEqual({ label: 'Special note line', raw: true });
  });
});

describe('buildGear', () => {
  const out = buildGear(catalog);
  const a = out.items['abyss-shard'];
  it('uses cardSlots (not sockets) and SLOTS has two accessory slots', () => {
    expect(a.cardSlots).toBe(2);
    expect(a.sockets).toBeUndefined();
    expect(SLOTS).toContain('accessory2');
  });
  it('adds parsedStats', () => {
    expect(a.parsedStats[0]).toEqual({ label: 'Atk', value: 20, perRefine: 2, percent: false });
  });
  it('adds craft materials + band minLevel (Swamp = Lv 36)', () => {
    expect(a.craft).toEqual({ zoneSlug: 'swamp', zoneName: 'Swamp', minLevel: 36, materials: [{ name: 'Larva', count: 75 }] });
  });
  it('item has setName null when no equipBySlug provided', () => {
    expect(a.setName).toBe(null);
  });
  it('item has setName from equipBySlug when provided', () => {
    const equipBySlug = new Map([['abyss-shard', { Set: 'Arcane' }]]);
    const out2 = buildGear(catalog, { equipBySlug });
    expect(out2.items['abyss-shard'].setName).toBe('Arcane');
  });
  it('returns empty artifacts array when none provided', () => {
    expect(out.artifacts).toEqual([]);
  });
});

describe('buildGear cards', () => {
  const out = buildGear({ equipment: [], cards: [{ name: 'Angel Card', slug: 'angel-card', slot: 'Weapon', affix: 'Blessed', description: 'A serene being.' }] });
  it('emits a cards map keyed by name with kind=card', () => {
    expect(out.cards['Angel Card']).toEqual({ kind: 'card', name: 'Angel Card', slug: 'angel-card', equipSlot: 'Weapon', affix: 'Blessed', description: 'A serene being.', stats: [] });
  });
  it('tolerates a catalog with no cards', () => {
    expect(buildGear({ equipment: [] }).cards).toEqual({});
  });
  it('accepts new raw object shape with cardBySlug', () => {
    const cardBySlug = new Map([['angel-card', { Stats: [{ Name: 'Atk_10', Value: { Value: 10 } }] }]]);
    const out2 = buildGear({ equipment: [], cards: [{ name: 'Angel Card', slug: 'angel-card', slot: 'Weapon', affix: 'Blessed', description: 'A serene being.' }] }, { cardBySlug });
    expect(out2.cards['Angel Card'].stats).toEqual(['+10 Atk']);
  });
});

describe('buildArtifacts', () => {
  const out = buildArtifacts([{
    Slug: 'warglyph',
    DisplayName: 'Warglyph',
    Description: 'd',
    FullSet: [{ Name: 'Atk_10', Value: { Value: 10 } }],
    PerPiece: [{ Name: 'Atk_5', Value: { Value: 5 } }],
    PerRefine: [{ Name: 'Atk_0', Value: { Value: 0 } }],
    Maps: ['Goblin Warcamp'],
  }]);
  it('decodes artifact bonuses and drops zero per-refine noise', () => {
    expect(out[0]).toEqual({
      slug: 'warglyph',
      name: 'Warglyph',
      description: 'd',
      fullSet: ['+10 Atk'],
      perPiece: ['+5 Atk'],
      perRefine: [],
      zones: ['Goblin Warcamp'],
    });
  });
  it('tolerates empty input', () => { expect(buildArtifacts()).toEqual([]); });
});
