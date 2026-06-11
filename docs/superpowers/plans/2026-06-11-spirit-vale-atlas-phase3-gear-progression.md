# Spirit Vale Atlas — Phase 3 Implementation Plan (Gear Progression)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a delta-based gear progression to a build — user-defined loadout stages by level, each a 10-slot loadout that inherits unchanged pieces — with per-stage "what to farm" that adds drop-source zones to the Atlas route.

**Architecture:** A build step turns the vendored `catalog.json` into `src/data/gear.json` (items with plain-text stats + flattened drop sources). Pure logic derives effective loadouts and farm tiles; the Phase 2 store/build-URL are extended with `gearStages`; React components render the gear section inside `BuildView`. Stats are HTML-stripped to text (no `dangerouslySetInnerHTML`).

**Tech Stack:** React 18, Vite 7, Vitest + @testing-library/react. Node ESM scripts. Windows; run from repo root `spirit-vale-map/`.

**Already in place:** `data/raw-builds/catalog.json` (vendored). Phase 1 (`map-tiles.js`, route) + Phase 2 (store `build`, `build-url.js`, `BuildView`, classes data). Branch will be created at execution time.

**Key model:** `build.gearStages = [{ fromLevel, changes: { slotId: itemSlug } }]` sorted ascending. Effective loadout at stage *i* = merge of `changes` of stages 0..i (`null` value = unequip). 10 loadout slots: `weapon, shield, headgear, face, chest, legwear, shoes, accessory1, accessory2, utility`. Any class equips any item.

---

## Task 1: Gear pipeline (pure)

**Files:** Create `scripts/lib/build-gear.mjs`, Test `scripts/lib/build-gear.test.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/lib/build-gear.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { buildGear, SLOTS } from './build-gear.mjs';

const catalog = {
  equipment: [
    {
      slug: 'abyss-shard', name: 'Abyss Shard', equipmentType: 'Dagger', slots: 2,
      statsPrimary: ['Atk: <span style="color: green">+20</span> <span>+2 per refine</span>'],
      statsSecondary: ['Double Attack: <span>+50%</span>'],
      statsFullSet: [],
      description: 'A dagger.',
      drops: [{ monster: { name: 'Dragonfly Arrow', isBoss: 0 }, chance: 3, maps: [{ name: 'Swamp', slug: 'swamp', minLevel: 36, maxLevel: 40 }] }],
      crafting: { map: { Slug: 'swamp', DisplayName: 'Swamp', MonsterMinLevel: 36 }, materials: [] },
    },
    { slug: 'iron-ring', name: 'Iron Ring', equipmentType: 'Accessory', slots: 0, statsPrimary: [], statsSecondary: [], statsFullSet: [], description: '', drops: [], crafting: null },
    { slug: 'mystery', name: 'Mystery', equipmentType: 'Pet', slots: 0, statsPrimary: [], statsSecondary: [], statsFullSet: [], description: '', drops: [], crafting: null },
  ],
};

describe('buildGear', () => {
  const out = buildGear(catalog);
  it('exposes the 10 loadout slots with two accessory slots', () => {
    expect(out.slots).toEqual(SLOTS);
    expect(out.slots).toContain('accessory1');
    expect(out.slots).toContain('accessory2');
  });
  it('maps weapon types to the weapon category and strips stat HTML to text', () => {
    expect(out.items['abyss-shard']).toMatchObject({ slot: 'weapon', type: 'Dagger', sockets: 2 });
    expect(out.items['abyss-shard'].statsPrimary).toEqual(['Atk: +20 +2 per refine']);
  });
  it('flattens drop sources and craft zone', () => {
    expect(out.items['abyss-shard'].sources).toEqual([
      { monster: 'Dragonfly Arrow', isBoss: false, chance: 3, zoneName: 'Swamp', zoneSlug: 'swamp', minLevel: 36, maxLevel: 40 },
    ]);
    expect(out.items['abyss-shard'].craft).toEqual({ zoneSlug: 'swamp', zoneName: 'Swamp' });
  });
  it('classifies accessory and drops unknown equipment types', () => {
    expect(out.items['iron-ring'].slot).toBe('accessory');
    expect(out.items.mystery).toBeUndefined(); // "Pet" is not a gear slot
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/build-gear.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`scripts/lib/build-gear.mjs`:
```js
export const SLOTS = ['weapon', 'shield', 'headgear', 'face', 'chest', 'legwear', 'shoes', 'accessory1', 'accessory2', 'utility'];

const WEAPON_TYPES = new Set(['Dagger', 'Sword', 'Staff', 'Axe', 'Mace', 'Spear', 'Ranged', 'Book', 'Scythe', 'Pistol', 'Rifle', 'Shotgun', 'Twinblade', 'Gatling', 'Launcher', 'Katar']);
const TYPE_TO_CAT = { Shield: 'shield', Headgear: 'headgear', Face: 'face', Chest: 'chest', Legwear: 'legwear', Shoes: 'shoes', Accessory: 'accessory', Utility: 'utility' };

function categoryOf(type) {
  if (WEAPON_TYPES.has(type)) return 'weapon';
  return TYPE_TO_CAT[type] || null;
}

function stripHtml(arr) {
  return (arr || []).map((s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function flattenSources(drops) {
  const rows = [];
  for (const d of drops || []) {
    for (const m of d.maps || []) {
      rows.push({
        monster: d.monster?.name, isBoss: !!d.monster?.isBoss, chance: d.chance,
        zoneName: m.name, zoneSlug: m.slug, minLevel: m.minLevel, maxLevel: m.maxLevel,
      });
    }
  }
  return rows;
}

function craftOf(crafting) {
  const m = crafting && crafting.map;
  if (!m) return null;
  return { zoneSlug: m.Slug || m.slug, zoneName: m.DisplayName || m.GameId || m.name };
}

export function buildGear(catalog) {
  const items = {};
  for (const e of catalog.equipment) {
    const slot = categoryOf(e.equipmentType);
    if (!slot) continue;
    items[e.slug] = {
      slug: e.slug, name: e.name, type: e.equipmentType, slot, sockets: e.slots || 0,
      statsPrimary: stripHtml(e.statsPrimary), statsSecondary: stripHtml(e.statsSecondary), setBonus: stripHtml(e.statsFullSet),
      description: e.description || '', sources: flattenSources(e.drops), craft: craftOf(e.crafting),
    };
  }
  return { slots: SLOTS, items };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/build-gear.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/build-gear.mjs scripts/lib/build-gear.test.mjs
git commit -m "feat: gear pipeline (items + sources from catalog)"
```

---

## Task 2: Gear CLI + npm wiring → `gear.json`

**Files:** Create `scripts/build-gear.mjs`, `src/data/gear.json` (generated); Modify `package.json`

- [ ] **Step 1: Write the CLI**

`scripts/build-gear.mjs`:
```js
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
```

- [ ] **Step 2: Wire npm scripts** — Modify `package.json`: the `data` and `prebuild` scripts must also run build-gear. Set both to:
```json
    "data": "node scripts/build-data.mjs && node scripts/build-classes.mjs && node scripts/build-gear.mjs",
    "prebuild": "node scripts/build-data.mjs && node scripts/build-classes.mjs && node scripts/build-gear.mjs",
```

- [ ] **Step 3: Generate**

Run: `node scripts/build-gear.mjs`
Expected: prints `Wrote src/data/gear.json — <N> items.` (N around 400+; > 0).

- [ ] **Step 4: Sanity-check**

Run: `node -e "const g=require('./src/data/gear.json'); const a=g.items['abyss-shard']; console.log(a && a.slot, a && a.sources[0] && a.sources[0].zoneName, g.items['abyss-shard'].statsPrimary[0])"`
Expected: prints `weapon Swamp Atk: +20 +2 per refine` (or similar — slot is a category, a real zone name, plain-text stat).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-gear.mjs src/data/gear.json package.json
git commit -m "feat: generate committed src/data/gear.json + npm data wiring"
```

---

## Task 3: Gear index helper

**Files:** Create `src/data/gear-index.js`, Test `src/data/gear-index.test.js`

- [ ] **Step 1: Write the failing test**

`src/data/gear-index.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { items, slots, gearDataFetched } from './gear-index.js';

describe('gear-index', () => {
  it('exposes items, the 10 slots, and a fetched date', () => {
    expect(Object.keys(items).length).toBeGreaterThan(0);
    expect(slots).toHaveLength(10);
    expect(typeof gearDataFetched).toBe('string');
  });
  it('items have a slot category and a name', () => {
    const sample = Object.values(items)[0];
    expect(sample).toHaveProperty('slot');
    expect(sample).toHaveProperty('name');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/gear-index.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/data/gear-index.js`:
```js
import data from './gear.json';

export const items = data.items;
export const slots = data.slots;
export const gearDataFetched = data.fetched;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/gear-index.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/gear-index.js src/data/gear-index.test.js
git commit -m "feat: gear index helper"
```

---

## Task 4: Tile resolver (zone name+level → tile)

**Files:** Modify `src/data/map-tiles.js`, Test `src/data/map-tiles-resolve.test.js`

- [ ] **Step 1: Write the failing test**

`src/data/map-tiles-resolve.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { resolveTile } from './map-tiles.js';

describe('resolveTile', () => {
  it('resolves a zone by name + level to its tile id', () => {
    const t = resolveTile('Swamp', 36);
    expect(t?.id).toBe('swamp');
  });
  it('falls back to name when the level does not match', () => {
    const t = resolveTile('Swamp', 999);
    expect(t?.name).toBe('Swamp');
  });
  it('returns null for an unknown zone', () => {
    expect(resolveTile('Nowhere', 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/map-tiles-resolve.test.js`
Expected: FAIL — `resolveTile` not exported.

- [ ] **Step 3: Add the resolver** — append to `src/data/map-tiles.js` (after the existing `tileById`/`keepKnownTileIds` exports):
```js
const tileByNameLevel = Object.fromEntries(mapTiles.map((t) => [`${t.name}|${t.minLevel}`, t]));
const tileByName = {};
for (const t of mapTiles) if (!(t.name in tileByName)) tileByName[t.name] = t;

// Resolve a catalog drop-zone (name + minLevel) to a map tile. Exact name+level
// first, then name-only (handles version-shifted level bands). null if unknown.
export function resolveTile(zoneName, minLevel) {
  return tileByNameLevel[`${zoneName}|${minLevel}`] || tileByName[zoneName] || null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/map-tiles-resolve.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/map-tiles.js src/data/map-tiles-resolve.test.js
git commit -m "feat: resolveTile (catalog zone -> map tile)"
```

---

## Task 5: Gear derivation logic

**Files:** Create `src/logic/gear.js`, Test `src/logic/gear.test.js`

- [ ] **Step 1: Write the failing test**

`src/logic/gear.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { sortStages, effectiveLoadout, stageChangedSlots, categoryOf, itemsForSlot, stageFarmTiles } from './gear.js';
import { items } from '../data/gear-index.js';

describe('gear logic', () => {
  it('sortStages orders by fromLevel and dedupes', () => {
    const s = sortStages([{ fromLevel: 16, changes: {} }, { fromLevel: 1, changes: {} }, { fromLevel: 16, changes: {} }]);
    expect(s.map((x) => x.fromLevel)).toEqual([1, 16]);
  });
  it('effectiveLoadout merges changes up to the index, carrying earlier pieces', () => {
    const stages = [
      { fromLevel: 1, changes: { weapon: 'a', chest: 'c1' } },
      { fromLevel: 11, changes: { weapon: 'b' } },
    ];
    expect(effectiveLoadout(stages, 0)).toEqual({ weapon: 'a', chest: 'c1' });
    expect(effectiveLoadout(stages, 1)).toEqual({ weapon: 'b', chest: 'c1' }); // chest carried
  });
  it('null change unequips a carried slot', () => {
    const stages = [{ fromLevel: 1, changes: { chest: 'c1' } }, { fromLevel: 11, changes: { chest: null } }];
    expect(effectiveLoadout(stages, 1)).toEqual({});
  });
  it('stageChangedSlots lists only this stage changes', () => {
    expect(stageChangedSlots({ changes: { weapon: 'b' } })).toEqual(['weapon']);
  });
  it('categoryOf strips the accessory slot suffix', () => {
    expect(categoryOf('accessory1')).toBe('accessory');
    expect(categoryOf('weapon')).toBe('weapon');
  });
  it('itemsForSlot returns items of the slot category, sorted', () => {
    const weapons = itemsForSlot('weapon');
    expect(weapons.length).toBeGreaterThan(0);
    expect(weapons.every((i) => i.slot === 'weapon')).toBe(true);
  });
  it('stageFarmTiles resolves changed items source zones to tile ids', () => {
    const weaponWithSource = Object.values(items).find((i) => i.slot === 'weapon' && i.sources.length > 0);
    const stage = { fromLevel: 1, changes: { weapon: weaponWithSource.slug } };
    const tiles = stageFarmTiles(stage);
    expect(Array.isArray(tiles)).toBe(true); // resolved ids (may be empty if a zone has no tile)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/logic/gear.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/logic/gear.js`:
```js
import { items } from '../data/gear-index.js';
import { resolveTile } from '../data/map-tiles.js';

export function sortStages(stages) {
  const seen = new Set();
  const out = [];
  for (const s of [...(stages || [])].sort((a, b) => a.fromLevel - b.fromLevel)) {
    if (seen.has(s.fromLevel)) continue;
    seen.add(s.fromLevel);
    out.push(s);
  }
  return out;
}

// Merge `changes` of stages 0..index (later override; null = unequip).
export function effectiveLoadout(stages, index) {
  const sorted = sortStages(stages);
  const out = {};
  for (let i = 0; i <= index && i < sorted.length; i++) {
    for (const [slot, item] of Object.entries(sorted[i].changes || {})) {
      if (item === null) delete out[slot];
      else out[slot] = item;
    }
  }
  return out;
}

export function stageChangedSlots(stage) {
  return Object.keys(stage?.changes || {});
}

export function categoryOf(slot) {
  return slot.replace(/\d+$/, '');
}

export function itemsForSlot(slot) {
  const cat = categoryOf(slot);
  return Object.values(items).filter((i) => i.slot === cat).sort((a, b) => a.name.localeCompare(b.name));
}

// Tile ids to farm for a stage = resolved source zones of its CHANGED items.
export function stageFarmTiles(stage) {
  const ids = new Set();
  for (const slot of stageChangedSlots(stage)) {
    const itm = items[stage.changes[slot]];
    if (!itm) continue;
    for (const src of itm.sources) {
      const tile = resolveTile(src.zoneName, src.minLevel);
      if (tile) ids.add(tile.id);
    }
  }
  return [...ids];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/logic/gear.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/gear.js src/logic/gear.test.js
git commit -m "feat: gear derivation logic (effective loadout, farm tiles)"
```

---

## Task 6: Build URL — gear segment

**Files:** Modify `src/state/build-url.js`, `src/state/build-url.test.js`

- [ ] **Step 1: Rewrite the test** — replace `src/state/build-url.test.js` entirely (adds gear cases and updates fixtures to include `gearStages`):
```js
import { describe, it, expect } from 'vitest';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';

describe('build url', () => {
  it('round-trips a build without gear (no 4th segment)', () => {
    const b = { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5, faith: 3 }, gearStages: [] };
    expect(encodeBuild(b)).toBe('acolyte~priest~heal:5,faith:3');
    expect(decodeBuild('acolyte~priest~heal:5,faith:3')).toEqual(b);
  });
  it('encodes and decodes gear stages', () => {
    const b = { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [
      { fromLevel: 1, changes: { weapon: 'hunting-knife' } },
      { fromLevel: 16, changes: { weapon: 'bonefang', accessory1: 'iron-ring' } },
    ] };
    const s = encodeBuild(b);
    expect(s).toBe('rogue~~~1:weapon=hunting-knife;16:weapon=bonefang,accessory1=iron-ring');
    expect(decodeBuild(s)).toEqual(b);
  });
  it('returns null for empty', () => {
    expect(decodeBuild('')).toBeNull();
    expect(encodeBuild(null)).toBe('');
  });
  it('sanitize drops unknown class', () => {
    expect(sanitizeBuild({ baseClass: 'not-a-class', advancedClass: null, levels: {}, gearStages: [] })).toBeNull();
  });
  it('sanitize keeps known gear, drops unknown items, sorts stages, clamps levels', () => {
    const b = sanitizeBuild({ baseClass: 'acolyte', advancedClass: null, levels: {}, gearStages: [
      { fromLevel: 200, changes: { weapon: 'abyss-shard', chest: 'not-a-real-item' } },
      { fromLevel: 1, changes: {} },
    ] });
    expect(b.gearStages[0].fromLevel).toBe(1); // sorted
    expect(b.gearStages[1].fromLevel).toBe(135); // clamped from 200
    expect(b.gearStages[1].changes).toEqual({ weapon: 'abyss-shard' }); // unknown item dropped
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/build-url.test.js`
Expected: FAIL (gear not encoded; decode lacks `gearStages`).

- [ ] **Step 3: Rewrite the implementation** — replace `src/state/build-url.js`:
```js
import { classBySlug, skillById } from '../data/classes-index.js';
import { treeOf, requirementsMet } from '../logic/build.js';
import { items as gearItems } from '../data/gear-index.js';
import { sortStages } from '../logic/gear.js';

function encodeGear(stages) {
  return (stages || [])
    .filter((s) => s && Number.isFinite(s.fromLevel))
    .map((s) => {
      const ch = Object.entries(s.changes || {})
        .filter(([, v]) => v)
        .map(([slot, item]) => `${slot}=${item}`)
        .join(',');
      return `${s.fromLevel}:${ch}`;
    })
    .join(';');
}

function decodeGear(str) {
  if (!str) return [];
  return str.split(';').filter(Boolean).map((seg) => {
    const [lvl, chStr] = seg.split(':');
    const changes = {};
    for (const pair of (chStr || '').split(',')) {
      if (!pair) continue;
      const [slot, item] = pair.split('=');
      if (slot && item) changes[slot] = item;
    }
    return { fromLevel: parseInt(lvl, 10), changes };
  });
}

export function encodeBuild(build) {
  if (!build?.baseClass) return '';
  const lv = Object.entries(build.levels || {})
    .filter(([, v]) => v > 0)
    .map(([id, v]) => `${id}:${v}`)
    .join(',');
  const gear = encodeGear(build.gearStages);
  const head = `${build.baseClass}~${build.advancedClass || ''}~${lv}`;
  return gear ? `${head}~${gear}` : head;
}

export function decodeBuild(str) {
  if (!str) return null;
  const [base, adv, lvStr, gearStr] = str.split('~');
  const levels = {};
  for (const part of (lvStr || '').split(',')) {
    if (!part) continue;
    const [id, v] = part.split(':');
    const n = parseInt(v, 10);
    if (id && n > 0) levels[id] = n;
  }
  return { baseClass: base || null, advancedClass: adv || null, levels, gearStages: decodeGear(gearStr) };
}

export function sanitizeBuild(build) {
  if (!build || !classBySlug[build.baseClass]) return null;
  const advancedClass = classBySlug[build.advancedClass] ? build.advancedClass : null;
  const clean = { baseClass: build.baseClass, advancedClass, levels: {}, gearStages: [] };
  for (const [id, lv] of Object.entries(build.levels || {})) {
    const sk = skillById[id];
    if (!sk || !treeOf(id, clean)) continue;
    clean.levels[id] = Math.min(lv, sk.maxLevel);
  }
  for (let i = 0; i < 5; i++) {
    let changed = false;
    for (const id of Object.keys(clean.levels)) {
      if (!requirementsMet(id, clean)) { delete clean.levels[id]; changed = true; }
    }
    if (!changed) break;
  }
  // gear: clamp level 1..135, keep known items, sort + dedupe
  const stages = (build.gearStages || []).map((s) => {
    const changes = {};
    for (const [slot, item] of Object.entries(s.changes || {})) {
      if (gearItems[item]) changes[slot] = item;
    }
    return { fromLevel: Math.min(135, Math.max(1, s.fromLevel || 1)), changes };
  });
  clean.gearStages = sortStages(stages);
  return clean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/build-url.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/build-url.js src/state/build-url.test.js
git commit -m "feat: build URL gear-stage encode/decode/sanitize"
```

---

## Task 7: Store — gear stage state & actions

**Files:** Modify `src/state/store.jsx`, `src/state/store-build.test.js`

- [ ] **Step 1: Update the test** — replace `src/state/store-build.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

const withBase = reducer(initialState, { type: 'selectClass', slug: 'acolyte' });

describe('reducer — build', () => {
  it('defaults view to atlas with an empty build incl. gearStages', () => {
    expect(initialState.view).toBe('atlas');
    expect(initialState.build).toEqual({ baseClass: null, advancedClass: null, levels: {}, gearStages: [] });
  });
  it('selectClass resets the build incl. gearStages', () => {
    const s = reducer({ ...withBase, build: { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 }, gearStages: [{ fromLevel: 1, changes: {} }] } }, { type: 'selectClass', slug: 'mage' });
    expect(s.build).toEqual({ baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [] });
  });
  it('setSkillLevel sets and deletes at 0', () => {
    let s = reducer(withBase, { type: 'setSkillLevel', id: 'heal', level: 3 });
    expect(s.build.levels.heal).toBe(3);
    s = reducer(s, { type: 'setSkillLevel', id: 'heal', level: 0 });
    expect(s.build.levels.heal).toBeUndefined();
  });
  it('addGearStage adds a sorted stage and selects it', () => {
    let s = reducer(withBase, { type: 'addGearStage', fromLevel: 20 });
    s = reducer(s, { type: 'addGearStage', fromLevel: 10 });
    expect(s.build.gearStages.map((x) => x.fromLevel)).toEqual([10, 20]);
    expect(s.selectedStage).toBe(0); // index of the just-added level-10 stage after sort
  });
  it('setGearSlot sets a change; clearGearSlot reverts to carried', () => {
    let s = reducer(withBase, { type: 'addGearStage', fromLevel: 1 });
    s = reducer(s, { type: 'setGearSlot', stageIndex: 0, slot: 'weapon', item: 'abyss-shard' });
    expect(s.build.gearStages[0].changes.weapon).toBe('abyss-shard');
    s = reducer(s, { type: 'clearGearSlot', stageIndex: 0, slot: 'weapon' });
    expect(s.build.gearStages[0].changes.weapon).toBeUndefined();
  });
  it('removeGearStage drops a stage', () => {
    let s = reducer(withBase, { type: 'addGearStage', fromLevel: 1 });
    s = reducer(s, { type: 'removeGearStage', index: 0 });
    expect(s.build.gearStages).toEqual([]);
  });
  it('resetBuild clears levels and gearStages, keeps class', () => {
    const s = reducer({ ...withBase, build: { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 }, gearStages: [{ fromLevel: 1, changes: {} }] } }, { type: 'resetBuild' });
    expect(s.build.levels).toEqual({});
    expect(s.build.gearStages).toEqual([]);
    expect(s.build.baseClass).toBe('acolyte');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/store-build.test.js`
Expected: FAIL — gearStages/actions missing.

- [ ] **Step 3: Update the store** — Modify `src/state/store.jsx`:

(a) `initialState.build` gains `gearStages: []`, and add `selectedStage`/`selectedItemSlug`. Replace `initialState`:
```js
export const initialState = {
  playerLevel: 1,
  dropFilter: 'all',
  selectedZoneId: null,
  route: [],
  view: 'atlas',
  build: { baseClass: null, advancedClass: null, levels: {}, gearStages: [] },
  selectedSkillId: null,
  selectedStage: 0,
  selectedItemSlug: null,
};
```

(b) Update `selectClass` and `resetBuild` to reset `gearStages`, and add the gear cases. Replace the `selectClass` and `resetBuild` cases and add the new ones (before `default`):
```js
    case 'selectClass':
      return { ...state, build: { baseClass: action.slug, advancedClass: null, levels: {}, gearStages: [] }, selectedSkillId: null, selectedStage: 0, selectedItemSlug: null };
    case 'resetBuild':
      return { ...state, build: { ...state.build, advancedClass: null, levels: {}, gearStages: [] }, selectedSkillId: null, selectedStage: 0, selectedItemSlug: null };
    case 'addGearStage': {
      const stages = [...state.build.gearStages, { fromLevel: action.fromLevel, changes: {} }]
        .sort((a, b) => a.fromLevel - b.fromLevel);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: stages.findIndex((s) => s.fromLevel === action.fromLevel) };
    }
    case 'removeGearStage': {
      const stages = state.build.gearStages.filter((_, i) => i !== action.index);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: Math.max(0, Math.min(state.selectedStage, stages.length - 1)) };
    }
    case 'setStageLevel': {
      const stages = state.build.gearStages.map((s, i) => (i === action.index ? { ...s, fromLevel: action.fromLevel } : s))
        .sort((a, b) => a.fromLevel - b.fromLevel);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: stages.findIndex((s) => s.fromLevel === action.fromLevel) };
    }
    case 'setGearSlot': {
      const stages = state.build.gearStages.map((s, i) =>
        i === action.stageIndex ? { ...s, changes: { ...s.changes, [action.slot]: action.item } } : s);
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
    case 'clearGearSlot': {
      const stages = state.build.gearStages.map((s, i) => {
        if (i !== action.stageIndex) return s;
        const changes = { ...s.changes };
        delete changes[action.slot];
        return { ...s, changes };
      });
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
    case 'selectStage': return { ...state, selectedStage: action.index };
    case 'selectItem': return { ...state, selectedItemSlug: action.slug };
```
Keep all existing cases (`setView`, `selectAdvanced`, `setSkillLevel`, `selectSkill`, `hydrate`, the atlas cases) unchanged.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/state/store-build.test.js`
Expected: PASS.
Run: `npx vitest run src/state/store.test.js`
Expected: Phase 1 store tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.jsx src/state/store-build.test.js
git commit -m "feat: store gear stage state and actions"
```

---

## Task 8: GearStageRail + GearLoadout

**Files:** Create `src/components/GearStageRail.jsx`, `src/components/GearLoadout.jsx`, Test `src/components/GearLoadout.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/GearLoadout.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import GearLoadout from './GearLoadout.jsx';
import { StoreProvider } from '../state/store.jsx';
import { items } from '../data/gear-index.js';

const weapon = Object.values(items).find((i) => i.slot === 'weapon');
const chest = Object.values(items).find((i) => i.slot === 'chest');

describe('GearLoadout', () => {
  it('renders 10 slots and shows changed vs carried items', () => {
    const stages = [
      { fromLevel: 1, changes: { weapon: weapon.slug, chest: chest.slug } },
      { fromLevel: 11, changes: { weapon: weapon.slug } },
    ];
    render(
      <StoreProvider init={{ view: 'builds', selectedStage: 1, build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: stages } }}>
        <GearLoadout />
      </StoreProvider>,
    );
    const slotEls = screen.getAllByTestId('gear-slot');
    expect(slotEls).toHaveLength(10);
    // chest is carried (from Lv 1) on the level-11 stage
    const chestSlot = slotEls.find((e) => within(e).queryByText(/chest/i));
    expect(chestSlot.className).toMatch(/carried/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/GearLoadout.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the components**

`src/components/GearStageRail.jsx`:
```jsx
import { useStore } from '../state/store.jsx';

function nextDefaultLevel(stages) {
  if (!stages.length) return 1;
  return Math.min(135, Math.max(...stages.map((s) => s.fromLevel)) + 10);
}

export default function GearStageRail() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages;

  const labelFor = (i) => {
    const from = stages[i].fromLevel;
    const to = i + 1 < stages.length ? stages[i + 1].fromLevel - 1 : 135;
    return `Lv ${from}–${to}`;
  };

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
        <button className="stage-add" onClick={() => {
          const lvl = parseInt(window.prompt('New stage starts at level:', String(nextDefaultLevel(stages))), 10);
          if (Number.isFinite(lvl)) dispatch({ type: 'addGearStage', fromLevel: Math.min(135, Math.max(1, lvl)) });
        }}>＋ Add stage</button>
      </div>
    </div>
  );
}
```

`src/components/GearLoadout.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import { slots, items } from '../data/gear-index.js';
import { effectiveLoadout, sortStages } from '../logic/gear.js';

const SLOT_LABELS = {
  weapon: 'Weapon', shield: 'Shield', headgear: 'Headgear', face: 'Face', chest: 'Chest',
  legwear: 'Legwear', shoes: 'Shoes', accessory1: 'Accessory', accessory2: 'Accessory', utility: 'Utility',
};

export default function GearLoadout() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages;
  if (!stages.length) return null;
  const sorted = sortStages(stages);
  const idx = Math.min(state.selectedStage, sorted.length - 1);
  const loadout = effectiveLoadout(sorted, idx);
  const changes = sorted[idx].changes || {};

  // For a carried slot, find which stage last set it (label).
  const carriedFrom = (slot) => {
    for (let i = idx - 1; i >= 0; i--) if (slot in (sorted[i].changes || {})) return sorted[i].fromLevel;
    return null;
  };

  return (
    <div className="gear-loadout">
      {slots.map((slot) => {
        const itemSlug = loadout[slot];
        const item = itemSlug ? items[itemSlug] : null;
        const isChanged = slot in changes;
        const from = !isChanged && item ? carriedFrom(slot) : null;
        return (
          <div key={slot} data-testid="gear-slot" className={`gear-slot${item ? ' filled' : ''}${isChanged ? ' changed' : item ? ' carried' : ''}`}
            onClick={() => { dispatch({ type: 'selectItemSlot', slot }); if (item) dispatch({ type: 'selectItem', slug: itemSlug }); }}>
            <div className="gear-slot-label">{SLOT_LABELS[slot]}</div>
            <div className="gear-slot-item">{item ? item.name : '—'}</div>
            {from != null && <div className="gear-slot-from">from Lv {from}</div>}
          </div>
        );
      })}
    </div>
  );
}
```
NOTE: `selectItemSlot` is dispatched to tell the picker which slot is open. Add this case to the store now (small addition): in `src/state/store.jsx` add before `default`: `case 'selectItemSlot': return { ...state, openSlot: action.slot };` and add `openSlot: null` to `initialState`. (One-line additions; keep with this task.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/GearLoadout.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GearStageRail.jsx src/components/GearLoadout.jsx src/components/GearLoadout.test.jsx src/state/store.jsx
git commit -m "feat: GearStageRail + GearLoadout (changed vs carried slots)"
```

---

## Task 9: GearPicker + ItemDetail

**Files:** Create `src/components/GearPicker.jsx`, `src/components/ItemDetail.jsx`, Test `src/components/ItemDetail.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/ItemDetail.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemDetail from './ItemDetail.jsx';
import { StoreProvider } from '../state/store.jsx';
import { items } from '../data/gear-index.js';

const withSource = Object.values(items).find((i) => i.sources.length > 0);

describe('ItemDetail', () => {
  it('prompts when nothing selected', () => {
    render(<StoreProvider><ItemDetail /></StoreProvider>);
    expect(screen.getByText(/select a gear piece/i)).toBeInTheDocument();
  });
  it('shows the item name, sources and a farm button', () => {
    render(<StoreProvider init={{ selectedItemSlug: withSource.slug }}><ItemDetail /></StoreProvider>);
    expect(screen.getByRole('heading', { name: new RegExp(withSource.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeInTheDocument();
    expect(screen.getByText(/drop sources/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add .* zones to route/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ItemDetail.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the components**

`src/components/ItemDetail.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import { items } from '../data/gear-index.js';
import { resolveTile } from '../data/map-tiles.js';

export default function ItemDetail() {
  const { state, dispatch } = useStore();
  const item = state.selectedItemSlug ? items[state.selectedItemSlug] : null;
  if (!item) return <div className="item-detail empty"><p className="muted">Select a gear piece to see its stats and sources.</p></div>;

  const tiles = [...new Set(item.sources.map((s) => resolveTile(s.zoneName, s.minLevel)).filter(Boolean).map((t) => t.id))];
  const addZones = () => tiles.forEach((id) => dispatch({ type: 'addToRoute', id }));

  return (
    <div className="item-detail">
      <h3>{item.name} <span className="label">{item.type}{item.sockets ? ` · ${item.sockets} sockets` : ''}</span></h3>
      {item.statsPrimary.map((s, i) => <div key={i} className="stat-line">{s}</div>)}
      {item.statsSecondary.map((s, i) => <div key={i} className="stat-line muted">{s}</div>)}
      {item.setBonus.length > 0 && <div className="set-bonus"><span className="label">Set</span> {item.setBonus.join(' · ')}</div>}
      <div className="label" style={{ marginTop: 8 }}>DROP SOURCES</div>
      {item.sources.length === 0 ? (
        <p className="muted">No drop source{item.craft ? ` — crafted at ${item.craft.zoneName}` : ' — craft only'}.</p>
      ) : (
        <ul className="src-list">
          {item.sources.slice(0, 8).map((s, i) => (
            <li key={i}><span className="src-zone">{s.zoneName}</span> <span className="muted">Lv {s.minLevel}–{s.maxLevel}</span> <span className="src-chance">{s.chance}%</span> <span className="muted">{s.monster}{s.isBoss ? ' (boss)' : ''}</span></li>
          ))}
        </ul>
      )}
      <button className="farm-btn" disabled={tiles.length === 0} onClick={addZones}>＋ Add {tiles.length} zone{tiles.length === 1 ? '' : 's'} to route</button>
    </div>
  );
}
```

`src/components/GearPicker.jsx`:
```jsx
import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { itemsForSlot } from '../logic/gear.js';

export default function GearPicker() {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const slot = state.openSlot;
  if (!slot) return null;

  const list = itemsForSlot(slot).filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const pick = (slug) => { dispatch({ type: 'setGearSlot', stageIndex: state.selectedStage, slot, item: slug }); dispatch({ type: 'selectItem', slug }); dispatch({ type: 'selectItemSlot', slot: null }); };

  return (
    <div className="gear-picker">
      <div className="gear-picker-head">
        <input placeholder={`Search ${slot}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <button onClick={() => { dispatch({ type: 'clearGearSlot', stageIndex: state.selectedStage, slot }); dispatch({ type: 'selectItemSlot', slot: null }); }}>Revert to carried</button>
        <button onClick={() => dispatch({ type: 'selectItemSlot', slot: null })}>✕</button>
      </div>
      <ul className="gear-picker-list">
        {list.map((i) => (
          <li key={i.slug}><button onClick={() => pick(i.slug)}>{i.name} <span className="muted">{i.type}</span></button></li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ItemDetail.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GearPicker.jsx src/components/ItemDetail.jsx src/components/ItemDetail.test.jsx
git commit -m "feat: GearPicker + ItemDetail (sources + add-to-route)"
```

---

## Task 10: GearProgression container + BuildView integration

**Files:** Create `src/components/GearProgression.jsx`, Modify `src/components/BuildView.jsx`, Test `src/components/GearProgression.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/GearProgression.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GearProgression from './GearProgression.jsx';
import { StoreProvider } from '../state/store.jsx';

describe('GearProgression', () => {
  it('shows an add-stage prompt when there are no stages', () => {
    render(<StoreProvider init={{ view: 'builds', build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [] } }}><GearProgression /></StoreProvider>);
    expect(screen.getByText(/gear stages/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
  });
  it('renders the loadout when a stage exists', () => {
    render(<StoreProvider init={{ view: 'builds', selectedStage: 0, build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [{ fromLevel: 1, changes: {} }] } }}><GearProgression /></StoreProvider>);
    expect(screen.getAllByTestId('gear-slot')).toHaveLength(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/GearProgression.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write + integrate**

`src/components/GearProgression.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import GearStageRail from './GearStageRail.jsx';
import GearLoadout from './GearLoadout.jsx';
import GearPicker from './GearPicker.jsx';
import ItemDetail from './ItemDetail.jsx';

export default function GearProgression() {
  const { state } = useStore();
  const hasStages = state.build.gearStages.length > 0;
  return (
    <div className="gear-progression">
      <GearStageRail />
      {!hasStages ? (
        <p className="muted gear-empty">Add a gear stage to plan your loadout for a level band.</p>
      ) : (
        <div className="gear-body">
          <div className="gear-main">
            <GearLoadout />
            {state.openSlot && <GearPicker />}
          </div>
          <ItemDetail />
        </div>
      )}
    </div>
  );
}
```

Modify `src/components/BuildView.jsx` — import and mount `GearProgression` under the trees. Add the import and render it after the `<SkillDetail .../>` inside the `build-body` (or just below the trees block). Replace the `build-body` block with:
```jsx
        <div className="build-body">
          <div className="trees">
            <SkillTree classSlug={baseClass} tree="base" />
            {advancedClass && <SkillTree classSlug={advancedClass} tree="advanced" />}
            <GearProgression />
          </div>
          <SkillDetail skillId={state.selectedSkillId} />
        </div>
```
Add at the top of `BuildView.jsx`: `import GearProgression from './GearProgression.jsx';`

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/GearProgression.test.jsx`
Expected: PASS.
Run: `npm test`
Expected: ALL test files PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GearProgression.jsx src/components/BuildView.jsx src/components/GearProgression.test.jsx
git commit -m "feat: GearProgression mounted in BuildView"
```

---

## Task 11: Styling + verify

**Files:** Modify `src/styles/app.css`

- [ ] **Step 1: Append gear styles** to `src/styles/app.css`:
```css
/* Gear progression */
.gear-progression { margin-top: 16px; border-top: 1px dashed var(--line); padding-top: 12px; }
.stage-rail .label, .gear-loadout + .label { color: #9bf; }
.stage-chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 10px; }
.stage-chip { display: flex; align-items: center; gap: 6px; background: #161d2e; border: 1px solid var(--line); border-radius: 6px; padding: 5px 9px; cursor: pointer; font-size: 12px; }
.stage-chip.on { border-color: var(--route); background: #2a2410; }
.stage-chip button { background: none; border: 0; color: var(--muted); cursor: pointer; }
.stage-add { background: transparent; border: 1px dashed var(--line); color: var(--muted); border-radius: 6px; padding: 5px 9px; cursor: pointer; font-size: 12px; }
.gear-body { display: flex; gap: 12px; align-items: flex-start; }
.gear-main { flex: 2; position: relative; }
.gear-loadout { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.gear-slot { background: #161d2e; border: 1px solid var(--line); border-radius: 6px; padding: 6px; min-height: 52px; cursor: pointer; }
.gear-slot.filled.changed { border-color: var(--on); background: #16241c; }
.gear-slot.filled.carried { opacity: .65; }
.gear-slot-label { font-size: 9px; color: #9bf; }
.gear-slot-item { font-size: 11px; color: var(--text); margin-top: 2px; }
.gear-slot-from { font-size: 9px; color: var(--muted); }
.gear-picker { position: absolute; inset: 0; background: #0e1422; border: 1px solid var(--line); border-radius: 8px; padding: 8px; z-index: 5; display: flex; flex-direction: column; }
.gear-picker-head { display: flex; gap: 6px; }
.gear-picker-head input { flex: 1; background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 5px 8px; }
.gear-picker-head button { background: #23304a; color: var(--text); border: 0; border-radius: 6px; padding: 5px 8px; cursor: pointer; font-size: 11px; }
.gear-picker-list { list-style: none; margin: 6px 0 0; padding: 0; overflow: auto; max-height: 280px; }
.gear-picker-list button { width: 100%; text-align: left; background: none; border: 0; color: var(--text); padding: 5px 6px; cursor: pointer; border-radius: 5px; font-size: 12px; }
.gear-picker-list button:hover { background: #1a2236; }
.item-detail { flex: 1; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px; font-size: 12px; }
.item-detail.empty { color: var(--muted); }
.item-detail h3 { margin: 0 0 6px; font-size: 14px; }
.stat-line { margin: 1px 0; }
.set-bonus { margin-top: 6px; color: var(--hub); }
.src-list { list-style: none; margin: 4px 0; padding: 0; }
.src-list li { padding: 1px 0; }
.src-zone { color: var(--on); }
.src-chance { color: var(--route); font-weight: 700; }
.farm-btn { margin-top: 8px; background: var(--route); color: #222; border: 0; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
.farm-btn:disabled { opacity: .4; cursor: default; }
.gear-empty { margin: 10px 0; }

@media (max-width: 800px) { .gear-body { flex-direction: column; } .gear-loadout { grid-template-columns: repeat(2, 1fr); } }
```

- [ ] **Step 2: Visual check + full build**

Run: `npm run dev`. In Builds: pick a class, add a stage at Lv 1, equip a weapon; add a stage at Lv 11, change only the weapon and confirm the chest/etc. show as **carried** (dimmed "from Lv 1"); click a piece → see sources; click "Add … zones to route", switch to Atlas, confirm zones added; copy the share link and reload to confirm gear restores.
Run: `npm run build`
Expected: clean build (prebuild regenerates all three data files).

- [ ] **Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "style: gear progression styling"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** pipeline → gear.json (T1–T2), gear index (T3), zone→tile resolver (T4), derivation incl. effective loadout/carry-over/farm tiles (T5), build-URL gear segment + sanitize (T6), store gear stages + actions (T7), stage rail + carried/changed loadout (T8), picker + item detail + add-to-route (T9), BuildView integration (T10), styling (T11). Both resolved OQs honored: 10 slots incl. two accessory (T1 `SLOTS`), no class filter (`itemsForSlot` ignores class).
- **Model-change churn:** extending `build` with `gearStages` requires updating the Phase 2 `build-url.test.js` (T6) and `store-build.test.js` (T7) fixtures to include `gearStages: []` — both are rewritten in-task. Phase 2 `store.test.js` (atlas-only) is untouched.
- **Naming consistency:** actions (`addGearStage/removeGearStage/setStageLevel/setGearSlot/clearGearSlot/selectStage/selectItem/selectItemSlot`), state (`gearStages/selectedStage/selectedItemSlug/openSlot`), logic (`sortStages/effectiveLoadout/stageChangedSlots/categoryOf/itemsForSlot/stageFarmTiles`), `resolveTile`, `encodeBuild/decodeBuild/sanitizeBuild` are used identically across tasks.
- **No `dangerouslySetInnerHTML`:** stats are stripped to text in T1.
```
