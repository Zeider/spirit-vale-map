import { classBySlug, skillById } from '../data/classes-index.js';

function gridHas(cls, id) {
  return !!cls && cls.grid.some((row) => row.includes(id));
}

// 'base' | 'advanced' | null — which selected tree the skill belongs to.
export function treeOf(skillId, build) {
  if (gridHas(classBySlug[build.baseClass], skillId)) return 'base';
  if (build.advancedClass && gridHas(classBySlug[build.advancedClass], skillId)) return 'advanced';
  return null;
}

export function pointsUsed(build, tree) {
  let sum = 0;
  for (const [id, lv] of Object.entries(build.levels || {})) {
    if (lv > 0 && treeOf(id, build) === tree) sum += lv;
  }
  return sum;
}

export function budget(build, tree) {
  const slug = tree === 'base' ? build.baseClass : build.advancedClass;
  return classBySlug[slug]?.maxJobLevel ?? 0;
}

export function requirementsMet(skillId, build) {
  const sk = skillById[skillId];
  if (!sk) return false;
  return (sk.requirements || []).every((r) => (build.levels?.[r.id] || 0) >= r.level);
}

export function canIncrement(skillId, build) {
  const sk = skillById[skillId];
  if (!sk) return false;
  const cur = build.levels?.[skillId] || 0;
  if (cur >= sk.maxLevel) return false;
  if (!requirementsMet(skillId, build)) return false;
  const tree = treeOf(skillId, build);
  if (!tree) return false;
  return pointsUsed(build, tree) < budget(build, tree);
}

export function canDecrement(skillId, build) {
  const cur = build.levels?.[skillId] || 0;
  if (cur <= 0) return false;
  for (const [depId, lv] of Object.entries(build.levels || {})) {
    if (lv <= 0) continue;
    const dep = skillById[depId];
    const req = (dep?.requirements || []).find((r) => r.id === skillId);
    if (req && cur - 1 < req.level) return false;
  }
  return true;
}
