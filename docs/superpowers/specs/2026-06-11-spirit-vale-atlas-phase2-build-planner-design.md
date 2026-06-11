# Spirit Vale Atlas — Phase 2 Design (Build Planner)

**Date:** 2026-06-11
**Status:** Draft for review
**Builds on:** Phase 1 (Atlas + Route + Drops), shipped to `main`.

---

## 1. Summary

Add a **Build Planner** as a second top-level view alongside the Atlas. The player picks a **base class**, optionally **advances** to its advanced class, and allocates **skill points** across each class's 6×7 skill tree — respecting prerequisites and a **point budget of 1 per job level** (base = 50, advanced = 70, separate pools). Clicking a skill shows its details (cost / cooldown / damage scaling, prerequisites). The build is shareable via a `?build=` URL.

Scope is **skill trees + advanced-class progression**. Attributes (STR/AGI/…) and gear are **Phase 3**; damage simulation is **Phase 4**.

## 2. Goals & non-goals

**Goals**
- Plan a class build (base + advanced) by allocating skill points with the game's real rules.
- Use **current** game data (the live builder API), not the stale v0.13.1 class files.
- Shareable, bookmarkable builds; clean separation from the Atlas view.

**Non-goals (Phase 2):** attribute/stat allocation, gear, cost totals, damage simulation, build comparison, accounts/leaderboards.

## 3. Data

### 3.1 Source — switch to the live builder API
Phase 1's `SpiritValeInfo` snapshot (v0.13.1) is stale. **spiritvalemarket.com exposes a public JSON API** with current data:
- `https://spiritvalemarket.com/api/build-simulator` → `{ classes[15], classSkillTrees{}, skillMap{208} }`
- `https://spiritvalemarket.com/api/catalog` → equipment / artifacts / cards / gems / consumables / materials (reserved for Phase 3).

Vendor a snapshot of `build-simulator` into `data/raw-builds/build-simulator.json` (+ `ATTRIBUTION` note + fetch date, since the payload carries no version field). Refresh = re-fetch + re-run the build step.

**Shapes (verified):**
- `classes[i]`: `{ Slug, GameId, DisplayName, Description, Type: 'base'|'advanced', MaxJobLevel, AdvancedClasses: string[], SkillTree }`.
- `classSkillTrees[ClassName]`: 6×7 grid; each cell is `null` or a skill object `{ id, name, description, maxLevel, isPassive, requirements: [{id,name,level}], values }`.
- `skillMap[id]`: same skill object. `values` may contain `cost`, `cooldown`, `damage`, each `{ base, level, scaling? }`. Passives have `values: []`.

### 3.2 Build step — `scripts/build-classes.mjs`
Reads the vendored snapshot, emits `src/data/classes.json` (committed):
```jsonc
{
  "classes": [{
    "slug": "acolyte", "name": "Acolyte", "type": "base",
    "maxJobLevel": 50, "advancedClasses": ["Priest"],
    "grid": [[null,"heal",null,"codex-mastery",null,"increased-recovery",null], …6 rows]
  }],
  "skills": {
    "heal": { "id":"heal","name":"Heal","description":"…","maxLevel":5,"isPassive":false,
              "requirements":[{ "id":"…","level":1 }],
              "cost":{"base":10,"level":5},"cooldown":{"base":1,"level":0},"damage":null }
  }
}
```
Grid cells are skill **ids** (deduped into `skills`), taken from `classSkillTrees` (whose embedded objects carry the slug `id` that matches `skillMap`). The class-level `SkillTree` field uses capitalized GameIds and is **not** used (id mismatch).

### 3.3 Advanced-class mapping — Open Question OQ-1
`classes[].AdvancedClasses` is **incomplete** even in the current API (only 5 of 7 base classes list an advancement; Knight/Warrior list none; Berserker/Paladin/Weaver are unlinked) — yet the live builder UI shows e.g. Warrior→Berserker. So the API field is not the full mapping. **Resolution:** during implementation, extract the real per-base advancement by driving the live builder (select each base class, read the advanced row) and bake the mapping into `build-classes.mjs`. Until then, fall back to `AdvancedClasses` and show "no advancement available" where empty.

## 4. UI / components

A view toggle switches the app between **Atlas** (Phase 1) and **Builds**. Builds layout (validated via mockup, modeled on spiritvalemarket's builder):

- **`TopBar` (made view-aware):** always shows the **Atlas / Builds toggle** + `gameVersion`/data badge. In Atlas view: level input, drop filter, Share-route. In Builds view: **Share-build**, **Reset**.
- **`BuildView`** (shown when `view === 'builds'`): composes the pieces below.
- **`ClassPicker`:** a **BASE** row (the 7 base classes as selectable chips) and an **ADVANCED** row (the selected base's advancement options; hidden if none). Selecting a base resets the advanced selection.
- **`SkillTree`:** renders one class's 6×7 grid. The base tree always shows; if an advanced class is selected, its tree renders **below** with its own header + budget bar. Props: `classSlug`, `levels`, `onChange`.
- **`SkillCard`** (grid cell): `null` → empty cell; otherwise a card with a **PASSIVE/SKILL** badge, skill name, `level/maxLevel`, and **`−` / `+`** steppers. Filled (level > 0) cards are highlighted. Clicking the card body selects it for the detail panel.
- **`SkillDetail`:** for the selected skill — name, passive/active, description, **cost / cooldown / damage per level** (computed `base + level·n`), and **prerequisites** (+ a derived "unlocks" list).
- **`BudgetBar`:** per tree — `points used / maxJobLevel`, turns red if over (shouldn't happen — allocation is blocked at the cap).

## 5. Build model, state & URL

```js
build = { baseClass: 'acolyte', advancedClass: 'priest' | null, levels: { 'heal': 5, 'faith': 5, … } }
```
- **Store:** extend the Phase 1 store with `view: 'atlas'|'builds'` and `build`. New actions: `setView`, `selectClass` (sets base, clears advanced + levels), `selectAdvanced`, `setSkillLevel`, `selectSkill` (detail focus), `resetBuild`.
- **URL (`src/state/build-url.js`):** `?view=builds&build=acolyte~priest~heal:5,faith:5,grace:1` (advanced omitted → `acolyte~~heal:5`). Skill ids are hyphen-slugs; `~` separates the three fields, `,` separates entries, `:` separates id and level. Atlas params (`lvl`, `route`) remain independent. `loadInitialState` parses `view` + `build`; persistence writes whichever view is active.

## 6. Allocation rules — `src/logic/build.js`

Pure functions over `(classes data, build)`:
- **`treeOf(skillId)`** → which class tree a skill belongs to (base or advanced), via grid membership.
- **`pointsUsed(build, tree)`** → sum of levels of skills in that tree.
- **`budget(classSlug)`** → `maxJobLevel`.
- **`requirementsMet(skillId, build)`** → every prereq `{id, level}` has `build.levels[id] >= level`.
- **`canIncrement(skillId, build)`** → `level < maxLevel` AND `requirementsMet` AND `pointsUsed(tree) < budget(tree)`.
- **`canDecrement(skillId, build)`** → `level > 0` AND **no currently-allocated skill lists this skill as a prerequisite at a level that would break** (block, don't cascade). 
- `setSkillLevel` action validates against these; the UI disables steppers when not allowed and shows a tooltip reason.

## 7. Error handling
- Unknown class/skill ids in a `?build=` URL → dropped silently; valid parts kept.
- A `build` whose levels violate budget/requirements (hand-edited URL) → clamp on load (drop skills whose requirements aren't met, then trim lowest-priority over-budget skills) and log once in dev.
- Missing `values` (passives) → detail panel shows description only, no scaling rows.
- Advanced class with no tree data → render base tree only, note advancement unavailable.

## 8. Testing (Vitest + Testing Library)
- **Pipeline:** `build-classes.mjs` grid→id resolution, skill dedup, requirement passthrough.
- **Logic:** `canIncrement` respects max/requirements/budget; `canDecrement` blocked by a dependent; `pointsUsed` per tree; build-URL encode/decode round-trip; clamp of an over-budget/illegal URL build.
- **Components:** picking a class renders its tree; `+` increments within budget and is disabled at the cap; a locked skill's `+` is disabled until its prereq is raised; selecting a skill fills the detail panel; view toggle swaps Atlas ↔ Builds.

## 9. Files (new / changed)
```
data/raw-builds/build-simulator.json   # vendored API snapshot (+ ATTRIBUTION note)
scripts/build-classes.mjs              # → src/data/classes.json
src/data/classes.json                  # generated, committed
src/state/build-url.js                 # build encode/decode
src/logic/build.js                     # allocation rules (pure)
src/components/BuildView.jsx  ClassPicker.jsx  SkillTree.jsx  SkillCard.jsx  SkillDetail.jsx  BudgetBar.jsx
src/components/TopBar.jsx               # made view-aware (modify)
src/App.jsx                            # view switch atlas|builds (modify)
src/state/store.jsx                    # + view, build, actions (modify)
src/state/sync.js                      # persist view+build (modify)
src/styles/app.css                     # build planner styles (modify)
```

## 10. Attribution
Build/skill data and (Phase 3) catalog data come from **spiritvalemarket.com's public API**. Update `ATTRIBUTION.md` to credit it alongside SpiritValeInfo + the map art. Confirm reuse is acceptable (community tool).

## 11. Open questions
- **OQ-1:** Full base→advanced class mapping (API field incomplete) — resolve by extracting from the live builder during implementation.
- **OQ-2:** Does the game share one skill-point pool across base+advanced, or separate pools? Assumed **separate** (50 + 70, matching per-class `MaxJobLevel`). Confirm.
- **OQ-3:** Should the map's 12 "pending" zones be backfilled from the spiritvalemarket API too? Out of scope here; tracked for a Phase 1 data refresh.
