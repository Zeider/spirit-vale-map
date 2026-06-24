// Render ripped skill-effect tokens (from the game files) as readable lines.
// An effect is { stat, value, filter? } where value is the PER-LEVEL magnitude
// (e.g. Summon Mastery SummonStatShare +10%/lvl → 100% at max).

export const STAT_LABELS = {
  Atk: 'Atk', Matk: 'Magic Atk', Def: 'Def', Mdef: 'Magic Def',
  AtkWeapon: 'Atk', MatkWeapon: 'Magic Atk',
  AtkMult: 'Atk', MatkMult: 'Magic Atk', DefMult: 'Def', MdefMult: 'Magic Def',
  AtkSpd: 'Atk Speed', CastSpd: 'Cast Speed', MoveSpd: 'Move Speed',
  Hp: 'HP', Mp: 'MP', HpMult: 'HP', MpMult: 'MP',
  HpRegen: 'HP Regen', MpRegen: 'MP Regen', HpRegenMax: 'Max HP Regen', MpRegenMax: 'Max MP Regen',
  HpRegenMult: 'HP Regen', MpRegenMult: 'MP Regen',
  Crit: 'Crit', CritDamage: 'Crit Damage', Hit: 'Hit', Range: 'Range', Block: 'Block', BlockShield: 'Shield Block',
  DoubleAttack: 'Double Attack', PerfectDodge: 'Perfect Dodge', SpellDodge: 'Spell Dodge',
  Healing: 'Healing', HealingReceived: 'Healing Received', ReflectDamage: 'Reflect Damage', SiphonHp: 'HP Siphon',
  AllStats: 'All Stats', AllResist: 'All Resist', Vit: 'Vit', Dex: 'Dex',
  DamageToElement: 'Damage Dealt', DamageFromElement: 'Damage Taken', WeightLimit: 'Weight Limit', SkillSplash: 'Skill Splash',
  StatusMaxStacks: 'Max Status Stacks',
  SummonAtkMult: 'Summon Atk', SummonMatkMult: 'Summon Magic Atk', SummonResist: 'Summon Resist', SummonStatShare: 'Summon Stat Share',
};

// Conservative: only mark "%" where we're confident (multipliers + the
// user-confirmed stat-share). Flat stats show a bare value.
const isPercent = (stat) => stat.endsWith('Mult') || stat === 'SummonStatShare';

export const statLabel = (stat) => STAT_LABELS[stat] || stat.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

// Group identical stat+value effects that differ only by filter into one line,
// e.g. Codex Mastery → "Magic Atk +3/lvl (Book · Wand · Mace)".
export function formatEffects(effects) {
  const groups = [];
  for (const e of effects || []) {
    const key = `${e.stat}|${e.value}`;
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, stat: e.stat, value: e.value, filters: [] }; groups.push(g); }
    if (e.filter) g.filters.push(e.filter);
  }
  return groups.map((g) => {
    const sign = g.value >= 0 ? '+' : '';
    const unit = isPercent(g.stat) ? '%' : '';
    const filt = g.filters.length ? ` (${g.filters.join(' · ')})` : '';
    return `${statLabel(g.stat)} ${sign}${g.value}${unit}/lvl${filt}`;
  });
}
