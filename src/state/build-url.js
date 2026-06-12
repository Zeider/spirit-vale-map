import { classBySlug, skillById } from '../data/classes-index.js';
import { treeOf, requirementsMet } from '../logic/build.js';
import { items as gearItems } from '../data/gear-index.js';
import { sortStages } from '../logic/gear.js';

const DEFAULT_ATTRS = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };

// base64url helpers (UTF-8 safe).
function b64encode(obj) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64decode(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function encodeBuild(build) {
  if (!build?.baseClass) return '';
  return b64encode({
    baseClass: build.baseClass,
    advancedClass: build.advancedClass || null,
    levels: build.levels || {},
    gearStages: build.gearStages || [],
    attributes: build.attributes || DEFAULT_ATTRS,
    notes: build.notes || '',
  });
}

// Legacy ~-delimited parser (Phase 2/3 links).
function decodeLegacy(str) {
  const [base, adv, lvStr, gearStr] = str.split('~');
  const levels = {};
  for (const part of (lvStr || '').split(',')) {
    if (!part) continue;
    const [id, v] = part.split(':');
    const n = parseInt(v, 10);
    if (id && n > 0) levels[id] = n;
  }
  const gearStages = (gearStr || '').split(';').filter(Boolean).map((seg) => {
    const [lvl, chStr] = seg.split(':');
    const changes = {};
    for (const pair of (chStr || '').split(',')) {
      if (!pair) continue;
      const [slot, item] = pair.split('=');
      if (slot && item) changes[slot] = item;
    }
    return { fromLevel: parseInt(lvl, 10), changes };
  });
  return { baseClass: base || null, advancedClass: adv || null, levels, gearStages, attributes: { ...DEFAULT_ATTRS }, notes: '' };
}

export function decodeBuild(str) {
  if (!str) return null;
  try {
    const o = b64decode(str);
    return {
      baseClass: o.baseClass || null,
      advancedClass: o.advancedClass || null,
      levels: o.levels || {},
      gearStages: o.gearStages || [],
      attributes: { ...DEFAULT_ATTRS, ...(o.attributes || {}) },
      notes: typeof o.notes === 'string' ? o.notes : '',
    };
  } catch {
    return decodeLegacy(str);
  }
}

export function sanitizeBuild(build) {
  if (!build || !classBySlug[build.baseClass]) return null;
  const advancedClass = classBySlug[build.advancedClass] ? build.advancedClass : null;
  const clean = { baseClass: build.baseClass, advancedClass, levels: {}, gearStages: [], attributes: { ...DEFAULT_ATTRS }, notes: '' };
  for (const [id, lv] of Object.entries(build.levels || {})) {
    const sk = skillById[id];
    if (!sk || !treeOf(id, clean)) continue;
    clean.levels[id] = Math.min(lv, sk.maxLevel);
  }
  for (let i = 0; i < 5; i++) {
    let changed = false;
    for (const id of Object.keys(clean.levels)) if (!requirementsMet(id, clean)) { delete clean.levels[id]; changed = true; }
    if (!changed) break;
  }
  const stages = (build.gearStages || []).map((s) => {
    const changes = {};
    for (const [slot, item] of Object.entries(s.changes || {})) if (gearItems[item]) changes[slot] = item;
    return { fromLevel: Math.min(135, Math.max(1, s.fromLevel || 1)), changes };
  });
  clean.gearStages = sortStages(stages);
  for (const k of Object.keys(DEFAULT_ATTRS)) {
    const v = build.attributes?.[k];
    clean.attributes[k] = Number.isFinite(v) ? Math.max(1, v) : 1;
  }
  if (typeof build.notes === 'string') clean.notes = build.notes;
  return clean;
}
