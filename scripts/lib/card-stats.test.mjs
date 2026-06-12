import { describe, it, expect } from 'vitest';
import { formatCardStat, formatCardStats } from './card-stats.mjs';

const S = (Name, Value, ValueStr = null) => ({ Name, Value: { Value, ValueStr } });

describe('formatCardStat', () => {
  it('percent multipliers', () => {
    expect(formatCardStat(S('AtkMult_10', 10))).toBe('+10% Atk');
    expect(formatCardStat(S('MatkMult_10', 10))).toBe('+10% Matk');
    expect(formatCardStat(S('HpMult_-25', -25))).toBe('-25% Max HP');
    expect(formatCardStat(S('MpMult_-25', -25))).toBe('-25% Max MP');
  });
  it('trusts the Name suffix when Value.Value is 0', () => {
    expect(formatCardStat(S('MdefMult_3', 0))).toBe('+3% Mdef');
  });
  it('flat stats', () => {
    expect(formatCardStat(S('Atk_5', 5))).toBe('+5 Atk');
    expect(formatCardStat(S('Hp_100', 100))).toBe('+100 Max HP');
    expect(formatCardStat(S('AllStats_1', 1))).toBe('+1 All Stats');
  });
  it('status immunity', () => {
    expect(formatCardStat(S('StatusImmune_100', 100, 'Bleeding'))).toBe('Immune to Bleeding');
  });
  it('grant skill', () => {
    expect(formatCardStat(S('GrantSkill_5', 5, 'Endure'))).toBe('Grants Endure Lv5');
  });
  it('skill damage humanizes camelCase skill name', () => {
    expect(formatCardStat(S('SkillDamage_10', 10, 'WeaponThrow'))).toBe('+10% Weapon Throw dmg');
  });
  it('element resist', () => {
    expect(formatCardStat(S('ElementResist_25', 25, 'Earth'))).toBe('+25% Earth resist');
  });
  it('takes the first magnitude when a key carries a trailing variant suffix', () => {
    expect(formatCardStat(S('SkillDamage_15_2', 0, 'TetraVortex'))).toBe('+15% Tetra Vortex dmg');
  });
  it('labels siphon/leech-on-kill keys', () => {
    expect(formatCardStat(S('SiphonHp_10', 10))).toBe('+10 HP siphon');
    expect(formatCardStat(S('LeechKillMp_10', 10))).toBe('+10 MP on kill');
  });
  it('binary flags', () => {
    expect(formatCardStat(S('NoKnockback_1', 1))).toBe('Immune to knockback');
  });
  it('formatCardStats maps an array', () => {
    expect(formatCardStats([S('AtkMult_10', 10), S('Atk_5', 5)])).toEqual(['+10% Atk', '+5 Atk']);
  });
});
