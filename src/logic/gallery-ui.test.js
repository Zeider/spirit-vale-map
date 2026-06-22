import { describe, it, expect } from 'vitest';
import { classColor, relativeTime, filterSortBuilds, ROLES, CONTENT } from './gallery-ui.js';

describe('classColor', () => {
  it('maps known classes and falls back', () => {
    expect(classColor('mage')).toMatch(/^#/);
    expect(classColor('???')).toBe('#8ea0bf');
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-06-22T00:00:00Z');
  it('formats buckets', () => {
    expect(relativeTime('2026-06-21T23:59:30Z', now)).toBe('just now');
    expect(relativeTime('2026-06-21T23:30:00Z', now)).toBe('30m');
    expect(relativeTime('2026-06-21T21:00:00Z', now)).toBe('3h');
    expect(relativeTime('2026-06-20T00:00:00Z', now)).toBe('2d');
    expect(relativeTime('2026-06-01T00:00:00Z', now)).toBe('3w');
  });

  it('formats years at the 52-week boundary and beyond', () => {
    expect(relativeTime('2025-06-23T00:00:00Z', now)).toBe('1y');  // 364 days = 52 weeks
    expect(relativeTime('2024-06-22T00:00:00Z', now)).toBe('2y');  // ~104 weeks
  });
});

describe('filterSortBuilds', () => {
  const rows = [
    { name: 'Frost Mage', description: 'aoe', base_class: 'mage', role: ['DPS'], content: ['Endgame'], like_count: 2, created_at: '2026-06-01T00:00:00Z' },
    { name: 'Holy Tank', description: 'survive', base_class: 'knight', role: ['Tank'], content: ['Boss'], like_count: 9, created_at: '2026-06-10T00:00:00Z' },
    { name: 'Level Rogue', description: 'fast xp', base_class: 'rogue', role: ['DPS'], content: ['Leveling'], like_count: 0, created_at: '2026-06-20T00:00:00Z' },
  ];
  it('sorts newest by default', () => {
    expect(filterSortBuilds(rows, {}).map((r) => r.name)).toEqual(['Level Rogue', 'Holy Tank', 'Frost Mage']);
  });
  it('sorts most-liked', () => {
    expect(filterSortBuilds(rows, { sort: 'most-liked' })[0].name).toBe('Holy Tank');
  });
  it('filters by class', () => {
    expect(filterSortBuilds(rows, { classFilter: 'mage' }).map((r) => r.name)).toEqual(['Frost Mage']);
  });
  it('filters by role (any match)', () => {
    expect(filterSortBuilds(rows, { role: ['DPS'] }).map((r) => r.name).sort()).toEqual(['Frost Mage', 'Level Rogue']);
  });
  it('filters by content and searches name/description', () => {
    expect(filterSortBuilds(rows, { content: ['Boss'] }).map((r) => r.name)).toEqual(['Holy Tank']);
    expect(filterSortBuilds(rows, { search: 'xp' }).map((r) => r.name)).toEqual(['Level Rogue']);
  });
  it('exposes the fixed tag vocab', () => {
    expect(ROLES).toEqual(['DPS', 'Tank', 'Support', 'Hybrid']);
    expect(CONTENT).toEqual(['Leveling', 'Endgame', 'Boss']);
  });
});
