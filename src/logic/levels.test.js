import { describe, it, expect } from 'vitest';
import { classifyLevel, computeGaps } from './levels.js';

describe('classifyLevel', () => {
  it('returns under / on / over', () => {
    expect(classifyLevel(6, 10, 3)).toBe('under');
    expect(classifyLevel(6, 10, 8)).toBe('on');
    expect(classifyLevel(6, 10, 12)).toBe('over');
    expect(classifyLevel(6, 10, 6)).toBe('on');
    expect(classifyLevel(6, 10, 10)).toBe('on');
  });
});

describe('computeGaps', () => {
  it('returns [] when contiguous', () => {
    expect(computeGaps([{ minLevel: 1, maxLevel: 5 }, { minLevel: 6, maxLevel: 10 }])).toEqual([]);
  });
  it('finds an uncovered range between bands', () => {
    expect(computeGaps([{ minLevel: 1, maxLevel: 5 }, { minLevel: 11, maxLevel: 15 }])).toEqual([{ from: 6, to: 10 }]);
  });
  it('ignores ordering and overlaps', () => {
    expect(computeGaps([{ minLevel: 11, maxLevel: 15 }, { minLevel: 1, maxLevel: 12 }])).toEqual([]);
  });
  it('returns [] for empty input', () => {
    expect(computeGaps([])).toEqual([]);
  });
});
