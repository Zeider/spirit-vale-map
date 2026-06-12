# Spirit Vale Atlas — Phase 4 Design (Stat Sheet, Notes & Annotated Route)

**Date:** 2026-06-11
**Status:** Draft for review
**Builds on:** Phases 1–3 (Atlas + Build planner + Gear progression), all shipped.

---

## 1. Summary

Phase 4 turns the planner into a fully **annotated** plan and adds the achievable half of "stats". Five parts:

1. **Tabs** — split the single "Builds" view into **Atlas · Build · Gear** (gear gets its own tab next to Build).
2. **Build notes** — a resizeable free-text notes area on the Build tab (build order, alternative gear, strategy), saved in the share URL.
3. **Gear stat sheet** — on the Gear tab, sum the active stage's loadout into total flat stats (Atk, Matk, Def, HP, crit, %s…), plus a raw attribute (STR/AGI/VIT/INT/DEX/LUK) allocator. Includes a **rework of the stage add-flow** (no `window.prompt`; contiguous level ranges).
4. **Annotated route** — each Atlas route zone expands to show per-zone **notes** (shared in the URL) and **wanted items** (auto-attached when added from the Gear tab; manually add/remove).
5. **Item-stats hover tooltip** — one reusable popover showing a gear item's stats, used on the zone **drops table**, route **wanted items**, and the gear picker.

**Damage/DPS simulation is explicitly out of scope** (deferred indefinitely): the game's attribute→stat and damage formulas, and monster combat stats, exist in no available data source (catalog stats are display-HTML; monster data has no HP/armor; no formula API). We do the accurate parts (summed flat gear stats, raw attributes) and don't fabricate damage numbers.

## 2. Goals & non-goals

**Goals:** annotate the whole plan (build + per-zone), surface gear stat totals, unify item hover info, clean tab structure.
**Non-goals:** DPS/damage simulation, attribute→derived-stat conversion, refine-level stat math, gem/card/artifact stat contributions, build comparison.

## 3. Parts

### 3.1 View tabs — Atlas · Build · Gear
`state.view` becomes `'atlas' | 'build' | 'gear'` (renames `'builds'`→`'build'`, adds `'gear'`). `TopBar` shows a 3-way toggle. `App` renders by view:
- **Atlas:** map + route (Phase 1) — unchanged except the enriched route (§3.4) and drop hover (§3.5).
- **Build:** `ClassPicker` + skill trees + skill detail + **build notes** (§3.2).
- **Gear:** the gear progression (Phase 3 `GearProgression`, moved here) + **stat sheet** (§3.3). Shows "Pick a class on the Build tab first" if `baseClass` is null.

`BuildView` is split into `BuildTab.jsx` (skills) and `GearTab.jsx` (gear). `GearProgression` moves from BuildView into `GearTab`.

### 3.2 Build notes
A **resizeable** `<textarea>` (`resize: vertical`) in the Build tab's right column, **below** the skill-detail panel (it fills the empty space there). Bound to `build.notes` (string). Shared in the `?build=` URL (§4). Placeholder: "Build order, alternative gear, strategy…".

### 3.3 Gear stat sheet + stage rework
**Stat parsing (build time):** `build-gear.mjs` parses each item's `statsPrimary`/`statsSecondary` HTML into `parsedStats: [{ label, value, perRefine, percent }]` — e.g. `"Atk: +20 +2 per refine"` → `{label:'Atk', value:20, perRefine:2, percent:false}`; `"Double Attack: +50%"` → `{label:'Double Attack', value:50, perRefine:0, percent:true}`. Lines that don't match the `Label: +N[%] [+M per refine]` pattern are kept as `{label, raw}` (shown verbatim, not summed).

**Craft materials (build time):** `build-gear.mjs` also enriches each item's `craft` with its materials list: `craft: { zoneSlug, zoneName, materials: [{ name, count }] }` (e.g. `Larva ×75`). **There is no gold/price field in any data source** (catalog items and the market's `known-items.json` have none), so the "cost" we can show is the **crafting materials**, not a gold price.

**Card slots (terminology fix):** the catalog `slots` field is the item's **card-slot count** (where cards are socketed — 0–4), not gem sockets. Phase 3 stored it as `sockets`; rename it to `cardSlots` in `build-gear.mjs`/`gear.json` and label it "card slots" everywhere (the Phase 3 `ItemDetail` "N sockets" text is corrected to "N card slots").

**Stat sheet (`StatSheet.jsx`, Gear tab):** sums the active stage's **effective loadout** parsed stats by `label` (base values at refine 0 — refine level is not modeled in v1; flat-stat sheet only). Renders a stat table (label → summed value, with `%` suffix where `percent`). Non-summable `raw` lines are listed separately under the item, not totalled. A short note states it's a base-stat sum (no refine/attribute/skill scaling).

**Attributes:** `build.attributes = {str,agi,vit,int,dex,luk}` (default all 1). A simple `−/+` allocator shown on the Gear tab (or Build tab — Gear tab, beside the stat sheet). **Raw points only** — no derived-stat conversion (formula unavailable). Shared in the URL.

**Stage add rework:** replace the `window.prompt` flow. `GearStageRail` gets an inline "＋ Add stage" that reveals a small number input (default = `max(existingLevels)+10`, clamped 1–135) + confirm; on add, the reducer inserts and re-sorts. Stage chips show **contiguous** ranges: stage *i* covers `from[i]` to `from[i+1]-1` (last → 135). This already-intended behavior is reimplemented cleanly so labels read `Lv 1–9`, `Lv 10–135` (fixes the live mislabel). Editing a stage's start level (click the range) is allowed and re-sorts.

### 3.4 Annotated route
**Model:** route entries become objects: `route: [{ id, notes: '', wants: [itemSlug] }]`. Migration on load: a legacy `[id]` array (or old `route=a,b` URL) maps to `[{id, notes:'', wants:[]}]`.

**Store actions:** `addToRoute{id, want?}` (adds the zone if absent; appends `want` to that zone's `wants` deduped); `removeFromRoute{id}`; `moveInRoute{index, dir}`; `setZoneNotes{id, notes}`; `addZoneWant{id, itemSlug}`; `removeZoneWant{id, itemSlug}`; `toggleZoneExpanded{id}` (UI; or local component state).

**`RouteRail`:** each zone is a header row (position, name, level band, reorder, remove, select-on-map) that **expands** on click to show: a **WANT HERE** list of wanted-item chips (name + drop %, each with remove + hover tooltip §3.5) and a **＋ add item** picker; and a per-zone **NOTES** textarea (`setZoneNotes`). Level-coverage + gap summary use `entry.id`. `MapView` route polyline maps `route.map(e => e.id)`.

**Gear → route bridge:** the Gear tab's `ItemDetail` farm button dispatches `addToRoute{id, want: item.slug}` for each resolved source tile, so the item is recorded as a want on the zone(s) it was added for.

### 3.5 Item-stats hover tooltip
A reusable `ItemTooltip` (a positioned popover; CSS-driven on hover, or a tiny hook). Given an item slug (or a gear item resolved by name), it shows:
- name, type, **card slots** (the `cardSlots` count, 0–4);
- parsed primary/secondary stats + set bonus;
- a **drop line** — the mob(s) that drop it + zone + best chance (e.g. "Drops: Dragonfly Arrow · Swamp · 3%"; boss-flagged);
- a **craft line** when craftable — the craft zone + materials (e.g. "Craft @ Swamp: Larva ×75"). No gold price is shown (not in the data).

Used in:
- **Route wanted-item chips** (Atlas route) — by slug.
- **Gear picker rows / item chips** — by slug.
- **Zone drops table** (`ZoneDrawer`) — for `type==='equip'` drops, resolve `gearByName[drop.name]` → tooltip. Non-equip drops (material/card/gem/consumable/artifact) have no stat data → show name + type only.

`gearByName` (a `{name: item}` index) is added to `gear-index.js` to bridge zone drop display-names → gear items.

## 4. State, URL & persistence

The shareable `?build=` and `?route=` params now carry free text (notes) and nested structures, so both switch to **base64url-encoded JSON**, with a **legacy fallback** so existing links keep working:
- `encodeBuild(build)` → `base64url(JSON.stringify({baseClass, advancedClass, levels, gearStages, attributes, notes}))`.
- `decodeBuild(str)` → try base64url-JSON; if it fails, fall back to the Phase 2/3 `~`-delimited parser. `sanitizeBuild` validates the result (known class/skills/items, clamped levels, sorted stages, attribute defaults, notes string).
- `encodeRoute(route)` / `decodeRoute(str)` → base64url-JSON of `[{id, notes, wants}]`, with fallback to the legacy comma-id list. `sanitizeRoute` keeps known tile ids + known item wants.
- Atlas URL: `?lvl=42&route=<b64>`. Build/Gear URL: `?view=build&build=<b64>` (or `view=gear`). `sync.js` persists per active view; `loadInitialState` decodes both.

`build.notes` and route `notes` are shared (user chose URL-shared notes). localStorage still mirrors atlas (level+route) as a fallback.

## 5. Components (new / changed)
```
src/components/BuildTab.jsx        # skills + build notes (was the build half of BuildView)
src/components/GearTab.jsx         # gear progression + StatSheet + attributes
src/components/BuildView.jsx       # REMOVED (split into BuildTab/GearTab) or thin router
src/components/StatSheet.jsx       # summed loadout stats + attribute allocator
src/components/BuildNotes.jsx      # resizeable textarea bound to build.notes
src/components/ItemTooltip.jsx     # reusable hover stats popover
src/components/RouteRail.jsx       # expandable zones: notes + wants (modify)
src/components/ZoneDrawer.jsx      # equip-drop hover tooltip (modify)
src/components/GearStageRail.jsx   # inline add + contiguous ranges (modify)
src/components/MapView.jsx         # route entries are objects now (modify)
src/components/TopBar.jsx          # 3-way Atlas/Build/Gear toggle (modify)
src/components/ItemDetail.jsx      # farm button passes the want (modify)
src/App.jsx                        # render by 3 views (modify)
```

## 6. Logic / data (new / changed)
```
scripts/lib/build-gear.mjs   # + parseStat() → parsedStats on each item (modify)
src/data/gear-index.js       # + gearByName index (modify)
src/logic/stats.js           # sumLoadoutStats(loadout) -> [{label,value,percent}]  (pure, new)
src/state/build-url.js       # base64url build encode/decode/sanitize + legacy fallback; + notes/attributes (modify)
src/state/route-url.js       # base64url route encode/decode/sanitize + legacy fallback (new)
src/state/store.jsx          # route objects, build.notes, build.attributes, new actions (modify)
src/state/sync.js            # use route-url; persist build notes/attrs (modify)
```

## 7. Error handling
- Legacy `?build=`/`?route=` links (non-base64) → parsed by the fallback parser; invalid parts dropped by sanitize.
- A wanted item that no longer exists in gear data → dropped from the zone on load.
- A zone drop name with no `gearByName` match → tooltip shows name+type only (no crash).
- Unparseable stat line → kept as `raw` text, excluded from totals.
- Empty route/build → tabs render their empty prompts; no errors.

## 8. Testing (Vitest + Testing Library)
- **Pipeline:** `parseStat` on `+N`, `+N%`, `+N per refine`, and non-matching lines.
- **Logic:** `sumLoadoutStats` aggregates by label incl. percent; route-url + build-url base64 round-trip AND legacy-fallback decode; sanitizeRoute/Build drop unknowns; stage range labels are contiguous (`1–9`,`10–135`).
- **Store:** `addToRoute{id,want}` appends a deduped want; `setZoneNotes`/`addZoneWant`/`removeZoneWant`; route-object migration from legacy id list; `build.notes`/`attributes` actions.
- **Components:** TopBar 3-way toggle switches views; a route zone expands to a notes textarea + want chips; hovering a want/equip-drop renders the tooltip; StatSheet shows a summed Atk for a 2-item loadout; BuildNotes edits persist to `build.notes`.

## 9. Open questions
- **OQ-1:** Refine level is not modeled (stat sheet sums base values only). If you later want a global "+N refine" slider (like base44's "+10 All"), it's an additive enhancement to `sumLoadoutStats`.
- **OQ-2:** Attribute points are raw (no derived stats) — purely a record of your planned allocation until the game's attribute formulas are available.

## 10. Roadmap after Phase 4
- If the game's formulas + monster combat stats ever become available (a SpiritValeInfo update, a documented wiki, or an extractable source), revisit a real **DPS/damage simulator** as Phase 5.
