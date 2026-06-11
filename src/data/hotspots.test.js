import { describe, it, expect } from 'vitest';
import { hotspots } from './hotspots.js';
import { subZones } from './zones-index.js';

describe('hotspots', () => {
  it('has an entry for every sub-zone', () => {
    const missing = subZones.map((s) => s.id).filter((id) => !hotspots[id]);
    expect(missing).toEqual([]);
  });
  it('uses percentage rects within 0..100', () => {
    for (const [id, r] of Object.entries(hotspots)) {
      expect(r.x >= 0 && r.x + r.w <= 100, `${id} x range`).toBe(true);
      expect(r.y >= 0 && r.y + r.h <= 100, `${id} y range`).toBe(true);
    }
  });
});
