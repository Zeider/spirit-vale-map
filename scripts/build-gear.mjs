import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildGear } from './lib/build-gear.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'data', 'raw-builds', 'catalog.json'), 'utf8'));
const out = { fetched: '2026-06-11', ...buildGear(catalog) };
const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'gear.json'), JSON.stringify(out, null, 2));
console.log(`Wrote src/data/gear.json — ${Object.keys(out.items).length} items.`);
