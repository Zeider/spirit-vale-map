import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

const withBase = reducer(initialState, { type: 'selectClass', slug: 'acolyte' });

describe('reducer — build', () => {
  it('defaults view to atlas with an empty build', () => {
    expect(initialState.view).toBe('atlas');
    expect(initialState.build).toEqual({ baseClass: null, advancedClass: null, levels: {} });
  });
  it('setView switches view', () => {
    expect(reducer(initialState, { type: 'setView', view: 'builds' }).view).toBe('builds');
  });
  it('selectClass sets base and clears advanced + levels', () => {
    const s = reducer({ ...withBase, build: { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 } } }, { type: 'selectClass', slug: 'mage' });
    expect(s.build).toEqual({ baseClass: 'mage', advancedClass: null, levels: {} });
  });
  it('selectAdvanced sets the advanced class', () => {
    expect(reducer(withBase, { type: 'selectAdvanced', slug: 'priest' }).build.advancedClass).toBe('priest');
  });
  it('setSkillLevel sets and deletes at 0', () => {
    let s = reducer(withBase, { type: 'setSkillLevel', id: 'heal', level: 3 });
    expect(s.build.levels.heal).toBe(3);
    s = reducer(s, { type: 'setSkillLevel', id: 'heal', level: 0 });
    expect(s.build.levels.heal).toBeUndefined();
  });
  it('resetBuild keeps the class but clears levels', () => {
    const s = reducer({ ...withBase, build: { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 } } }, { type: 'resetBuild' });
    expect(s.build.levels).toEqual({});
    expect(s.build.baseClass).toBe('acolyte');
  });
});
