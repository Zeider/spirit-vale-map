import { describe, it, expect } from 'vitest';
import { sumLoadoutStats } from './stats.js';

const items = {
  a: { parsedStats: [{ label: 'Atk', value: 20, percent: false }, { label: 'Crit', value: 5, percent: true }] },
  b: { parsedStats: [{ label: 'Atk', value: 10, percent: false }, { label: 'Note', raw: true }] },
};

describe('sumLoadoutStats', () => {
  it('sums by label, keeps percent flag, ignores raw', () => {
    const out = sumLoadoutStats({ weapon: 'a', chest: 'b' }, items);
    expect(out.find((s) => s.label === 'Atk')).toEqual({ label: 'Atk', value: 30, percent: false });
    expect(out.find((s) => s.label === 'Crit')).toEqual({ label: 'Crit', value: 5, percent: true });
    expect(out.some((s) => s.label === 'Note')).toBe(false);
  });
  it('handles an empty loadout', () => {
    expect(sumLoadoutStats({}, items)).toEqual([]);
  });
});
