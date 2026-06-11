import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildClasses } from './lib/build-classes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(readFileSync(join(root, 'data', 'raw-builds', 'build-simulator.json'), 'utf8'));
const out = { fetched: '2026-06-11', ...buildClasses(raw) };
const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'classes.json'), JSON.stringify(out, null, 2));
console.log(`Wrote src/data/classes.json — ${out.classes.length} classes, ${Object.keys(out.skills).length} skills.`);
