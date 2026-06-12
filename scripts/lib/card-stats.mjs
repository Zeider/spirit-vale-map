// Decode Spirit Vale raw card stat enums into readable strings.

function humanize(s) {
  if (!s) return '';
  return String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

const FLAG_LABELS = {
  NoCastCancel: 'Uninterruptible casting',
  PerfectCloak: 'Perfect Cloak',
  Detector: 'Detects hidden enemies',
  NoKnockback: 'Immune to knockback',
  NoReflect: 'Ignores damage reflect',
};

const LABELS = {
  Atk: 'Atk', Matk: 'Matk', Def: 'Def', Mdef: 'Mdef', Hp: 'Max HP', Mp: 'Max MP',
  Crit: 'Crit', CritDamage: 'Crit Dmg', CritMult: 'Crit', Hit: 'Hit', Flee: 'Flee',
  AtkSpd: 'Atk Spd', CastSpd: 'Cast Spd', MoveSpd: 'Move Spd', WeightLimit: 'Weight Limit',
  AllStats: 'All Stats', Agi: 'Agi', Vit: 'Vit', Str: 'Str', Int: 'Int', Dex: 'Dex', Luk: 'Luk',
  HpRegen: 'HP Regen', MpRegen: 'MP Regen', MpRegenMax: 'MP Regen', WeaponThrow: 'Weapon Throw',
  ReflectSpell: 'Reflect spell', ElementWeapon: 'Weapon element', ElementArmor: 'Armor element',
  CritDamageMult: 'Crit Dmg', SiphonHp: 'HP siphon', SiphonMp: 'MP siphon', LeechKillMp: 'MP on kill',
};

// prefix -> (n, str) => string. These get explicit, confident formatting.
const SPECIAL = {
  ElementResist: (n, s) => `+${n}% ${humanize(s)} resist`,
  DamageToElement: (n, s) => `+${n}% dmg to ${humanize(s)}`,
  DamageElement: (n, s) => `+${n}% ${humanize(s)} element dmg`,
  SkillDamage: (n, s) => `+${n}% ${humanize(s)} dmg`,
  DamageMagic: (n) => `+${n}% magic dmg`,
  DamageRanged: (n) => `+${n}% ranged dmg`,
  DamageMelee: (n) => `+${n}% melee dmg`,
  DamageStatus: (n) => `+${n}% dmg vs statused`,
  GrantSkill: (n, s) => `Grants ${humanize(s)} Lv${n}`,
  StatusImmune: (n, s) => (n >= 100 ? `Immune to ${s}` : `${n}% immunity to ${s}`),
  AutocastAttack: (n, s) => `${n}% chance to cast ${humanize(s)} on attack`,
  AutocastHit: (n, s) => `Chance to cast ${humanize(s)} on hit`,
  Healing: (n) => `+${n}% healing`,
  HealingReceived: (n) => `${n > 0 ? '+' : ''}${n}% healing received`,
  MpCost: (n) => `${n > 0 ? '+' : ''}${n}% MP cost`,
  SkillCost: (n, s) => `${humanize(s)} MP cost ${n > 0 ? '+' : ''}${n}`,
  Leech: (n) => `+${n}% life leech`,
  LeechMp: (n) => `+${n}% MP leech`,
  ReflectDamage: (n) => `Reflects ${n}% damage`,
  DoubleAttack: (n) => `${n}% Double Attack chance`,
  PerfectDodge: (n) => `${n}% Perfect Dodge`,
};

export function formatCardStat(stat) {
  const name = (stat && stat.Name) || '';
  const str = stat && stat.Value && stat.Value.ValueStr;
  // Prefix = leading letters; magnitude = the FIRST _<number> (some keys carry a
  // trailing variant suffix, e.g. "SkillDamage_15_2" → prefix SkillDamage, n 15).
  const mm = name.match(/^([A-Za-z]+)_(-?\d+)/);
  const prefix = mm ? mm[1] : name;
  const n = mm ? parseInt(mm[2], 10) : (stat && stat.Value && stat.Value.Value) || 0;
  const sign = n > 0 ? '+' : '';

  if (SPECIAL[prefix]) return SPECIAL[prefix](n, str);
  if (FLAG_LABELS[prefix]) return FLAG_LABELS[prefix];

  if (prefix.endsWith('Mult')) {
    const base = prefix.slice(0, -4);
    const label = LABELS[base] || humanize(base);
    return `${sign}${n}% ${label}`;
  }

  const label = LABELS[prefix] || humanize(prefix);
  const out = `${sign}${n} ${label}`;
  return str ? `${out} (${humanize(str)})` : out;
}

export function formatCardStats(stats) {
  return (stats || []).map(formatCardStat);
}
