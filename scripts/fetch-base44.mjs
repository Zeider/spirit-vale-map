// Vendors the spirit-vale-builder base44 GameData snapshot.
//
// The whole game DB is one `GameData` entity: 19 rows keyed by `data_type`,
// each holding a `data_json` blob (monsters w/ full drop tables, equipment,
// materials, cards, gems, the *_drops join tables, classes, skills, …). One
// unauthenticated GET returns everything. We split each row into its own file
// under data/raw-base44/ for readable diffs, and write a manifest of versions.
//
// Refresh: `node scripts/fetch-base44.mjs` then `npm run data`.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP_ID = '6956d0e7cbb3450ac799247a';
const URL = `https://spirit-vale-builder.base44.app/api/apps/${APP_ID}/entities/GameData`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'data', 'raw-base44');
mkdirSync(outDir, { recursive: true });

const rows = await (await fetch(URL)).json();
if (!Array.isArray(rows)) throw new Error('Unexpected GameData response');

const manifest = {};
for (const row of rows) {
  const type = row.data_type;
  let payload;
  try {
    payload = JSON.parse(row.data_json);
  } catch {
    payload = row.data_json; // some rows (e.g. app_config) may be non-JSON
  }
  writeFileSync(join(outDir, `${type}.json`), JSON.stringify(payload, null, 2));
  manifest[type] = { version: row.version, updated: row.updated_date };
}
writeFileSync(join(outDir, '_manifest.json'), JSON.stringify({ source: URL, fetched: 'see git', appId: APP_ID, types: manifest }, null, 2));
console.log(`Vendored ${rows.length} GameData types → data/raw-base44/`);
console.log(Object.entries(manifest).map(([t, m]) => `  ${t}: ${m.version}`).join('\n'));
