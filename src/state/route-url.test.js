import { describe, it, expect } from 'vitest';
import { encodeRoute, decodeRoute, sanitizeRoute } from './route-url.js';

const route = [
  { id: 'swamp', notes: 'stay to 40', wants: ['abyss-shard'] },
  { id: 'goblin-cave', notes: '', wants: [] },
];

describe('route url', () => {
  it('round-trips object entries via base64', () => {
    const s = encodeRoute(route);
    expect(decodeRoute(s)).toEqual(route);
  });
  it('decodes a LEGACY comma-id list to objects', () => {
    expect(decodeRoute('swamp,goblin-cave')).toEqual([
      { id: 'swamp', notes: '', wants: [] },
      { id: 'goblin-cave', notes: '', wants: [] },
    ]);
  });
  it('returns [] for empty', () => {
    expect(decodeRoute('')).toEqual([]);
    expect(encodeRoute([])).toBe('');
  });
  it('sanitize keeps known tiles + known wants', () => {
    const out = sanitizeRoute([{ id: 'swamp', notes: 'x', wants: ['abyss-shard', 'nope'] }, { id: 'not-a-tile', notes: '', wants: [] }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'swamp', notes: 'x', wants: ['abyss-shard'] });
  });
  it('sanitize keeps relic (artifact set) wants, not just gear', () => {
    const out = sanitizeRoute([{ id: 'swamp', notes: '', wants: ['warglyph', 'nope'] }]);
    expect(out[0].wants).toEqual(['warglyph']);
  });
});
