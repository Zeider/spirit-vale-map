import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildGear } from './lib/build-gear.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data', 'raw-builds', 'catalog.json'), 'utf8'));
const rawCardsObj = JSON.parse(readFileSync(join(root, 'data', 'raw', 'cards.json'), 'utf8'));
const rawCardBySlug = new Map(Object.values(rawCardsObj).map((c) => [c.Slug, c]));
const rawEquipObj = JSON.parse(readFileSync(join(root, 'data', 'raw', 'equipment.json'), 'utf8'));
const equipBySlug = new Map(Object.values(rawEquipObj).map((e) => [e.Slug, e]));
const rawArtifactsObj = JSON.parse(readFileSync(join(root, 'data', 'raw', 'artifacts.json'), 'utf8'));
const artifacts = Object.values(rawArtifactsObj);
const out = { fetched: '2026-06-11', ...buildGear(catalog, { cardBySlug: rawCardBySlug, equipBySlug, artifacts }) };

// Manual overrides: add items missing from all upstream sources + fix/add craft recipes.
const overrides = JSON.parse(readFileSync(join(root, 'data', 'gear-overrides.json'), 'utf8'));
for (const item of overrides.add || []) out.items[item.slug] = item;
for (const [slug, craft] of Object.entries(overrides.craft || {})) if (out.items[slug]) out.items[slug].craft = craft;
const overrideCount = (overrides.add || []).length + Object.keys(overrides.craft || {}).length;

const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'gear.json'), JSON.stringify(out, null, 2));
console.log(`Wrote src/data/gear.json — ${Object.keys(out.items).length} items (${overrideCount} manual overrides).`);
