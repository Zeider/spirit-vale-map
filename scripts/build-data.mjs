import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mapTiles } from '../src/data/map-tiles.js';
import { buildLookupsAugmented, buildZonesFromBase44 } from './lib/build-zones-base44.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readV013 = (n) => JSON.parse(readFileSync(join(root, 'data', 'raw', `${n}.json`), 'utf8'));
const readB44 = (n) => JSON.parse(readFileSync(join(root, 'data', 'raw-base44', `${n}.json`), 'utf8'));

const lookups = buildLookupsAugmented(
  { equipment: readV013('equipment'), materials: readV013('materials'), consumables: readV013('consumables'),
    gems: readV013('gems'), cards: readV013('cards'), artifacts: readV013('artifacts') },
  { equipment: readB44('equipment'), gems: readB44('gems'), cards: readB44('cards') },
);
const monsters = readB44('monsters');
const manifest = readB44('_manifest');
const gameVersion = `base44 ${manifest.types.monsters.version.slice(0, 10)}`;

const zones = buildZonesFromBase44({ monsters, mapTiles, lookups, gameVersion });
const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'zones.json'), JSON.stringify(zones, null, 2));

const subCount = zones.regions.reduce((n, r) => n + r.subZones.length, 0);
console.log(`Wrote src/data/zones.json — ${gameVersion}, ${zones.regions.length} regions, ${subCount} sub-zones.`);
