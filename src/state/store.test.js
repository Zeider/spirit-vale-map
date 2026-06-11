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
    expect(s.route).toEqual(['a']);
  });
  it('removes from route', () => {
    const s = reducer({ ...initialState, route: ['a', 'b'] }, { type: 'removeFromRoute', id: 'a' });
    expect(s.route).toEqual(['b']);
  });
  it('moves an entry up/down and ignores out-of-bounds', () => {
    const base = { ...initialState, route: ['a', 'b', 'c'] };
    expect(reducer(base, { type: 'moveInRoute', index: 0, dir: 1 }).route).toEqual(['b', 'a', 'c']);
    expect(reducer(base, { type: 'moveInRoute', index: 0, dir: -1 }).route).toEqual(['a', 'b', 'c']);
  });
  it('hydrates partial state', () => {
    expect(reducer(initialState, { type: 'hydrate', state: { playerLevel: 7, route: ['x'] } }))
      .toMatchObject({ playerLevel: 7, route: ['x'] });
  });
});
