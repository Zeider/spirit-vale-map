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

// Overlay current data ripped from the game files (data/raw-game/skills.json):
// the real per-level effect magnitudes + the game's current descriptions, which
// the spiritvalemarket API never carried. See scripts/rip-game-data.py.
function mergeGameSkills(skills, gameSkills) {
  for (const [id, g] of Object.entries(gameSkills || {})) {
    if (!skills[id]) continue;
    if (g.description) skills[id].description = g.description; // current game text > base44
    skills[id].effects = g.effects || [];
  }
}

export function buildClasses(raw, gameSkills = {}) {
  const skills = {};
  for (const [id, s] of Object.entries(raw.skillMap)) skills[id] = normSkill(s);

  const classes = raw.classes.map((c) => {
    const treeGrid = raw.classSkillTrees[c.GameId] || [];
    const grid = treeGrid.map((row) => row.map((cell) => (cell ? cell.id : null)));
    for (const row of treeGrid) for (const cell of row) if (cell && !skills[cell.id]) skills[cell.id] = normSkill(cell);
    const advancedClasses = c.Type === 'base' ? (ADVANCEMENTS[c.Slug] || []) : [];
    return { slug: c.Slug, name: c.DisplayName, type: c.Type, maxJobLevel: c.MaxJobLevel, advancedClasses, grid };
  });

  mergeGameSkills(skills, gameSkills);
  return { classes, skills };
}
