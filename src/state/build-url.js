import { classBySlug, skillById } from '../data/classes-index.js';
import { treeOf, requirementsMet } from '../logic/build.js';
import { items as gearItems } from '../data/gear-index.js';
import { sortStages } from '../logic/gear.js';

function encodeGear(stages) {
  return (stages || [])
    .filter((s) => s && Number.isFinite(s.fromLevel))
    .map((s) => {
      const ch = Object.entries(s.changes || {})
        .filter(([, v]) => v)
        .map(([slot, item]) => `${slot}=${item}`)
        .join(',');
      return `${s.fromLevel}:${ch}`;
    })
    .join(';');
}

function decodeGear(str) {
  if (!str) return [];
  return str.split(';').filter(Boolean).map((seg) => {
    const [lvl, chStr] = seg.split(':');
    const changes = {};
    for (const pair of (chStr || '').split(',')) {
      if (!pair) continue;
      const [slot, item] = pair.split('=');
      if (slot && item) changes[slot] = item;
    }
    return { fromLevel: parseInt(lvl, 10), changes };
  });
}

export function encodeBuild(build) {
  if (!build?.baseClass) return '';
  const lv = Object.entries(build.levels || {})
    .filter(([, v]) => v > 0)
    .map(([id, v]) => `${id}:${v}`)
    .join(',');
  const gear = encodeGear(build.gearStages);
  const head = `${build.baseClass}~${build.advancedClass || ''}~${lv}`;
  return gear ? `${head}~${gear}` : head;
}

export function decodeBuild(str) {
  if (!str) return null;
  const [base, adv, lvStr, gearStr] = str.split('~');
  const levels = {};
  for (const part of (lvStr || '').split(',')) {
    if (!part) continue;
    const [id, v] = part.split(':');
    const n = parseInt(v, 10);
    if (id && n > 0) levels[id] = n;
  }
  return { baseClass: base || null, advancedClass: adv || null, levels, gearStages: decodeGear(gearStr) };
}

export function sanitizeBuild(build) {
  if (!build || !classBySlug[build.baseClass]) return null;
  const advancedClass = classBySlug[build.advancedClass] ? build.advancedClass : null;
  const clean = { baseClass: build.baseClass, advancedClass, levels: {}, gearStages: [] };
  for (const [id, lv] of Object.entries(build.levels || {})) {
    const sk = skillById[id];
    if (!sk || !treeOf(id, clean)) continue;
    clean.levels[id] = Math.min(lv, sk.maxLevel);
  }
  for (let i = 0; i < 5; i++) {
    let changed = false;
    for (const id of Object.keys(clean.levels)) {
      if (!requirementsMet(id, clean)) { delete clean.levels[id]; changed = true; }
    }
    if (!changed) break;
  }
  const stages = (build.gearStages || []).map((s) => {
    const changes = {};
    for (const [slot, item] of Object.entries(s.changes || {})) {
      if (gearItems[item]) changes[slot] = item;
    }
    return { fromLevel: Math.min(135, Math.max(1, s.fromLevel || 1)), changes };
  });
  clean.gearStages = sortStages(stages);
  return clean;
}
