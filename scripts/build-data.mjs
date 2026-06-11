import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildZones } from './lib/build-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = join(root, 'data', 'raw');
const read = (name) => JSON.parse(readFileSync(join(rawDir, `${name}.json`), 'utf8'));

const raw = {
  info: read('info'),
  maps: read('maps'),
  monsters: read('monsters'),
  equipment: read('equipment'),
  materials: read('materials'),
  consumables: read('consumables'),
  gems: read('gems'),
  cards: read('cards'),
  artifacts: read('artifacts'),
};

const zones = buildZones(raw);
const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'zones.json'), JSON.stringify(zones, null, 2));

const subCount = zones.regions.reduce((n, r) => n + r.subZones.length, 0);
console.log(`Wrote src/data/zones.json — gameVersion ${zones.gameVersion}, ${zones.regions.length} regions, ${subCount} sub-zones.`);
