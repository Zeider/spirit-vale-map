export function classifyLevel(minLevel, maxLevel, playerLevel) {
  if (playerLevel < minLevel) return 'under';
  if (playerLevel > maxLevel) return 'over';
  return 'on';
}

// bands: [{ minLevel, maxLevel }] -> [{ from, to }] uncovered ranges within the span.
export function computeGaps(bands) {
  if (!bands.length) return [];
  const lo = Math.min(...bands.map((b) => b.minLevel));
  const hi = Math.max(...bands.map((b) => b.maxLevel));
  const covered = new Array(hi - lo + 1).fill(false);
  for (const b of bands) {
    for (let l = Math.max(lo, b.minLevel); l <= Math.min(hi, b.maxLevel); l++) covered[l - lo] = true;
  }
  const gaps = [];
  let start = null;
  for (let l = lo; l <= hi; l++) {
    const isCovered = covered[l - lo];
    if (!isCovered && start === null) start = l;
    if (isCovered && start !== null) { gaps.push({ from: start, to: l - 1 }); start = null; }
  }
  return gaps;
}
