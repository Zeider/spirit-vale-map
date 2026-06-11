import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from './url.js';

describe('url state', () => {
  it('round-trips level and route', () => {
    const qs = encodeState({ playerLevel: 42, route: ['sunny-meadows', 'labyrinth-1'] });
    expect(decodeState(qs)).toEqual({ playerLevel: 42, route: ['sunny-meadows', 'labyrinth-1'] });
  });
  it('defaults level to 1 and route to [] when absent', () => {
    expect(decodeState('')).toEqual({ playerLevel: 1, route: [] });
  });
  it('drops empty route entries', () => {
    expect(decodeState('route=a,,b,').route).toEqual(['a', 'b']);
  });
  it('omits empty params when encoding', () => {
    expect(encodeState({ playerLevel: 1, route: [] })).toBe('lvl=1');
  });
});
