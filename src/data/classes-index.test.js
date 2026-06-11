import { describe, it, expect } from 'vitest';
import { classes, skills, classBySlug, baseClasses, advancedFor } from './classes-index.js';

describe('classes-index', () => {
  it('exposes classes and a skills map', () => {
    expect(classes.length).toBeGreaterThan(0);
    expect(Object.keys(skills).length).toBeGreaterThan(0);
  });
  it('indexes classes by slug', () => {
    expect(classBySlug.acolyte.name).toBe('Acolyte');
  });
  it('lists 7 base classes', () => {
    expect(baseClasses.every((c) => c.type === 'base')).toBe(true);
    expect(baseClasses.length).toBe(7);
  });
  it('resolves advancement options to class objects', () => {
    const adv = advancedFor('acolyte').map((c) => c.slug);
    expect(adv).toContain('priest');
    expect(adv).toContain('weaver');
  });
});
