import { describe, it, expect } from 'vitest';
import { effectiveCards, effectiveArtifacts, ARTIFACT_TYPES } from './gear.js';

const stages = [
  { toLevel: 10, changes: { weapon: 'bonefang' }, cards: { weapon: ['Boar Card', null] },
    artifacts: { rune: { set: 'spellweaver', gem: 'atk-gem' } } },
  { toLevel: 20, changes: {}, cards: { weapon: ['Boar Card', 'Wasp Card'] },
    artifacts: { rune: null, jewel: { set: 'spellweaver', gem: null } } },
];

describe('effectiveCards / effectiveArtifacts', () => {
  it('exposes the four artifact types in order', () => {
    expect(ARTIFACT_TYPES).toEqual(['rune', 'jewel', 'scroll', 'relic']);
  });
  it('accumulates cards per slot (later band overrides)', () => {
    expect(effectiveCards(stages, 0)).toEqual({ weapon: ['Boar Card', null] });
    expect(effectiveCards(stages, 1)).toEqual({ weapon: ['Boar Card', 'Wasp Card'] });
  });
  it('accumulates artifacts per type and clears on null', () => {
    expect(effectiveArtifacts(stages, 0)).toEqual({ rune: { set: 'spellweaver', gem: 'atk-gem' } });
    expect(effectiveArtifacts(stages, 1)).toEqual({ jewel: { set: 'spellweaver', gem: null } });
  });
});
