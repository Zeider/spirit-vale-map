import { items } from '../data/gear-index.js';
import { resolveTile } from '../data/map-tiles.js';

export function sortStages(stages) {
  const seen = new Set();
  const out = [];
  for (const s of [...(stages || [])].sort((a, b) => a.toLevel - b.toLevel)) {
    if (seen.has(s.toLevel)) continue;
    seen.add(s.toLevel);
    out.push(s);
  }
  return out;
}

export function stageRanges(stages) {
  const sorted = sortStages(stages);
  return sorted.map((s, i) => ({
    start: i === 0 ? 1 : sorted[i - 1].toLevel + 1,
    end: s.toLevel,
    toLevel: s.toLevel,
    changes: s.changes || {},
  }));
}

export function clampCap(stages, index, value) {
  const sorted = sortStages(stages);
  const start = index === 0 ? 1 : sorted[index - 1].toLevel + 1;
  const nextCap = index + 1 < sorted.length ? sorted[index + 1].toLevel - 1 : 135;
  const v = Math.round(Number(value));
  if (!Number.isFinite(v)) return start; // defensive: never write NaN as a cap
  return Math.min(nextCap, Math.max(start, v));
}

export function effectiveLoadout(stages, index) {
  const sorted = sortStages(stages);
  const out = {};
  for (let i = 0; i <= index && i < sorted.length; i++) {
    for (const [slot, item] of Object.entries(sorted[i].changes || {})) {
      if (item === null) delete out[slot];
      else out[slot] = item;
    }
  }
  return out;
}

export function stageChangedSlots(stage) {
  return Object.keys(stage?.changes || {});
}

export function categoryOf(slot) {
  return slot.replace(/\d+$/, '');
}

export function itemsForSlot(slot) {
  const cat = categoryOf(slot);
  return Object.values(items).filter((i) => i.slot === cat).sort((a, b) => a.name.localeCompare(b.name));
}

// Map tiles where an item can be obtained: its drop zones AND its craft zone
// (so crafted-only items still resolve to a zone for the route).
export function itemTiles(item) {
  if (!item) return [];
  const ids = new Set();
  for (const s of item.sources || []) {
    const t = resolveTile(s.zoneName, s.minLevel);
    if (t) ids.add(t.id);
  }
  if (item.craft) {
    const t = resolveTile(item.craft.zoneName, item.craft.minLevel);
    if (t) ids.add(t.id);
  }
  return [...ids];
}

// Tiles to FARM an item for a route: its drop zones. The craft zone is only a
// fallback for craft-only items — so a wanted item never lands on a zone that
// doesn't drop it (e.g. Novice gear no longer "wants" its craft zone, R2-3),
// while craft-only gear (R2-5) still resolves somewhere. itemTiles (drops +
// craft) stays for the item-detail panel, where the craft location is useful.
export function itemFarmTiles(item) {
  if (!item) return [];
  const drops = new Set();
  for (const s of item.sources || []) {
    const t = resolveTile(s.zoneName, s.minLevel);
    if (t) drops.add(t.id);
  }
  if (drops.size) return [...drops];
  if (item.craft) {
    const t = resolveTile(item.craft.zoneName, item.craft.minLevel);
    if (t) return [t.id];
  }
  return [];
}

// All (tileId, want) route targets for an effective loadout (slot -> itemSlug),
// so the whole stage's gear can be added to the route in one action.
export function loadoutRouteTargets(loadout) {
  const targets = [];
  for (const slug of new Set(Object.values(loadout || {}))) {
    for (const id of itemFarmTiles(items[slug])) targets.push({ id, want: slug });
  }
  return targets;
}

export function stageFarmTiles(stage) {
  const ids = new Set();
  for (const slot of stageChangedSlots(stage)) {
    for (const id of itemFarmTiles(items[stage.changes[slot]])) ids.add(id);
  }
  return [...ids];
}

// Items obtainable in a tile (drops or craft), for the route's WANT-HERE picker.
export function itemsForTile(tileId) {
  return Object.values(items)
    .filter((i) => itemTiles(i).includes(tileId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const ARTIFACT_TYPES = ['rune', 'jewel', 'scroll', 'relic'];

export function effectiveCards(stages, index) {
  const sorted = sortStages(stages);
  const out = {};
  for (let i = 0; i <= index && i < sorted.length; i++) {
    for (const [slot, cards] of Object.entries(sorted[i].cards || {})) {
      if (cards == null) delete out[slot];
      else out[slot] = cards;
    }
  }
  return out;
}

export function effectiveArtifacts(stages, index) {
  const sorted = sortStages(stages);
  const out = {};
  for (let i = 0; i <= index && i < sorted.length; i++) {
    for (const [type, val] of Object.entries(sorted[i].artifacts || {})) {
      if (val == null) delete out[type];
      else out[type] = val;
    }
  }
  return out;
}
