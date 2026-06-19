import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

const withStage = () => ({
  ...initialState,
  build: { ...initialState.build, gearStages: [{ toLevel: 10, changes: {} }] },
});

describe('socket reducer actions', () => {
  it('setCardSlot sets and clears a card at an index', () => {
    let s = reducer(withStage(), { type: 'setCardSlot', stageIndex: 0, slot: 'weapon', index: 1, card: 'Boar Card' });
    expect(s.build.gearStages[0].cards.weapon[1]).toBe('Boar Card');
    s = reducer(s, { type: 'setCardSlot', stageIndex: 0, slot: 'weapon', index: 1, card: null });
    expect(s.build.gearStages[0].cards.weapon[1]).toBe(null);
  });
  it('setArtifact sets a set keeping prior gem, and clears on null', () => {
    let s = reducer(withStage(), { type: 'setArtifact', stageIndex: 0, atype: 'rune', set: 'spellweaver' });
    expect(s.build.gearStages[0].artifacts.rune).toEqual({ set: 'spellweaver', gem: null });
    s = reducer(s, { type: 'setArtifactGem', stageIndex: 0, atype: 'rune', gem: 'atk-gem' });
    expect(s.build.gearStages[0].artifacts.rune).toEqual({ set: 'spellweaver', gem: 'atk-gem' });
    s = reducer(s, { type: 'setArtifact', stageIndex: 0, atype: 'rune', set: 'warglyph' });
    expect(s.build.gearStages[0].artifacts.rune).toEqual({ set: 'warglyph', gem: 'atk-gem' });
    s = reducer(s, { type: 'setArtifact', stageIndex: 0, atype: 'rune', set: null });
    expect(s.build.gearStages[0].artifacts.rune).toBe(null);
  });
  it('setArtifactGem is a no-op without a set', () => {
    const s = reducer(withStage(), { type: 'setArtifactGem', stageIndex: 0, atype: 'jewel', gem: 'atk-gem' });
    expect(s.build.gearStages[0].artifacts?.jewel ?? undefined).toBeUndefined();
  });
  it('openGearEditor opens the overlay on a stage; close clears it', () => {
    let s = reducer(withStage(), { type: 'openGearEditor', index: 0 });
    expect(s.gearOverlay).toBe(true);
    expect(s.selectedStage).toBe(0);
    s = reducer(s, { type: 'closeGearEditor' });
    expect(s.gearOverlay).toBe(false);
  });
  it('switching stages clears any open picker', () => {
    const s = reducer({ ...withStage(), openPicker: { kind: 'card', slot: 'weapon', index: 0 } }, { type: 'selectStage', index: 0 });
    expect(s.openPicker).toBe(null);
  });
});
