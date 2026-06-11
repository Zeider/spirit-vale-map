import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

const withBase = reducer(initialState, { type: 'selectClass', slug: 'acolyte' });

describe('reducer — build', () => {
  it('defaults view to atlas with an empty build incl. gearStages', () => {
    expect(initialState.view).toBe('atlas');
    expect(initialState.build).toEqual({ baseClass: null, advancedClass: null, levels: {}, gearStages: [] });
  });
  it('selectClass resets the build incl. gearStages', () => {
    const s = reducer({ ...withBase, build: { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 }, gearStages: [{ fromLevel: 1, changes: {} }] } }, { type: 'selectClass', slug: 'mage' });
    expect(s.build).toEqual({ baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [] });
  });
  it('setSkillLevel sets and deletes at 0', () => {
    let s = reducer(withBase, { type: 'setSkillLevel', id: 'heal', level: 3 });
    expect(s.build.levels.heal).toBe(3);
    s = reducer(s, { type: 'setSkillLevel', id: 'heal', level: 0 });
    expect(s.build.levels.heal).toBeUndefined();
  });
  it('addGearStage adds a sorted stage and selects it', () => {
    let s = reducer(withBase, { type: 'addGearStage', fromLevel: 20 });
    s = reducer(s, { type: 'addGearStage', fromLevel: 10 });
    expect(s.build.gearStages.map((x) => x.fromLevel)).toEqual([10, 20]);
    expect(s.selectedStage).toBe(0);
  });
  it('setGearSlot sets a change; clearGearSlot reverts to carried', () => {
    let s = reducer(withBase, { type: 'addGearStage', fromLevel: 1 });
    s = reducer(s, { type: 'setGearSlot', stageIndex: 0, slot: 'weapon', item: 'abyss-shard' });
    expect(s.build.gearStages[0].changes.weapon).toBe('abyss-shard');
    s = reducer(s, { type: 'clearGearSlot', stageIndex: 0, slot: 'weapon' });
    expect(s.build.gearStages[0].changes.weapon).toBeUndefined();
  });
  it('removeGearStage drops a stage', () => {
    let s = reducer(withBase, { type: 'addGearStage', fromLevel: 1 });
    s = reducer(s, { type: 'removeGearStage', index: 0 });
    expect(s.build.gearStages).toEqual([]);
  });
  it('resetBuild clears levels and gearStages, keeps class', () => {
    const s = reducer({ ...withBase, build: { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 }, gearStages: [{ fromLevel: 1, changes: {} }] } }, { type: 'resetBuild' });
    expect(s.build.levels).toEqual({});
    expect(s.build.gearStages).toEqual([]);
    expect(s.build.baseClass).toBe('acolyte');
  });
});
