import { describe, it, expect } from 'vitest';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';

describe('build url', () => {
  it('round-trips a build without gear (no 4th segment)', () => {
    const b = { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5, faith: 3 }, gearStages: [] };
    expect(encodeBuild(b)).toBe('acolyte~priest~heal:5,faith:3');
    expect(decodeBuild('acolyte~priest~heal:5,faith:3')).toEqual(b);
  });
  it('encodes and decodes gear stages', () => {
    const b = { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [
      { fromLevel: 1, changes: { weapon: 'hunting-knife' } },
      { fromLevel: 16, changes: { weapon: 'bonefang', accessory1: 'amber-bow' } },
    ] };
    const s = encodeBuild(b);
    expect(s).toBe('rogue~~~1:weapon=hunting-knife;16:weapon=bonefang,accessory1=amber-bow');
    expect(decodeBuild(s)).toEqual(b);
  });
  it('returns null for empty', () => {
    expect(decodeBuild('')).toBeNull();
    expect(encodeBuild(null)).toBe('');
  });
  it('sanitize drops unknown class', () => {
    expect(sanitizeBuild({ baseClass: 'not-a-class', advancedClass: null, levels: {}, gearStages: [] })).toBeNull();
  });
  it('sanitize keeps known gear, drops unknown items, sorts stages, clamps levels', () => {
    const b = sanitizeBuild({ baseClass: 'acolyte', advancedClass: null, levels: {}, gearStages: [
      { fromLevel: 200, changes: { weapon: 'abyss-shard', chest: 'not-a-real-item' } },
      { fromLevel: 1, changes: {} },
    ] });
    expect(b.gearStages[0].fromLevel).toBe(1);
    expect(b.gearStages[1].fromLevel).toBe(135);
    expect(b.gearStages[1].changes).toEqual({ weapon: 'abyss-shard' });
  });
});
