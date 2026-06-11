// Verified base→advanced mapping from the live spiritvalemarket builder.
// Every base class can also advance to Weaver; the API's AdvancedClasses field
// is incomplete, so we override it with this.
export const ADVANCEMENTS = {
  warrior: ['berserker', 'weaver'],
  knight: ['paladin', 'weaver'],
  scout: ['gunslinger', 'weaver'],
  mage: ['wizard', 'weaver'],
  acolyte: ['priest', 'weaver'],
  rogue: ['shinobi', 'weaver'],
  summoner: ['necromancer', 'weaver'],
};

function normSkill(s) {
  const v = s.values && !Array.isArray(s.values) ? s.values : {};
  const pick = (k) => (v[k] ? { base: v[k].base, level: v[k].level } : null);
  return {
    id: s.id,
    name: s.name,
    description: s.description || '',
    maxLevel: s.maxLevel,
    isPassive: !!s.isPassive,
    requirements: (s.requirements || []).map((r) => ({ id: r.id, level: r.level })),
    cost: pick('cost'),
    cooldown: pick('cooldown'),
    damage: pick('damage'),
  };
}

export function buildClasses(raw) {
  const skills = {};
  for (const [id, s] of Object.entries(raw.skillMap)) skills[id] = normSkill(s);

  const classes = raw.classes.map((c) => {
    const treeGrid = raw.classSkillTrees[c.GameId] || [];
    const grid = treeGrid.map((row) => row.map((cell) => (cell ? cell.id : null)));
    for (const row of treeGrid) for (const cell of row) if (cell && !skills[cell.id]) skills[cell.id] = normSkill(cell);
    const advancedClasses = c.Type === 'base' ? (ADVANCEMENTS[c.Slug] || []) : [];
    return { slug: c.Slug, name: c.DisplayName, type: c.Type, maxJobLevel: c.MaxJobLevel, advancedClasses, grid };
  });

  return { classes, skills };
}
