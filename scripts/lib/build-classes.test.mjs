import { describe, it, expect } from 'vitest';
import { buildClasses, ADVANCEMENTS } from './build-classes.mjs';

const raw = {
  classes: [
    { Slug: 'acolyte', GameId: 'Acolyte', DisplayName: 'Acolyte', Type: 'base', MaxJobLevel: 50, AdvancedClasses: ['Priest'] },
    { Slug: 'priest', GameId: 'Priest', DisplayName: 'Priest', Type: 'advanced', MaxJobLevel: 70, AdvancedClasses: [] },
  ],
  classSkillTrees: {
    Acolyte: [[null, { id: 'heal', name: 'Heal', description: 'h', maxLevel: 5, isPassive: false, requirements: [], values: { cost: { base: 10, level: 5 }, cooldown: { base: 1, level: 0 } } }]],
    Priest: [[{ id: 'sanctuary', name: 'Sanctuary', description: 's', maxLevel: 3, isPassive: false, requirements: [{ id: 'heal', name: 'Heal', level: 3 }], values: { damage: { base: 0, level: 50 } } }]],
  },
  skillMap: {
    heal: { id: 'heal', name: 'Heal', description: 'h', maxLevel: 5, isPassive: false, requirements: [], values: { cost: { base: 10, level: 5 }, cooldown: { base: 1, level: 0 } } },
    sanctuary: { id: 'sanctuary', name: 'Sanctuary', description: 's', maxLevel: 3, isPassive: false, requirements: [{ id: 'heal', name: 'Heal', level: 3 }], values: { damage: { base: 0, level: 50 } } },
  },
};

describe('buildClasses', () => {
  const out = buildClasses(raw);
  it('emits classes with slug grids', () => {
    const acolyte = out.classes.find((c) => c.slug === 'acolyte');
    expect(acolyte.grid[0]).toEqual([null, 'heal']);
    expect(acolyte.maxJobLevel).toBe(50);
  });
  it('overrides base advancedClasses with the verified mapping (incl. weaver)', () => {
    const acolyte = out.classes.find((c) => c.slug === 'acolyte');
    expect(acolyte.advancedClasses).toEqual(ADVANCEMENTS.acolyte);
    expect(acolyte.advancedClasses).toContain('weaver');
  });
  it('gives advanced classes no advancedClasses', () => {
    expect(out.classes.find((c) => c.slug === 'priest').advancedClasses).toEqual([]);
  });
  it('normalizes skills with requirements and value scaling', () => {
    expect(out.skills.heal).toMatchObject({ name: 'Heal', maxLevel: 5, isPassive: false, cost: { base: 10, level: 5 } });
    expect(out.skills.sanctuary.requirements).toEqual([{ id: 'heal', level: 3 }]);
    expect(out.skills.sanctuary.damage).toEqual({ base: 0, level: 50 });
    expect(out.skills.heal.damage).toBeNull();
  });
});
