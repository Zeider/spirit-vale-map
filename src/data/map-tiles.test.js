import { describe, it, expect } from 'vitest';
import { mapTiles, tileById, keepKnownTileIds } from './map-tiles.js';
import { subZoneById } from './zones-index.js';

describe('map-tiles', () => {
  it('holds the full current-game tile set with unique ids', () => {
    expect(mapTiles.length).toBeGreaterThanOrEqual(40);
    const ids = mapTiles.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('positions every tile within 0..100%', () => {
    for (const t of mapTiles) {
      expect(t.x >= 0 && t.x + t.w <= 100, `${t.id} x`).toBe(true);
      expect(t.y >= 0 && t.y + t.h <= 100, `${t.id} y`).toBe(true);
    }
  });
  it('links matched tiles to real zones, leaves newer zones pending', () => {
    for (const t of mapTiles.filter((t) => t.zoneId)) {
      expect(subZoneById[t.zoneId], t.id).toBeTruthy();
    }
    expect(mapTiles.some((t) => t.zoneId === null)).toBe(true);
  });
  it('keepKnownTileIds drops unknown ids', () => {
    expect(keepKnownTileIds(['nevaris', 'not-a-tile'])).toEqual(['nevaris']);
  });
});
