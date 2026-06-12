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

import { gearByName } from './gear-index.js';
import { items as allItems } from './gear-index.js';

describe('gearByName', () => {
  it('maps display name to the item', () => {
    const sample = Object.values(allItems)[0];
    expect(gearByName[sample.name].slug).toBe(sample.slug);
  });
});

import { cardByName } from './gear-index.js';
describe('cardByName', () => {
  it('is a map (may be empty in test data) keyed by card name', () => {
    expect(typeof cardByName).toBe('object');
  });
});
