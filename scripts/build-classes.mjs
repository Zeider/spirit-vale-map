import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildClasses } from './lib/build-classes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src', 'data');
const classesPath = join(outDir, 'classes.json');
const raw = JSON.parse(readFileSync(join(root, 'data', 'raw-builds', 'build-simulator.json'), 'utf8'));
// Skill descriptions + per-level effects ripped from the game files. The rip
// (data/raw-game/ + scripts/rip-game-data.py) is kept LOCAL ONLY — not in the
// public repo. When it's absent (e.g. the deploy runner), preserve the
// description+effects already baked into the committed classes.json so the
// build doesn't strip them.
let gameSkills = {};
try {
  gameSkills = JSON.parse(readFileSync(join(root, 'data', 'raw-game', 'skills.json'), 'utf8'));
} catch {
  try {
    const prev = JSON.parse(readFileSync(classesPath, 'utf8'));
    for (const [id, s] of Object.entries(prev.skills || {})) gameSkills[id] = { description: s.description, effects: s.effects || [] };
  } catch { /* first build, nothing to preserve */ }
}
const out = { fetched: '2026-06-11', ...buildClasses(raw, gameSkills) };
mkdirSync(outDir, { recursive: true });
writeFileSync(classesPath, JSON.stringify(out, null, 2));
console.log(`Wrote src/data/classes.json — ${out.classes.length} classes, ${Object.keys(out.skills).length} skills.`);
