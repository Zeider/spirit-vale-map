import { describe, it, expect } from 'vitest';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';

const full = {
  baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 },
  gearStages: [{ fromLevel: 1, changes: { weapon: 'abyss-shard' } }],
  attributes: { str: 3, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
  notes: 'farm to 40; alt: axe',
};

describe('build url (base64)', () => {
  it('round-trips a full build incl. notes/attributes via base64', () => {
    const s = encodeBuild(full);
    expect(s).not.toContain('~'); // base64url, not legacy
    expect(decodeBuild(s)).toEqual(full);
  });
  it('decodes a LEGACY ~-delimited build (back-compat)', () => {
    const b = decodeBuild('acolyte~priest~heal:5');
    expect(b.baseClass).toBe('acolyte');
    expect(b.advancedClass).toBe('priest');
    expect(b.levels).toEqual({ heal: 5 });
    expect(b.gearStages).toEqual([]);
    expect(b.notes).toBe('');
    expect(b.attributes).toEqual({ str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 });
  });
  it('returns null/empty for empties', () => {
    expect(decodeBuild('')).toBeNull();
    expect(encodeBuild(null)).toBe('');
  });
  it('sanitize drops unknown class', () => {
    expect(sanitizeBuild({ baseClass: 'nope', levels: {}, gearStages: [], attributes: {}, notes: '' })).toBeNull();
  });
  it('sanitize keeps known skills/items, clamps, defaults attributes, coerces notes', () => {
    const b = sanitizeBuild({ baseClass: 'acolyte', advancedClass: null, levels: { heal: 999, fake: 3 }, gearStages: [{ fromLevel: 200, changes: { weapon: 'abyss-shard', x: 'no' } }], attributes: { str: 9 }, notes: 42 });
    expect(b.levels.fake).toBeUndefined();
    expect(b.gearStages[0].fromLevel).toBe(135);
    expect(b.gearStages[0].changes).toEqual({ weapon: 'abyss-shard' });
    expect(b.attributes.str).toBe(9);
    expect(b.attributes.agi).toBe(1);
    expect(b.notes).toBe('');
  });
});
