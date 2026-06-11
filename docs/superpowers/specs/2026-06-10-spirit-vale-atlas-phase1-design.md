# Spirit Vale Atlas — Phase 1 Design (Atlas + Route + Drops)

**Date:** 2026-06-10
**Status:** Draft for review
**Product:** Spirit Vale Atlas — a map-centric build & levelling planner for the idle RPG *Spirit Vale*
**Repo (folder):** `spirit-vale-map` (provisional; product name "Spirit Vale Atlas")

---

## 1. Summary

A static, GitHub Pages–hosted web app where the **interactive world map is the primary interface**. In Phase 1 the player can:

1. See the Spirit Vale world map with every zone as a clickable tile.
2. Click a zone to view its level band, monsters, boss, and an **aggregated drop table** (what drops there and at what rate).
3. Build an **ordered levelling route** by adding zones, then reorder/remove them.
4. See zones **tinted relative to their character level**, with the route drawn as a path on the map and **level-gap detection** in the route summary.
5. Share a route via URL.

This is Phase 1 of a larger map-centric planner. Phases 2–4 (class/skill build planner, gear & stats, damage sim) are **out of scope** here and will get their own specs. Phase 1 is independently useful and shippable.

## 2. Goals & non-goals

**Goals**
- Faithful, good-looking map matching the in-game world (uses the official trimmed map art).
- Answer the two questions a leveller asks: *"where do I go next?"* and *"what drops there?"*
- Zero backend — all game data is vendored and the site is fully static.
- Data is generated from a reproducible pipeline so a game update is a re-run, not a rewrite.

**Non-goals (Phase 1)**
- Class/skill trees, gear/equipment stat math, damage simulation, market prices, user accounts, server-side anything.

## 3. Data

### 3.1 Source
Game data from **`RandomGuy5555/SpiritValeInfo`** → `example-data/game/*.json` (game **v0.13.1**, snapshot 2026-02-26), vendored into `data/raw/`. Map art (`world-map.webp`) from **spiritvalemarket.com**, trimmed to `assets/world-map.png` (1178×846).

> **Data freshness:** the live game is ahead of 0.13.1, but the repo maintainer (RandomGuy, who is involved with the game itself) has indicated an **updated data snapshot is coming soon to this same repo**. We build on 0.13.1 now; the refresh path is a first-class, documented workflow — replace `data/raw/*.json`, run `npm run data`, done. The current `gameVersion` is surfaced in the UI footer so users know which build the planner reflects.

Raw files used in Phase 1:
- `maps.json` — zones: `MonsterMinLevel`/`MonsterMaxLevel`, `MonsterPool[]`, `BossMonster`, `DisplayName`, `Slug`.
- `monsters.json` — per-monster drop tables: `EquipDrops`, `MaterialDrops`, `ConsumableDrops`, `GemDrops`, `Card`, `Artifact` (each `{Id, DropChance}`), plus `Element`, `Level`, `IsBoss`.
- Name-resolution lookups: `items.json`, `materials.json`, `equipment.json`, and (to be downloaded) `gems.json`, `consumables.json`, `artifacts.json`, `cards.json`.

### 3.2 Build pipeline — `scripts/build-data.mjs`
A Node script (run via `npm run data`, also wired as a `prebuild` step) that reads `data/raw/` and emits `src/data/zones.json`. Logic:

- **Resolve monsters:** for each zone, map `MonsterPool[]` + `BossMonster` to monster records.
- **Aggregate drops:** union every monster's drop entries. For each dropped `Id`:
  - resolve a **display name** via the lookup files (fallback to raw `Id` if missing);
  - keep the **best (max) `DropChance`** seen across the zone's monsters;
  - record **which monsters** drop it and a **`bossOnly`** flag;
  - tag a **`type`** (`equip` | `material` | `consumable` | `gem` | `card` | `artifact`).
- **Region grouping:** zones sharing a `Slug`/`DisplayName` (e.g. `Labyrinth 1–4` → "Forest Labyrinth") are grouped as **sub-zones of a named region**, but each sub-zone keeps its own level band and drop table (the reference map shows each level band as its own tile).
- **Hubs:** zones with empty `MonsterPool` and level 0 (`Nevaris`, `Wayfarer's Landing`) are flagged `isHub: true` — shown on the map but not addable to a route and have no drops.

**Output `src/data/zones.json`** (committed, so the dev server runs without a manual build):
```jsonc
{
  "regions": [{
    "id": "forest-labyrinth", "name": "Forest Labyrinth",
    "minLevel": 6, "maxLevel": 25,
    "subZones": [{
      "id": "labyrinth-1", "gameId": "Labyrinth 1",
      "minLevel": 6, "maxLevel": 10,
      "monsters": ["Bee","Seed","Cat Meow","Dog Pup"],
      "boss": null, "isHub": false,
      "drops": [{ "id":"Tree Bark","name":"Tree Bark","type":"material",
                  "chance":100,"bossOnly":false,"sources":["Bee","Seed"] }]
    }]
  }]
}
```

### 3.3 DropChance semantics — open question
`DropChance` is a number (e.g. `100`, `12`, `0.3`, `15`). It appears to be a percent-like weight. **Assumption:** display the raw value with a `%`-style affordance and a tooltip "raw drop weight from game data"; we refine the exact formula once confirmed against the live game / market site. Captured as **Open Question OQ-1**.

### 3.4 Hotspots — `src/data/hotspots.js`
A map of `subZoneId → { x, y, w, h }` as **percentages of the base map**, so they scale with the responsive image. ~40 sub-zone rectangles, authored manually against the trimmed map. Stored as data so a tile can later be swapped to SVG polygon points without touching anything else. A dev-only **calibration overlay** (grid + click-to-read-% ) makes authoring fast.

## 4. UI / components (React)

Layout (validated via mockup): **top bar**, a **map pane** (left/main), a **route rail** (right), and a **zone detail drawer** (below the map).

- **`TopBar`** — title, **player level** input, **drop-type filter** (`all`/equip/material/card/gem/consumable/artifact), **Share** button (copies URL).
- **`MapView`** — renders `assets/world-map.png` at fixed aspect ratio; overlays one `<button>` per hotspot. Each hotspot gets a CSS state class: `on-level` / `over-level` / `under-level` (from player level vs band) and `in-route` / `selected`. An absolutely-positioned **SVG overlay** draws a dashed **polyline through route hotspot centers** in route order. Click → select zone.
- **`ZoneDrawer`** — for the selected zone: name, level band, boss, monster list, and the **aggregated drop list grouped by type with chance** (respecting the active filter). Primary action: **Add to / Remove from route** (hidden for hubs).
- **`RouteRail`** — the ordered route: each entry shows name + level band, with **reorder** (up/down) and **remove**. Footer summary: **level coverage** (min–max), zone count, and **gaps** (level ranges between the route's min and max not covered by any route zone).

## 5. State, URL & persistence

State shape:
```js
{ playerLevel: 42, dropFilter: 'all', selectedZoneId: 'swamp', route: ['sunny-meadows','labyrinth-1', ...] }
```
- **Store:** React Context + `useReducer` (no extra state lib) in `src/state/store.js`.
- **URL schema:** `?lvl=42&route=sunny-meadows,labyrinth-1,fairy-glen` (sub-zone ids). `src/state/url.js` encodes/decodes; on change we `history.replaceState`. On load, URL params win; otherwise fall back to **localStorage**. Invalid/unknown route ids are dropped silently (kept: valid ones).

## 6. Level tinting & gap logic
- For band `[min,max]` and level `L`: `under` if `L < min`, `over` if `L > max`, else `on-level`. (Buffer = 0 in Phase 1; constant left configurable.) A **legend** sits on the map.
- **Gaps:** union the route's bands; within `[routeMin, routeMax]`, report any integer level range not covered.

## 7. Error handling
- Unresolved drop `Id` → fall back to raw id, dev-only `console.warn` once.
- Hub zones → drawer shows "Hub — no monsters"; not route-addable.
- Unknown URL ids → ignored, never throw.
- Map image load failure → neutral placeholder background; hotspots still function.

## 8. Testing (Vitest + Testing Library)
- **Pipeline unit tests:** drop aggregation (max-chance dedup, name resolution, `bossOnly`), region grouping, hub flagging.
- **Logic unit tests:** URL encode/decode round-trip, level-tint classification, gap detection.
- **Component tests:** clicking a hotspot selects the zone; add/remove updates rail + URL; filter narrows the drop list.
- Playwright e2e deferred to a later phase.

## 9. Build & deploy
- **Vite + React.** `vite.config.js` `base` set for GitHub Pages project path (or `/` with a custom domain).
- **GitHub Actions** (`.github/workflows/deploy.yml`): on push to `main` → `npm ci` → `npm run build` (runs `prebuild` data gen) → upload `dist/` to GitHub Pages.
- `package.json` scripts: `data` (build-data), `prebuild` (→ data), `dev`, `build`, `preview`, `test`.

## 10. Proposed structure
```
spirit-vale-map/
  assets/world-map.png              # trimmed base map (committed)
  data/raw/*.json                   # vendored game data (v0.13.1) + ATTRIBUTION
  scripts/build-data.mjs
  src/
    main.jsx  App.jsx
    components/{TopBar,MapView,ZoneDrawer,RouteRail}.jsx
    state/{store.js,url.js}
    data/{zones.json (generated),hotspots.js}
    styles/*.css
  .github/workflows/deploy.yml
  index.html  vite.config.js  package.json  README.md
```

## 11. Attribution & licensing — **must confirm before public hosting**
- Game data: `SpiritValeInfo` — verify its license permits redistribution; include an `ATTRIBUTION.md` + credit.
- Map art: spiritvalemarket.com — credit them; confirm reuse is acceptable for a community tool. **Open Question OQ-2.**

## 12. Open questions
- **OQ-1:** Exact meaning/formula of `DropChance` (percent vs weight). Display raw for now.
- **OQ-2:** Permission/attribution for reusing the map art and game data publicly.
- **OQ-3:** Hotspot granularity — assumed **per sub-zone** (per level-band tile). Confirm vs per named region.
- **OQ-4:** Final repo/product name (`spirit-vale-atlas` vs keep `spirit-vale-map`).

## 13. Phase roadmap (context only)
- **P1 (this):** Atlas + Route + Drops.
- **P2:** Build planner — class → advanced class, skill-tree allocation, shareable builds.
- **P3:** Gear & stats — equip gear, compute stats via `statMap`, "what should I farm?" linking gear back to route zones.
- **P4 (optional):** Damage simulator vs a zone's monsters.
