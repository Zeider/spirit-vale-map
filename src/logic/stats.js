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
