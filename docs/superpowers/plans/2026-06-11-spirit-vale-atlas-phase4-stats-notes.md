# Spirit Vale Atlas — Phase 4 Implementation Plan (Stats, Notes & Annotated Route)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the app into Atlas/Build/Gear tabs; add build notes, a gear stat sheet, an annotated route (per-zone notes + wanted items), and a shared item hover tooltip — all from current data, no damage sim.

**Architecture:** Build-time gear data gains parsed stats + craft materials (and `sockets`→`cardSlots`). Pure logic sums loadout stats. The `?build=`/`?route=` URLs move to base64url-JSON (with legacy fallback) to carry free-text notes + nested structures. The store gains a 3-value `view`, `build.notes`/`build.attributes`, and object-shaped route entries `{id,notes,wants}`. React components split BuildView into BuildTab+GearTab and add StatSheet/ItemTooltip/BuildNotes.

**Tech Stack:** React 18, Vite 7, Vitest + @testing-library/react. Node ESM scripts. Windows; run from repo root `spirit-vale-map/`.

**Branch:** create `feat/phase4-stats-notes` at execution start (not main).

**Existing shapes (do not break):** store `initialState.build = {baseClass,advancedClass,levels,gearStages}`; `view:'atlas'|'builds'`; `route:[tileId]`; `selectedStage/selectedItemSlug/openSlot/selectedSkillId`. `build-url.js` exports encode/decode/sanitizeBuild (`~`-delimited). `src/state/url.js` exports encodeState/decodeState (atlas lvl+route). `map-tiles.js` exports `resolveTile`, `keepKnownTileIds`, `tileById`, `mapTiles`. `gear-index.js` exports `items`, `slots`. `gear.json` items have `sockets`, `statsPrimary/Secondary` (text), `setBonus`, `sources`, `craft:{zoneSlug,zoneName}`.

---

## Task 1: Gear pipeline — parsed stats, craft materials, cardSlots

**Files:** Modify `scripts/lib/build-gear.mjs`, `scripts/lib/build-gear.test.mjs`; regenerate `src/data/gear.json`

- [ ] **Step 1: Update the test** — replace the assertions in `scripts/lib/build-gear.test.mjs` for the abyss-shard item and add parse cases. Replace the whole file with:
```js
import { describe, it, expect } from 'vitest';
import { buildGear, SLOTS, parseStat } from './build-gear.mjs';

const catalog = {
  equipment: [{
    slug: 'abyss-shard', name: 'Abyss Shard', equipmentType: 'Dagger', slots: 2,
    statsPrimary: ['Atk: <span>+20</span> <span>+2 per refine</span>'],
    statsSecondary: ['Double Attack: <span>+50%</span>', 'Special note line'],
    statsFullSet: [],
    description: 'A dagger.',
    drops: [{ monster: { name: 'Dragonfly Arrow', isBoss: 0 }, chance: 3, maps: [{ name: 'Swamp', slug: 'swamp', minLevel: 36, maxLevel: 40 }] }],
    crafting: { map: { Slug: 'swamp', DisplayName: 'Swamp' }, materials: [{ item: { DisplayName: 'Larva' }, count: 75 }] },
  }],
};

describe('parseStat', () => {
  it('parses flat + per-refine', () => {
    expect(parseStat('Atk: +20 +2 per refine')).toEqual({ label: 'Atk', value: 20, perRefine: 2, percent: false });
  });
  it('parses percent', () => {
    expect(parseStat('Double Attack: +50%')).toEqual({ label: 'Double Attack', value: 50, perRefine: 0, percent: true });
  });
  it('keeps non-matching lines as raw', () => {
    expect(parseStat('Special note line')).toEqual({ label: 'Special note line', raw: true });
  });
});

describe('buildGear', () => {
  const out = buildGear(catalog);
  const a = out.items['abyss-shard'];
  it('uses cardSlots (not sockets) and SLOTS has two accessory slots', () => {
    expect(a.cardSlots).toBe(2);
    expect(a.sockets).toBeUndefined();
    expect(SLOTS).toContain('accessory2');
  });
  it('adds parsedStats', () => {
    expect(a.parsedStats[0]).toEqual({ label: 'Atk', value: 20, perRefine: 2, percent: false });
  });
  it('adds craft materials', () => {
    expect(a.craft).toEqual({ zoneSlug: 'swamp', zoneName: 'Swamp', materials: [{ name: 'Larva', count: 75 }] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/build-gear.test.mjs`
Expected: FAIL (`parseStat` not exported; `cardSlots`/`parsedStats`/materials missing).

- [ ] **Step 3: Update `scripts/lib/build-gear.mjs`** — add `parseStat`, use `cardSlots`, parse stats, add materials. Replace the file's `stripHtml`/`craftOf`/`buildGear` region with:
```js
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

export function buildGear(catalog) {
  const items = {};
  for (const e of catalog.equipment) {
    const slot = categoryOf(e.equipmentType);
    if (!slot) continue;
    const statsPrimary = stripHtml(e.statsPrimary);
    const statsSecondary = stripHtml(e.statsSecondary);
    items[e.slug] = {
      slug: e.slug, name: e.name, type: e.equipmentType, slot, cardSlots: e.slots || 0,
      statsPrimary, statsSecondary, setBonus: stripHtml(e.statsFullSet),
      parsedStats: [...statsPrimary, ...statsSecondary].map(parseStat),
      description: e.description || '', sources: flattenSources(e.drops), craft: craftOf(e.crafting),
    };
  }
  return { slots: SLOTS, items };
}
```
(Keep the existing `SLOTS`, `WEAPON_TYPES`, `TYPE_TO_CAT`, `categoryOf` declarations above.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/build-gear.test.mjs`
Expected: PASS.

- [ ] **Step 5: Regenerate + commit**

Run: `node scripts/build-gear.mjs` (expect "Wrote src/data/gear.json — 448 items.")
```bash
git add scripts/lib/build-gear.mjs scripts/lib/build-gear.test.mjs src/data/gear.json
git commit -m "feat: gear parsedStats + craft materials + cardSlots rename"
```

---

## Task 2: gearByName index

**Files:** Modify `src/data/gear-index.js`, Test `src/data/gear-index.test.js`

- [ ] **Step 1: Add a failing test** — append to `src/data/gear-index.test.js`:
```js
import { gearByName } from './gear-index.js';
import { items as allItems } from './gear-index.js';

describe('gearByName', () => {
  it('maps display name to the item', () => {
    const sample = Object.values(allItems)[0];
    expect(gearByName[sample.name].slug).toBe(sample.slug);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/gear-index.test.js`
Expected: FAIL — `gearByName` undefined.

- [ ] **Step 3: Add the export** — append to `src/data/gear-index.js`:
```js
export const gearByName = {};
for (const it of Object.values(items)) if (!(it.name in gearByName)) gearByName[it.name] = it;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/gear-index.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/gear-index.js src/data/gear-index.test.js
git commit -m "feat: gearByName index"
```

---

## Task 3: Stat summation logic

**Files:** Create `src/logic/stats.js`, Test `src/logic/stats.test.js`

- [ ] **Step 1: Write the failing test**

`src/logic/stats.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { sumLoadoutStats } from './stats.js';

const items = {
  a: { parsedStats: [{ label: 'Atk', value: 20, percent: false }, { label: 'Crit', value: 5, percent: true }] },
  b: { parsedStats: [{ label: 'Atk', value: 10, percent: false }, { label: 'Note', raw: true }] },
};

describe('sumLoadoutStats', () => {
  it('sums by label, keeps percent flag, ignores raw', () => {
    const out = sumLoadoutStats({ weapon: 'a', chest: 'b' }, items);
    expect(out.find((s) => s.label === 'Atk')).toEqual({ label: 'Atk', value: 30, percent: false });
    expect(out.find((s) => s.label === 'Crit')).toEqual({ label: 'Crit', value: 5, percent: true });
    expect(out.some((s) => s.label === 'Note')).toBe(false);
  });
  it('handles an empty loadout', () => {
    expect(sumLoadoutStats({}, items)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/logic/stats.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/logic/stats.js`:
```js
// Sum the parsed flat stats of an effective loadout ({slot: itemSlug}) by label.
// Base values only (refine not modeled). Raw (unparseable) stat lines are skipped.
export function sumLoadoutStats(loadout, items) {
  const totals = new Map(); // label -> { label, value, percent }
  for (const itemSlug of Object.values(loadout || {})) {
    const item = items[itemSlug];
    if (!item) continue;
    for (const st of item.parsedStats || []) {
      if (st.raw) continue;
      const cur = totals.get(st.label) || { label: st.label, value: 0, percent: st.percent };
      cur.value += st.value;
      totals.set(st.label, cur);
    }
  }
  return [...totals.values()];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/logic/stats.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/stats.js src/logic/stats.test.js
git commit -m "feat: sumLoadoutStats"
```

---

## Task 4: Build URL → base64url-JSON (+ notes, attributes)

**Files:** Modify `src/state/build-url.js`, `src/state/build-url.test.js`

- [ ] **Step 1: Rewrite the test** — replace `src/state/build-url.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';

const full = {
  baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 },
  gearStages: [{ fromLevel: 1, changes: { weapon: 'abyss-shard' } }],
  attributes: { str: 3, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
  notes: 'farm to 40; alt: axe',
};

describe('build url (base64)', () => {
  it('round-trips a full build incl. notes/attributes via base64', () => {
    const s = encodeBuild(full);
    expect(s).not.toContain('~'); // base64url, not legacy
    expect(decodeBuild(s)).toEqual(full);
  });
  it('decodes a LEGACY ~-delimited build (back-compat)', () => {
    const b = decodeBuild('acolyte~priest~heal:5');
    expect(b.baseClass).toBe('acolyte');
    expect(b.advancedClass).toBe('priest');
    expect(b.levels).toEqual({ heal: 5 });
    expect(b.gearStages).toEqual([]);
    expect(b.notes).toBe('');
    expect(b.attributes).toEqual({ str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 });
  });
  it('returns null/empty for empties', () => {
    expect(decodeBuild('')).toBeNull();
    expect(encodeBuild(null)).toBe('');
  });
  it('sanitize drops unknown class', () => {
    expect(sanitizeBuild({ baseClass: 'nope', levels: {}, gearStages: [], attributes: {}, notes: '' })).toBeNull();
  });
  it('sanitize keeps known skills/items, clamps, defaults attributes, coerces notes', () => {
    const b = sanitizeBuild({ baseClass: 'acolyte', advancedClass: null, levels: { heal: 999, fake: 3 }, gearStages: [{ fromLevel: 200, changes: { weapon: 'abyss-shard', x: 'no' } }], attributes: { str: 9 }, notes: 42 });
    expect(b.levels.fake).toBeUndefined();
    expect(b.gearStages[0].fromLevel).toBe(135);
    expect(b.gearStages[0].changes).toEqual({ weapon: 'abyss-shard' });
    expect(b.attributes.str).toBe(9);
    expect(b.attributes.agi).toBe(1);
    expect(b.notes).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/build-url.test.js`
Expected: FAIL.

- [ ] **Step 3: Rewrite `src/state/build-url.js`**:
```js
import { classBySlug, skillById } from '../data/classes-index.js';
import { treeOf, requirementsMet } from '../logic/build.js';
import { items as gearItems } from '../data/gear-index.js';
import { sortStages } from '../logic/gear.js';

const DEFAULT_ATTRS = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };

// base64url helpers (UTF-8 safe).
function b64encode(obj) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64decode(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function encodeBuild(build) {
  if (!build?.baseClass) return '';
  return b64encode({
    baseClass: build.baseClass,
    advancedClass: build.advancedClass || null,
    levels: build.levels || {},
    gearStages: build.gearStages || [],
    attributes: build.attributes || DEFAULT_ATTRS,
    notes: build.notes || '',
  });
}

// Legacy ~-delimited parser (Phase 2/3 links).
function decodeLegacy(str) {
  const [base, adv, lvStr, gearStr] = str.split('~');
  const levels = {};
  for (const part of (lvStr || '').split(',')) {
    if (!part) continue;
    const [id, v] = part.split(':');
    const n = parseInt(v, 10);
    if (id && n > 0) levels[id] = n;
  }
  const gearStages = (gearStr || '').split(';').filter(Boolean).map((seg) => {
    const [lvl, chStr] = seg.split(':');
    const changes = {};
    for (const pair of (chStr || '').split(',')) {
      if (!pair) continue;
      const [slot, item] = pair.split('=');
      if (slot && item) changes[slot] = item;
    }
    return { fromLevel: parseInt(lvl, 10), changes };
  });
  return { baseClass: base || null, advancedClass: adv || null, levels, gearStages, attributes: { ...DEFAULT_ATTRS }, notes: '' };
}

export function decodeBuild(str) {
  if (!str) return null;
  try {
    const o = b64decode(str);
    return {
      baseClass: o.baseClass || null,
      advancedClass: o.advancedClass || null,
      levels: o.levels || {},
      gearStages: o.gearStages || [],
      attributes: { ...DEFAULT_ATTRS, ...(o.attributes || {}) },
      notes: typeof o.notes === 'string' ? o.notes : '',
    };
  } catch {
    return decodeLegacy(str);
  }
}

export function sanitizeBuild(build) {
  if (!build || !classBySlug[build.baseClass]) return null;
  const advancedClass = classBySlug[build.advancedClass] ? build.advancedClass : null;
  const clean = { baseClass: build.baseClass, advancedClass, levels: {}, gearStages: [], attributes: { ...DEFAULT_ATTRS }, notes: '' };
  for (const [id, lv] of Object.entries(build.levels || {})) {
    const sk = skillById[id];
    if (!sk || !treeOf(id, clean)) continue;
    clean.levels[id] = Math.min(lv, sk.maxLevel);
  }
  for (let i = 0; i < 5; i++) {
    let changed = false;
    for (const id of Object.keys(clean.levels)) if (!requirementsMet(id, clean)) { delete clean.levels[id]; changed = true; }
    if (!changed) break;
  }
  const stages = (build.gearStages || []).map((s) => {
    const changes = {};
    for (const [slot, item] of Object.entries(s.changes || {})) if (gearItems[item]) changes[slot] = item;
    return { fromLevel: Math.min(135, Math.max(1, s.fromLevel || 1)), changes };
  });
  clean.gearStages = sortStages(stages);
  for (const k of Object.keys(DEFAULT_ATTRS)) {
    const v = build.attributes?.[k];
    clean.attributes[k] = Number.isFinite(v) ? Math.max(1, v) : 1;
  }
  if (typeof build.notes === 'string') clean.notes = build.notes;
  return clean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/build-url.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/build-url.js src/state/build-url.test.js
git commit -m "feat: base64url build URL with notes + attributes (legacy fallback)"
```

---

## Task 5: Route URL (base64url-JSON, object entries)

**Files:** Create `src/state/route-url.js`, Test `src/state/route-url.test.js`

- [ ] **Step 1: Write the failing test**

`src/state/route-url.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { encodeRoute, decodeRoute, sanitizeRoute } from './route-url.js';

const route = [
  { id: 'swamp', notes: 'stay to 40', wants: ['abyss-shard'] },
  { id: 'goblin-cave', notes: '', wants: [] },
];

describe('route url', () => {
  it('round-trips object entries via base64', () => {
    const s = encodeRoute(route);
    expect(decodeRoute(s)).toEqual(route);
  });
  it('decodes a LEGACY comma-id list to objects', () => {
    expect(decodeRoute('swamp,goblin-cave')).toEqual([
      { id: 'swamp', notes: '', wants: [] },
      { id: 'goblin-cave', notes: '', wants: [] },
    ]);
  });
  it('returns [] for empty', () => {
    expect(decodeRoute('')).toEqual([]);
    expect(encodeRoute([])).toBe('');
  });
  it('sanitize keeps known tiles + known wants', () => {
    const out = sanitizeRoute([{ id: 'swamp', notes: 'x', wants: ['abyss-shard', 'nope'] }, { id: 'not-a-tile', notes: '', wants: [] }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'swamp', notes: 'x', wants: ['abyss-shard'] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/route-url.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/state/route-url.js`:
```js
import { tileById } from '../data/map-tiles.js';
import { items as gearItems } from '../data/gear-index.js';

function b64encode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64decode(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

export function encodeRoute(route) {
  if (!route || !route.length) return '';
  return b64encode(route.map((e) => ({ id: e.id, notes: e.notes || '', wants: e.wants || [] })));
}

export function decodeRoute(str) {
  if (!str) return [];
  try {
    const arr = b64decode(str);
    if (!Array.isArray(arr)) return [];
    return arr.map((e) => ({ id: e.id, notes: typeof e.notes === 'string' ? e.notes : '', wants: Array.isArray(e.wants) ? e.wants : [] }));
  } catch {
    return str.split(',').filter(Boolean).map((id) => ({ id, notes: '', wants: [] }));
  }
}

export function sanitizeRoute(route) {
  return (route || [])
    .filter((e) => tileById[e.id])
    .map((e) => ({ id: e.id, notes: typeof e.notes === 'string' ? e.notes : '', wants: (e.wants || []).filter((w) => gearItems[w]) }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/route-url.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/route-url.js src/state/route-url.test.js
git commit -m "feat: base64url route URL with per-zone notes + wants (legacy fallback)"
```

---

## Task 6: Store — views, build notes/attributes, route objects

**Files:** Modify `src/state/store.jsx`, `src/state/store-build.test.js`, `src/state/store.test.js`

- [ ] **Step 1: Update the tests.** Replace `src/state/store.test.js`'s route assertions and `store-build.test.js` build assertions. First, append a new `src/state/store-phase4.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

describe('reducer — phase 4', () => {
  it('view defaults to atlas and build has notes + attributes', () => {
    expect(initialState.view).toBe('atlas');
    expect(initialState.build.notes).toBe('');
    expect(initialState.build.attributes).toEqual({ str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 });
  });
  it('setView accepts build and gear', () => {
    expect(reducer(initialState, { type: 'setView', view: 'gear' }).view).toBe('gear');
  });
  it('setBuildNotes + setAttribute', () => {
    let s = reducer(initialState, { type: 'selectClass', slug: 'acolyte' });
    s = reducer(s, { type: 'setBuildNotes', notes: 'hi' });
    expect(s.build.notes).toBe('hi');
    s = reducer(s, { type: 'setAttribute', key: 'str', value: 5 });
    expect(s.build.attributes.str).toBe(5);
  });
  it('addToRoute stores objects and appends a deduped want', () => {
    let s = reducer(initialState, { type: 'addToRoute', id: 'swamp', want: 'abyss-shard' });
    s = reducer(s, { type: 'addToRoute', id: 'swamp', want: 'abyss-shard' });
    s = reducer(s, { type: 'addToRoute', id: 'swamp', want: 'axe' });
    expect(s.route).toEqual([{ id: 'swamp', notes: '', wants: ['abyss-shard', 'axe'] }]);
  });
  it('setZoneNotes / addZoneWant / removeZoneWant', () => {
    let s = reducer(initialState, { type: 'addToRoute', id: 'swamp' });
    s = reducer(s, { type: 'setZoneNotes', id: 'swamp', notes: 'farm' });
    s = reducer(s, { type: 'addZoneWant', id: 'swamp', itemSlug: 'axe' });
    s = reducer(s, { type: 'removeZoneWant', id: 'swamp', itemSlug: 'axe' });
    expect(s.route[0]).toEqual({ id: 'swamp', notes: 'farm', wants: [] });
  });
  it('removeFromRoute + moveInRoute by id/index on objects', () => {
    let s = reducer({ ...initialState, route: [{ id: 'a', notes: '', wants: [] }, { id: 'b', notes: '', wants: [] }] }, { type: 'moveInRoute', index: 0, dir: 1 });
    expect(s.route.map((e) => e.id)).toEqual(['b', 'a']);
    s = reducer(s, { type: 'removeFromRoute', id: 'a' });
    expect(s.route.map((e) => e.id)).toEqual(['b']);
  });
});
```
Also in `src/state/store.test.js`, the Phase 1 route tests use string ids; update them: any assertion like `route: ['a','b']` becomes objects, and `addToRoute`/`removeFromRoute`/`moveInRoute` expectations use `{id,notes:'',wants:[]}`. (Rewrite those specific Phase 1 route test cases to object form; keep level/filter/select tests unchanged.) In `store-build.test.js`, update the `selectClass`/`resetBuild` expected `build` objects to include `notes: ''` and `attributes: {str:1,agi:1,vit:1,int:1,dex:1,luk:1}`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/state/store-phase4.test.js`
Expected: FAIL.

- [ ] **Step 3: Update `src/state/store.jsx`.**

(a) `initialState`: `view: 'atlas'` (unchanged enum value), `build` gains `notes: ''` and `attributes`; `route: []` now holds objects. Replace `initialState`:
```js
export const initialState = {
  playerLevel: 1,
  dropFilter: 'all',
  selectedZoneId: null,
  route: [],
  view: 'atlas',
  build: { baseClass: null, advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } },
  selectedSkillId: null,
  selectedStage: 0,
  selectedItemSlug: null,
  openSlot: null,
};
```

(b) Replace the route cases (`addToRoute`, `removeFromRoute`, `moveInRoute`) and `selectClass`/`resetBuild`, and add the new cases. The route is now objects:
```js
    case 'addToRoute': {
      const idx = state.route.findIndex((e) => e.id === action.id);
      let route;
      if (idx === -1) route = [...state.route, { id: action.id, notes: '', wants: action.want ? [action.want] : [] }];
      else if (action.want && !state.route[idx].wants.includes(action.want)) {
        route = state.route.map((e, i) => (i === idx ? { ...e, wants: [...e.wants, action.want] } : e));
      } else route = state.route;
      return { ...state, route };
    }
    case 'removeFromRoute':
      return { ...state, route: state.route.filter((e) => e.id !== action.id) };
    case 'moveInRoute': {
      const r = [...state.route];
      const j = action.index + action.dir;
      if (j < 0 || j >= r.length) return state;
      [r[action.index], r[j]] = [r[j], r[action.index]];
      return { ...state, route: r };
    }
    case 'setZoneNotes':
      return { ...state, route: state.route.map((e) => (e.id === action.id ? { ...e, notes: action.notes } : e)) };
    case 'addZoneWant':
      return { ...state, route: state.route.map((e) => (e.id === action.id && !e.wants.includes(action.itemSlug) ? { ...e, wants: [...e.wants, action.itemSlug] } : e)) };
    case 'removeZoneWant':
      return { ...state, route: state.route.map((e) => (e.id === action.id ? { ...e, wants: e.wants.filter((w) => w !== action.itemSlug) } : e)) };
    case 'setBuildNotes':
      return { ...state, build: { ...state.build, notes: action.notes } };
    case 'setAttribute':
      return { ...state, build: { ...state.build, attributes: { ...state.build.attributes, [action.key]: Math.max(1, action.value) } } };
    case 'selectClass':
      return { ...state, build: { baseClass: action.slug, advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } }, selectedSkillId: null, selectedStage: 0, selectedItemSlug: null };
    case 'resetBuild':
      return { ...state, build: { ...state.build, advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } }, selectedSkillId: null, selectedStage: 0, selectedItemSlug: null };
```
Keep every other existing case (setView, selectAdvanced, setSkillLevel, gear stage cases, selectSkill/selectItem/selectItemSlot/selectStage, hydrate, setLevel/setFilter/select) unchanged.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/state/store-phase4.test.js src/state/store.test.js src/state/store-build.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.jsx src/state/store-phase4.test.js src/state/store.test.js src/state/store-build.test.js
git commit -m "feat: store views, build notes/attributes, object route entries"
```

---

## Task 7: Sync — base64 build/route + view persistence

**Files:** Modify `src/state/sync.js`

- [ ] **Step 1: Update `src/state/sync.js`.** Replace its imports and the `loadInitialState`/`usePersist` bodies. The route is now objects; build/route use base64; persist per active view.
```js
import { useEffect } from 'react';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';
import { encodeRoute, decodeRoute, sanitizeRoute } from './route-url.js';

const LS_KEY = 'sva.state.v2';

export function loadInitialState() {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('view');
  const view = v === 'build' || v === 'gear' ? v : 'atlas';
  const lvl = parseInt(params.get('lvl'), 10);
  let route = sanitizeRoute(decodeRoute(params.get('route') || ''));
  let playerLevel = Number.isFinite(lvl) ? lvl : 1;
  if (!params.get('route') && !params.get('lvl') && localStorage.getItem(LS_KEY)) {
    try {
      const ls = JSON.parse(localStorage.getItem(LS_KEY));
      route = sanitizeRoute(ls.route || []);
      playerLevel = ls.playerLevel ?? 1;
    } catch { /* ignore */ }
  }
  const build = sanitizeBuild(decodeBuild(params.get('build')));
  return { view, playerLevel, route, ...(build ? { build } : {}) };
}

export function usePersist(state) {
  useEffect(() => {
    const path = window.location.pathname;
    if (state.view === 'build' || state.view === 'gear') {
      const b = encodeBuild(state.build);
      window.history.replaceState(null, '', `${path}?view=${state.view}${b ? `&build=${b}` : ''}`);
    } else {
      const p = new URLSearchParams();
      if (state.playerLevel) p.set('lvl', String(state.playerLevel));
      const r = encodeRoute(state.route);
      if (r) p.set('route', r);
      const qs = p.toString();
      window.history.replaceState(null, '', `${path}${qs ? `?${qs}` : ''}`);
    }
    localStorage.setItem(LS_KEY, JSON.stringify({ playerLevel: state.playerLevel, route: state.route }));
  }, [state.view, state.playerLevel, state.route, state.build]);
}
```
(This removes the dependency on `./url.js` and `keepKnownTileIds`; `route-url`'s sanitize replaces them.)

- [ ] **Step 2: Run the suite**

Run: `npm test`
Expected: all PASS (App/RouteRail/MapView tests may fail here if they assume string-id routes — those are fixed in Tasks 8–10; if they fail, proceed and they'll be green after Task 10, but the sync/url/store/logic tests must pass now). Re-run after Task 10 for the full green.

- [ ] **Step 3: Commit**

```bash
git add src/state/sync.js
git commit -m "feat: sync base64 build/route + 3-view persistence"
```

---

## Task 8: TopBar 3-way toggle + App renders 3 views

**Files:** Modify `src/components/TopBar.jsx`, `src/App.jsx`; Create `src/components/BuildTab.jsx`, `src/components/GearTab.jsx`, `src/components/BuildNotes.jsx`; Modify/remove `src/components/BuildView.jsx`; Test `src/App.test.jsx`

- [ ] **Step 1: Update `src/App.test.jsx`** view-switch tests to the new tabs:
```jsx
describe('App — tabs', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/'); localStorage.clear(); });
  it('switches to Build then Gear', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^build$/i }));
    expect(screen.getByText(/pick a class/i)).toBeInTheDocument();
    expect(window.location.search).toMatch(/view=build/);
    fireEvent.click(screen.getByRole('button', { name: /^gear$/i }));
    expect(window.location.search).toMatch(/view=gear/);
  });
});
```
(Replace the Phase 2 "toggles to the Builds view" test with this. Keep the three-pane atlas render test, but its button query `/builds/i` becomes `/build/i`.)

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/App.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Write/replace components.**

`src/components/BuildNotes.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
export default function BuildNotes() {
  const { state, dispatch } = useStore();
  return (
    <div className="build-notes">
      <div className="label">BUILD NOTES</div>
      <textarea className="build-notes-area" value={state.build.notes} placeholder="Build order, alternative gear, strategy…"
        onChange={(e) => dispatch({ type: 'setBuildNotes', notes: e.target.value })} />
    </div>
  );
}
```

`src/components/BuildTab.jsx` (skills + notes; was the build half of BuildView):
```jsx
import { useStore } from '../state/store.jsx';
import ClassPicker from './ClassPicker.jsx';
import SkillTree from './SkillTree.jsx';
import SkillDetail from './SkillDetail.jsx';
import BuildNotes from './BuildNotes.jsx';

export default function BuildTab() {
  const { state } = useStore();
  const { baseClass, advancedClass } = state.build;
  return (
    <div className="build-view">
      <ClassPicker />
      {!baseClass ? (
        <p className="muted build-empty">Pick a class to start allocating skills.</p>
      ) : (
        <div className="build-body">
          <div className="trees">
            <SkillTree classSlug={baseClass} tree="base" />
            {advancedClass && <SkillTree classSlug={advancedClass} tree="advanced" />}
          </div>
          <div className="build-side">
            <SkillDetail skillId={state.selectedSkillId} />
            <BuildNotes />
          </div>
        </div>
      )}
    </div>
  );
}
```

`src/components/GearTab.jsx` (gear progression + stat sheet):
```jsx
import { useStore } from '../state/store.jsx';
import GearProgression from './GearProgression.jsx';
import StatSheet from './StatSheet.jsx';

export default function GearTab() {
  const { state } = useStore();
  if (!state.build.baseClass) return <p className="muted build-empty">Pick a class on the Build tab first.</p>;
  return (
    <div className="gear-view">
      <GearProgression />
      <StatSheet />
    </div>
  );
}
```

`src/components/TopBar.jsx` — replace the `view-toggle` nav with 3 buttons and gate atlas-only controls on `view==='atlas'`:
```jsx
import { useStore } from '../state/store.jsx';
import { gameVersion } from '../data/zones-index.js';

const FILTERS = ['all', 'equip', 'material', 'card', 'gem', 'consumable', 'artifact'];

export default function TopBar() {
  const { state, dispatch } = useStore();
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); } catch { /* clipboard unavailable */ } };
  const tab = (v, label) => (
    <button className={state.view === v ? 'on' : ''} onClick={() => dispatch({ type: 'setView', view: v })}>{label}</button>
  );
  return (
    <header className="top-bar">
      <span className="brand">⚔️ Spirit Vale Atlas</span>
      <nav className="view-toggle">{tab('atlas', '／Atlas')}{tab('build', 'Build')}{tab('gear', '⚒ Gear')}</nav>
      <span className="spacer" />
      {state.view === 'atlas' ? (
        <>
          <label className="field">Level
            <input type="number" min="1" max="135" value={state.playerLevel}
              onChange={(e) => dispatch({ type: 'setLevel', level: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
          </label>
          <label className="field">Filter
            <select value={state.dropFilter} onChange={(e) => dispatch({ type: 'setFilter', filter: e.target.value })}>
              {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <button onClick={share}>🔗 Share route</button>
        </>
      ) : (
        <>
          <button onClick={share}>🔗 Share build</button>
          <button onClick={() => dispatch({ type: 'resetBuild' })}>Reset</button>
        </>
      )}
      <span className="game-version" title="Game data version">v{gameVersion}</span>
    </header>
  );
}
```

`src/App.jsx` — import the tabs and render by view (replace the BuildView import + the Shell JSX branch):
```jsx
import BuildTab from './components/BuildTab.jsx';
import GearTab from './components/GearTab.jsx';
```
In `Shell`'s return, replace the `state.view === 'builds' ? <BuildView/> : (...atlas...)` with:
```jsx
      {state.view === 'build' ? (
        <BuildTab />
      ) : state.view === 'gear' ? (
        <GearTab />
      ) : (
        <>
          <div className="main"><MapView /><RouteRail /></div>
          <ZoneDrawer />
        </>
      )}
```
Delete `src/components/BuildView.jsx` (replaced by BuildTab/GearTab) and remove its import. NOTE: Task 9 creates `StatSheet.jsx` which `GearTab` imports — until then GearTab won't compile, so create a stub `src/components/StatSheet.jsx` now: `export default function StatSheet() { return null; }` (replaced in Task 9). Also delete `src/components/BuildView.test.jsx` (BuildView is gone; coverage moves to BuildTab — add a quick `BuildTab.test.jsx` mirroring the old BuildView tests but with the heading checks).

`src/components/BuildTab.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuildTab from './BuildTab.jsx';
import { StoreProvider } from '../state/store.jsx';

describe('BuildTab', () => {
  it('prompts to pick a class', () => {
    render(<StoreProvider init={{ view: 'build' }}><BuildTab /></StoreProvider>);
    expect(screen.getByText(/pick a class/i)).toBeInTheDocument();
  });
  it('renders the base tree + build notes after a class is picked', () => {
    render(<StoreProvider init={{ view: 'build', build: { baseClass: 'acolyte', advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } } }}><BuildTab /></StoreProvider>);
    expect(screen.getByText(/BASE CLASS · Acolyte/i)).toBeInTheDocument();
    expect(screen.getByText(/build notes/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/App.test.jsx src/components/BuildTab.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.jsx src/App.jsx src/components/BuildTab.jsx src/components/GearTab.jsx src/components/BuildNotes.jsx src/components/StatSheet.jsx src/components/BuildTab.test.jsx
git rm src/components/BuildView.jsx src/components/BuildView.test.jsx
git commit -m "feat: Atlas/Build/Gear tabs + build notes; split BuildView"
```

---

## Task 9: StatSheet (gear stats + attributes)

**Files:** Replace `src/components/StatSheet.jsx` (stub from Task 8), Test `src/components/StatSheet.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/StatSheet.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatSheet from './StatSheet.jsx';
import { StoreProvider } from '../state/store.jsx';
import { items } from '../data/gear-index.js';

const weaponWithAtk = Object.values(items).find((i) => i.slot === 'weapon' && i.parsedStats.some((s) => s.label === 'Atk' && !s.raw));

describe('StatSheet', () => {
  it('shows summed gear stats for the active stage and an attribute allocator', () => {
    render(
      <StoreProvider init={{ view: 'gear', selectedStage: 0, build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [{ fromLevel: 1, changes: { weapon: weaponWithAtk.slug } }], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } } }}>
        <StatSheet />
      </StoreProvider>,
    );
    expect(screen.getByText(/total stats/i)).toBeInTheDocument();
    expect(screen.getByText('Atk')).toBeInTheDocument();
    expect(screen.getByText(/attributes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /increase str/i }));
    expect(screen.getByTestId('attr-str').textContent).toMatch(/2/);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/components/StatSheet.test.jsx`
Expected: FAIL (stub returns null).

- [ ] **Step 3: Write `src/components/StatSheet.jsx`**:
```jsx
import { useStore } from '../state/store.jsx';
import { items } from '../data/gear-index.js';
import { effectiveLoadout, sortStages } from '../logic/gear.js';
import { sumLoadoutStats } from '../logic/stats.js';

const ATTRS = [['str', '💪 STR'], ['agi', '⚡ AGI'], ['vit', '❤️ VIT'], ['int', '🧠 INT'], ['dex', '🎯 DEX'], ['luk', '🍀 LUK']];

export default function StatSheet() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages;
  const loadout = stages.length ? effectiveLoadout(sortStages(stages), Math.min(state.selectedStage, stages.length - 1)) : {};
  const totals = sumLoadoutStats(loadout, items).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="stat-sheet">
      <div className="label">TOTAL STATS (from gear)</div>
      {totals.length === 0 ? (
        <p className="muted">Equip gear to see totals.</p>
      ) : (
        <ul className="stat-totals">
          {totals.map((s) => (
            <li key={s.label}><span>{s.label}</span><b>+{s.value}{s.percent ? '%' : ''}</b></li>
          ))}
        </ul>
      )}
      <div className="label" style={{ marginTop: 10 }}>ATTRIBUTES</div>
      <div className="attrs">
        {ATTRS.map(([key, label]) => (
          <div key={key} className="attr">
            <span>{label}</span>
            <button aria-label={`decrease ${key}`} onClick={() => dispatch({ type: 'setAttribute', key, value: state.build.attributes[key] - 1 })}>−</button>
            <b data-testid={`attr-${key}`}>{state.build.attributes[key]}</b>
            <button aria-label={`increase ${key}`} onClick={() => dispatch({ type: 'setAttribute', key, value: state.build.attributes[key] + 1 })}>+</button>
          </div>
        ))}
      </div>
      <p className="muted stat-note">Base gear totals only — no refine/attribute/skill scaling (formulas aren’t in the game data).</p>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/components/StatSheet.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatSheet.jsx src/components/StatSheet.test.jsx
git commit -m "feat: StatSheet — summed gear stats + attribute allocator"
```

---

## Task 10: ItemTooltip + RouteRail/ZoneDrawer/ItemDetail/MapView/GearStageRail

**Files:** Create `src/components/ItemTooltip.jsx`; Modify `src/components/RouteRail.jsx`, `src/components/ZoneDrawer.jsx`, `src/components/ItemDetail.jsx`, `src/components/MapView.jsx`, `src/components/GearStageRail.jsx`; Tests `src/components/ItemTooltip.test.jsx`, `src/components/RouteRail.test.jsx`

- [ ] **Step 1: Write failing tests.**

`src/components/ItemTooltip.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemTooltip from './ItemTooltip.jsx';
import { items } from '../data/gear-index.js';

const it1 = Object.values(items).find((i) => i.sources.length > 0);

describe('ItemTooltip', () => {
  it('renders item name, card slots, a drop line', () => {
    render(<ItemTooltip item={it1} />);
    expect(screen.getByText(new RegExp(it1.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    expect(screen.getByText(/card slot/i)).toBeInTheDocument();
    expect(screen.getByText(/drops:/i)).toBeInTheDocument();
  });
});
```

Replace `src/components/RouteRail.test.jsx` (route entries are objects now):
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteRail from './RouteRail.jsx';
import { StoreProvider } from '../state/store.jsx';

describe('RouteRail', () => {
  it('shows an empty hint with no route', () => {
    render(<StoreProvider><RouteRail /></StoreProvider>);
    expect(screen.getByText(/no zones yet/i)).toBeInTheDocument();
  });
  it('expands a zone to show notes + wants', () => {
    render(<StoreProvider init={{ route: [{ id: 'swamp', notes: 'farm', wants: ['abyss-shard'] }] }}><RouteRail /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /expand swamp|Swamp/i }));
    expect(screen.getByDisplayValue('farm')).toBeInTheDocument();
    expect(screen.getByText(/Abyss Shard/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/components/ItemTooltip.test.jsx src/components/RouteRail.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Write/modify components.**

`src/components/ItemTooltip.jsx`:
```jsx
export default function ItemTooltip({ item }) {
  if (!item) return null;
  const src = item.sources && item.sources[0];
  return (
    <div className="item-tip">
      <b>{item.name}</b> <span className="muted">{item.type} · {item.cardSlots} card slot{item.cardSlots === 1 ? '' : 's'}</span>
      {(item.statsPrimary || []).map((s, i) => <div key={`p${i}`} className="tip-stat">{s}</div>)}
      {(item.statsSecondary || []).slice(0, 4).map((s, i) => <div key={`s${i}`} className="tip-stat muted">{s}</div>)}
      {item.setBonus && item.setBonus.length > 0 && <div className="tip-set">Set: {item.setBonus.join(' · ')}</div>}
      {src && <div className="tip-drop">Drops: {src.monster}{src.isBoss ? ' (boss)' : ''} · {src.zoneName} · {src.chance}%</div>}
      {item.craft && (
        <div className="tip-craft">Craft @ {item.craft.zoneName}{item.craft.materials.length ? `: ${item.craft.materials.map((m) => `${m.name} ×${m.count}`).join(', ')}` : ''}</div>
      )}
    </div>
  );
}
```

`src/components/RouteRail.jsx` — rewrite to objects + expand + notes + wants + tooltips:
```jsx
import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { tileById } from '../data/map-tiles.js';
import { items as gearItems } from '../data/gear-index.js';
import { classifyLevel, computeGaps } from '../logic/levels.js';
import ItemTooltip from './ItemTooltip.jsx';

export default function RouteRail() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(null);
  const entries = state.route.map((e) => ({ ...e, tile: tileById[e.id] })).filter((e) => e.tile);
  const gaps = computeGaps(entries.map((e) => ({ minLevel: e.tile.minLevel, maxLevel: e.tile.maxLevel })));
  const min = entries.length ? Math.min(...entries.map((e) => e.tile.minLevel)) : null;
  const max = entries.length ? Math.max(...entries.map((e) => e.tile.maxLevel)) : null;

  return (
    <aside className="route-rail">
      <h2>Levelling route</h2>
      {entries.length === 0 ? (
        <p className="muted">No zones yet — click a zone and "Add to route".</p>
      ) : (
        <>
          <ol>
            {entries.map((e, i) => (
              <li key={e.id} className={`route-item lvl-${classifyLevel(e.tile.minLevel, e.tile.maxLevel, state.playerLevel)}`}>
                <div className="route-head">
                  <span className="route-pos">{i + 1}</span>
                  <button className="link" aria-label={`expand ${e.tile.name}`} onClick={() => setOpen(open === e.id ? null : e.id)}>
                    {e.tile.name} <span className="muted">Lv {e.tile.minLevel}–{e.tile.maxLevel}</span>{e.wants.length ? <span className="want-count"> ·{e.wants.length}</span> : ''}
                  </button>
                  <span className="route-actions">
                    <button aria-label={`move ${e.tile.name} up`} disabled={i === 0} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: -1 })}>↑</button>
                    <button aria-label={`move ${e.tile.name} down`} disabled={i === entries.length - 1} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: 1 })}>↓</button>
                    <button aria-label={`remove ${e.tile.name}`} onClick={() => dispatch({ type: 'removeFromRoute', id: e.id })}>✕</button>
                  </span>
                </div>
                {open === e.id && (
                  <div className="route-expand">
                    <div className="label">WANT HERE</div>
                    <div className="wants">
                      {e.wants.map((w) => {
                        const it = gearItems[w];
                        return (
                          <span key={w} className="want-chip">
                            {it ? it.name : w}
                            <span className="tip-host"><ItemTooltip item={it} /></span>
                            <button aria-label={`remove want ${w}`} onClick={() => dispatch({ type: 'removeZoneWant', id: e.id, itemSlug: w })}>✕</button>
                          </span>
                        );
                      })}
                      {e.wants.length === 0 && <span className="muted">none yet</span>}
                    </div>
                    <div className="label">NOTES</div>
                    <textarea className="zone-notes" value={e.notes} placeholder="e.g. farm to 40, grab 2 daggers"
                      onChange={(ev) => dispatch({ type: 'setZoneNotes', id: e.id, notes: ev.target.value })} />
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="route-summary">
            <span>Covers Lv {min}–{max} · {entries.length} zones</span>
            {gaps.length > 0 && <span className="gaps">Gaps: {gaps.map((g) => (g.from === g.to ? g.from : `${g.from}–${g.to}`)).join(', ')}</span>}
          </div>
        </>
      )}
    </aside>
  );
}
```

`src/components/MapView.jsx` — route is objects: change `route.includes(id)` and `route.map(center)`. Replace the two route usages:
```jsx
  const routeIds = route.map((e) => e.id);
  const routePoints = routeIds.map(center).filter(Boolean);
```
and in the hotspot map `const inRoute = routeIds.includes(id);` (replace `route.includes(id)`).

`src/components/ItemDetail.jsx` — (a) label cardSlots; (b) farm button passes the want. Change the header `sockets` text to `${item.cardSlots} card slots`, and the `addZones` to pass the want:
```jsx
  const addZones = () => tiles.forEach((id) => dispatch({ type: 'addToRoute', id, want: item.slug }));
```
and in the `<h3>`: `{item.cardSlots ? ` · ${item.cardSlots} card slots` : ''}` (replace the `sockets` reference).

`src/components/ZoneDrawer.jsx` — add a tooltip on equip drops. Import `gearByName` and `ItemTooltip`; wrap each drop `<li>` that is `type==='equip'` with a hover host:
```jsx
import { gearByName } from '../data/gear-index.js';
import ItemTooltip from './ItemTooltip.jsx';
```
In the drops `<li>` render, after the existing chip content add (inside the `<li>`):
```jsx
                    {d.type === 'equip' && gearByName[d.name] && (
                      <span className="tip-host"><ItemTooltip item={gearByName[d.name]} /></span>
                    )}
```
and add `tip-anchor` to the `<li>` className so the tooltip positions relative to it: `className={`drop drop-${d.type} tip-anchor`}`.

`src/components/GearStageRail.jsx` — replace the `window.prompt` add-flow with an inline number input. Replace the file:
```jsx
import { useState } from 'react';
import { useStore } from '../state/store.jsx';

export default function GearStageRail() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages ?? [];
  const [adding, setAdding] = useState(false);
  const [lvl, setLvl] = useState('');

  const labelFor = (i) => {
    const from = stages[i].fromLevel;
    const to = i + 1 < stages.length ? stages[i + 1].fromLevel - 1 : 135;
    return `Lv ${from}–${to}`;
  };
  const submit = () => {
    const n = parseInt(lvl, 10);
    if (Number.isFinite(n)) dispatch({ type: 'addGearStage', fromLevel: Math.min(135, Math.max(1, n)) });
    setAdding(false); setLvl('');
  };
  const defaultLvl = stages.length ? Math.min(135, Math.max(...stages.map((s) => s.fromLevel)) + 10) : 1;

  return (
    <div className="stage-rail">
      <div className="label">GEAR STAGES</div>
      <div className="stage-chips">
        {stages.map((s, i) => (
          <div key={i} className={`stage-chip${i === state.selectedStage ? ' on' : ''}`} onClick={() => dispatch({ type: 'selectStage', index: i })}>
            <span>{labelFor(i)}</span>
            <button aria-label={`remove stage ${labelFor(i)}`} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'removeGearStage', index: i }); }}>✕</button>
          </div>
        ))}
        {adding ? (
          <span className="stage-add-input">
            <input type="number" min="1" max="135" autoFocus value={lvl} placeholder={String(defaultLvl)}
              onChange={(e) => setLvl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false); }} />
            <button onClick={submit}>add at Lv {lvl || defaultLvl}</button>
          </span>
        ) : (
          <button className="stage-add" onClick={() => { setLvl(''); setAdding(true); }}>＋ Add stage</button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/ItemTooltip.test.jsx src/components/RouteRail.test.jsx`
Expected: PASS.
Run: `npm test`
Expected: ALL test files PASS (App, MapView, ZoneDrawer, ItemDetail, etc.).

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemTooltip.jsx src/components/RouteRail.jsx src/components/RouteRail.test.jsx src/components/ItemTooltip.test.jsx src/components/MapView.jsx src/components/ItemDetail.jsx src/components/ZoneDrawer.jsx src/components/GearStageRail.jsx
git commit -m "feat: item tooltip, expandable route zones, cardSlots label, inline stage add"
```

---

## Task 11: Styling + verify

**Files:** Modify `src/styles/app.css`

- [ ] **Step 1: Append styles** to `src/styles/app.css`:
```css
/* Build side column + notes */
.build-side { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.build-notes .label { color: #9bf; margin-bottom: 4px; }
.build-notes-area { width: 100%; min-height: 90px; resize: vertical; background: #0e1422; color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 8px; font: inherit; }

/* Stat sheet */
.gear-view { display: block; }
.stat-sheet { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px; margin-top: 14px; max-width: 360px; }
.stat-sheet .label { color: #9bf; }
.stat-totals { list-style: none; margin: 4px 0; padding: 0; font-size: 12px; }
.stat-totals li { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #1a2236; }
.stat-totals b { color: var(--on); }
.attrs { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; }
.attr { display: flex; align-items: center; gap: 4px; }
.attr button { background: #23304a; color: #fff; border: 0; border-radius: 3px; width: 18px; height: 18px; cursor: pointer; }
.stat-note { font-size: 10px; margin-top: 8px; }

/* Tooltip (hover host) */
.tip-host { display: none; position: absolute; top: 100%; left: 0; z-index: 20; }
.tip-anchor, .want-chip, .route-item .link { position: relative; }
.want-chip:hover > .tip-host, .tip-anchor:hover > .tip-host { display: block; }
.item-tip { width: 240px; background: #0e1422; border: 1px solid var(--on); border-radius: 8px; padding: 8px; font-size: 11px; box-shadow: 0 6px 18px #000a; text-align: left; }
.item-tip b { color: #fff; }
.tip-stat { color: #9f9; }
.tip-stat.muted { color: var(--muted); }
.tip-set { color: var(--hub); margin-top: 3px; }
.tip-drop { color: #8fa; margin-top: 3px; }
.tip-craft { color: #cdb; margin-top: 2px; }

/* Route zone expand */
.route-head { display: flex; align-items: center; gap: 6px; }
.route-expand { margin-top: 6px; padding-left: 10px; }
.route-expand .label { color: #9bf; margin: 4px 0 2px; }
.wants { display: flex; gap: 5px; flex-wrap: wrap; }
.want-chip { background: #16241c; border: 1px solid #7CFC9B; border-radius: 10px; padding: 2px 8px; font-size: 11px; }
.want-chip button { background: none; border: 0; color: var(--muted); cursor: pointer; margin-left: 4px; }
.want-count { color: var(--route); }
.zone-notes { width: 100%; min-height: 40px; resize: vertical; background: #0e1422; color: var(--text); border: 1px solid var(--line); border-radius: 5px; padding: 5px; margin-top: 2px; font: inherit; }

/* Inline stage add */
.stage-add-input { display: inline-flex; gap: 4px; align-items: center; }
.stage-add-input input { width: 56px; background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 4px 6px; }
.stage-add-input button { background: var(--on); color: #123; border: 0; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 11px; }
```

- [ ] **Step 2: Visual check + build**

Run: `npm run dev` — verify: 3 tabs switch; Build tab shows resizeable notes below skill detail; Gear tab shows stat sheet summing the active stage + attribute steppers; adding a stage uses the inline input and chips read `Lv 1–9`/`Lv 10–135`; the gear "add to route" records the item as a want; in Atlas, a route zone expands to notes + wants; hovering a want or an equip drop shows the stats/drop/craft tooltip; share link round-trips.
Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "style: phase 4 — notes, stat sheet, tooltips, route expand"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** tabs (T8), build notes (T8 BuildNotes + T6 store + T4 url), stat sheet + attributes (T9, T3, T6), stage rework (T10 GearStageRail), annotated route objects + notes + wants (T5, T6, T10 RouteRail, T10 ItemDetail farm-want), item tooltip incl. card slots/drop mob/craft materials (T1 data, T10 ItemTooltip, ZoneDrawer/RouteRail hosts), base64 URLs + legacy fallback (T4, T5, T7), `sockets`→`cardSlots` (T1, T10 ItemDetail/tooltip). Damage sim intentionally absent.
- **Cross-task churn:** the `build` model (notes/attributes) and `route` (objects) changes force test rewrites in `build-url.test.js` (T4), `store*.test.js` (T6), `App.test.jsx`/`RouteRail.test.jsx` (T8/T10) and the BuildView→BuildTab move (T8). Each is handled in-task.
- **Order dependency:** T8 creates a `StatSheet` stub so `GearTab` compiles; T9 replaces it. Run `npm test` green only after T10 (MapView/ZoneDrawer/ItemDetail consume the object route + cardSlots).
- **Naming consistency:** actions `setBuildNotes/setAttribute/setZoneNotes/addZoneWant/removeZoneWant`, `addToRoute{id,want}`; data `cardSlots/parsedStats/craft.materials/gearByName`; logic `sumLoadoutStats`; url `encodeRoute/decodeRoute/sanitizeRoute` + base64 build — used identically across tasks.
- **No `dangerouslySetInnerHTML`** (stats are pre-stripped text). **No damage formulas fabricated.**
```
