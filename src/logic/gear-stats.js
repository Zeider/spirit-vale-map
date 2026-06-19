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

// Parse a flat stat string into { label, value, percent } for summing.
// Handles two shapes: "Label: +value[%] [+x per refine]" and "+value[%] Label".
// Anything else (e.g. skill-damage lines) is returned raw and not summed.
export function parseSocketStat(line) {
  const s = String(line).trim();
  let m = s.match(/^(.+?):\s*([+-]?\d+(?:\.\d+)?)(%?)/);
  if (m) return { label: m[1].trim(), value: Number(m[2]), percent: m[3] === '%' };
  m = s.match(/^([+-]?\d+(?:\.\d+)?)(%?)\s+(.+)$/);
  if (m && !/\bper\s+refine\b/i.test(m[3])) return { label: m[3].trim(), value: Number(m[1]), percent: m[2] === '%' };
  return { label: s, raw: true };
}
