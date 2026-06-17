# Gear Stages — "cap" ranges (anchor-at-1, contiguous) Design

**Date:** 2026-06-17
**Status:** Approved (design); ready for implementation plan.

## Problem

The gear-progression planner (Builds → Gear) lets the user define loadout
stages, each covering a level band. Today each stage stores a **`fromLevel`**
(the band's *start*); a band's range is `[fromLevel, nextStage.fromLevel − 1]`,
and the last band always runs to **135**. The user types the *start* of a band
and the *end* is implied by the next band added later — so an existing chip
silently re-labels when a later band is added (e.g. a single stage shows
`Lv 1–135`, then becomes `Lv 1–10` only after a second stage at 11 is added).
This implicit, shifting end is confusing.

## Goal

Invert the input model to match how people think about gear bands: you type the
level a band runs **up to** (its cap), and bands chain contiguously from 1.

- First entry `10` → `Lv 1–10`.
- Next entry `25` → `Lv 11–25`.
- Next entry `40` → `Lv 26–40`.

The cap you type is the band's end, shown verbatim. The top band caps at its
entered value (levels above it are simply unplanned until another band is added)
— **decided:** no implicit extend-to-135 for new bands.

## Data model

Each stage stores its **`toLevel`** (cap) instead of `fromLevel`. The start is
*derived*, never stored:

```
stages sorted ascending by toLevel
start(i) = (i === 0) ? 1 : stages[i-1].toLevel + 1
end(i)   = stages[i].toLevel
```

A stage is `{ toLevel: number, changes: { [slot]: itemSlug } }`. The per-stage
`changes` delta model (only changed slots stored; unchanged slots carry over
from the nearest earlier stage that set them) is **unchanged** — only the level
field flips from `fromLevel` to `toLevel`.

Invariants:
- `toLevel` values are unique and strictly increasing once sorted.
- `1 ≤ toLevel ≤ 135`.
- `start(i) ≤ toLevel(i)` always holds (guaranteed by the validation rules).

## Interactions

All four are demonstrated in the approved mockup
(`.git/sdd/stage-mockup.html`, not committed).

1. **Add** — clicking `＋ Add stage` shows an inline input that is the band's
   **cap**. It displays the derived start as a non-editable prefix (`Lv 11–▢`)
   and pre-fills a placeholder of `min(135, highestCap + 10)` (or `10` for the
   first band). On submit:
   - parse integer `n`;
   - the new band's start is `highestCap + 1` (or `1` if no stages);
   - **reject** if `n < start` (inline hint: "Cap must be ≥ {start}…") — no add;
   - clamp `n` to `≤ 135`;
   - append `{ toLevel: n, changes: {} }`, sort, and select the new stage.
   - Empty/`Esc` cancels with no change.

2. **Display** — each chip reads `Lv {start(i)}–{toLevel(i)}`. The selected chip
   is highlighted. A single entry of `10` shows `Lv 1–10`.

3. **Edit a cap** — clicking a chip's cap number turns it into an inline number
   input (or uses a prompt-free inline editor). The new value is **clamped** to
   `[start(i), nextCap − 1]` (or `[start(i), 135]` for the top band) so bands
   never cross or reorder. Editing re-derives all later starts automatically.
   Editing does not touch any band's `changes`.

4. **Remove** — `✕` drops that stage (and its `changes`). Remaining bands
   re-chain: later starts shift down because they derive from the previous cap.
   `selectedStage` is clamped to the new range.

## Back-compat (URL builds)

Shared `?build=` links encode `gearStages` by `fromLevel`. On decode/sanitize,
migrate losslessly to `toLevel`:

```
given fromLevels sorted ascending f[0..n-1]:
toLevel[i] = (i < n-1) ? f[i+1] - 1 : 135
```

So an old build `[1, 11, 26]` → caps `[10, 25, 135]` — exact same displayed
ranges (old top band kept its implicit 135 end). New builds authored with the
cap UX serialize their `toLevel`s directly and may cap the top band below 135.

The serialized segment changes from a start-level to the cap level; the
`changes` portion of each segment is unchanged. `sanitizeBuild` clamps each
`toLevel` to `[1,135]`, drops invalid items, and re-sorts. The migration is
applied in the same decode path so a legacy link and a new link both round-trip.

## Components / files

- `src/logic/gear.js` — replace `fromLevel` sort/dedupe with `toLevel`; add a
  `stageRanges(stages) → [{ start, end }]` derivation helper used by the rail
  and loadout.
- `src/state/store.jsx` (reducer) — `addGearStage` takes `toLevel`; add
  `editStageCap({ index, toLevel })`; `removeGearStage` unchanged in shape but
  re-clamps `selectedStage`. `setGearSlot`/`clearGearSlot` unchanged.
- `src/state/build-url.js` — encode/decode `toLevel`; legacy `fromLevel`
  migration; `sanitizeBuild` clamps `toLevel`.
- `src/components/GearStageRail.jsx` — the new add/edit/display UX (derived
  start prefix, cap input, click-to-edit cap, validation hint).
- `src/components/GearLoadout.jsx` — the "carried from Lv N" label uses the
  derived **start** of the originating stage instead of its `fromLevel`.
- Tests alongside each (`gear.test.js`, `store-build.test.js`,
  `build-url.test.js`, `GearStageRail.test.jsx` (new/updated),
  `GearLoadout.test.jsx`).

## Unchanged

Selecting a stage, the delta "carried from Lv N" gear inheritance semantics, the
loadout grid, the gear picker, the stat sheet, and the level-aware route.

## Out of scope / non-goals

- No auto-mapping of a character's current level to the active stage (stage
  selection stays manual).
- No reordering of bands by editing a cap across a neighbor (clamping prevents
  it); to move a band you remove and re-add.
- No change to the gear catalog, drop data, or map.

## Testing notes

- `stageRanges` derivation: `[{toLevel:10},{toLevel:25},{toLevel:40}]` →
  `[{start:1,end:10},{start:11,end:25},{start:26,end:40}]`.
- Add validation: cap below derived start is rejected; cap > 135 clamps to 135.
- Edit clamp: editing a middle band's cap above the next band's cap clamps to
  `nextCap − 1`; below its own start clamps to start.
- Remove re-chains: removing the middle band of three shifts the third band's
  start to the first band's cap + 1.
- Legacy migration: `fromLevel [1,11,26]` decodes to caps `[10,25,135]` with
  identical displayed ranges; round-trips through encode.
