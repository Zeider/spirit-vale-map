import { describe, it, expect } from 'vitest';
import { pack, unpack } from './urlcodec.js';

// Reproduce the pre-compression base64url(JSON) format for back-compat tests.
const b64url = (obj) => {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const obj = { a: 1, b: 'héllo', list: [{ x: true }, null], nested: { deep: [1, 2, 3] } };

describe('urlcodec', () => {
  it('round-trips an object', () => {
    expect(unpack(pack(obj))).toEqual(obj);
  });
  it('produces a URLSearchParams-safe string (z-marked, no + or ~)', () => {
    const s = pack(obj);
    expect(s[0]).toBe('z');
    expect(s).not.toContain('+'); // URLSearchParams would read '+' as a space
    expect(s).not.toContain('~');
  });
  it('still decodes legacy base64url(JSON) payloads (back-compat)', () => {
    expect(unpack(b64url(obj))).toEqual(obj);
  });
  it('compresses a repetitive build well below base64 size', () => {
    const big = { gearStages: Array.from({ length: 6 }, (_, i) => ({
      toLevel: (i + 1) * 10,
      changes: { weapon: 'executioner-axe', chest: 'cleric-vest', headgear: 'grave-helm' },
      cards: { weapon: ['Bee Card', 'Bomb Card'] },
      artifacts: { rune: { set: 'spellweaver', gem: 'atk-gem' }, jewel: { set: 'spellweaver', gem: 'crit-gem' } },
    })) };
    expect(pack(big).length).toBeLessThan(b64url(big).length);
  });
});
