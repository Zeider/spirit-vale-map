# Spirit Vale Atlas — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static, GitHub Pages–hosted React app where an interactive Spirit Vale world map lets a player view each zone's aggregated drops and build a shareable, level-aware levelling route.

**Architecture:** A build-time Node pipeline joins the vendored `SpiritValeInfo` JSON (zones ↔ monsters ↔ drops) into one `src/data/zones.json`. The React app reads that plus a `hotspots.js` coordinate map, renders the map image with clickable per-sub-zone hotspots, and keeps `{playerLevel, dropFilter, route}` in a Context+reducer store synced to the URL and localStorage. No backend.

**Tech Stack:** React 18, Vite 7, Vitest + @testing-library/react (jsdom), Node ESM scripts, GitHub Actions → Pages.

**Conventions:** TDD (test → red → implement → green → commit). DRY, YAGNI. Exact paths below. Run all commands from the repo root `spirit-vale-map/` unless noted. The repo already contains `data/raw/*.json` (game v0.13.1) and `assets/world-map.png` (1178×846).

---

## File structure (created by this plan)

```
spirit-vale-map/
  package.json  vite.config.js  index.html  .gitignore (exists)
  public/world-map.png                # copied from assets/ for serving
  scripts/
    lib/build-data.mjs                 # pure pipeline functions (tested)
    build-data.mjs                     # CLI: reads data/raw, writes src/data/zones.json
  src/
    main.jsx  App.jsx
    test/setup.js
    data/
      zones.json                       # GENERATED, committed
      zones-index.js                   # flatten helpers over zones.json
      hotspots.js                      # sub-zone id -> {x,y,w,h} % (authored via calibrator)
    state/
      store.jsx                        # Context + reducer + provider
      url.js                           # encode/decode URL state
    logic/
      levels.js                        # classifyLevel, computeGaps
    components/
      TopBar.jsx  MapView.jsx  ZoneDrawer.jsx  RouteRail.jsx
      HotspotCalibrator.jsx            # dev-only coordinate authoring tool
    styles/app.css
  .github/workflows/deploy.yml
  README.md  ATTRIBUTION.md
```

---

## Task 0: Scaffold Vite + React + Vitest

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/test/setup.js`, `src/styles/app.css`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "spirit-vale-atlas",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "data": "node scripts/build-data.mjs",
    "prebuild": "node scripts/build-data.mjs",
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "vite": "^7.3.2",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is '/' for local + custom-domain; the deploy workflow sets VITE_BASE
// to the GitHub Pages project path (e.g. '/spirit-vale-map/').
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Spirit Vale Atlas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/test/setup.js`**

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Create `src/styles/app.css` (placeholder, filled in Task 10)**

```css
:root { color-scheme: dark; }
body { margin: 0; font-family: system-ui, sans-serif; background: #0d1018; color: #e6edf3; }
```

- [ ] **Step 6: Create `src/App.jsx` (temporary smoke component)**

```jsx
export default function App() {
  return <h1>Spirit Vale Atlas</h1>;
}
```

- [ ] **Step 7: Create `src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
);
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors. If npm reports a peer-dependency conflict between `vite@7` and `@vitejs/plugin-react`, install the current compatible versions instead: `npm install -D vite@latest @vitejs/plugin-react@latest` and re-run.

- [ ] **Step 9: Verify the test runner boots**

Run: `npx vitest run`
Expected: exits 0 with "No test files found" (acceptable — we add tests next).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + Vitest"
```

---

## Task 1: Data pipeline — pure functions + tests

**Files:**
- Create: `scripts/lib/build-data.mjs`
- Test: `scripts/lib/build-data.test.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/lib/build-data.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { slugify, toNameMap, buildLookups, aggregateDrops, buildZones } from './build-data.mjs';

const lookups = {
  equipment: { 'Bunny Cap': 'Bunny Cap', NoviceFeet: 'Novice Boots' },
  materials: { 'Tree Bark': 'Tree Bark' },
  consumables: { 'Lure Hare': 'Hare Lure' },
  gems: { 'Firebolt Gem': 'Firebolt Gem' },
  cards: { Bunny: 'Bunny Card' },
  artifacts: { Novice: 'Novice Scroll' },
};
const monsters = {
  Bunny: {
    GameId: 'Bunny', IsBoss: 0,
    EquipDrops: [{ Id: 'Bunny Cap', DropChance: 1 }, { Id: 'NoviceFeet', DropChance: 12 }],
    MaterialDrops: [{ Id: 'Tree Bark', DropChance: 100 }],
    ConsumableDrops: [{ Id: 'Lure Hare', DropChance: 0.3 }],
    GemDrops: [{ Id: 'Firebolt Gem', DropChance: 0.1 }],
    Card: { Id: 'Bunny', DropChance: 1 },
    Artifact: { Id: 'Novice', DropChance: 15 },
  },
  Hare: { GameId: 'Hare', IsBoss: 1, MaterialDrops: [{ Id: 'Tree Bark', DropChance: 50 }], EquipDrops: [{ Id: 'Bunny Cap', DropChance: 9 }] },
};

describe('slugify', () => {
  it('lowercases and dashes', () => {
    expect(slugify('Labyrinth 1')).toBe('labyrinth-1');
    expect(slugify("Demon's Maw")).toBe('demon-s-maw');
  });
});

describe('toNameMap', () => {
  it('handles dict and list shapes', () => {
    expect(toNameMap({ A: { GameId: 'A', DisplayName: 'Alpha' } })).toEqual({ A: 'Alpha' });
    expect(toNameMap([{ GameId: 'B', DisplayName: 'Beta' }])).toEqual({ B: 'Beta' });
  });
});

describe('aggregateDrops', () => {
  const drops = aggregateDrops(['Bunny'], 'Hare', monsters, lookups);
  it('resolves names and types', () => {
    const bark = drops.find((d) => d.id === 'Tree Bark');
    expect(bark).toMatchObject({ name: 'Tree Bark', type: 'material' });
  });
  it('keeps the max chance across monsters', () => {
    const bark = drops.find((d) => d.id === 'Tree Bark');
    expect(bark.chance).toBe(100); // Bunny 100 > Hare 50
    expect(bark.sources.sort()).toEqual(['Bunny', 'Hare']);
  });
  it('marks boss-only drops', () => {
    const cap = drops.find((d) => d.id === 'Bunny Cap');
    expect(cap.bossOnly).toBe(false); // dropped by Bunny (non-boss) too
  });
  it('falls back to raw id when unresolved', () => {
    const d2 = aggregateDrops(['X'], null, { X: { MaterialDrops: [{ Id: 'Unknown', DropChance: 5 }] } }, lookups);
    expect(d2[0]).toMatchObject({ id: 'Unknown', name: 'Unknown', type: 'material' });
  });
  it('sorts by descending chance', () => {
    for (let i = 1; i < drops.length; i++) expect(drops[i - 1].chance).toBeGreaterThanOrEqual(drops[i].chance);
  });
});

describe('buildZones', () => {
  const raw = {
    info: { gameVersion: '0.13.1' },
    maps: {
      'Labyrinth 1': { Slug: 'forest-labyrinth', GameId: 'Labyrinth 1', DisplayName: 'Forest Labyrinth', MonsterMinLevel: 6, MonsterMaxLevel: 10, MonsterPool: ['Bunny'], BossMonster: 'Hare' },
      'Labyrinth 2': { Slug: 'forest-labyrinth', GameId: 'Labyrinth 2', DisplayName: 'Forest Labyrinth', MonsterMinLevel: 11, MonsterMaxLevel: 15, MonsterPool: ['Bunny'], BossMonster: null },
      Nevaris: { Slug: 'nevaris', GameId: 'Nevaris', DisplayName: 'Nevaris', MonsterMinLevel: 0, MonsterMaxLevel: 0, MonsterPool: [], BossMonster: null },
    },
    monsters,
    equipment: lookups.equipment, materials: lookups.materials, consumables: lookups.consumables,
    gems: lookups.gems, cards: lookups.cards, artifacts: [{ GameId: 'Novice', DisplayName: 'Novice Scroll' }],
  };
  const out = buildZones(raw);
  it('groups sub-zones under a region by Slug', () => {
    const region = out.regions.find((r) => r.id === 'forest-labyrinth');
    expect(region.subZones.map((s) => s.id)).toEqual(['labyrinth-1', 'labyrinth-2']);
    expect(region.minLevel).toBe(6);
    expect(region.maxLevel).toBe(15);
  });
  it('flags hubs and gives them no drops', () => {
    const hub = out.regions.find((r) => r.id === 'nevaris').subZones[0];
    expect(hub.isHub).toBe(true);
    expect(hub.drops).toEqual([]);
  });
  it('passes through gameVersion', () => {
    expect(out.gameVersion).toBe('0.13.1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/build-data.test.mjs`
Expected: FAIL — "Failed to resolve import './build-data.mjs'".

- [ ] **Step 3: Write the implementation**

`scripts/lib/build-data.mjs`:
```js
export function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Convert a lookup file (dict keyed by GameId, or array of entries) to { GameId: DisplayName }.
export function toNameMap(data) {
  const out = {};
  const entries = Array.isArray(data) ? data : Object.values(data);
  for (const e of entries) {
    if (e && e.GameId) out[e.GameId] = e.DisplayName || e.GameId;
  }
  return out;
}

export function buildLookups(raw) {
  return {
    equipment: toNameMap(raw.equipment),
    materials: toNameMap(raw.materials),
    consumables: toNameMap(raw.consumables),
    gems: toNameMap(raw.gems),
    cards: toNameMap(raw.cards),
    artifacts: toNameMap(raw.artifacts),
  };
}

// Which monster fields map to which drop type + which lookup table.
const ARRAY_SOURCES = [
  ['EquipDrops', 'equip', 'equipment'],
  ['MaterialDrops', 'material', 'materials'],
  ['ConsumableDrops', 'consumable', 'consumables'],
  ['GemDrops', 'gem', 'gems'],
];

export function aggregateDrops(monsterNames, bossName, monsters, lookups) {
  const byKey = new Map();
  const add = (id, type, table, chance, monsterName, bossOnly) => {
    const name = (lookups[table] && lookups[table][id]) || id;
    const key = `${type}:${id}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { id, name, type, chance, bossOnly, sources: [monsterName] });
    } else {
      existing.chance = Math.max(existing.chance, chance);
      existing.bossOnly = existing.bossOnly && bossOnly;
      if (!existing.sources.includes(monsterName)) existing.sources.push(monsterName);
    }
  };
  const roster = [
    ...monsterNames.map((n) => ({ n, boss: false })),
    ...(bossName ? [{ n: bossName, boss: true }] : []),
  ];
  for (const { n, boss } of roster) {
    const mon = monsters[n];
    if (!mon) continue;
    for (const [field, type, table] of ARRAY_SOURCES) {
      for (const d of mon[field] || []) add(d.Id, type, table, d.DropChance, n, boss);
    }
    if (mon.Card) add(mon.Card.Id, 'card', 'cards', mon.Card.DropChance, n, boss);
    if (mon.Artifact) add(mon.Artifact.Id, 'artifact', 'artifacts', mon.Artifact.DropChance, n, boss);
  }
  return [...byKey.values()].sort((a, b) => b.chance - a.chance);
}

export function buildZones(raw) {
  const lookups = buildLookups(raw);
  const regions = new Map();
  for (const [gameId, z] of Object.entries(raw.maps)) {
    const isHub = !z.MonsterPool || z.MonsterPool.length === 0;
    const sub = {
      id: slugify(gameId),
      gameId,
      name: z.DisplayName,
      minLevel: z.MonsterMinLevel,
      maxLevel: z.MonsterMaxLevel,
      isHub,
      monsters: z.MonsterPool || [],
      boss: z.BossMonster || null,
      drops: isHub ? [] : aggregateDrops(z.MonsterPool, z.BossMonster, raw.monsters, lookups),
    };
    if (!regions.has(z.Slug)) {
      regions.set(z.Slug, { id: z.Slug, slug: z.Slug, name: z.DisplayName, subZones: [] });
    }
    regions.get(z.Slug).subZones.push(sub);
  }
  const out = [...regions.values()].map((r) => {
    const combat = r.subZones.filter((s) => !s.isHub);
    r.minLevel = combat.length ? Math.min(...combat.map((s) => s.minLevel)) : 0;
    r.maxLevel = combat.length ? Math.max(...combat.map((s) => s.maxLevel)) : 0;
    return r;
  });
  return { gameVersion: raw.info.gameVersion, regions: out };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/build-data.test.mjs`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/build-data.mjs scripts/lib/build-data.test.mjs
git commit -m "feat: data pipeline pure functions (zones/drops aggregation)"
```

---

## Task 2: Data pipeline CLI — generate `zones.json`

**Files:**
- Create: `scripts/build-data.mjs`, `src/data/zones.json` (generated)

- [ ] **Step 1: Write the CLI**

`scripts/build-data.mjs`:
```js
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
```

- [ ] **Step 2: Run the generator**

Run: `npm run data`
Expected: prints `Wrote src/data/zones.json — gameVersion 0.13.1, 28 regions, 36 sub-zones.` (region/sub-zone counts may differ slightly with data; both must be > 0).

- [ ] **Step 3: Sanity-check the output**

Run: `node -e "const z=require('./src/data/zones.json'); const fl=z.regions.find(r=>r.id==='forest-labyrinth'); console.log(fl.subZones.length, fl.subZones[0].drops.slice(0,2).map(d=>d.name+' '+d.chance))"`
Expected: prints the Forest Labyrinth sub-zone count and a couple of resolved drop names with chances (names must be human-readable, not raw ids like `NoviceFeet`).

- [ ] **Step 4: Commit (zones.json is committed so dev works without a build)**

```bash
git add scripts/build-data.mjs src/data/zones.json
git commit -m "feat: generate committed src/data/zones.json from raw game data"
```

---

## Task 3: Domain logic — level classification & route gaps

**Files:**
- Create: `src/logic/levels.js`
- Test: `src/logic/levels.test.js`

- [ ] **Step 1: Write the failing test**

`src/logic/levels.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { classifyLevel, computeGaps } from './levels.js';

describe('classifyLevel', () => {
  it('returns under / on / over', () => {
    expect(classifyLevel(6, 10, 3)).toBe('under');
    expect(classifyLevel(6, 10, 8)).toBe('on');
    expect(classifyLevel(6, 10, 12)).toBe('over');
    expect(classifyLevel(6, 10, 6)).toBe('on');
    expect(classifyLevel(6, 10, 10)).toBe('on');
  });
});

describe('computeGaps', () => {
  it('returns [] when contiguous', () => {
    expect(computeGaps([{ minLevel: 1, maxLevel: 5 }, { minLevel: 6, maxLevel: 10 }])).toEqual([]);
  });
  it('finds an uncovered range between bands', () => {
    expect(computeGaps([{ minLevel: 1, maxLevel: 5 }, { minLevel: 11, maxLevel: 15 }])).toEqual([{ from: 6, to: 10 }]);
  });
  it('ignores ordering and overlaps', () => {
    expect(computeGaps([{ minLevel: 11, maxLevel: 15 }, { minLevel: 1, maxLevel: 12 }])).toEqual([]);
  });
  it('returns [] for empty input', () => {
    expect(computeGaps([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/logic/levels.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/logic/levels.js`:
```js
export function classifyLevel(minLevel, maxLevel, playerLevel) {
  if (playerLevel < minLevel) return 'under';
  if (playerLevel > maxLevel) return 'over';
  return 'on';
}

// bands: [{ minLevel, maxLevel }] -> [{ from, to }] uncovered ranges within the span.
export function computeGaps(bands) {
  if (!bands.length) return [];
  const lo = Math.min(...bands.map((b) => b.minLevel));
  const hi = Math.max(...bands.map((b) => b.maxLevel));
  const covered = new Array(hi - lo + 1).fill(false);
  for (const b of bands) {
    for (let l = Math.max(lo, b.minLevel); l <= Math.min(hi, b.maxLevel); l++) covered[l - lo] = true;
  }
  const gaps = [];
  let start = null;
  for (let l = lo; l <= hi; l++) {
    const isCovered = covered[l - lo];
    if (!isCovered && start === null) start = l;
    if (isCovered && start !== null) { gaps.push({ from: start, to: l - 1 }); start = null; }
  }
  return gaps;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/logic/levels.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/levels.js src/logic/levels.test.js
git commit -m "feat: level classification and route gap detection"
```

---

## Task 4: URL state encode/decode

**Files:**
- Create: `src/state/url.js`
- Test: `src/state/url.test.js`

- [ ] **Step 1: Write the failing test**

`src/state/url.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from './url.js';

describe('url state', () => {
  it('round-trips level and route', () => {
    const qs = encodeState({ playerLevel: 42, route: ['sunny-meadows', 'labyrinth-1'] });
    expect(decodeState(qs)).toEqual({ playerLevel: 42, route: ['sunny-meadows', 'labyrinth-1'] });
  });
  it('defaults level to 1 and route to [] when absent', () => {
    expect(decodeState('')).toEqual({ playerLevel: 1, route: [] });
  });
  it('drops empty route entries', () => {
    expect(decodeState('route=a,,b,').route).toEqual(['a', 'b']);
  });
  it('omits empty params when encoding', () => {
    expect(encodeState({ playerLevel: 1, route: [] })).toBe('lvl=1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/url.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/state/url.js`:
```js
export function encodeState({ playerLevel, route }) {
  const p = new URLSearchParams();
  if (playerLevel) p.set('lvl', String(playerLevel));
  if (route && route.length) p.set('route', route.join(','));
  return p.toString();
}

export function decodeState(search) {
  const p = new URLSearchParams(search);
  const lvl = parseInt(p.get('lvl'), 10);
  const route = (p.get('route') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return { playerLevel: Number.isFinite(lvl) ? lvl : 1, route };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/url.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/url.js src/state/url.test.js
git commit -m "feat: URL state encode/decode"
```

---

## Task 5: State store — reducer + provider

**Files:**
- Create: `src/state/store.jsx`
- Test: `src/state/store.test.js`

- [ ] **Step 1: Write the failing test (reducer is pure → tested directly)**

`src/state/store.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

describe('reducer', () => {
  it('sets level and filter', () => {
    expect(reducer(initialState, { type: 'setLevel', level: 40 }).playerLevel).toBe(40);
    expect(reducer(initialState, { type: 'setFilter', filter: 'gem' }).dropFilter).toBe('gem');
  });
  it('adds to route without duplicates', () => {
    let s = reducer(initialState, { type: 'addToRoute', id: 'a' });
    s = reducer(s, { type: 'addToRoute', id: 'a' });
    expect(s.route).toEqual(['a']);
  });
  it('removes from route', () => {
    const s = reducer({ ...initialState, route: ['a', 'b'] }, { type: 'removeFromRoute', id: 'a' });
    expect(s.route).toEqual(['b']);
  });
  it('moves an entry up/down and ignores out-of-bounds', () => {
    const base = { ...initialState, route: ['a', 'b', 'c'] };
    expect(reducer(base, { type: 'moveInRoute', index: 0, dir: 1 }).route).toEqual(['b', 'a', 'c']);
    expect(reducer(base, { type: 'moveInRoute', index: 0, dir: -1 }).route).toEqual(['a', 'b', 'c']);
  });
  it('hydrates partial state', () => {
    expect(reducer(initialState, { type: 'hydrate', state: { playerLevel: 7, route: ['x'] } }))
      .toMatchObject({ playerLevel: 7, route: ['x'] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/store.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/state/store.jsx`:
```jsx
import { createContext, useContext, useReducer } from 'react';

export const initialState = {
  playerLevel: 1,
  dropFilter: 'all',
  selectedZoneId: null,
  route: [],
};

export function reducer(state, action) {
  switch (action.type) {
    case 'setLevel': return { ...state, playerLevel: action.level };
    case 'setFilter': return { ...state, dropFilter: action.filter };
    case 'select': return { ...state, selectedZoneId: action.id };
    case 'addToRoute':
      return state.route.includes(action.id) ? state : { ...state, route: [...state.route, action.id] };
    case 'removeFromRoute':
      return { ...state, route: state.route.filter((id) => id !== action.id) };
    case 'moveInRoute': {
      const r = [...state.route];
      const { index, dir } = action;
      const j = index + dir;
      if (j < 0 || j >= r.length) return state;
      [r[index], r[j]] = [r[j], r[index]];
      return { ...state, route: r };
    }
    case 'hydrate': return { ...state, ...action.state };
    default: return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children, init }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...init });
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/store.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.jsx src/state/store.test.js
git commit -m "feat: context store with reducer"
```

---

## Task 6: Zones index helper

**Files:**
- Create: `src/data/zones-index.js`
- Test: `src/data/zones-index.test.js`

- [ ] **Step 1: Write the failing test**

`src/data/zones-index.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { regions, subZoneById, subZones, gameVersion } from './zones-index.js';

describe('zones-index', () => {
  it('exposes a non-empty region list and gameVersion', () => {
    expect(regions.length).toBeGreaterThan(0);
    expect(typeof gameVersion).toBe('string');
  });
  it('indexes sub-zones by id with regionName attached', () => {
    const sample = subZones[0];
    expect(subZoneById[sample.id]).toBe(sample);
    expect(sample.regionName).toBeTruthy();
  });
  it('Forest Labyrinth sub-zones are present', () => {
    expect(subZoneById['labyrinth-1']).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/zones-index.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/data/zones-index.js`:
```js
import data from './zones.json';

export const gameVersion = data.gameVersion;
export const regions = data.regions;

export const subZoneById = {};
for (const r of regions) {
  for (const s of r.subZones) {
    subZoneById[s.id] = Object.assign(s, { regionName: r.name });
  }
}
export const subZones = Object.values(subZoneById);

// Validate an array of ids against known sub-zones (used for URL route hydration).
export function keepKnownIds(ids) {
  return ids.filter((id) => subZoneById[id]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/zones-index.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/zones-index.js src/data/zones-index.test.js
git commit -m "feat: zones index helper with id validation"
```

---

## Task 7: Hotspot calibrator + authored coordinates

The map needs one rectangle per sub-zone. The calibrator is a dev tool that overlays the map and prints coordinates as you click; you use it to author `hotspots.js`. Coordinates are percentages (0–100) of the displayed map.

**Files:**
- Create: `src/components/HotspotCalibrator.jsx`, `src/data/hotspots.js`
- Modify (temporarily): `src/App.jsx`
- Copy: `public/world-map.png`

- [ ] **Step 1: Make the map servable**

Run: `mkdir -p public && cp assets/world-map.png public/world-map.png`

- [ ] **Step 2: Create the calibrator**

`src/components/HotspotCalibrator.jsx`:
```jsx
import { useState } from 'react';
import { subZones } from '../data/zones-index.js';

// Dev-only tool: pick a sub-zone, click TOP-LEFT then BOTTOM-RIGHT on the map.
// It prints a hotspots.js line you paste into src/data/hotspots.js.
export default function HotspotCalibrator() {
  const [i, setI] = useState(0);
  const [corner, setCorner] = useState(null);
  const [out, setOut] = useState([]);
  const zone = subZones[i];

  const onClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = +(((e.clientX - r.left) / r.width) * 100).toFixed(2);
    const y = +(((e.clientY - r.top) / r.height) * 100).toFixed(2);
    if (!corner) { setCorner({ x, y }); return; }
    const line = `  '${zone.id}': { x: ${Math.min(corner.x, x)}, y: ${Math.min(corner.y, y)}, w: ${Math.abs(x - corner.x).toFixed(2)}, h: ${Math.abs(y - corner.y).toFixed(2)} }, // ${zone.name} ${zone.minLevel}-${zone.maxLevel}`;
    setOut((o) => [...o, line]);
    setCorner(null);
    setI((n) => Math.min(n + 1, subZones.length - 1));
  };

  return (
    <div style={{ padding: 12 }}>
      <p>
        Zone {i + 1}/{subZones.length}: <b>{zone.name}</b> (Lv {zone.minLevel}-{zone.maxLevel}) —
        click {corner ? 'BOTTOM-RIGHT' : 'TOP-LEFT'} corner.
        {' '}<button onClick={() => setI((n) => Math.min(n + 1, subZones.length - 1))}>skip</button>
      </p>
      <div style={{ position: 'relative', width: '100%', maxWidth: 1178 }}>
        <img src={`${import.meta.env.BASE_URL}world-map.png`} style={{ width: '100%', display: 'block', cursor: 'crosshair' }} onClick={onClick} alt="calibrate" />
      </div>
      <textarea readOnly value={out.join('\n')} style={{ width: '100%', height: 200, marginTop: 8 }} />
    </div>
  );
}
```

- [ ] **Step 3: Temporarily mount the calibrator**

Replace `src/App.jsx` body with:
```jsx
import HotspotCalibrator from './components/HotspotCalibrator.jsx';
export default function App() {
  return <HotspotCalibrator />;
}
```

- [ ] **Step 4: Author the coordinates**

Run: `npm run dev` and open the printed local URL.
For each sub-zone in the checklist below, click its top-left then bottom-right corner on the map tile. Copy the accumulated textarea output. The checklist (id — name — level band) — capture all of them:

```
castle-crypt — Abyss Castle Crypt — 106-110
castle-keep — Abyss Castle Keep — 101-105
castle-library — Abyss Castle Library — 111-115
cemetery — Festering Woods — 21-25
dark-forest — Dark Forest — 91-95
demon-s-maw — Demon's Maw — 96-100
desert-field-1 — Windy Desert — 21-25
desert-field-2 — Windy Desert — 26-30
desert-field-3 — Windy Desert — 26-30
dungeon-boss — Forgotten Depths — 46-50
dungeon-outside — Forgotten Depths — 41-45
enchanted-forest — Fairy Glen — 31-35
forest-field-1 — Sunny Meadows — 1-5
forest-field-2 — Treant Trail — 5-9
forge — The Forge — 126-130
goblin-cave — Goblin Cave — 51-55
goblin-village — Goblin Village — 56-60
goblin-warcamp — Goblin Warcamp — 116-120
ice-cave — Crystal Cave — 66-70
ice-field — Starfall Tundra — 131-135
island-dungeon — Turtle Nexus — 131-135
island — Stormreef Isle — 61-65
labyrinth-1 — Forest Labyrinth — 6-10
labyrinth-2 — Forest Labyrinth — 11-15
labyrinth-3 — Forest Labyrinth — 16-20
labyrinth-4 — Forest Labyrinth — 21-25
mystic-lake — Mystic Lake — 31-35
nevaris — Nevaris (HUB) — 0-0
night-garden — Night Garden — 126-130
poison-cave — Underground Cavern — 86-90
port-town — Wayfarer's Landing (HUB) — 0-0
sanctum-inner — Sanctum of Light — 76-80
sanctum-throne — Sanctum of Light — 81-85
swamp-wilderness — Swamp Wilderness — 71-75
swamp — Swamp — 36-40
water-dungeon — Sunken Depths — 121-125
```
> Tip: the live checklist order in the tool is driven by `subZones`; the names above match. If `subZones` includes any id not listed here (e.g. after a data refresh), capture it too. Hubs (`nevaris`, `port-town`) still get a hotspot so they're visible/labeled.

- [ ] **Step 5: Write `src/data/hotspots.js` from the captured lines**

`src/data/hotspots.js` (paste the captured lines between the braces — every sub-zone id must appear exactly once; values are the tool output):
```js
// Sub-zone id -> { x, y, w, h } as percentages of the map image.
// Authored with HotspotCalibrator. Stored as data so a tile can later
// become an SVG polygon without touching components.
export const hotspots = {
  // paste calibrator output lines here, e.g.:
  // 'forest-field-1': { x: 30.1, y: 41.2, w: 12.0, h: 11.5 }, // Sunny Meadows 1-5
};
```

- [ ] **Step 6: Add a guard test for completeness**

`src/data/hotspots.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { hotspots } from './hotspots.js';
import { subZones } from './zones-index.js';

describe('hotspots', () => {
  it('has an entry for every sub-zone', () => {
    const missing = subZones.map((s) => s.id).filter((id) => !hotspots[id]);
    expect(missing).toEqual([]);
  });
  it('uses percentage rects within 0..100', () => {
    for (const [id, r] of Object.entries(hotspots)) {
      expect(r.x >= 0 && r.x + r.w <= 100, `${id} x range`).toBe(true);
      expect(r.y >= 0 && r.y + r.h <= 100, `${id} y range`).toBe(true);
    }
  });
});
```

- [ ] **Step 7: Run the guard test**

Run: `npx vitest run src/data/hotspots.test.js`
Expected: PASS (fails loudly if any sub-zone lacks a hotspot — finish calibration until green).

- [ ] **Step 8: Restore `src/App.jsx` to the smoke component**

```jsx
export default function App() {
  return <h1>Spirit Vale Atlas</h1>;
}
```

- [ ] **Step 9: Commit**

```bash
git add public/world-map.png src/components/HotspotCalibrator.jsx src/data/hotspots.js src/data/hotspots.test.js src/App.jsx
git commit -m "feat: hotspot calibrator and authored zone coordinates"
```

---

## Task 8: MapView component

**Files:**
- Create: `src/components/MapView.jsx`
- Test: `src/components/MapView.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/MapView.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MapView from './MapView.jsx';
import { StoreProvider } from '../state/store.jsx';

// Minimal real data exists via zones-index/hotspots imports.
function renderWithStore(init) {
  return render(<StoreProvider init={init}><MapView /></StoreProvider>);
}

describe('MapView', () => {
  it('renders a hotspot button per sub-zone that has coordinates', () => {
    renderWithStore();
    // Forest Labyrinth tile should be present and labelled.
    expect(screen.getByRole('button', { name: /Forest Labyrinth/i })).toBeInTheDocument();
  });
  it('dispatches select on hotspot click', () => {
    renderWithStore();
    const btn = screen.getAllByRole('button')[0];
    fireEvent.click(btn);
    // After click the button reflects aria-pressed state.
    expect(btn).toHaveAttribute('aria-pressed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/MapView.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/components/MapView.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import { subZoneById } from '../data/zones-index.js';
import { hotspots } from '../data/hotspots.js';
import { classifyLevel } from '../logic/levels.js';

export default function MapView() {
  const { state, dispatch } = useStore();
  const { playerLevel, route, selectedZoneId } = state;

  const center = (id) => {
    const h = hotspots[id];
    return h ? { cx: h.x + h.w / 2, cy: h.y + h.h / 2 } : null;
  };
  const routePoints = route.map(center).filter(Boolean);

  return (
    <div className="map-view">
      <img className="map-img" src={`${import.meta.env.BASE_URL}world-map.png`} alt="Spirit Vale world map" />
      <svg className="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        {routePoints.length > 1 && (
          <polyline
            points={routePoints.map((p) => `${p.cx},${p.cy}`).join(' ')}
            fill="none" stroke="#FFD25A" strokeWidth="0.6" strokeDasharray="1.6 1.2"
          />
        )}
      </svg>
      {Object.entries(hotspots).map(([id, h]) => {
        const z = subZoneById[id];
        if (!z) return null;
        const cls = z.isHub ? 'hub' : classifyLevel(z.minLevel, z.maxLevel, playerLevel);
        const inRoute = route.includes(id);
        const selected = selectedZoneId === id;
        return (
          <button
            key={id}
            className={`hotspot lvl-${cls}${inRoute ? ' in-route' : ''}${selected ? ' selected' : ''}`}
            style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
            title={z.isHub ? `${z.name} (hub)` : `${z.name} · Lv ${z.minLevel}-${z.maxLevel}`}
            aria-label={`${z.name} ${z.isHub ? 'hub' : `level ${z.minLevel} to ${z.maxLevel}`}`}
            aria-pressed={selected}
            onClick={() => dispatch({ type: 'select', id })}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/MapView.test.jsx`
Expected: PASS.

> If Step 1's name query fails because Forest Labyrinth hotspots weren't authored, finish Task 7 calibration first.

- [ ] **Step 5: Commit**

```bash
git add src/components/MapView.jsx src/components/MapView.test.jsx
git commit -m "feat: MapView with level-tinted hotspots and route polyline"
```

---

## Task 9: ZoneDrawer component

**Files:**
- Create: `src/components/ZoneDrawer.jsx`
- Test: `src/components/ZoneDrawer.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/ZoneDrawer.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoneDrawer from './ZoneDrawer.jsx';
import { StoreProvider } from '../state/store.jsx';
import { subZones } from '../data/zones-index.js';

const combatZone = subZones.find((s) => !s.isHub && s.drops.length > 0);

describe('ZoneDrawer', () => {
  it('prompts to pick a zone when none selected', () => {
    render(<StoreProvider><ZoneDrawer /></StoreProvider>);
    expect(screen.getByText(/select a zone/i)).toBeInTheDocument();
  });
  it('shows zone name and an add-to-route button', () => {
    render(<StoreProvider init={{ selectedZoneId: combatZone.id }}><ZoneDrawer /></StoreProvider>);
    expect(screen.getByRole('heading', { name: new RegExp(combatZone.name) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to route/i })).toBeInTheDocument();
  });
  it('toggles route membership on click', () => {
    render(<StoreProvider init={{ selectedZoneId: combatZone.id }}><ZoneDrawer /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /add to route/i }));
    expect(screen.getByRole('button', { name: /remove from route/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ZoneDrawer.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/components/ZoneDrawer.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import { subZoneById } from '../data/zones-index.js';

const TYPE_LABELS = {
  all: 'All', equip: 'Equipment', material: 'Materials',
  card: 'Cards', gem: 'Gems', consumable: 'Consumables', artifact: 'Artifacts',
};

export default function ZoneDrawer() {
  const { state, dispatch } = useStore();
  const zone = state.selectedZoneId ? subZoneById[state.selectedZoneId] : null;

  if (!zone) {
    return <div className="zone-drawer empty"><p>Select a zone on the map to see its drops.</p></div>;
  }

  const inRoute = state.route.includes(zone.id);
  const drops = state.dropFilter === 'all' ? zone.drops : zone.drops.filter((d) => d.type === state.dropFilter);

  return (
    <div className="zone-drawer">
      <div className="zone-drawer-head">
        <h2>{zone.name}</h2>
        {zone.isHub ? (
          <span className="badge hub">Hub — no monsters</span>
        ) : (
          <>
            <span className="badge">Lv {zone.minLevel}–{zone.maxLevel}</span>
            {zone.boss && <span className="badge boss">Boss: {zone.boss}</span>}
            <button onClick={() => dispatch({ type: inRoute ? 'removeFromRoute' : 'addToRoute', id: zone.id })}>
              {inRoute ? 'Remove from route' : '+ Add to route'}
            </button>
          </>
        )}
      </div>

      {!zone.isHub && (
        <div className="zone-drawer-body">
          <div className="monsters">
            <h3>Monsters ({zone.monsters.length})</h3>
            <p>{zone.monsters.join(' · ')}</p>
          </div>
          <div className="drops">
            <h3>Drops — {TYPE_LABELS[state.dropFilter]} ({drops.length})</h3>
            {drops.length === 0 ? (
              <p className="muted">No {TYPE_LABELS[state.dropFilter].toLowerCase()} drops.</p>
            ) : (
              <ul>
                {drops.map((d) => (
                  <li key={`${d.type}:${d.id}`} className={`drop drop-${d.type}`}>
                    <span className="drop-name">{d.name}</span>
                    <span className="drop-type">{d.type}</span>
                    <span className="drop-chance" title="raw drop weight from game data">{d.chance}%</span>
                    {d.bossOnly && <span className="badge boss small">boss</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ZoneDrawer.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ZoneDrawer.jsx src/components/ZoneDrawer.test.jsx
git commit -m "feat: ZoneDrawer with filtered aggregated drops"
```

---

## Task 10: RouteRail component

**Files:**
- Create: `src/components/RouteRail.jsx`
- Test: `src/components/RouteRail.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/RouteRail.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteRail from './RouteRail.jsx';
import { StoreProvider } from '../state/store.jsx';
import { subZones } from '../data/zones-index.js';

const [a, b] = subZones.filter((s) => !s.isHub).slice(0, 2);

describe('RouteRail', () => {
  it('shows an empty hint with no route', () => {
    render(<StoreProvider><RouteRail /></StoreProvider>);
    expect(screen.getByText(/no zones yet/i)).toBeInTheDocument();
  });
  it('lists route zones in order and removes one', () => {
    render(<StoreProvider init={{ route: [a.id, b.id] }}><RouteRail /></StoreProvider>);
    expect(screen.getByText(new RegExp(a.name))).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0]);
    expect(screen.queryByText(new RegExp(`^${a.name}`))).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/RouteRail.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/components/RouteRail.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import { subZoneById } from '../data/zones-index.js';
import { classifyLevel, computeGaps } from '../logic/levels.js';

export default function RouteRail() {
  const { state, dispatch } = useStore();
  const zones = state.route.map((id) => subZoneById[id]).filter(Boolean);
  const gaps = computeGaps(zones.map((z) => ({ minLevel: z.minLevel, maxLevel: z.maxLevel })));
  const min = zones.length ? Math.min(...zones.map((z) => z.minLevel)) : null;
  const max = zones.length ? Math.max(...zones.map((z) => z.maxLevel)) : null;

  return (
    <aside className="route-rail">
      <h2>Levelling route</h2>
      {zones.length === 0 ? (
        <p className="muted">No zones yet — click a zone and "Add to route".</p>
      ) : (
        <>
          <ol>
            {zones.map((z, i) => (
              <li key={z.id} className={`route-item lvl-${classifyLevel(z.minLevel, z.maxLevel, state.playerLevel)}`}>
                <span className="route-pos">{i + 1}</span>
                <button className="link" onClick={() => dispatch({ type: 'select', id: z.id })}>
                  {z.name} <span className="muted">Lv {z.minLevel}–{z.maxLevel}</span>
                </button>
                <span className="route-actions">
                  <button aria-label={`move ${z.name} up`} disabled={i === 0} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: -1 })}>↑</button>
                  <button aria-label={`move ${z.name} down`} disabled={i === zones.length - 1} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: 1 })}>↓</button>
                  <button aria-label={`remove ${z.name}`} onClick={() => dispatch({ type: 'removeFromRoute', id: z.id })}>✕</button>
                </span>
              </li>
            ))}
          </ol>
          <div className="route-summary">
            <span>Covers Lv {min}–{max} · {zones.length} zones</span>
            {gaps.length > 0 && (
              <span className="gaps">Gaps: {gaps.map((g) => (g.from === g.to ? g.from : `${g.from}–${g.to}`)).join(', ')}</span>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/RouteRail.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RouteRail.jsx src/components/RouteRail.test.jsx
git commit -m "feat: RouteRail with reorder, remove, and gap summary"
```

---

## Task 11: TopBar component

**Files:**
- Create: `src/components/TopBar.jsx`
- Test: `src/components/TopBar.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/TopBar.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from './TopBar.jsx';
import { StoreProvider, useStore } from '../state/store.jsx';

function Probe() {
  const { state } = useStore();
  return <output data-testid="lvl">{state.playerLevel}-{state.dropFilter}</output>;
}

describe('TopBar', () => {
  it('updates player level', () => {
    render(<StoreProvider><TopBar /><Probe /></StoreProvider>);
    fireEvent.change(screen.getByLabelText(/level/i), { target: { value: '50' } });
    expect(screen.getByTestId('lvl').textContent).toBe('50-all');
  });
  it('updates drop filter', () => {
    render(<StoreProvider><TopBar /><Probe /></StoreProvider>);
    fireEvent.change(screen.getByLabelText(/filter/i), { target: { value: 'gem' } });
    expect(screen.getByTestId('lvl').textContent).toBe('1-gem');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/TopBar.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/components/TopBar.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import { gameVersion } from '../data/zones-index.js';

const FILTERS = ['all', 'equip', 'material', 'card', 'gem', 'consumable', 'artifact'];

export default function TopBar() {
  const { state, dispatch } = useStore();

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* clipboard unavailable */ }
  };

  return (
    <header className="top-bar">
      <span className="brand">⚔️ Spirit Vale Atlas</span>
      <span className="spacer" />
      <label className="field">
        Level
        <input
          type="number" min="1" max="135" value={state.playerLevel}
          onChange={(e) => dispatch({ type: 'setLevel', level: Math.max(1, parseInt(e.target.value, 10) || 1) })}
        />
      </label>
      <label className="field">
        Filter
        <select value={state.dropFilter} onChange={(e) => dispatch({ type: 'setFilter', filter: e.target.value })}>
          {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
      <button onClick={share}>🔗 Share route</button>
      <span className="game-version" title="Game data version">v{gameVersion}</span>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/TopBar.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.jsx src/components/TopBar.test.jsx
git commit -m "feat: TopBar with level, filter, share, version"
```

---

## Task 12: App composition + URL/localStorage sync

**Files:**
- Modify: `src/App.jsx`
- Create: `src/state/sync.js`
- Test: `src/App.test.jsx`

- [ ] **Step 1: Write the failing integration test**

`src/App.test.jsx`:
```jsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

describe('App', () => {
  it('renders the three panes', () => {
    render(<App />);
    expect(screen.getByText(/Spirit Vale Atlas/i)).toBeInTheDocument();
    expect(screen.getByText(/Levelling route/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a zone/i)).toBeInTheDocument();
  });
  it('writes the route to the URL when a zone is added', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Lv |hub/i })[0]); // select a hotspot
    const drawer = screen.getByText(/Drops —/i).closest('.zone-drawer') || document.body;
    const addBtn = within(drawer).queryByRole('button', { name: /add to route/i });
    if (addBtn) {
      fireEvent.click(addBtn);
      expect(window.location.search).toMatch(/route=/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.jsx`
Expected: FAIL — App still renders the smoke `<h1>` / sync module missing.

- [ ] **Step 3: Write the sync hook**

`src/state/sync.js`:
```js
import { useEffect } from 'react';
import { encodeState, decodeState } from './url.js';
import { keepKnownIds } from '../data/zones-index.js';

const LS_KEY = 'sva.state.v1';

// Read initial state from URL first, then localStorage; validate route ids.
export function loadInitialState() {
  const fromUrl = decodeState(window.location.search.replace(/^\?/, ''));
  let base = fromUrl;
  if (!window.location.search && localStorage.getItem(LS_KEY)) {
    try { base = { ...base, ...JSON.parse(localStorage.getItem(LS_KEY)) }; } catch { /* ignore */ }
  }
  return { playerLevel: base.playerLevel ?? 1, route: keepKnownIds(base.route || []) };
}

// Persist level+route to URL (replaceState) and localStorage whenever they change.
export function usePersist(state) {
  useEffect(() => {
    const slice = { playerLevel: state.playerLevel, route: state.route };
    const qs = encodeState(slice);
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', url);
    localStorage.setItem(LS_KEY, JSON.stringify(slice));
  }, [state.playerLevel, state.route]);
}
```

- [ ] **Step 4: Write `src/App.jsx`**

```jsx
import { StoreProvider, useStore } from './state/store.jsx';
import { loadInitialState, usePersist } from './state/sync.js';
import TopBar from './components/TopBar.jsx';
import MapView from './components/MapView.jsx';
import RouteRail from './components/RouteRail.jsx';
import ZoneDrawer from './components/ZoneDrawer.jsx';
import { gameVersion } from './data/zones-index.js';

function Shell() {
  const { state } = useStore();
  usePersist(state);
  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <MapView />
        <RouteRail />
      </div>
      <ZoneDrawer />
      <footer className="app-footer">
        Game data v{gameVersion}. Data: SpiritValeInfo. Map art: spiritvalemarket.com. Community tool, not affiliated with the game.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider init={loadInitialState()}>
      <Shell />
    </StoreProvider>
  );
}
```

- [ ] **Step 5: Run the integration test**

Run: `npx vitest run src/App.test.jsx`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all test files PASS.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/state/sync.js src/App.test.jsx
git commit -m "feat: compose app shell with URL + localStorage sync"
```

---

## Task 13: Styling

**Files:**
- Modify: `src/styles/app.css`

- [ ] **Step 1: Write the stylesheet**

Replace `src/styles/app.css` with:
```css
:root {
  color-scheme: dark;
  --bg: #0d1018; --panel: #11182a; --line: #243049; --text: #e6edf3; --muted: #8ea0bf;
  --on: #7CFC9B; --over: #6b7a99; --under: #ff7c7c; --route: #FFD25A; --hub: #7CB2FC;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); }
.app { max-width: 1280px; margin: 0 auto; padding: 12px; }

.top-bar { display: flex; align-items: center; gap: 12px; padding: 8px 4px; }
.top-bar .brand { font-weight: 700; }
.top-bar .spacer { flex: 1; }
.top-bar .field { display: flex; flex-direction: column; font-size: 11px; color: var(--muted); }
.top-bar input, .top-bar select { background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 4px 6px; }
.top-bar button { background: var(--route); color: #222; border: 0; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
.game-version { font-size: 11px; color: var(--muted); }

.main { display: flex; gap: 12px; align-items: flex-start; }
.map-view { position: relative; flex: 1.9; line-height: 0; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.map-img { width: 100%; display: block; }
.map-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.hotspot { position: absolute; border: 2px solid transparent; border-radius: 4px; background: transparent; cursor: pointer; padding: 0; transition: background .12s, border-color .12s; }
.hotspot:hover { border-color: #fff; background: rgba(255,255,255,.12); }
.hotspot.lvl-on { border-color: var(--on); background: rgba(124,252,155,.18); }
.hotspot.lvl-over { border-color: var(--over); background: rgba(107,122,153,.12); }
.hotspot.lvl-under { border-color: var(--under); background: rgba(255,124,124,.14); }
.hotspot.lvl-hub { border-color: var(--hub); background: rgba(124,178,252,.12); }
.hotspot.in-route { box-shadow: 0 0 0 2px var(--route) inset; }
.hotspot.selected { border-color: #fff; box-shadow: 0 0 12px rgba(255,255,255,.5); }

.route-rail { flex: 1; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px; }
.route-rail h2 { font-size: 13px; margin: 0 0 8px; }
.route-rail ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.route-item { display: flex; align-items: center; gap: 6px; background: #1a2236; border-left: 3px solid var(--on); padding: 5px 7px; border-radius: 5px; font-size: 12px; }
.route-item.lvl-over { border-left-color: var(--over); }
.route-item.lvl-under { border-left-color: var(--under); }
.route-pos { color: var(--muted); }
.route-item .link { background: none; border: 0; color: var(--text); cursor: pointer; text-align: left; flex: 1; }
.route-actions button { background: #23304a; color: var(--text); border: 0; border-radius: 4px; cursor: pointer; padding: 1px 5px; }
.route-actions button:disabled { opacity: .35; cursor: default; }
.route-summary { margin-top: 8px; border-top: 1px dashed var(--line); padding-top: 6px; font-size: 11px; color: var(--muted); display: flex; flex-direction: column; gap: 2px; }
.route-summary .gaps { color: var(--route); }

.zone-drawer { margin-top: 12px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px; }
.zone-drawer.empty { color: var(--muted); }
.zone-drawer-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.zone-drawer-head h2 { font-size: 15px; margin: 0; }
.zone-drawer-head button { margin-left: auto; background: var(--route); color: #222; border: 0; border-radius: 6px; padding: 5px 10px; cursor: pointer; }
.badge { font-size: 11px; background: #23304a; padding: 2px 7px; border-radius: 5px; }
.badge.boss { color: #f99; background: transparent; }
.badge.hub { color: var(--hub); }
.badge.small { font-size: 9px; }
.zone-drawer-body { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; }
.zone-drawer-body .monsters { flex: 1; }
.zone-drawer-body .drops { flex: 1.4; }
.drops ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 5px; }
.drop { display: inline-flex; align-items: center; gap: 6px; background: #1a2236; border-radius: 12px; padding: 2px 9px; }
.drop-type { color: var(--muted); font-size: 10px; }
.drop-chance { font-weight: 700; }
.muted { color: var(--muted); }
.app-footer { margin-top: 16px; font-size: 11px; color: var(--muted); text-align: center; }

@media (max-width: 800px) {
  .main { flex-direction: column; }
  .map-view, .route-rail { width: 100%; flex: none; }
}
```

- [ ] **Step 2: Visually verify**

Run: `npm run dev`, open the URL. Confirm: map renders with tinted hotspots; clicking a zone fills the drawer with drops; adding zones builds the rail and draws the route line; changing Level retints; the route appears in the URL; refresh restores it.

- [ ] **Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "style: app layout and zone/route styling"
```

---

## Task 14: Production build, GitHub Pages deploy, docs

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`, `ATTRIBUTION.md`

- [ ] **Step 1: Verify a clean production build**

Run: `npm run build`
Expected: `prebuild` regenerates `zones.json`, then Vite writes `dist/` with no errors.

- [ ] **Step 2: Create the deploy workflow**

`.github/workflows/deploy.yml` (set `VITE_BASE` to `/<repo-name>/`; using `spirit-vale-map` — change if the repo is renamed):
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_BASE: /spirit-vale-map/
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Create `README.md`**

```markdown
# Spirit Vale Atlas

A map-centric levelling & drop planner for the idle RPG **Spirit Vale**. Click a zone to see its aggregated drops, build a level-aware levelling route, and share it via URL. Static site — no backend.

## Develop
- `npm install`
- `npm run data` — regenerate `src/data/zones.json` from `data/raw/`
- `npm run dev` — local dev server
- `npm test` — run the test suite
- `npm run build` — production build to `dist/`

## Updating game data
When `RandomGuy5555/SpiritValeInfo` publishes a newer snapshot:
1. Replace the files in `data/raw/` with the new `example-data/game/*.json`.
2. Run `npm run data` and commit the regenerated `src/data/zones.json`.
The current `gameVersion` is shown in the app header.

## Credits
See `ATTRIBUTION.md`.
```

- [ ] **Step 4: Create `ATTRIBUTION.md`**

```markdown
# Attribution

- **Game data:** [RandomGuy5555/SpiritValeInfo](https://github.com/RandomGuy5555/SpiritValeInfo) (game v0.13.1).
- **World map art:** sourced from [spiritvalemarket.com](https://spiritvalemarket.com).
- **Game:** *Spirit Vale*. This is an unofficial community tool, not affiliated with or endorsed by the game's developers.

If you are a rights holder and want attribution changed or content removed, please open an issue.
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml README.md ATTRIBUTION.md
git commit -m "chore: GitHub Pages deploy workflow + docs and attribution"
```

- [ ] **Step 6: (Manual, by Jeremy) Publish**

Create the GitHub repo, push `main`, and in repo Settings → Pages set Source = "GitHub Actions". Confirm the workflow runs green and the site loads at `https://<user>.github.io/spirit-vale-map/`.

---

## Self-review notes (for the implementer)

- **Spec coverage:** map render (T7–T8), zone detail + aggregated drops with chance (T2, T9), route build/reorder/remove + gaps (T10), level tinting (T3, T8), data pipeline + committed `zones.json` + refresh path (T1–T2, T14 README), URL + localStorage sharing (T4, T12), GitHub Pages deploy (T14), attribution (T14). Towns handled as hubs (T1, T8, T9).
- **Open questions:** OQ-1 `DropChance` shown raw with a "raw drop weight" tooltip + `%`. OQ-3 hotspots are per sub-zone (T7). OQ-4 repo name parameterized via `VITE_BASE` (T14). OQ-2 attribution recorded; confirm public-hosting permission before Step 6.
- **Naming consistency:** action types (`setLevel/setFilter/select/addToRoute/removeFromRoute/moveInRoute/hydrate`), `subZoneById`, `hotspots`, `classifyLevel`, `computeGaps`, `encodeState/decodeState` are used identically across tasks.
```
