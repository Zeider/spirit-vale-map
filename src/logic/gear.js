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

export function stageFarmTiles(stage) {
  const ids = new Set();
  for (const slot of stageChangedSlots(stage)) {
    const itm = items[stage.changes[slot]];
    if (!itm) continue;
    for (const src of itm.sources) {
      const tile = resolveTile(src.zoneName, src.minLevel);
      if (tile) ids.add(tile.id);
    }
  }
  return [...ids];
}
