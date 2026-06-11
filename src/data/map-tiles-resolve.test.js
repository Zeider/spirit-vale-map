import { describe, it, expect } from 'vitest';
import { resolveTile } from './map-tiles.js';

describe('resolveTile', () => {
  it('resolves a zone by name + level to its tile id', () => {
    const t = resolveTile('Swamp', 36);
    expect(t?.id).toBe('swamp');
  });
  it('falls back to name when the level does not match', () => {
    const t = resolveTile('Swamp', 999);
    expect(t?.name).toBe('Swamp');
  });
  it('returns null for an unknown zone', () => {
    expect(resolveTile('Nowhere', 1)).toBeNull();
  });
});
