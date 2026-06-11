export function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Convert a lookup file (dict keyed by GameId, or array of entries) to { GameId: DisplayName }.
export function toNameMap(data) {
  const out = {};
  const entries = Array.isArray(data) ? data : Object.values(data);
  for (const e of entries) {
    if (e && e.GameId) out[e.GameId] = e.DisplayName || e.GameId;
  }
  return out;
}

export function buildLookups(raw) {
  return {
    equipment: toNameMap(raw.equipment),
    materials: toNameMap(raw.materials),
    consumables: toNameMap(raw.consumables),
    gems: toNameMap(raw.gems),
    cards: toNameMap(raw.cards),
    artifacts: toNameMap(raw.artifacts),
  };
}

// Which monster fields map to which drop type + which lookup table.
const ARRAY_SOURCES = [
  ['EquipDrops', 'equip', 'equipment'],
  ['MaterialDrops', 'material', 'materials'],
  ['ConsumableDrops', 'consumable', 'consumables'],
  ['GemDrops', 'gem', 'gems'],
];

export function aggregateDrops(monsterNames, bossName, monsters, lookups) {
  const byKey = new Map();
  const add = (id, type, table, chance, monsterName, bossOnly) => {
    const name = (lookups[table] && lookups[table][id]) || id;
    const key = `${type}:${id}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { id, name, type, chance, bossOnly, sources: [monsterName] });
    } else {
      existing.chance = Math.max(existing.chance, chance);
      existing.bossOnly = existing.bossOnly && bossOnly;
      if (!existing.sources.includes(monsterName)) existing.sources.push(monsterName);
    }
  };
  const roster = [
    ...monsterNames.map((n) => ({ n, boss: false })),
    ...(bossName ? [{ n: bossName, boss: true }] : []),
  ];
  for (const { n, boss } of roster) {
    const mon = monsters[n];
    if (!mon) continue;
    for (const [field, type, table] of ARRAY_SOURCES) {
      for (const d of mon[field] || []) add(d.Id, type, table, d.DropChance, n, boss);
    }
    if (mon.Card) add(mon.Card.Id, 'card', 'cards', mon.Card.DropChance, n, boss);
    if (mon.Artifact) add(mon.Artifact.Id, 'artifact', 'artifacts', mon.Artifact.DropChance, n, boss);
  }
  return [...byKey.values()].sort((a, b) => b.chance - a.chance);
}

export function buildZones(raw) {
  const lookups = buildLookups(raw);
  const regions = new Map();
  for (const [gameId, z] of Object.entries(raw.maps)) {
    const isHub = !z.MonsterPool || z.MonsterPool.length === 0;
    const sub = {
      id: slugify(gameId),
      gameId,
      name: z.DisplayName,
      minLevel: z.MonsterMinLevel,
      maxLevel: z.MonsterMaxLevel,
      isHub,
      monsters: z.MonsterPool || [],
      boss: z.BossMonster || null,
      drops: isHub ? [] : aggregateDrops(z.MonsterPool, z.BossMonster, raw.monsters, lookups),
    };
    if (!regions.has(z.Slug)) {
      regions.set(z.Slug, { id: z.Slug, slug: z.Slug, name: z.DisplayName, subZones: [] });
    }
    regions.get(z.Slug).subZones.push(sub);
  }
  const out = [...regions.values()].map((r) => {
    const combat = r.subZones.filter((s) => !s.isHub);
    r.minLevel = combat.length ? Math.min(...combat.map((s) => s.minLevel)) : 0;
    r.maxLevel = combat.length ? Math.max(...combat.map((s) => s.maxLevel)) : 0;
    return r;
  });
  return { gameVersion: raw.info.gameVersion, regions: out };
}
