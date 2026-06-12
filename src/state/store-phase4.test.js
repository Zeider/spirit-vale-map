import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

describe('reducer — phase 4', () => {
  it('view defaults to atlas and build has notes + attributes', () => {
    expect(initialState.view).toBe('atlas');
    expect(initialState.build.notes).toBe('');
    expect(initialState.build.attributes).toEqual({ str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 });
  });
  it('setView accepts build and gear', () => {
    expect(reducer(initialState, { type: 'setView', view: 'gear' }).view).toBe('gear');
  });
  it('setBuildNotes + setAttribute', () => {
    let s = reducer(initialState, { type: 'selectClass', slug: 'acolyte' });
    s = reducer(s, { type: 'setBuildNotes', notes: 'hi' });
    expect(s.build.notes).toBe('hi');
    s = reducer(s, { type: 'setAttribute', key: 'str', value: 5 });
    expect(s.build.attributes.str).toBe(5);
  });
  it('addToRoute stores objects and appends a deduped want', () => {
    let s = reducer(initialState, { type: 'addToRoute', id: 'swamp', want: 'abyss-shard' });
    s = reducer(s, { type: 'addToRoute', id: 'swamp', want: 'abyss-shard' });
    s = reducer(s, { type: 'addToRoute', id: 'swamp', want: 'axe' });
    expect(s.route).toEqual([{ id: 'swamp', notes: '', wants: ['abyss-shard', 'axe'] }]);
  });
  it('setZoneNotes / addZoneWant / removeZoneWant', () => {
    let s = reducer(initialState, { type: 'addToRoute', id: 'swamp' });
    s = reducer(s, { type: 'setZoneNotes', id: 'swamp', notes: 'farm' });
    s = reducer(s, { type: 'addZoneWant', id: 'swamp', itemSlug: 'axe' });
    s = reducer(s, { type: 'removeZoneWant', id: 'swamp', itemSlug: 'axe' });
    expect(s.route[0]).toEqual({ id: 'swamp', notes: 'farm', wants: [] });
  });
  it('removeFromRoute + moveInRoute by id/index on objects', () => {
    let s = reducer({ ...initialState, route: [{ id: 'a', notes: '', wants: [] }, { id: 'b', notes: '', wants: [] }] }, { type: 'moveInRoute', index: 0, dir: 1 });
    expect(s.route.map((e) => e.id)).toEqual(['b', 'a']);
    s = reducer(s, { type: 'removeFromRoute', id: 'a' });
    expect(s.route.map((e) => e.id)).toEqual(['b']);
  });
});
