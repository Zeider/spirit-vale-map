import { slugify, toNameMap, aggregateDrops } from './build-data.mjs';

// v0.13.1 lookups are authoritative + stable; base44 equipment/gems/cards use
// the same GameId/DisplayName scheme, so augment those with current names + new
// ids. material/consumable/artifacts in base44 key by name/slug (incompatible)
// and are left as the v0.13.1 maps.
export function buildLookupsAugmented(v013Raw, base44) {
  const out = {
    equipment: toNameMap(v013Raw.equipment),
    materials: toNameMap(v013Raw.materials),
    consumables: toNameMap(v013Raw.consumables),
    gems: toNameMap(v013Raw.gems),
    cards: toNameMap(v013Raw.cards),
    artifacts: toNameMap(v013Raw.artifacts),
  };
  const augment = (table, entries) => {
    for (const e of entries || []) if (e && e.GameId) table[e.GameId] = e.DisplayName || e.GameId;
  };
  augment(out.equipment, base44.equipment);
  augment(out.gems, base44.gems);
  augment(out.cards, base44.cards);
  return out;
}

// Curated tie-break overrides: each boss's spawner-lure drops in exactly 2
// candidate zones; v0.13.1 boss data disambiguates which zone gets the boss.
// Homeless world/event bosses (null spawner, maps=[]) are NOT overridden here —
// they correctly remain unassigned.
export const BOSS_OVERRIDES = {
  // Tie: Lure Hare drops in both Bunny Woods and Forest Labyrinth; v0.13.1
  // assigns Hare to "Sunny Meadows" — the base44 equivalent dedicated bunny zone.
  'Bunny Woods': 'Hare',
  // Tie: Lure Sting drops in both Forest Labyrinth and Sunny Meadows 2; v0.13.1
  // assigns Sting to "Forest Labyrinth" (11-15 band).
  'Forest Labyrinth': 'Sting',
  // Tie: Lure Sunflora Pixie drops in both Fairy Glen and Forest Labyrinth via
  // a shared mob; v0.13.1 assigns Sunflora Pixie to "Fairy Glen".
  'Fairy Glen': 'Sunflora Pixie',
};

export function assignBosses(monsters) {
  // lure GameId -> set of map names whose monsters drop it
  const lureToMaps = {};
  for (const m of monsters) {
    for (const mp of m.maps || []) {
      for (const d of m.ConsumableDrops || []) {
        (lureToMaps[d.Id] ||= new Set()).add(mp.name);
      }
    }
  }
  const byName = new Map(monsters.map((m) => [m.DisplayName || m.name, m]));
  const byMap = {};
  for (const b of monsters) {
    if (!(b.IsBoss ?? b.isBoss)) continue;
    const lure = b.spawner && b.spawner.GameId;
    const maps = lure && lureToMaps[lure] ? [...lureToMaps[lure]] : [];
    if (maps.length === 1) byMap[maps[0]] = b;
  }
  for (const [mapName, bossName] of Object.entries(BOSS_OVERRIDES)) {
    const b = byName.get(bossName);
    if (b) byMap[mapName] = b;
  }
  return byMap;
}
