import { describe, it, expect } from 'vitest';
import { categorizeGearStats } from './gear-stats.js';

describe('categorizeGearStats', () => {
  it('puts per-skill skill-damage lines in skill', () => {
    const g = categorizeGearStats(['Atk: +10 +1 per refine'], ['Shadow Step Damage +15% +2% per refine']);
    expect(g.skill).toEqual(['Shadow Step Damage +15% +2% per refine']);
  });
  it('puts primary Atk/Matk in base', () => {
    const g = categorizeGearStats(['Atk: +10 +1 per refine', 'Matk: +10 +1 per refine'], []);
    expect(g.base).toEqual(['Atk: +10 +1 per refine', 'Matk: +10 +1 per refine']);
  });
  it('puts secondary Atk/Matk and primary Def in other (NOT base)', () => {
    const g = categorizeGearStats(['Def: +5'], ['Atk: +3', 'Matk per Str: +1']);
    expect(g.base).toEqual([]);
    expect(g.other).toEqual(['Def: +5', 'Atk: +3', 'Matk per Str: +1']);
  });
});
