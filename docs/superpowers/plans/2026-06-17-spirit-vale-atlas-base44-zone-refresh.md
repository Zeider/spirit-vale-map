# Spirit Vale Atlas — base44 Zone Data Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale v0.13.1 SpiritValeInfo zone/drop snapshot with current (2026-06-16) data from the spirit-vale-builder base44 `GameData` API, so every one of the map's 48 tiles — including the ~11 newer zones — has a complete, current drop table.

**Architecture:** Vendor the base44 `GameData` snapshot (done) into `data/raw-base44/`. A new adapter (`scripts/lib/build-zones-base44.mjs`) synthesizes `zones.json` directly from base44 monsters + the existing `map-tiles.js` tile grid (which already encodes the current 48 tiles), reusing the proven `aggregateDrops`/`slugify` helpers. Each combat **tile** becomes one **sub-zone keyed by the tile's existing id** (preserving shareable-route back-compat); monsters are assigned to tiles by map name + level band; bosses are assigned via their spawner-lure's drop location. Name resolution reuses the stable v0.13.1 lookup tables, augmented with base44 equipment/gems/cards names where the `GameId` scheme matches. `build-data.mjs` switches to this adapter; the gear catalog pipeline (`build-gear.mjs`, market-sourced) is untouched. The Phase-1.5 `build-pending-zones.mjs` gear-only backfill is retired (base44 covers those zones natively).

**Tech Stack:** Node ESM build scripts, Vitest, React+Vite app. No new runtime deps.

## Global Constraints

- **Preserve shareable-route back-compat:** sub-zone ids MUST equal the existing `map-tiles.js` tile `id`s. Routes/builds are encoded in `?route=`/`?build=` URLs by tile id — changing ids breaks existing shared links.
- **Output shape unchanged:** the adapter emits the same `zones.json` shape the app already consumes — `{ gameVersion, regions: [{ id, slug, name, minLevel, maxLevel, subZones: [{ id, gameId, name, minLevel, maxLevel, isHub, monsters[], boss, drops[] }] }] }`. Drop entry shape: `{ id, name, type, chance, bossOnly, sources[] }`, sorted by descending chance. (No `partial` field — base44 zones are complete.)
- **Drop types:** `equip | material | consumable | gem | card | artifact` (same as `aggregateDrops`).
- **Reuse, don't fork:** import `slugify` and `aggregateDrops` from `scripts/lib/build-data.mjs`; do not reimplement drop aggregation.
- **Determinism:** no `Date.now()`/network in the build path; the build reads only vendored files under `data/`.
- **Attribution:** base44 (`spirit-vale-builder`) data originates from the game; credit it in `ATTRIBUTION.md` and the in-app footer.

---

## File Structure

- `scripts/fetch-base44.mjs` — **(exists)** vendors `GameData` → `data/raw-base44/*.json` + `_manifest.json`.
- `data/raw-base44/*.json` — **(exists)** vendored snapshot (monsters, equipment, gems, cards, material, consumable, artifacts, *_drops, classes, skills, …).
- `scripts/lib/build-zones-base44.mjs` — **(new)** the adapter: `buildLookupsAugmented`, `assignBosses`, `buildZonesFromBase44`.
- `scripts/lib/build-zones-base44.test.mjs` — **(new)** unit + integration tests.
- `scripts/build-data.mjs` — **(modify)** read v0.13.1 lookups + base44 monsters + map-tiles → adapter → `zones.json`. Drop the `mergePendingZones` call.
- `src/data/map-tiles.js` — **(modify)** set every combat tile's `zoneId` to its own `id`; hubs `zoneId: null`.
- `scripts/lib/build-pending-zones.mjs` + `.test.mjs` — **(delete)** superseded.
- `src/components/ZoneDrawer.jsx` + `.test.jsx` — **(modify)** remove the gear-only/`partial` branch (no longer reachable); keep the hub + "drops pending" fallbacks.
- `ATTRIBUTION.md`, `README.md` — **(modify)** document base44 as the zone/drop source + refresh steps.

---

## Data facts (verified against the vendored snapshot)

- `data/raw-base44/monsters.json`: **261** monsters. Each has v0.13.1-compatible drop arrays `EquipDrops/MaterialDrops/ConsumableDrops/GemDrops` of `{Id, DropChance, Count}`, plus `Card`/`Artifact` of `{Id, DropChance, Count}` (Id may be null), `IsBoss` (0/1), `Level`, `DisplayName`, `GameId`, and enriched `maps: [{name, slug}]` + `spawner: {GameId, …}`.
- Monster→map: regular monsters list their `maps`; **bosses have empty `maps`** and instead a `spawner` whose `GameId` is a lure (e.g. `"Lure Death Mage"`).
- **Tile↔map join:** all 45 combat tiles in `map-tiles.js` match a base44 map by `name` (0 unmatched, 0 orphan maps). Two maps span multiple level-band tiles: **Forest Labyrinth** (tiles 6-10/11-15/16-20/21-25) and **Sanctum of Light** (76-80/81-85) — split base44 monsters into these bands by `Level`.
- **Boss assignment:** for a boss, find its `spawner.GameId`; the (single) map whose monsters drop that lure (via `ConsumableDrops`) is the boss's zone. **24/25** bosses resolve this way; 1 needs a curated override.
- **Lookups:** reuse `data/raw/{equipment,materials,consumables,gems,cards,artifacts}.json` (v0.13.1, `GameId→DisplayName`). Augment `equipment`/`gems`/`cards` with base44's `GameId→DisplayName` (compatible). `material`/`consumable`/`artifacts` in base44 key by `name`/`slug` (incompatible) → v0.13.1 only; a handful of brand-new ids fall back to showing the raw id.
- Hubs: `Nevaris`, `Wayfarer's Landing`, `The Echoing Spire` (tiles with `isHub: true`).

---

### Task 1: Vendoring script (already implemented — verify only)

**Files:**
- Verify: `scripts/fetch-base44.mjs`, `data/raw-base44/_manifest.json`

**Interfaces:**
- Produces: `data/raw-base44/<data_type>.json` for each of the 19 GameData types; `_manifest.json` with per-type `version`.

- [ ] **Step 1: Confirm the snapshot is present and current**

Run: `node -e "const m=require('./data/raw-base44/_manifest.json'); console.log(m.types.monsters.version, '|', require('./data/raw-base44/monsters.json').length, 'monsters')"`
Expected: prints a `2026-06-16…` monsters version and `261 monsters`.

- [ ] **Step 2: Commit the vendored snapshot + fetch script**

```bash
git add scripts/fetch-base44.mjs data/raw-base44
git commit -m "feat(data): vendor spirit-vale-builder base44 GameData snapshot"
```

---

### Task 2: Lookup augmentation helper

Builds the `GameId→DisplayName` lookup maps `aggregateDrops` needs, reusing v0.13.1 tables and augmenting the compatible ones from base44.

**Files:**
- Create: `scripts/lib/build-zones-base44.mjs`
- Test: `scripts/lib/build-zones-base44.test.mjs`

**Interfaces:**
- Consumes: `toNameMap` from `./build-data.mjs`.
- Produces: `buildLookupsAugmented(v013Raw, base44) -> { equipment, materials, consumables, gems, cards, artifacts }` where each value is `{ [GameId]: DisplayName }`. `v013Raw` = `{ equipment, materials, consumables, gems, cards, artifacts }` (raw v0.13.1 JSON). `base44` = `{ equipment, gems, cards }` (vendored base44 arrays).

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/build-zones-base44.test.mjs
import { describe, it, expect } from 'vitest';
import { buildLookupsAugmented } from './build-zones-base44.mjs';

describe('buildLookupsAugmented', () => {
  const v013 = {
    equipment: { OldBoots: { GameId: 'OldBoots', DisplayName: 'Old Boots' } },
    materials: { TreeBark: { GameId: 'TreeBark', DisplayName: 'Tree Bark' } },
    consumables: {}, gems: {}, cards: {},
    artifacts: [{ GameId: 'Matk', DisplayName: 'Starfire' }],
  };
  const base44 = {
    equipment: [{ GameId: 'OldBoots', DisplayName: 'Old Boots v2' }, { GameId: 'NewBlade', DisplayName: 'New Blade' }],
    gems: [{ GameId: 'FireGem', DisplayName: 'Fire Gem' }],
    cards: [{ GameId: 'BunnyCard', DisplayName: 'Bunny Card' }],
  };
  const out = buildLookupsAugmented(v013, base44);

  it('augments equipment with new base44 ids and prefers base44 names', () => {
    expect(out.equipment.NewBlade).toBe('New Blade');
    expect(out.equipment.OldBoots).toBe('Old Boots v2');
  });
  it('adds base44 gems/cards', () => {
    expect(out.gems.FireGem).toBe('Fire Gem');
    expect(out.cards.BunnyCard).toBe('Bunny Card');
  });
  it('keeps v0.13.1-only tables (materials/artifacts) intact', () => {
    expect(out.materials.TreeBark).toBe('Tree Bark');
    expect(out.artifacts.Matk).toBe('Starfire');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/build-zones-base44.test.mjs -t buildLookupsAugmented`
Expected: FAIL — `buildLookupsAugmented` is not exported / module missing.

- [ ] **Step 3: Implement the helper**

```js
// scripts/lib/build-zones-base44.mjs
import { slugify, toNameMap, aggregateDrops } from './build-data.mjs';

// v0.13.1 lookups are authoritative + stable; base44 equipment/gems/cards use
// the same GameId/DisplayName scheme, so augment those with current names + new
// ids. material/consumable/artifacts in base44 key by name/slug (incompatible)
// and are left as the v0.13.1 maps.
export function buildLookupsAugmented(v013Raw, base44) {
  const out = {
    equipment: toNameMap(v013Raw.equipment),
    materials: toNameMap(v013Raw.materials),
    consumables: toNameMap(v013Raw.consumables),
    gems: toNameMap(v013Raw.gems),
    cards: toNameMap(v013Raw.cards),
    artifacts: toNameMap(v013Raw.artifacts),
  };
  const augment = (table, entries) => {
    for (const e of entries || []) if (e && e.GameId) table[e.GameId] = e.DisplayName || e.GameId;
  };
  augment(out.equipment, base44.equipment);
  augment(out.gems, base44.gems);
  augment(out.cards, base44.cards);
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/build-zones-base44.test.mjs -t buildLookupsAugmented`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/build-zones-base44.mjs scripts/lib/build-zones-base44.test.mjs
git commit -m "feat(data): base44 lookup augmentation helper"
```

---

### Task 3: Boss → zone assignment

**Files:**
- Modify: `scripts/lib/build-zones-base44.mjs`
- Test: `scripts/lib/build-zones-base44.test.mjs`

**Interfaces:**
- Produces: `assignBosses(monsters) -> { [mapName]: bossMonster }`. For each boss (`IsBoss` truthy), look up `spawner.GameId`; the unique map whose monsters drop that lure (`ConsumableDrops[].Id === lure`) gets the boss. Ties/misses are skipped (curated `BOSS_OVERRIDES` fills the rest). Returns the **monster object** so callers can read its drops/level.
- Exposes: `export const BOSS_OVERRIDES = { /* mapName: bossDisplayName */ }` (start empty; populated in Step 5 for the 1 unresolved boss).

- [ ] **Step 1: Write the failing test**

```js
// append to scripts/lib/build-zones-base44.test.mjs
import { assignBosses } from './build-zones-base44.mjs';

describe('assignBosses', () => {
  const monsters = [
    { DisplayName: 'Grunt', IsBoss: 0, maps: [{ name: 'Cave' }], ConsumableDrops: [{ Id: 'Lure Warlord' }] },
    { DisplayName: 'Warlord', IsBoss: 1, maps: [], spawner: { GameId: 'Lure Warlord' }, ConsumableDrops: [] },
    { DisplayName: 'Loner', IsBoss: 1, maps: [], spawner: { GameId: 'Lure Nowhere' }, ConsumableDrops: [] },
  ];
  it('assigns a boss to the map whose monsters drop its lure', () => {
    const byMap = assignBosses(monsters);
    expect(byMap.Cave.DisplayName).toBe('Warlord');
  });
  it('skips bosses whose lure is dropped nowhere', () => {
    const byMap = assignBosses(monsters);
    expect(Object.values(byMap).some((b) => b.DisplayName === 'Loner')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/build-zones-base44.test.mjs -t assignBosses`
Expected: FAIL — `assignBosses` not exported.

- [ ] **Step 3: Implement**

```js
// add to scripts/lib/build-zones-base44.mjs
export const BOSS_OVERRIDES = {}; // mapName -> boss DisplayName, for bosses not resolvable via lure

export function assignBosses(monsters) {
  // lure GameId -> set of map names whose monsters drop it
  const lureToMaps = {};
  for (const m of monsters) {
    for (const mp of m.maps || []) {
      for (const d of m.ConsumableDrops || []) {
        (lureToMaps[d.Id] ||= new Set()).add(mp.name);
      }
    }
  }
  const byName = new Map(monsters.map((m) => [m.DisplayName || m.name, m]));
  const byMap = {};
  for (const b of monsters) {
    if (!(b.IsBoss ?? b.isBoss)) continue;
    const lure = b.spawner && b.spawner.GameId;
    const maps = lure && lureToMaps[lure] ? [...lureToMaps[lure]] : [];
    if (maps.length === 1) byMap[maps[0]] = b;
  }
  for (const [mapName, bossName] of Object.entries(BOSS_OVERRIDES)) {
    const b = byName.get(bossName);
    if (b) byMap[mapName] = b;
  }
  return byMap;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/build-zones-base44.test.mjs -t assignBosses`
Expected: PASS (2 tests).

- [ ] **Step 5: Identify and override the 1 unresolved boss**

Run: `node scripts/lib/_boss-report.mjs` *(create a throwaway script that imports `assignBosses` + the vendored monsters and prints bosses whose name is not a value in the result)*. For the single unresolved boss, add `mapName: 'Boss Name'` to `BOSS_OVERRIDES` using its level band + v0.13.1 `data/raw/maps.json` `BossMonster` as the cross-check. Delete the throwaway script.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/build-zones-base44.mjs scripts/lib/build-zones-base44.test.mjs
git commit -m "feat(data): boss->zone assignment via spawner-lure derivation"
```

---

### Task 4: `buildZonesFromBase44` — the core adapter

**Files:**
- Modify: `scripts/lib/build-zones-base44.mjs`
- Test: `scripts/lib/build-zones-base44.test.mjs`

**Interfaces:**
- Consumes: `slugify`, `aggregateDrops` (from build-data); `buildLookupsAugmented`, `assignBosses` (Tasks 2-3).
- Produces: `buildZonesFromBase44({ monsters, mapTiles, lookups, gameVersion }) -> { gameVersion, regions }`.
  - Iterates **combat** tiles (`!isHub`). For each tile: sub-zone `id = tile.id`, `gameId = tile.name`, `name = tile.name`, `minLevel/maxLevel = tile band`.
  - A **multi-band map** = a map `name` shared by more than one combat tile (only Forest Labyrinth ×4 and Sanctum of Light ×2). Everything else is **single-band**.
  - `monsterPool`: base44 monsters whose `maps` include `tile.name`. For a **single-band** map, keep ALL of them (do not level-filter — a zone's mobs may sit anywhere in/near its range, as v0.13.1 did). For a **multi-band** map, keep only those whose `Level` ∈ `[tile.minLevel, tile.maxLevel]` (this is what splits the shared map across its bands).
  - `boss`: take `bossByMap[tile.name]`. For a **single-band** map, attach it **unconditionally** — bosses routinely sit a few levels ABOVE the zone's mob range (e.g. Hare L30 in Bunny Woods 21-25), so never null a single-band boss by level. For a **multi-band** map, attach the boss to exactly ONE band: the band whose range contains the boss's `Level`, or — if no band contains it — the **highest** band (max `maxLevel`). A boss with no map assignment (homeless world boss) never appears.
  - `drops` = `aggregateDrops(monsterPool.map(name), boss?.name, monstersByName, lookups)`.
  - `monsters` field = pool display names; `boss` field = boss display name or null.
  - **Hub** tiles → one sub-zone with `isHub: true`, `monsters: []`, `boss: null`, `drops: []`.
  - Region grouping: `regionSlug = slugify(baseName(tile.name))` where `baseName` strips a trailing ` 1`-` 9` or ` North`/` South`/` East`/` West`. Region `minLevel/maxLevel` = min/max across its combat sub-zones.

- [ ] **Step 1: Write the failing test**

```js
// append to scripts/lib/build-zones-base44.test.mjs
import { buildZonesFromBase44 } from './build-zones-base44.mjs';

const lookups = { equipment: { Blade: 'Blade' }, materials: { Bark: 'Bark' }, consumables: {}, gems: {}, cards: {}, artifacts: {} };
const monsters = [
  { DisplayName: 'Wisp', GameId: 'Wisp', Level: 12, IsBoss: 0, maps: [{ name: 'Forest Field 1' }],
    EquipDrops: [{ Id: 'Blade', DropChance: 5 }], MaterialDrops: [{ Id: 'Bark', DropChance: 100 }],
    ConsumableDrops: [], GemDrops: [], Card: { Id: null }, Artifact: { Id: null } },
  { DisplayName: 'LabA', GameId: 'LabA', Level: 8, IsBoss: 0, maps: [{ name: 'Forest Labyrinth' }],
    EquipDrops: [{ Id: 'Blade', DropChance: 3 }], MaterialDrops: [], ConsumableDrops: [], GemDrops: [], Card: { Id: null }, Artifact: { Id: null } },
  { DisplayName: 'LabB', GameId: 'LabB', Level: 14, IsBoss: 0, maps: [{ name: 'Forest Labyrinth' }],
    EquipDrops: [{ Id: 'Blade', DropChance: 4 }], MaterialDrops: [], ConsumableDrops: [], GemDrops: [], Card: { Id: null }, Artifact: { Id: null } },
];
// Boss whose level (16) sits ABOVE the single-band Forest Field 1 (11-15).
const bossMonster = { DisplayName: 'FFBoss', GameId: 'FFBoss', Level: 16, IsBoss: 1, maps: [],
  spawner: { GameId: 'Lure FFBoss' }, ConsumableDrops: [],
  EquipDrops: [{ Id: 'Blade', DropChance: 1 }], MaterialDrops: [], GemDrops: [], Card: { Id: null }, Artifact: { Id: null } };
// A Forest Field 1 mob drops the boss's lure, so assignBosses pins FFBoss to that map.
monsters[0].ConsumableDrops = [{ Id: 'Lure FFBoss' }];
monsters.push(bossMonster);

const mapTiles = [
  { id: 'ff1', name: 'Forest Field 1', minLevel: 11, maxLevel: 15, isHub: false },
  { id: 'lab-1', name: 'Forest Labyrinth', minLevel: 6, maxLevel: 10, isHub: false },
  { id: 'lab-2', name: 'Forest Labyrinth', minLevel: 11, maxLevel: 15, isHub: false },
  { id: 'nevaris', name: 'Nevaris', minLevel: 0, maxLevel: 0, isHub: true },
];

describe('buildZonesFromBase44', () => {
  const out = buildZonesFromBase44({ monsters, mapTiles, lookups, gameVersion: '2026-06-16' });
  const sub = (id) => out.regions.flatMap((r) => r.subZones).find((s) => s.id === id);

  it('keys sub-zones by tile id and passes gameVersion', () => {
    expect(out.gameVersion).toBe('2026-06-16');
    expect(sub('ff1').name).toBe('Forest Field 1');
  });
  it('resolves drops via the lookups', () => {
    expect(sub('ff1').drops.find((d) => d.name === 'Bark').type).toBe('material');
  });
  it('splits a multi-band map by monster level', () => {
    expect(sub('lab-1').monsters).toEqual(['LabA']); // level 8 -> band 6-10
    expect(sub('lab-2').monsters).toEqual(['LabB']); // level 14 -> band 11-15
  });
  it('attaches a single-band boss even when its level exceeds the band', () => {
    expect(sub('ff1').boss).toBe('FFBoss'); // L16 boss kept on the 11-15 single-band zone
  });
  it('groups level bands under one region and emits empty hub sub-zones', () => {
    const lab = out.regions.find((r) => r.slug === 'forest-labyrinth');
    expect(lab.subZones.map((s) => s.id).sort()).toEqual(['lab-1', 'lab-2']);
    expect(sub('nevaris').isHub).toBe(true);
    expect(sub('nevaris').drops).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/build-zones-base44.test.mjs -t buildZonesFromBase44`
Expected: FAIL — `buildZonesFromBase44` not exported.

- [ ] **Step 3: Implement**

```js
// add to scripts/lib/build-zones-base44.mjs
function baseName(name) {
  return name.replace(/\s+(?:[1-9]|North|South|East|West)$/i, '').trim();
}

export function buildZonesFromBase44({ monsters, mapTiles, lookups, gameVersion }) {
  const byName = {};
  for (const m of monsters) byName[m.DisplayName || m.name] = m;
  const bossByMap = assignBosses(monsters);

  // map name -> monsters listed in that map
  const poolByMap = {};
  for (const m of monsters) for (const mp of m.maps || []) (poolByMap[mp.name] ||= []).push(m);

  // combat tiles that share a map name = multi-band maps (Forest Labyrinth, Sanctum of Light)
  const bandsByName = {};
  for (const t of mapTiles) if (!t.isHub) (bandsByName[t.name] ||= []).push(t);
  const lvl = (m) => m.Level ?? m.level;

  // For a multi-band map, which band-tile owns the boss: the band containing the
  // boss level, else the highest band. Single-band maps always own their boss.
  function tileOwnsBoss(t, boss) {
    const bands = bandsByName[t.name];
    if (bands.length === 1) return true;
    const bl = lvl(boss);
    const containing = bands.find((b) => bl >= b.minLevel && bl <= b.maxLevel);
    const owner = containing || bands.reduce((a, b) => (b.maxLevel > a.maxLevel ? b : a));
    return owner.id === t.id;
  }

  const regions = new Map();
  for (const t of mapTiles) {
    const regionSlug = slugify(baseName(t.name));
    if (!regions.has(regionSlug)) {
      regions.set(regionSlug, { id: regionSlug, slug: regionSlug, name: baseName(t.name), subZones: [] });
    }
    if (t.isHub) {
      regions.get(regionSlug).subZones.push({
        id: t.id, gameId: t.name, name: t.name, minLevel: t.minLevel, maxLevel: t.maxLevel,
        isHub: true, monsters: [], boss: null, drops: [],
      });
      continue;
    }
    const mapMonsters = poolByMap[t.name] || [];
    // single-band: keep all the map's monsters; multi-band: split by level into this band
    const pool = bandsByName[t.name].length === 1
      ? mapMonsters
      : mapMonsters.filter((m) => lvl(m) >= t.minLevel && lvl(m) <= t.maxLevel);
    const mapBoss = bossByMap[t.name] || null;
    const boss = mapBoss && tileOwnsBoss(t, mapBoss) ? mapBoss : null;
    const bossName = boss ? (boss.DisplayName || boss.name) : null;
    const drops = aggregateDrops(pool.map((m) => m.DisplayName || m.name), bossName, byName, lookups);
    regions.get(regionSlug).subZones.push({
      id: t.id, gameId: t.name, name: t.name, minLevel: t.minLevel, maxLevel: t.maxLevel,
      isHub: false, monsters: pool.map((m) => m.DisplayName || m.name), boss: bossName, drops,
    });
  }
  const out = [...regions.values()].map((r) => {
    const combat = r.subZones.filter((s) => !s.isHub);
    r.minLevel = combat.length ? Math.min(...combat.map((s) => s.minLevel)) : 0;
    r.maxLevel = combat.length ? Math.max(...combat.map((s) => s.maxLevel)) : 0;
    return r;
  });
  return { gameVersion, regions: out };
}
```

> Note: `aggregateDrops` keys monsters by **DisplayName** here (we pass display names + a name-keyed map), unlike `buildZones` which keys by GameId. `aggregateDrops` is agnostic — it just indexes `monsters[name]` — so passing a `byName` map is valid.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/build-zones-base44.test.mjs -t buildZonesFromBase44`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/build-zones-base44.mjs scripts/lib/build-zones-base44.test.mjs
git commit -m "feat(data): buildZonesFromBase44 adapter (tile-driven, band-split, boss-aware)"
```

---

### Task 5: Wire the adapter into `build-data.mjs` and retire the pending-zones backfill

**Files:**
- Modify: `scripts/build-data.mjs`
- Delete: `scripts/lib/build-pending-zones.mjs`, `scripts/lib/build-pending-zones.test.mjs`

**Interfaces:**
- Consumes: `buildLookupsAugmented`, `buildZonesFromBase44`; `mapTiles` from `../src/data/map-tiles.js`; v0.13.1 lookups from `data/raw/*`; base44 `monsters`/`equipment`/`gems`/`cards` from `data/raw-base44/*`; `monsters` manifest version for `gameVersion`.
- Produces: `src/data/zones.json` (current data, no `partial` zones).

- [ ] **Step 1: Rewrite `build-data.mjs`**

```js
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
```

- [ ] **Step 2: Delete the pending-zones backfill**

```bash
git rm scripts/lib/build-pending-zones.mjs scripts/lib/build-pending-zones.test.mjs
```

- [ ] **Step 3: Run the data build**

Run: `node scripts/build-data.mjs`
Expected: prints `base44 2026-06-16, … regions, 48 sub-zones.` (45 combat + 3 hub).

- [ ] **Step 4: Verify drop completeness + boss coverage**

Run:
```bash
node -e "const z=require('./src/data/zones.json'); const subs=z.regions.flatMap(r=>r.subZones); const combat=subs.filter(s=>!s.isHub); const types=new Set(combat.flatMap(s=>s.drops.map(d=>d.type))); console.log('combat sub-zones',combat.length,'| drop types',[...types].sort().join(','),'| with boss',combat.filter(s=>s.boss).length,'| zero-drop',combat.filter(s=>!s.drops.length).map(s=>s.name).join('|')||'none');"
```
Expected: 45 combat sub-zones; drop types include `artifact,card,consumable,equip,gem,material`; most have a boss; `zero-drop` is `none`.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data.mjs
git commit -m "feat(data): build zones.json from base44 snapshot; retire pending-zones backfill"
```

---

### Task 6: Re-wire `map-tiles.js` zoneIds + update the resolver expectations

**Files:**
- Modify: `src/data/map-tiles.js`

**Interfaces:**
- Produces: every combat tile `zoneId === tile.id`; hub tiles `zoneId: null`.

- [ ] **Step 1: Set zoneId = id for combat tiles**

For each tile object in `src/data/map-tiles.js`: if `isHub: false`, set `zoneId` to the tile's own `id` string; if `isHub: true`, set `zoneId: null`. (Mechanical edit across the ~48 tile literals; values already present, only the `zoneId` field changes.) Update the header comment to state: zoneId links each tile to its base44-sourced sub-zone (same id); null = hub.

- [ ] **Step 2: Verify every combat tile resolves and only hubs are null**

Run:
```bash
node --input-type=module -e "import {mapTiles} from './src/data/map-tiles.js'; import zones from './src/data/zones.json' with {type:'json'}; const ids=new Set(zones.regions.flatMap(r=>r.subZones.map(s=>s.id))); const broken=mapTiles.filter(t=>t.zoneId&&!ids.has(t.zoneId)); const nullCombat=mapTiles.filter(t=>!t.zoneId&&!t.isHub); console.log('broken zoneIds',broken.length,'| non-hub null',nullCombat.map(t=>t.name).join('|')||'none');"
```
Expected: `broken zoneIds 0 | non-hub null none`.

- [ ] **Step 3: Run the full data pipeline + the existing map-tiles resolution test**

Run: `npm run data && npx vitest run src/data/map-tiles-resolve.test.js src/data/zones-index.test.js`
Expected: build succeeds; tests pass (update assertions in those tests only if they hard-coded old slugs/counts — keep them asserting structural invariants, not specific stale ids).

- [ ] **Step 4: Commit**

```bash
git add src/data/map-tiles.js src/data/zones.json src/data/*.test.js
git commit -m "feat(map): wire all tiles to base44 sub-zones (zoneId = tile id)"
```

---

### Task 7: Remove the gear-only/partial UI path

**Files:**
- Modify: `src/components/ZoneDrawer.jsx`, `src/components/ZoneDrawer.test.jsx`, `src/styles/app.css`

**Interfaces:**
- No `partial` zones exist anymore; remove the "Gear only" badge, the `.zone-note` partial banner, and the now-dead `partial` branch. Keep the hub badge and the `!zone` "drops pending" fallback.

- [ ] **Step 1: Update `ZoneDrawer.jsx`**

Remove the `{zone?.partial && …}` badge line and the `{zone.partial && (<p className="zone-note">…)}` block. Leave the rest (`monsters`, `drops`, hub, `!zone` fallback) unchanged.

- [ ] **Step 2: Update `ZoneDrawer.test.jsx`**

Replace the `partialTile`/gear-only test with one asserting a real combat tile renders monsters + a non-empty drop list across multiple types:

```js
const combatTile = mapTiles.find((t) => t.zoneId && !t.isHub && subZoneById[t.zoneId].drops.length > 0);
// …
it('renders monsters and a multi-type drop list for a combat zone', () => {
  render(<StoreProvider init={{ selectedZoneId: combatTile.id }}><ZoneDrawer /></StoreProvider>);
  expect(screen.getByRole('heading', { name: combatTile.name })).toBeInTheDocument();
  expect(screen.getByText(/^Drops —/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Remove the now-unused `.zone-note` rule from `app.css`** (leave `.muted`).

- [ ] **Step 4: Run the component tests**

Run: `npx vitest run src/components/ZoneDrawer.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ZoneDrawer.jsx src/components/ZoneDrawer.test.jsx src/styles/app.css
git commit -m "refactor(ui): drop gear-only partial-zone path (all zones now complete)"
```

---

### Task 8: Attribution, version footer, README + full verification

**Files:**
- Modify: `ATTRIBUTION.md`, `README.md`, app footer component (the one rendering `Game data v{gameVersion}` — locate via `grep -rn "gameVersion" src`).

- [ ] **Step 1: Update `ATTRIBUTION.md`**

Add: *Zone / monster / drop data: spirit-vale-builder (base44) `GameData` API — current game data. World map art + tile grid: spiritvalemarket.com. Build/skill/catalog data: spiritvalemarket.com. Original zone schema reference: RandomGuy5555/SpiritValeInfo (game v0.13.1).* Keep the rights-holder note.

- [ ] **Step 2: Update `README.md`** data section to describe `scripts/fetch-base44.mjs` → `data/raw-base44/` → `npm run data`.

- [ ] **Step 3: Confirm the footer shows the new version** (`gameVersion` now `base44 2026-06-16`); adjust copy if it hard-codes "v" prefix.

- [ ] **Step 4: Full build + test + visual check**

Run: `npm run data && npm test && npm run build`
Expected: data builds (48 sub-zones), all tests pass, production build succeeds.

Then launch `npm run dev`, and via Playwright select **Forest Labyrinth (16-20)** and **Bunny Woods** — confirm each shows monsters, a boss (where applicable), and drops spanning material/card/gem/equip — not just equipment.

- [ ] **Step 5: Commit + finish the branch**

```bash
git add ATTRIBUTION.md README.md src
git commit -m "docs+ui: attribute base44 zone data; version footer"
```

Then use **superpowers:finishing-a-development-branch** to decide merge/PR.

---

## Self-Review

**Spec coverage:** full refresh from base44 ✓ (Tasks 4-5); per-band subzones for Labyrinth/Sanctum ✓ (Task 4 level filter); reuse+augment lookups ✓ (Task 2); boss assignment ✓ (Task 3); tile re-wire ✓ (Task 6); retire pending-zones ✓ (Task 5); attribution ✓ (Task 8); shareable-route back-compat ✓ (sub-zone id = tile id, Global Constraints + Task 4).

**Placeholder scan:** the only deferred specifics are the single `BOSS_OVERRIDES` entry (Task 3 Step 5, derived at implementation from a reported value) and the mechanical per-tile `zoneId` edit (Task 6 Step 1) — both are concrete actions with verification commands, not vague hand-waves.

**Type consistency:** `buildLookupsAugmented`/`assignBosses`/`buildZonesFromBase44` signatures and the `{ id, gameId, name, minLevel, maxLevel, isHub, monsters, boss, drops }` sub-zone shape are used identically across Tasks 2-6 and match the existing `zones.json` contract consumed by `zones-index.js` + `ZoneDrawer.jsx`.

## Open risks

- A few brand-new materials/consumables may render as raw ids until the v0.13.1 lookups are extended (accepted per the name-resolution decision). Task 5 Step 4 surfaces any zero-drop zones.
- `gear.json` stays market-sourced (448 items) and is intentionally out of scope; **Moonweave Gloves** remains absent there (separate gap).
