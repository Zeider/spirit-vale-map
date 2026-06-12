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

// Target level for the target skill (+1) and every prerequisite (to its required
// level), recursively. Returns { skillId: targetLevel } for the whole chain.
export function dependencyTargets(skillId, build) {
  const targets = {};
  const cur = (id) => build.levels?.[id] || 0;
  const seen = new Set();
  const want = (id, lvl) => {
    targets[id] = Math.max(targets[id] ?? cur(id), lvl);
    if (seen.has(id)) return;
    seen.add(id);
    for (const r of skillById[id]?.requirements || []) want(r.id, r.level);
  };
  want(skillId, cur(skillId) + 1);
  return targets;
}

// Total points needed to raise skillId by 1 including filling unmet prerequisites.
export function incrementCost(skillId, build) {
  const t = dependencyTargets(skillId, build);
  let c = 0;
  for (const [id, lvl] of Object.entries(t)) c += lvl - (build.levels?.[id] || 0);
  return c;
}

export function canIncrement(skillId, build) {
  const sk = skillById[skillId];
  if (!sk) return false;
  if ((build.levels?.[skillId] || 0) >= sk.maxLevel) return false;
  const tree = treeOf(skillId, build);
  if (!tree) return false;
  const targets = dependencyTargets(skillId, build);
  for (const [id, lvl] of Object.entries(targets)) {
    const s = skillById[id];
    if (!s || lvl > s.maxLevel) return false;       // a prereq would exceed its max
    if (treeOf(id, build) !== tree) return false;    // cross-tree dependency (shouldn't happen)
  }
  return incrementCost(skillId, build) <= budget(build, tree) - pointsUsed(build, tree);
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
