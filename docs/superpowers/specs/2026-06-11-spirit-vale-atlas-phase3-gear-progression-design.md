# Spirit Vale Atlas — Phase 3 Design (Gear Progression + "What to Farm")

**Date:** 2026-06-11
**Status:** Draft for review
**Builds on:** Phase 2 (Build Planner). Lives inside the **Builds** view, below the skill trees.

---

## 1. Summary

Add a **gear progression** to a build: a series of user-defined **loadout stages** keyed by level (e.g. Lv 1–10, Lv 11–20, …), tied to the selected class. Each stage is a 9-slot loadout, but stages are **delta-based** — a stage stores only the pieces that *change*, inheriting everything else from the previous stage, so a gear set acquired at Lv 40 carries through to Lv 90 without re-entry. Each gear piece shows its stats, gem sockets, set bonus, and **drop sources** (monster · zone · chance) + crafting. A stage's **"what to farm"** (only its *changed* pieces) can add those source zones to the Atlas levelling route.

Scope is gear loadout + sourcing + route integration. **Summed character stat-totals and damage simulation are deferred to Phase 4** (the current catalog exposes stats as display HTML, not summable numbers).

## 2. Goals & non-goals

**Goals**
- Plan how gear changes as you level — a complete, shareable levelling plan = route + skills + gear progression.
- Never re-farm carried gear: stages are deltas; the farm list shows only what changed.
- Bridge gear → map: add a stage's source zones to the route in one click.

**Non-goals (Phase 3):** summed stat-totals, damage sim, attribute (STR/AGI/…) allocation, gem/card/artifact *socketing* math, build comparison.

## 3. Data

### 3.1 Source
Current data from **spiritvalemarket.com `/api/catalog`** (`equipment` 448 items, plus artifacts/cards/gems/consumables/materials). Vendor a snapshot to `data/raw-builds/catalog.json` (already fetched; add to repo). Each equipment item: `{ name, slug, icon, equipmentType, slots (gem sockets), statsPrimary[], statsSecondary[], statsFullSet[], description, drops[], crafting }`. Stats are **HTML strings**; `drops[]` = `[{ monster:{name,slug,level,element,isBoss}, chance, maps:[{name,slug,minLevel,maxLevel}] }]`.

### 3.2 Build step — `scripts/build-gear.mjs`
Reads the vendored catalog, emits `src/data/gear.json` (committed), trimmed and **HTML-stripped to plain text** (no `dangerouslySetInnerHTML`; avoids XSS):
```jsonc
{
  "fetched": "2026-06-11",
  "slots": ["weapon","shield","headgear","face","chest","legwear","shoes","accessory","utility"],
  "items": {
    "abyss-shard": {
      "slug":"abyss-shard","name":"Abyss Shard","type":"Dagger","slot":"weapon",
      "sockets":2,
      "statsPrimary":["Atk: +20 +2 per refine","Matk: +10 +1 per refine"],
      "statsSecondary":["Double Attack: +50%","Shadow Step Damage +15% +2% per refine"],
      "setBonus":[], "description":"…",
      "sources":[{ "monster":"Dragonfly Arrow","isBoss":false,"chance":3,
                   "zoneName":"Swamp","zoneSlug":"swamp","minLevel":36,"maxLevel":40 }],
      "craft":{ "zoneSlug":"swamp","zoneName":"Swamp" }  // or null
    }
  }
}
```
- **`slot`** is derived by grouping `equipmentType` → slot: all weapon types (Dagger/Sword/Staff/Axe/Mace/Spear/Ranged/Book/Scythe/Pistol/Rifle/Shotgun/Twinblade/Gatling/Launcher/Katar) → `weapon`; `Shield`→shield; `Headgear`→headgear; `Face`→face; `Chest`→chest; `Legwear`→legwear; `Shoes`→shoes; `Accessory`→accessory; `Utility`→utility.
- **`type`** keeps the original `equipmentType` (for weapon sub-filtering + class compatibility).
- **`sources`** flattens `drops[]` to `{monster, isBoss, chance, zoneName, zoneSlug, minLevel, maxLevel}` rows.

### 3.3 Catalog zone → map tile resolver
A stage's source zones must map to Atlas route tile ids. Build a lookup keyed by **`${zoneName}|${minLevel}`** over `mapTiles` (Phase 1) — robust across the matched/pending split (the catalog zone slug alone doesn't always equal our tile id for pending zones). Unresolved zones are skipped (logged in dev). Add `tileByNameLevel` to `src/data/map-tiles.js` (or a resolver in gear logic).

### 3.4 Open questions
- **OQ-1 (slots):** assumed **9 single slots**. Confirm from the live builder whether there are 2 accessory slots or other multiples; if so, slot ids become `accessory1/accessory2` etc. — localized to the `slots` list + loadout rendering.
- **OQ-2 (class↔weapon):** which weapon `type`s each class can equip. The build "tied to class" filters the weapon picker. **MVP fallback:** if no clean mapping, show all weapon items (no class filter) and resolve the real mapping from the builder later.

## 4. Build model (extends Phase 2)

```js
build = {
  baseClass, advancedClass, levels,            // Phase 2
  gearStages: [                                // Phase 3 (sorted by fromLevel asc)
    { fromLevel: 1,  changes: { weapon: 'hunting-knife' } },
    { fromLevel: 16, changes: { weapon: 'bonefang' } },
    { fromLevel: 40, changes: { chest: 'plate-mail', headgear: '…', shoes: '…' } },
  ]
}
```
- **Effective loadout at stage *i*** = merge `changes` of every stage with index ≤ *i* (later stages override; `null` value = unequip). Computed by `effectiveLoadout(gearStages, i)`.
- A slot in the active stage is **changed** if its key is in that stage's own `changes`, else **carried** (shown dimmed with the stage it came from).

## 5. State, URL & route bridge

- **Store (extend Phase 2):** add `selectedStage` (index), `selectedItemSlug` (detail focus). Actions: `addGearStage{fromLevel}`, `removeGearStage{index}`, `setStageLevel{index,fromLevel}` (re-sorts), `setGearSlot{stageIndex,slot,itemSlug|null}`, `selectStage{index}`, `selectItem{slug}`. The existing `addToRoute` is reused for the farm bridge (dispatch once per resolved tile id).
- **URL:** extend the build param with a 4th `~` segment for gear:
  `?build=acolyte~priest~heal:5~1:weapon=hunting-knife;16:weapon=bonefang;40:chest=plate-mail,headgear=…`
  Stage sep `;`, `fromLevel:` prefix, slot `=` item, multiple changes `,`-joined. Slugs are `[a-z0-9-]` so these separators never collide. Backward compatible — no 4th segment ⇒ no gear. `sanitizeBuild` (Phase 2) is extended to validate gear (drop unknown items/slots, clamp levels 1–135, sort stages, ensure a stage at the lowest level).
- **Farm bridge:** "Add this stage's zones to route" resolves the stage's **changed** items' `sources[].(zoneName,minLevel)` → tile ids → `addToRoute`. A whole-progression variant adds all stages' changed-item zones. After adding, a small toast confirms; the route lives in the Atlas (switchable via the existing toggle).

## 6. UI / components (in `BuildView`, below the skill trees)

- **`GearProgression`** — section container; shows the stage rail + the active stage's loadout + item detail.
- **`GearStageRail`** — the user-defined stages as chips (`Lv 1–10`, `Lv 11–20`, …, active highlighted) + **"＋ Add stage"** (prompts a start level) + per-stage remove. Editing a stage's start level re-sorts. Seeded with a single stage at Lv 1; "add 10-level brackets" quick action optional.
- **`GearLoadout`** — the 9-slot strip for the active stage. Each slot shows the **effective** item; **changed** slots are highlighted, **carried** slots dimmed with a "from Lv N" tag. Click a slot → open the picker; an equipped slot offers "change" / "revert to carried".
- **`GearPicker`** — filterable list of items for the clicked slot (search by name; weapons sub-filtered by class via OQ-2; sort by name). Selecting sets a delta on the active stage.
- **`ItemDetail`** — selected item: type, sockets, stats (plain-text lines), set bonus, description, **sources** (zone · Lv band · best chance · monsters, boss-flagged), craft zone, and **"＋ Add this stage's zones to route"**.

## 7. Allocation/derivation logic — `src/logic/gear.js`
Pure functions over `(gear data, build)`:
- `effectiveLoadout(gearStages, index)` → `{slot: itemSlug}` merging changes ≤ index.
- `stageChangedSlots(stage)` → keys of `stage.changes`.
- `stageFarmTiles(stage, gearData, tileResolver)` → unique tile ids from changed items' sources.
- `itemsForSlot(slot, classSlug)` → filtered/sorted item list for the picker (class filter applied to `weapon` via OQ-2 mapping or all-weapons fallback).
- `sortStages(stages)` → ascending by `fromLevel`, dedupe equal levels.

## 8. Error handling
- Unknown item/slot/zone in a `?build=` gear segment → dropped by `sanitizeBuild`.
- A stage referencing a class-incompatible weapon (e.g. after a class change) → the slot is cleared with a dev log; loadout still renders.
- A source zone that doesn't resolve to a tile → skipped in the farm action (others still added).
- No gear stages yet → the section shows an "Add a gear stage" prompt; skill trees are unaffected.
- Items with empty `sources` (craft-only / shop) → detail shows "No drop source — craft only" and the farm button is disabled for that item.

## 9. Testing (Vitest + Testing Library)
- **Pipeline:** `build-gear.mjs` slot grouping, HTML→text stripping, source flattening, craft extraction.
- **Logic:** `effectiveLoadout` merge incl. carry-over and `null` unequip; `stageChangedSlots`; `stageFarmTiles` resolves zones→tiles (and skips unresolved); `sortStages`; gear URL encode/decode/sanitize round-trip incl. multi-stage.
- **Components:** adding a stage + setting a slot shows the item; a later stage shows the prior item as **carried** (dimmed) until overridden; the farm button dispatches `addToRoute` for the resolved tiles; picker filters by slot.

## 10. Files (new / changed)
```
data/raw-builds/catalog.json          # vendored API snapshot
scripts/build-gear.mjs                # → src/data/gear.json
src/data/gear.json                    # generated, committed
src/data/map-tiles.js                 # + tileByNameLevel resolver (modify)
src/logic/gear.js                     # gear derivation (pure)
src/state/build-url.js                # gear segment encode/decode/sanitize (modify)
src/state/store.jsx                   # gear stage actions (modify)
src/components/GearProgression.jsx  GearStageRail.jsx  GearLoadout.jsx  GearPicker.jsx  ItemDetail.jsx
src/components/BuildView.jsx          # mount GearProgression under the trees (modify)
src/styles/app.css                    # gear styles (modify)
package.json                          # data/prebuild add build-gear (modify)
ATTRIBUTION.md                        # catalog credit already added in P2 — confirm
```

## 11. Phase roadmap (context)
- **P4 (next after this):** stat totals (parse/structured) + damage simulator vs a zone's monsters.
- **Backlog:** route timeline showing the active gear stage per level band; gem/card/artifact socketing.
