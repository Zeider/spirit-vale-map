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
});
