import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildGear, buildItem, parseStat } from './lib/build-gear.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data', 'raw-builds', 'catalog.json'), 'utf8'));
const rawCardsObj = JSON.parse(readFileSync(join(root, 'data', 'raw', 'cards.json'), 'utf8'));
const rawCardBySlug = new Map(Object.values(rawCardsObj).map((c) => [c.Slug, c]));
const rawEquipObj = JSON.parse(readFileSync(join(root, 'data', 'raw', 'equipment.json'), 'utf8'));
const equipBySlug = new Map(Object.values(rawEquipObj).map((e) => [e.Slug, e]));
const rawArtifactsObj = JSON.parse(readFileSync(join(root, 'data', 'raw', 'artifacts.json'), 'utf8'));
const artifacts = Object.values(rawArtifactsObj);
const out = { fetched: '2026-06-11', ...buildGear(catalog, { cardBySlug: rawCardBySlug, equipBySlug, artifacts }) };

// Manual overrides. The spiritvalemarket catalog is the default item list, but it lags the
// live game. base44 (vendored in data/raw-base44/) is newer and richer, so we pull specific
// slugs from it; `add` covers items in NO source; `patch` fixes a built item's fields;
// `craft` sets/fixes a craft recipe.
const overrides = JSON.parse(readFileSync(join(root, 'data', 'gear-overrides.json'), 'utf8'));

// base44 equipment is an array containing both engine dumps and enriched (display-ready)
// entries; keep the enriched one per slug (it carries statsPrimary).
const base44Equip = JSON.parse(readFileSync(join(root, 'data', 'raw-base44', 'equipment.json'), 'utf8'));
const base44BySlug = new Map();
for (const e of base44Equip) {
  const slug = e.slug || e.Slug;
  if (slug && (e.statsPrimary || !base44BySlug.has(slug))) base44BySlug.set(slug, e);
}

// monster slug -> spawn zones, so monster-keyed base44 drops can resolve to routable zones.
const base44Monsters = JSON.parse(readFileSync(join(root, 'data', 'raw-base44', 'monsters.json'), 'utf8'));
const monsterMaps = new Map();
for (const mo of Array.isArray(base44Monsters) ? base44Monsters : Object.values(base44Monsters)) {
  const slug = mo.slug || mo.Slug;
  if (slug) monsterMaps.set(slug, mo.maps || []);
}

// base44 drops are monster-keyed ({monster:{slug,level},chance}); the catalog shape that
// flattenSources (inside buildItem) expects is map-keyed ({monster,chance,maps:[{name,slug,
// minLevel,maxLevel}]}). Resolve each monster's spawn zones (using its own level as the band
// hint) so drop sources route the same as catalog items.
function resolveBase44Drops(drops) {
  return (drops || []).map((d) => {
    const lvl = d.monster && d.monster.level;
    const maps = (monsterMaps.get(d.monster && d.monster.slug) || []).map((m) => ({ ...m, minLevel: lvl, maxLevel: lvl }));
    return { monster: { name: d.monster && d.monster.name, isBoss: d.monster && d.monster.isBoss }, chance: d.chance, maps };
  });
}

for (const slug of overrides.fromBase44 || []) {
  const entry = base44BySlug.get(slug);
  const item = entry && buildItem({ ...entry, drops: resolveBase44Drops(entry.drops) });
  if (item) out.items[slug] = item;
  else console.warn(`  fromBase44: no usable base44 entry for "${slug}"`);
}
for (const item of overrides.add || []) out.items[item.slug] = item;
for (const [slug, fields] of Object.entries(overrides.patch || {})) {
  const item = out.items[slug];
  if (!item) { console.warn(`  patch: no item "${slug}" to patch`); continue; }
  Object.assign(item, fields);
  item.parsedStats = [...item.statsPrimary, ...item.statsSecondary].map(parseStat);
}
for (const [slug, craft] of Object.entries(overrides.craft || {})) if (out.items[slug]) out.items[slug].craft = craft;
const overrideCount = (overrides.fromBase44 || []).length + (overrides.add || []).length
  + Object.keys(overrides.patch || {}).length + Object.keys(overrides.craft || {}).length;

const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'gear.json'), JSON.stringify(out, null, 2));
console.log(`Wrote src/data/gear.json — ${Object.keys(out.items).length} items (${overrideCount} manual overrides).`);
