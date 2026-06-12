import { formatCardStats } from './card-stats.mjs';

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
  return { zoneSlug: m.Slug || m.slug, zoneName: m.DisplayName || m.GameId || m.name, materials };
}

function cardOf(c, raw) {
  return {
    kind: 'card', name: c.name, slug: c.slug, equipSlot: c.slot || null,
    affix: c.affix || '', description: c.description || '',
    stats: raw ? formatCardStats(raw.Stats) : [],
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

export function buildGear(catalog, raw = {}) {
  const items = {};
  for (const e of catalog.equipment) {
    const slot = categoryOf(e.equipmentType);
    if (!slot) continue;
    const statsPrimary = stripHtml(e.statsPrimary);
    const statsSecondary = stripHtml(e.statsSecondary);
    items[e.slug] = {
      slug: e.slug, name: e.name, type: e.equipmentType, slot, cardSlots: e.slots || 0,
      statsPrimary, statsSecondary, setBonus: stripHtml(e.statsFullSet),
      setName: (raw.equipBySlug && raw.equipBySlug.get(e.slug) && raw.equipBySlug.get(e.slug).Set) || null,
      parsedStats: [...statsPrimary, ...statsSecondary].map(parseStat),
      description: e.description || '', sources: flattenSources(e.drops), craft: craftOf(e.crafting),
    };
  }
  const cards = {};
  for (const c of catalog.cards || []) cards[c.name] = cardOf(c, raw.cardBySlug && raw.cardBySlug.get(c.slug));
  return { slots: SLOTS, items, cards, artifacts: buildArtifacts(raw.artifacts || []) };
}
