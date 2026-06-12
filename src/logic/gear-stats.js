// Categorize an equipment item's rendered stat lines into display groups.
//   skill: per-skill skill-damage lines (weapons), e.g. "Shadow Step Damage +15% +2% per refine"
//   base:  the primary Atk/Matk lines, e.g. "Atk: +10 +1 per refine"
//   other: everything else (secondary Atk/Matk, Def, Mdef, Matk per Str, ...)
const isSkill = (s) => /\bdamage\s+[+\-]/i.test(s);
const isBaseAtkMatk = (s) => /^(atk|matk):/i.test(s);

export function categorizeGearStats(primary = [], secondary = []) {
  const skill = [];
  const base = [];
  const other = [];
  for (const s of primary) {
    if (isSkill(s)) skill.push(s);
    else if (isBaseAtkMatk(s)) base.push(s);
    else other.push(s);
  }
  for (const s of secondary) {
    (isSkill(s) ? skill : other).push(s);
  }
  return { skill, base, other };
}
