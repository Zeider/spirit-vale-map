import { describe, it, expect } from 'vitest';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';

const full = {
  baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 },
  gearStages: [{ toLevel: 10, changes: { weapon: 'abyss-shard' } }],
  attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, notes: 'hi',
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
  it('migrates a legacy fromLevel build to toLevel caps', () => {
    const b = sanitizeBuild({
      baseClass: 'acolyte', advancedClass: null, levels: {},
      gearStages: [{ fromLevel: 1, changes: {} }, { fromLevel: 11, changes: {} }, { fromLevel: 26, changes: {} }],
      attributes: {}, notes: '',
    });
    expect(b.gearStages.map((s) => s.toLevel)).toEqual([10, 25, 135]);
  });

  it('clamps and drops invalid items in stages', () => {
    const b = sanitizeBuild({
      baseClass: 'acolyte', advancedClass: null, levels: {},
      gearStages: [{ toLevel: 200, changes: { weapon: 'abyss-shard', x: 'no' } }],
      attributes: {}, notes: '',
    });
    expect(b.gearStages[0].toLevel).toBe(135);
    expect(b.gearStages[0].changes).toEqual({ weapon: 'abyss-shard' });
  });
});
