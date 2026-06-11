import { describe, it, expect } from 'vitest';
import { treeOf, pointsUsed, budget, requirementsMet, canIncrement, canDecrement } from './build.js';
import { classBySlug, skills } from '../data/classes-index.js';

const acolyte = classBySlug.acolyte;
const flat = acolyte.grid.flat().filter(Boolean);

describe('build logic', () => {
  const base = { baseClass: 'acolyte', advancedClass: null, levels: {} };

  it('treeOf finds the base tree for a base-class skill', () => {
    expect(treeOf(flat[0], base)).toBe('base');
  });
  it('pointsUsed sums levels in a tree', () => {
    const b = { ...base, levels: { [flat[0]]: 3 } };
    expect(pointsUsed(b, 'base')).toBe(3);
  });
  it('budget equals the class maxJobLevel', () => {
    expect(budget(base, 'base')).toBe(50);
  });
  it('canIncrement is false past maxLevel', () => {
    const id = flat[0];
    const full = { ...base, levels: { [id]: 999 } };
    expect(canIncrement(id, full)).toBe(false);
  });
  it('canDecrement is blocked when a dependent still needs the level', () => {
    const req = Object.values(skills).find(
      (s) => s.requirements.length && flat.includes(s.id) && flat.includes(s.requirements[0].id),
    );
    if (!req) return; // no in-tree requirement pair; skip
    const depId = req.id, reqId = req.requirements[0].id, reqLvl = req.requirements[0].level;
    const b = { ...base, levels: { [reqId]: reqLvl, [depId]: 1 } };
    expect(canDecrement(reqId, b)).toBe(false);
    expect(requirementsMet(depId, b)).toBe(true);
  });
});
