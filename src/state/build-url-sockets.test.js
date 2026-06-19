import { describe, it, expect } from 'vitest';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';
import { cardByName, gemBySlug, artifactBySlug } from '../data/gear-index.js';

const aCard = Object.keys(cardByName)[0];
const aGem = Object.keys(gemBySlug)[0];
const aSet = Object.keys(artifactBySlug)[0];

describe('socket serialization', () => {
  it('round-trips cards + artifacts and drops invalid ones', () => {
    const build = {
      baseClass: 'mage', advancedClass: null, levels: {}, attributes: undefined, notes: '',
      gearStages: [{ toLevel: 10, changes: {},
        cards: { weapon: [aCard, 'Not A Real Card'] },
        artifacts: { rune: { set: aSet, gem: aGem }, jewel: { set: 'nope', gem: aGem } } }],
    };
    const clean = sanitizeBuild(decodeBuild(encodeBuild(build)));
    const st = clean.gearStages[0];
    expect(st.cards.weapon).toEqual([aCard]); // invalid card dropped
    expect(st.artifacts.rune).toEqual({ set: aSet, gem: aGem });
    expect(st.artifacts.jewel).toBeUndefined(); // invalid set dropped
  });
  it('legacy stages without channels still load', () => {
    const clean = sanitizeBuild({ baseClass: 'mage', gearStages: [{ toLevel: 10, changes: {} }] });
    expect(clean.gearStages[0].cards).toBeUndefined();
    expect(clean.gearStages[0].artifacts).toBeUndefined();
  });
});
