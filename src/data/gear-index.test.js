import { describe, it, expect } from 'vitest';
import { items, slots, gearDataFetched } from './gear-index.js';

describe('gear-index', () => {
  it('exposes items, the 10 slots, and a fetched date', () => {
    expect(Object.keys(items).length).toBeGreaterThan(0);
    expect(slots).toHaveLength(10);
    expect(typeof gearDataFetched).toBe('string');
  });
  it('items have a slot category and a name', () => {
    const sample = Object.values(items)[0];
    expect(sample).toHaveProperty('slot');
    expect(sample).toHaveProperty('name');
  });
});
