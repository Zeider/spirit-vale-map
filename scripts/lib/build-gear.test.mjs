import { describe, it, expect } from 'vitest';
import { buildGear, SLOTS, parseStat } from './build-gear.mjs';

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
  it('adds craft materials', () => {
    expect(a.craft).toEqual({ zoneSlug: 'swamp', zoneName: 'Swamp', materials: [{ name: 'Larva', count: 75 }] });
  });
});
