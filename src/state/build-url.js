import { classBySlug, skillById } from '../data/classes-index.js';
import { treeOf, requirementsMet } from '../logic/build.js';

export function encodeBuild(build) {
  if (!build?.baseClass) return '';
  const lv = Object.entries(build.levels || {})
    .filter(([, v]) => v > 0)
    .map(([id, v]) => `${id}:${v}`)
    .join(',');
  return `${build.baseClass}~${build.advancedClass || ''}~${lv}`;
}

export function decodeBuild(str) {
  if (!str) return null;
  const [base, adv, lvStr] = str.split('~');
  const levels = {};
  for (const part of (lvStr || '').split(',')) {
    if (!part) continue;
    const [id, v] = part.split(':');
    const n = parseInt(v, 10);
    if (id && n > 0) levels[id] = n;
  }
  return { baseClass: base || null, advancedClass: adv || null, levels };
}

// Drop unknown classes/skills, clamp to maxLevel, drop skills not in a selected
// tree or with unmet requirements (a few settling passes). null if base unknown.
export function sanitizeBuild(build) {
  if (!build || !classBySlug[build.baseClass]) return null;
  const advancedClass = classBySlug[build.advancedClass] ? build.advancedClass : null;
  const clean = { baseClass: build.baseClass, advancedClass, levels: {} };
  for (const [id, lv] of Object.entries(build.levels || {})) {
    const sk = skillById[id];
    if (!sk) continue;
    if (!treeOf(id, clean)) continue;
    clean.levels[id] = Math.min(lv, sk.maxLevel);
  }
  for (let i = 0; i < 5; i++) {
    let changed = false;
    for (const id of Object.keys(clean.levels)) {
      if (!requirementsMet(id, clean)) { delete clean.levels[id]; changed = true; }
    }
    if (!changed) break;
  }
  return clean;
}
