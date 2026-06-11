import { describe, it, expect } from 'vitest';
import { regions, subZoneById, subZones, gameVersion } from './zones-index.js';

describe('zones-index', () => {
  it('exposes a non-empty region list and gameVersion', () => {
    expect(regions.length).toBeGreaterThan(0);
    expect(typeof gameVersion).toBe('string');
  });
  it('indexes sub-zones by id with regionName attached', () => {
    const sample = subZones[0];
    expect(subZoneById[sample.id]).toBe(sample);
    expect(sample.regionName).toBeTruthy();
  });
  it('Forest Labyrinth sub-zones are present', () => {
    expect(subZoneById['labyrinth-1']).toBeTruthy();
  });
});
