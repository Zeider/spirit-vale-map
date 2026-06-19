import { parseSocketStat } from './gear-stats.js';

// Sum the parsed flat stats of an effective loadout ({slot: itemSlug}) by label.
// Base values only (refine not modeled). Raw (unparseable) stat lines are skipped.
export function sumLoadoutStats(loadout, items) {
  const totals = new Map(); // label -> { label, value, percent }
  for (const itemSlug of Object.values(loadout || {})) {
    const item = items[itemSlug];
    if (!item) continue;
    for (const st of item.parsedStats || []) {
      if (st.raw) continue;
      const cur = totals.get(st.label) || { label: st.label, value: 0, percent: st.percent };
      cur.value += st.value;
      totals.set(st.label, cur);
    }
  }
  return [...totals.values()];
}

// Sum socket contributions: cards (capped to cardSlots), gems, and artifacts
// (per-piece x slots-with-that-set, plus full-set when all 4 slots share a set).
export function sumSocketStats({ cards = {}, artifacts = {} }, data) {
  const { itemsBySlot = {}, cardByName = {}, gemBySlug = {}, artifactBySlug = {} } = data;
  const totals = new Map();
  const add = (lines) => {
    for (const line of lines || []) {
      const st = parseSocketStat(line);
      if (st.raw) continue;
      const cur = totals.get(st.label) || { label: st.label, value: 0, percent: st.percent };
      cur.value += st.value;
      totals.set(st.label, cur);
    }
  };

  // Cards (capped to the slot item's cardSlots).
  for (const [slot, names] of Object.entries(cards)) {
    const cap = itemsBySlot[slot]?.cardSlots || 0;
    (names || []).slice(0, cap).forEach((name) => { if (name && cardByName[name]) add(cardByName[name].stats); });
  }

  // Artifacts: count sets across the (up to) 4 typed slots.
  const counts = {};
  for (const v of Object.values(artifacts)) {
    if (!v?.set) continue;
    counts[v.set] = (counts[v.set] || 0) + 1;
    if (v.gem && gemBySlug[v.gem]) add(gemBySlug[v.gem].stats);
  }
  for (const [set, n] of Object.entries(counts)) {
    const art = artifactBySlug[set];
    if (!art) continue;
    for (let i = 0; i < n; i++) add(art.perPiece);
    if (n === 4) add(art.fullSet);
  }
  return [...totals.values()];
}
