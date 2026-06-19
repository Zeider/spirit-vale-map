import { describe, it, expect } from 'vitest';
import { parseSocketStat } from './gear-stats.js';
import { sumSocketStats } from './stats.js';

describe('parseSocketStat', () => {
  it('parses value-first stat strings', () => {
    expect(parseSocketStat('+10 Atk')).toEqual({ label: 'Atk', value: 10, percent: false });
    expect(parseSocketStat('+5% Max HP')).toEqual({ label: 'Max HP', value: 5, percent: true });
    expect(parseSocketStat('-15% Max MP')).toEqual({ label: 'Max MP', value: -15, percent: true });
  });
  it('parses colon stat strings (per-refine ignored)', () => {
    expect(parseSocketStat('Atk Spd: +5% +1% per refine')).toEqual({ label: 'Atk Spd', value: 5, percent: true });
  });
  it('leaves skill-damage / unparseable lines raw', () => {
    expect(parseSocketStat('Aerial Shot Damage +2% per refine')).toEqual({ label: 'Aerial Shot Damage +2% per refine', raw: true });
  });
});

describe('sumSocketStats', () => {
  const data = {
    itemsBySlot: { weapon: { cardSlots: 2 }, chest: { cardSlots: 1 } },
    cardByName: { 'Atk Card': { stats: ['+10 Atk'] }, 'HP Card': { stats: ['+5% Max HP'] } },
    gemBySlug: { 'atk-gem': { stats: ['Atk: +3'] } },
    artifactBySlug: {
      spellweaver: { slug: 'spellweaver', perPiece: ['+5 Matk'], fullSet: ['+20 Matk'] },
      warglyph: { slug: 'warglyph', perPiece: ['+5 Atk'], fullSet: ['+10 Atk'] },
    },
  };
  const byLabel = (rows) => Object.fromEntries(rows.map((r) => [r.label, r.value]));

  it('sums card stats capped to cardSlots, ignoring extra/empty entries', () => {
    const rows = sumSocketStats({ cards: { weapon: ['Atk Card', null, 'HP Card'] }, artifacts: {} }, data);
    expect(byLabel(rows)).toEqual({ Atk: 10 }); // 3rd entry beyond cardSlots=2 ignored; null skipped
  });
  it('sums artifact per-piece x count and full-set when all four match', () => {
    const all = { rune: { set: 'spellweaver' }, jewel: { set: 'spellweaver' }, scroll: { set: 'spellweaver' }, relic: { set: 'spellweaver' } };
    const rows = sumSocketStats({ cards: {}, artifacts: all }, data);
    expect(byLabel(rows)).toEqual({ Matk: 40 }); // 5*4 per-piece + 20 full-set
  });
  it('per-piece only when sets are mixed', () => {
    const mixed = { rune: { set: 'spellweaver' }, jewel: { set: 'warglyph' } };
    const rows = sumSocketStats({ cards: {}, artifacts: mixed }, data);
    expect(byLabel(rows)).toEqual({ Matk: 5, Atk: 5 });
  });
  it('sums gem stats', () => {
    const rows = sumSocketStats({ cards: {}, artifacts: { rune: { set: 'spellweaver', gem: 'atk-gem' } } }, data);
    expect(byLabel(rows)).toEqual({ Matk: 5, Atk: 3 });
  });
});
