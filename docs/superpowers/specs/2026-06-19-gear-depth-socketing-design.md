# Gear-Depth Socketing — Design

**Status:** Approved design, pre-implementation.
**Date:** 2026-06-19
**Branch:** `feat/qa-round1`
**QA items closed:** C (artifacts in gear stage), I (cards into equipment).

## Goal

Let a build plan, **per level band**, the cards socketed into equipment and the
4 artifacts (with their gems) — and fold all of it into the gear stat totals.
This replaces today's read-only artifact catalog and the complete absence of
card/gem support.

## Background — current state

- Gear stages: `gearStages = [{ toLevel, changes: { slot: itemSlug|null } }]`.
  `effectiveLoadout(stages, idx)` accumulates `changes` across bands (later band
  overrides; `null` = unequip). Items carry `cardSlots` (0–3).
- `ArtifactPanel` is a static read-only list of 27 artifact **sets** (each with
  `fullSet` / `perPiece` / `perRefine` bonus lines). Not interactive, not staged.
- Gems are **not** in `gear.json` (catalog has 129; each has `affix` + a `stats`
  string array).
- Cards **are** in `gear.json` (244), each with `equipSlot`
  (Weapon/Headgear/Chest/Shield/Legwear/Shoes/Accessory; 2 are slot-agnostic)
  and a `stats` string array.
- `sumLoadoutStats(loadout, items)` sums item `parsedStats` by label, feeding
  StatSheet's "TOTAL STATS (from gear)".
- Serialization (`build-url.js`): `encodeBuild` base64url-JSONs the build incl.
  `gearStages` **wholesale**; `decodeBuild`/`sanitizeBuild`/`normalizeStages`
  validate it.

## Game model (confirmed with the user, from in-game screenshots)

- **Cards** socket into an equipment item's card slots (count = `item.cardSlots`).
- **Artifacts** occupy **4 typed slots: Rune, Jewel, Scroll, Relic.** Each slot
  holds one piece **of a chosen set** (e.g. "Spellweaver Rune"). Our data models
  the 27 sets, not the per-type pieces — fine, because every piece of a set
  contributes the **same** per-piece bonus.
  - **Per-piece** bonus applies once per slot filled with that set.
  - **Full-set** bonus applies when **all 4 slots hold the same set**.
- Each artifact slot holds **gem(s)**. `gemSlots` is 0/unpopulated in our data,
  so we default to **1 gem per artifact slot** (4 gems max). Revisit if data
  populates `gemSlots`.

## Data model changes

Each gear stage gains two **optional** channels, accumulated across bands exactly
like `changes` (later band overrides earlier; absence = inherit):

```js
{
  toLevel,
  changes:   { [slot]: itemSlug | null },              // unchanged
  cards:     { [slot]: (cardName | null)[] },           // NEW — per equip slot
  artifacts: { rune|jewel|scroll|relic: { set, gem } | null }, // NEW
}
```

- `cards[slot]` is an array indexed by card-slot position; entries are a card
  `name` (cards are keyed by name in `gear.json`) or `null` (empty socket).
- `artifacts[type]` is `{ set: artifactSlug, gem: gemSlug|null }`, or `null`
  (clear that artifact slot for this band onward).
- Both omitted on legacy builds → empty → identical to today.

### New accumulation helpers (`src/logic/gear.js`)

- `effectiveCards(stages, idx) -> { [slot]: (cardName|null)[] }` — same fold as
  `effectiveLoadout` over the `cards` channel. Cards persist per **slot** even
  when the item changes; the UI/stat layer caps each array to the effective
  item's `cardSlots` (extra entries ignored, not dropped from data).
- `effectiveArtifacts(stages, idx) -> { [type]: { set, gem } }` — same fold over
  `artifacts`; `null` clears the type.

## Data pipeline — add gems

- `scripts/lib/build-gear.mjs`: add `buildGems(catalog)` mirroring `cardOf` →
  `{ kind:'gem', name, slug, affix, description, stats: [...] }` from the 129
  catalog gems. Export under a new `gems` key in `gear.json`.
- `src/data/gear-index.js`: export `gems` and a `gemByName`/`gemBySlug` lookup.
- Artifacts already present (27 sets) — no data change needed; we treat each as a
  pickable set for any of the 4 typed slots.

## Stat calculation (`src/logic/stats.js`)

Extend the gear-total computation (StatSheet) to fold in sockets. Card/gem/
artifact stat lines are **display strings**, so they must be parsed. The
build-time parser lives in `scripts/lib/build-gear.mjs` (Node-only, not
importable from the browser bundle), so **add a `parseStat` to
`src/logic/gear-stats.js`** (a small, identically-behaving copy of the
build-time regex) and use it for all socket stat summing. Sum by label like
items. New surface:

- `sumSocketStats({ loadout, cards, artifacts }, { items, cardsByName, gemsByName, artifactsBySlug })`
  returns the same `{ label, value, percent }[]` shape, summing:
  - **Cards:** for each slot, for each socketed card (capped to item.cardSlots),
    parse + add its `stats`.
  - **Artifacts per-piece:** for each set present across the 4 slots, add its
    `perPiece` × (count of slots holding that set).
  - **Artifacts full-set:** if all 4 typed slots hold the **same** set, add that
    set's `fullSet` once.
  - **Gems:** for each socketed gem, parse + add its `stats`.
- StatSheet merges `sumLoadoutStats` + `sumSocketStats` (combine by label).
- Keep the existing caveat note ("base totals, no refine/attribute/skill
  scaling"); `perRefine` lines stay display-only, not summed.

## Reducer actions (`src/state/store.jsx`)

All operate on `state.selectedStage` band; all are additive and leave existing
actions untouched.

- `setCardSlot { stageIndex, slot, index, card }` — set `cards[slot][index]` to a
  card name or `null`. Initializes the array if missing.
- `setArtifact { stageIndex, type, set }` — set `artifacts[type] = { set, gem:null }`,
  or `null` to clear (preserve existing gem when only the set changes? No — set
  defines the piece; changing set keeps the gem: `{ set, gem: prevGem }`).
- `setArtifactGem { stageIndex, type, gem }` — set `artifacts[type].gem` (no-op
  if the type has no set yet).

## Serialization & back-compat (`src/state/build-url.js`)

- `encodeBuild` already serializes `gearStages` wholesale → `cards`/`artifacts`
  ride along with **no change**.
- `normalizeStages` / `sanitizeBuild`: carry through `cards` and `artifacts`,
  validating against the data:
  - drop card names not in `gear.json` cards; keep `null` slots; cap each slot's
    array to 3 entries (the max `cardSlots` in the data).
  - drop artifact entries whose `set` isn't a known artifact slug; drop `gem` not
    in gems; allow `{ set, gem:null }`.
- Legacy links (no `cards`/`artifacts`) decode to empty channels → unchanged
  behavior. **No version bump needed** — purely additive keys.

## UI (Gear view — `GearTab`)

**Option A — inline card pips + interactive 4-typed-slot artifact panel.**

### Card pips — `GearLoadout.jsx`
- Under each filled gear slot, render `item.cardSlots` pips. A filled pip shows
  the card's short name; an empty pip shows `＋`.
- Clicking a pip opens a **card picker** for that `{slot, index}`, filtered to
  cards whose `equipSlot` matches `categoryOf(slot)` (case-insensitive) plus the
  2 slot-agnostic cards. Choosing dispatches `setCardSlot`; an "Unequip"/clear
  option sets `null`.
- Pip state reads from `effectiveCards(...)[slot]`, capped to `cardSlots`.

### Artifact panel — replace `ArtifactPanel.jsx`
- Four rows: **Rune / Jewel / Scroll / Relic.** Each row:
  - Set name (or `＋ pick set`) → opens an **artifact-set picker** (the 27 sets;
    shows per-piece/full-set bonus on hover via existing `ItemTooltip`-style).
  - A gem chip (or `＋ gem`) → opens a **gem picker** (129 gems, searchable).
  - Clear actions set the slot / gem to `null`.
- Footer: "✦ Full-set: N/4 \<set\>" — N = max count of any single set across the
  4 slots; highlights when N = 4.
- Reads from `effectiveArtifacts(...)`. All staged off `selectedStage`.

### Pickers
- Reuse the existing picker pattern (`GearPicker` + `openSlot` in store). Add
  parallel open-state: `openCard { slot, index }`, `openArtifact type`,
  `openGem type`. Each picker is a small searchable list (cards/gems are long).
  Prefer one generic `<Picker>` over three near-duplicates.

### StatSheet
- "TOTAL STATS (from gear)" now includes socket contributions (see Stat calc).

## Edge cases & decisions

- **Cards persist per slot** across item changes (capped to new item's
  `cardSlots`). Simple and predictable; documented in UI copy if needed.
- **Gem without set:** a gem can only be socketed once an artifact set is chosen
  for that type (`setArtifactGem` no-ops otherwise).
- **Full-set partial:** mixed sets give per-piece only; the footer shows progress.
- **`face`/`utility` slots** have no cards in data → render 0 pips.
- **XSS:** card/gem/artifact strings render as text (or via existing escaped
  tooltip path); no `dangerouslySetInnerHTML` of socket data.

## Out of scope (YAGNI)

- Per-type distinct artifact-piece stats (data doesn't distinguish them).
- Multiple gems per artifact (default 1 until `gemSlots` data populates).
- Refine/attribute/skill stat scaling (already out of scope app-wide).
- Auto-routing artifacts/gems to zones (artifacts have `zones`; can be a later
  follow-up to the "add zones to route" flow, not part of this spec).

## Testing

- `gear.test`/new: `effectiveCards`, `effectiveArtifacts` accumulation incl.
  override + clear + cap.
- `stats`/new: `sumSocketStats` — card sum, per-piece × count, full-set at 4,
  gem sum, mixed sets.
- `build-url`: round-trip a build with `cards`/`artifacts`; legacy link (no
  channels) still loads; invalid card/gem/set dropped on sanitize.
- Component: a card pip opens the picker and sets a card; artifact row picks a
  set then a gem; StatSheet total reflects a socketed card.
- Data: `gear.json` gains `gems` (129); build script unchanged tests pass.
