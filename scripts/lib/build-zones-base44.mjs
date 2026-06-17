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
