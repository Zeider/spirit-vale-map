import { describe, it, expect } from 'vitest';
import { formatEffects, statLabel } from './skill-effects.js';

describe('skill-effects formatter', () => {
  it('groups same stat+value across filters into one line (Codex Mastery)', () => {
    const lines = formatEffects([
      { stat: 'MatkWeapon', value: 3, filter: 'Book' },
      { stat: 'MatkWeapon', value: 3, filter: 'Wand' },
      { stat: 'MatkWeapon', value: 3, filter: 'Mace' },
      { stat: 'Healing', value: 1 },
    ]);
    expect(lines).toEqual(['Magic Atk +3/lvl (Book · Wand · Mace)', 'Healing +1/lvl']);
  });
  it('marks % for multipliers + stat-share, flat otherwise', () => {
    expect(formatEffects([{ stat: 'SummonStatShare', value: 10 }])).toEqual(['Summon Stat Share +10%/lvl']);
    expect(formatEffects([{ stat: 'HpMult', value: 10 }])).toEqual(['HP +10%/lvl']);
    expect(formatEffects([{ stat: 'AtkWeapon', value: 3, filter: 'Pistol' }])).toEqual(['Atk +3/lvl (Pistol)']);
  });
  it('handles negatives and humanizes unknown keys', () => {
    expect(formatEffects([{ stat: 'MpMult', value: -15 }])).toEqual(['MP -15%/lvl']);
    expect(statLabel('FooBarBaz')).toBe('Foo Bar Baz');
  });
  it('returns [] for no effects', () => {
    expect(formatEffects([])).toEqual([]);
    expect(formatEffects(undefined)).toEqual([]);
  });
});
