import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

describe('reducer', () => {
  it('sets level and filter', () => {
    expect(reducer(initialState, { type: 'setLevel', level: 40 }).playerLevel).toBe(40);
    expect(reducer(initialState, { type: 'setFilter', filter: 'gem' }).dropFilter).toBe('gem');
  });
  it('adds to route without duplicates', () => {
    let s = reducer(initialState, { type: 'addToRoute', id: 'a' });
    s = reducer(s, { type: 'addToRoute', id: 'a' });
    expect(s.route).toEqual([{ id: 'a', notes: '', wants: [] }]);
  });
  it('merges (accumulates) multiple wants into the same route zone', () => {
    let s = reducer(initialState, { type: 'addToRoute', id: 'z', want: 'scroll-charm' });
    s = reducer(s, { type: 'addToRoute', id: 'z', want: 'gravestone-breaker' });
    s = reducer(s, { type: 'addToRoute', id: 'z', want: 'scroll-charm' }); // dup want is ignored
    expect(s.route).toHaveLength(1);
    expect(s.route[0].wants).toEqual(['scroll-charm', 'gravestone-breaker']);
  });
  it('inserts new zones in level order so a later-added low-level zone is not stranded at the bottom (R2-4)', () => {
    // Real tile ids: cemetery=Lv21, forest-field-1=Lv1, festering-woods-2-26=Lv26.
    let s = reducer(initialState, { type: 'addToRoute', id: 'cemetery' });
    s = reducer(s, { type: 'addToRoute', id: 'forest-field-1' });
    s = reducer(s, { type: 'addToRoute', id: 'festering-woods-2-26' });
    expect(s.route.map((e) => e.id)).toEqual(['forest-field-1', 'cemetery', 'festering-woods-2-26']);
  });
  it('does not reorder zones that are already in the route (manual order is preserved)', () => {
    // Two same-level zones placed manually out of level order stay put; re-adding is a no-op.
    const route = [{ id: 'bunny-woods-21', notes: '', wants: [] }, { id: 'cemetery', notes: '', wants: [] }];
    const s = reducer({ ...initialState, route }, { type: 'addToRoute', id: 'cemetery', want: 'x' });
    expect(s.route.map((e) => e.id)).toEqual(['bunny-woods-21', 'cemetery']);
    expect(s.route[1].wants).toEqual(['x']);
  });
  it('removes from route', () => {
    const s = reducer({ ...initialState, route: [{ id: 'a', notes: '', wants: [] }, { id: 'b', notes: '', wants: [] }] }, { type: 'removeFromRoute', id: 'a' });
    expect(s.route).toEqual([{ id: 'b', notes: '', wants: [] }]);
  });
  it('moves an entry up/down and ignores out-of-bounds', () => {
    const base = { ...initialState, route: [{ id: 'a', notes: '', wants: [] }, { id: 'b', notes: '', wants: [] }, { id: 'c', notes: '', wants: [] }] };
    expect(reducer(base, { type: 'moveInRoute', index: 0, dir: 1 }).route).toEqual([{ id: 'b', notes: '', wants: [] }, { id: 'a', notes: '', wants: [] }, { id: 'c', notes: '', wants: [] }]);
    expect(reducer(base, { type: 'moveInRoute', index: 0, dir: -1 }).route).toEqual([{ id: 'a', notes: '', wants: [] }, { id: 'b', notes: '', wants: [] }, { id: 'c', notes: '', wants: [] }]);
  });
  it('hydrates partial state', () => {
    expect(reducer(initialState, { type: 'hydrate', state: { playerLevel: 7, route: [{ id: 'x', notes: '', wants: [] }] } }))
      .toMatchObject({ playerLevel: 7, route: [{ id: 'x', notes: '', wants: [] }] });
  });
  it('setGalleryBuild opens the gallery on a build id', () => {
    const s = reducer(initialState, { type: 'setGalleryBuild', id: 'abc123' });
    expect(s.view).toBe('builds');
    expect(s.galleryBuildId).toBe('abc123');
  });
  it('setGalleryBuild with null shows the gallery list', () => {
    const s = reducer({ ...initialState, galleryBuildId: 'x' }, { type: 'setGalleryBuild', id: null });
    expect(s.view).toBe('builds');
    expect(s.galleryBuildId).toBeNull();
  });
  it('initialState defaults readOnly false and galleryBuildId null', () => {
    expect(initialState.readOnly).toBe(false);
    expect(initialState.galleryBuildId).toBeNull();
  });
});
