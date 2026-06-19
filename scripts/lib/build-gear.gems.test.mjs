import { describe, it, expect } from 'vitest';
import { buildGear } from './build-gear.mjs';

const catalog = {
  equipment: [],
  cards: [],
  gems: [
    { name: 'Atk Gem', slug: 'atk-gem', affix: 'None', description: 'd',
      stats: ['Atk: <span>+5</span>'] },
  ],
};

describe('buildGear gems', () => {
  it('builds gems keyed by slug with stripped stat strings', () => {
    const out = buildGear(catalog, {});
    expect(out.gems['atk-gem']).toMatchObject({ kind: 'gem', name: 'Atk Gem', slug: 'atk-gem', affix: 'None' });
    expect(out.gems['atk-gem'].stats).toEqual(['Atk: +5']);
  });
});
