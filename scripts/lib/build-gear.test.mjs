import { describe, it, expect } from 'vitest';
import { buildGear, SLOTS } from './build-gear.mjs';

const catalog = {
  equipment: [
    {
      slug: 'abyss-shard', name: 'Abyss Shard', equipmentType: 'Dagger', slots: 2,
      statsPrimary: ['Atk: <span style="color: green">+20</span> <span>+2 per refine</span>'],
      statsSecondary: ['Double Attack: <span>+50%</span>'],
      statsFullSet: [],
      description: 'A dagger.',
      drops: [{ monster: { name: 'Dragonfly Arrow', isBoss: 0 }, chance: 3, maps: [{ name: 'Swamp', slug: 'swamp', minLevel: 36, maxLevel: 40 }] }],
      crafting: { map: { Slug: 'swamp', DisplayName: 'Swamp', MonsterMinLevel: 36 }, materials: [] },
    },
    { slug: 'iron-ring', name: 'Iron Ring', equipmentType: 'Accessory', slots: 0, statsPrimary: [], statsSecondary: [], statsFullSet: [], description: '', drops: [], crafting: null },
    { slug: 'mystery', name: 'Mystery', equipmentType: 'Pet', slots: 0, statsPrimary: [], statsSecondary: [], statsFullSet: [], description: '', drops: [], crafting: null },
  ],
};

describe('buildGear', () => {
  const out = buildGear(catalog);
  it('exposes the 10 loadout slots with two accessory slots', () => {
    expect(out.slots).toEqual(SLOTS);
    expect(out.slots).toContain('accessory1');
    expect(out.slots).toContain('accessory2');
  });
  it('maps weapon types to the weapon category and strips stat HTML to text', () => {
    expect(out.items['abyss-shard']).toMatchObject({ slot: 'weapon', type: 'Dagger', sockets: 2 });
    expect(out.items['abyss-shard'].statsPrimary).toEqual(['Atk: +20 +2 per refine']);
  });
  it('flattens drop sources and craft zone', () => {
    expect(out.items['abyss-shard'].sources).toEqual([
      { monster: 'Dragonfly Arrow', isBoss: false, chance: 3, zoneName: 'Swamp', zoneSlug: 'swamp', minLevel: 36, maxLevel: 40 },
    ]);
    expect(out.items['abyss-shard'].craft).toEqual({ zoneSlug: 'swamp', zoneName: 'Swamp' });
  });
  it('classifies accessory and drops unknown equipment types', () => {
    expect(out.items['iron-ring'].slot).toBe('accessory');
    expect(out.items.mystery).toBeUndefined();
  });
});
