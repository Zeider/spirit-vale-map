import { describe, it, expect } from 'vitest';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';

describe('build url', () => {
  it('round-trips a build', () => {
    const b = { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5, faith: 3 } };
    const s = encodeBuild(b);
    expect(s).toBe('acolyte~priest~heal:5,faith:3');
    expect(decodeBuild(s)).toEqual(b);
  });
  it('handles no advanced class', () => {
    expect(encodeBuild({ baseClass: 'mage', advancedClass: null, levels: { firebolt: 2 } })).toBe('mage~~firebolt:2');
    expect(decodeBuild('mage~~firebolt:2')).toEqual({ baseClass: 'mage', advancedClass: null, levels: { firebolt: 2 } });
  });
  it('returns null for empty', () => {
    expect(decodeBuild('')).toBeNull();
    expect(encodeBuild(null)).toBe('');
  });
  it('sanitize drops unknown class', () => {
    expect(sanitizeBuild({ baseClass: 'not-a-class', advancedClass: null, levels: { heal: 5 } })).toBeNull();
  });
  it('sanitize clamps levels and drops unknown skills', () => {
    const b = sanitizeBuild({ baseClass: 'acolyte', advancedClass: null, levels: { heal: 999, 'fake-skill': 3 } });
    expect(b.baseClass).toBe('acolyte');
    expect(b.levels['fake-skill']).toBeUndefined();
    expect(b.levels.heal).toBeLessThanOrEqual(10);
  });
});
