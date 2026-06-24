import { formatCardStats } from './card-stats.mjs';
import { mapTiles } from '../../src/data/map-tiles.js';

// Tiles grouped by display name, ascending by level — to resolve a craft zone's
// BAND. A multi-band zone (Forest Labyrinth ×4, Sanctum of Light ×2) shares one
// DisplayName, so the catalog GameId ("Labyrinth 4") carries the band index.
const tilesByName = {};
for (const t of mapTiles) (tilesByName[t.name] ||= []).push(t);
for (const k in tilesByName) tilesByName[k].sort((a, b) => a.minLevel - b.minLevel);

// minLevel of the exact band tile, so resolveTile(name, minLevel) lands on the
// right one instead of the first. Without this, e.g. Azure Antlers (Labyrinth 4,
// Lv 21-25) was resolving to Forest Labyrinth Lv 6-10.
function craftMinLevel(displayName, gameId) {
  const tiles = tilesByName[displayName];
  if (!tiles || !tiles.length) return undefined;
  if (tiles.length === 1) return tiles[0].minLevel;
  const m = String(gameId || '').match(/(\d+)\s*$/);
  const band = m ? parseInt(m[1], 10) : 1;
  return (tiles[band - 1] || tiles[0]).minLevel;
}

export const SLOTS = ['weapon', 'shield', 'headgear', 'face', 'chest', 'legwear', 'shoes', 'accessory1', 'accessory2', 'utility'];

const WEAPON_TYPES = new Set(['Dagger', 'Sword', 'Staff', 'Axe', 'Mace', 'Spear', 'Ranged', 'Book', 'Scythe', 'Pistol', 'Rifle', 'Shotgun', 'Twinblade', 'Gatling', 'Launcher', 'Katar']);
const TYPE_TO_CAT = { Shield: 'shield', Headgear: 'headgear', Face: 'face', Chest: 'chest', Legwear: 'legwear', Shoes: 'shoes', Accessory: 'accessory', Utility: 'utility' };

function categoryOf(type) {
  if (WEAPON_TYPES.has(type)) return 'weapon';
  return TYPE_TO_CAT[type] || null;
}

export function parseStat(line) {
  const m = line.match(/^(.+?):\s*\+?(-?\d+(?:\.\d+)?)(%?)(?:\s*\+(-?\d+(?:\.\d+)?)\s*per\s*refine)?/i);
  if (!m) return { label: line.trim(), raw: true };
  return { label: m[1].trim(), value: Number(m[2]), perRefine: m[4] ? Number(m[4]) : 0, percent: m[3] === '%' };
}

function stripHtml(arr) {
  return (arr || []).map((s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function flattenSources(drops) {
  const rows = [];
  for (const d of drops || []) {
    for (const m of d.maps || []) {
      rows.push({ monster: d.monster?.name, isBoss: !!d.monster?.isBoss, chance: d.chance, zoneName: m.name, zoneSlug: m.slug, minLevel: m.minLevel, maxLevel: m.maxLevel });
    }
  }
  return rows;
}

function craftOf(crafting) {
  const m = crafting && crafting.map;
  if (!m) return null;
  const materials = (crafting.materials || []).map((x) => ({ name: x.item?.DisplayName || x.item?.GameId || x.item?.name, count: x.count }));
  const zoneName = m.DisplayName || m.GameId || m.name;
  return { zoneSlug: m.Slug || m.slug, zoneName, minLevel: craftMinLevel(zoneName, m.GameId), materials };
}

function cardOf(c, raw) {
  return {
    kind: 'card', name: c.name, slug: c.slug, equipSlot: c.slot || null,
    affix: c.affix || '', description: c.description || '',
    stats: raw ? formatCardStats(raw.Stats) : [],
  };
}

function gemOf(g) {
  return {
    kind: 'gem', name: g.name, slug: g.slug,
    affix: g.affix || '', description: g.description || '',
    stats: stripHtml(g.stats),
  };
}

function nonZeroLine(line) {
  return !/^[+-]?0(\s|%)/.test(line); // drop "+0 X" / "0% X" noise from per-refine
}

function artifactOf(a) {
  return {
    slug: a.Slug,
    name: a.DisplayName,
    description: a.Description || '',
    fullSet: formatCardStats(a.FullSet),
    perPiece: formatCardStats(a.PerPiece),
    perRefine: formatCardStats(a.PerRefine).filter(nonZeroLine),
    zones: a.Maps || [],
  };
}

export function buildArtifacts(rawArtifacts) {
  return (rawArtifacts || []).map(artifactOf);
}

// Build one gear item from a catalog/base44 entry. Both sources share field names
// (slug/name/equipmentType/statsPrimary[]/statsSecondary[]/drops/crafting); they differ
// only in the card-slot field (catalog `slots` vs base44 `cardSlots`) and how the set name
// is carried (catalog via raw.equipBySlug lookup, base44 inline as `Set`).
export function buildItem(e, raw = {}) {
  const slot = categoryOf(e.equipmentType);
  if (!slot) return null;
  const statsPrimary = stripHtml(e.statsPrimary);
  const statsSecondary = stripHtml(e.statsSecondary);
  const lookupSet = raw.equipBySlug && raw.equipBySlug.get(e.slug) && raw.equipBySlug.get(e.slug).Set;
  return {
    slug: e.slug, name: e.name, type: e.equipmentType, slot,
    cardSlots: e.slots ?? e.cardSlots ?? 0,
    statsPrimary, statsSecondary, setBonus: stripHtml(e.statsFullSet),
    setName: e.Set ?? lookupSet ?? null,
    parsedStats: [...statsPrimary, ...statsSecondary].map(parseStat),
    description: e.description || '', sources: flattenSources(e.drops), craft: craftOf(e.crafting),
  };
}

export function buildGear(catalog, raw = {}) {
  const items = {};
  for (const e of catalog.equipment) {
    const item = buildItem(e, raw);
    if (item) items[e.slug] = item;
  }
  const cards = {};
  for (const c of catalog.cards || []) cards[c.name] = cardOf(c, raw.cardBySlug && raw.cardBySlug.get(c.slug));
  const gems = {};
  // A few gems appear twice under one slug, one copy carrying a broken "?" placeholder
  // stat (e.g. "? Damage" vs "Death Coil Damage"). Keep the non-placeholder copy.
  const broken = (gem) => (gem.stats || []).some((s) => s.includes('?'));
  for (const g of catalog.gems || []) {
    const gem = gemOf(g);
    const existing = gems[g.slug];
    if (!existing || (broken(existing) && !broken(gem))) gems[g.slug] = gem;
  }
  return { slots: SLOTS, items, cards, gems, artifacts: buildArtifacts(raw.artifacts || []) };
}
