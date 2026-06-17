# Gear Stage Cap Ranges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change gear stages from a `fromLevel` (band start) input model to a `toLevel` (band cap) model: you type the level a band runs *up to*, bands chain contiguously from 1, and the top band caps at its entered value.

**Architecture:** The stored field on each stage flips from `fromLevel` to `toLevel`; the band start is *derived* (`start(i) = i===0 ? 1 : stages[i-1].toLevel + 1`). Pure helpers in `logic/gear.js` (`stageRanges`, `clampCap`, `toLevel`-based `sortStages`) drive the reducer, the loadout label, and a rewritten `GearStageRail` UX (cap input with derived-start prefix, click-to-edit cap, validation). Legacy shared `?build=` links (which store `fromLevel`) migrate losslessly to caps in `sanitizeBuild`.

**Tech Stack:** React + Vite, Context+reducer store, Vitest.

## Global Constraints

- Stage shape is `{ toLevel: number, changes: { [slot]: itemSlug } }`. `toLevel` ∈ `[1,135]`, unique, strictly increasing once sorted. The `changes` delta model is unchanged.
- Band ranges are derived: `start(0)=1`, `start(i)=stages[i-1].toLevel+1`, `end(i)=stages[i].toLevel`. A single stage with `toLevel:10` displays `Lv 1–10` (NOT `1–135`). The top band caps at its entered value — no implicit extend-to-135 for new bands.
- Add validation: a new cap must be `> highest existing cap` and is clamped `≤ 135`; otherwise it is rejected with an inline hint and not added.
- Edit-cap clamp: a cap is clamped to `[start(i), nextCap−1]` (top band: `[start(i), 135]`) so bands never cross or reorder.
- Back-compat: legacy stages keyed by `fromLevel` migrate to caps via `toLevel[i] = (i<last ? fromLevel[i+1]−1 : 135)`. Migration lives in `sanitizeBuild` (the hydration choke point: `sync.js` calls `sanitizeBuild(decodeBuild(str))`).
- Reuse, don't fork: derive ranges via `stageRanges` everywhere; do not re-implement start derivation inline.
- Commit-message trailer for every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

- `src/logic/gear.js` — `sortStages` (now by `toLevel`), new `stageRanges`, new `clampCap`. Other exports unchanged.
- `src/state/build-url.js` — new `normalizeStages` (migrate `fromLevel`→`toLevel`, clamp, dedupe, sort); `sanitizeBuild` uses it. `encodeBuild`/`decodeBuild` unchanged in shape (stages are plain JSON).
- `src/state/store.jsx` (reducer) — `addGearStage` takes `toLevel`; `setStageLevel` replaced by `setStageCap` (clamped); `removeGearStage` unchanged.
- `src/components/GearLoadout.jsx` — "from Lv N" label uses the derived start.
- `src/components/GearStageRail.jsx` — full UX rewrite (cap input, click-to-edit, validation hint).
- `src/styles/app.css` — small additions for the editable cap + hint.
- Tests: `gear.test.js`, `build-url.test.js`, `store-build.test.js`, `GearLoadout.test.jsx` (updated), `GearStageRail.test.jsx` (new).

---

### Task 1: `logic/gear.js` — toLevel sorting + range/clamp helpers

**Files:**
- Modify: `src/logic/gear.js`
- Test: `src/logic/gear.test.js`

**Interfaces:**
- Produces:
  - `sortStages(stages) -> stages[]` — sorted ascending by `toLevel`, deduped by `toLevel`.
  - `stageRanges(stages) -> [{ start, end, toLevel, changes }]` — sorted; `start` derived, `end === toLevel`.
  - `clampCap(stages, index, value) -> number` — clamp `value` to `[start(index), nextCap−1]` (top band upper bound 135), rounded.
- `effectiveLoadout`, `stageChangedSlots`, `categoryOf`, `itemsForSlot`, `stageFarmTiles` unchanged.

- [ ] **Step 1: Replace the gear.test.js stage tests**

Replace the `sortStages` test and add `stageRanges` + `clampCap` tests (keep any other existing tests in the file unchanged):

```js
import { describe, it, expect } from 'vitest';
import { sortStages, stageRanges, clampCap, effectiveLoadout } from './gear.js';

describe('sortStages', () => {
  it('orders by toLevel and dedupes', () => {
    const s = sortStages([{ toLevel: 25, changes: {} }, { toLevel: 10, changes: {} }, { toLevel: 25, changes: {} }]);
    expect(s.map((x) => x.toLevel)).toEqual([10, 25]);
  });
});

describe('stageRanges', () => {
  it('derives contiguous starts anchored at 1', () => {
    const r = stageRanges([{ toLevel: 10, changes: {} }, { toLevel: 25, changes: {} }, { toLevel: 40, changes: {} }]);
    expect(r.map((x) => [x.start, x.end])).toEqual([[1, 10], [11, 25], [26, 40]]);
  });
  it('a single stage runs 1..cap (not 135)', () => {
    expect(stageRanges([{ toLevel: 10, changes: {} }])).toEqual([{ start: 1, end: 10, toLevel: 10, changes: {} }]);
  });
});

describe('clampCap', () => {
  const stages = [{ toLevel: 10, changes: {} }, { toLevel: 25, changes: {} }, { toLevel: 40, changes: {} }];
  it('clamps a middle band above its neighbor down to nextCap-1', () => {
    expect(clampCap(stages, 1, 99)).toBe(39);
  });
  it('clamps below its own start up to start', () => {
    expect(clampCap(stages, 1, 3)).toBe(11);
  });
  it('top band upper bound is 135', () => {
    expect(clampCap(stages, 2, 999)).toBe(135);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/logic/gear.test.js`
Expected: FAIL — `stageRanges`/`clampCap` undefined; `sortStages` sorts by `fromLevel`.

- [ ] **Step 3: Implement**

In `src/logic/gear.js`, replace `sortStages` and add the two helpers (leave the rest of the file as-is):

```js
export function sortStages(stages) {
  const seen = new Set();
  const out = [];
  for (const s of [...(stages || [])].sort((a, b) => a.toLevel - b.toLevel)) {
    if (seen.has(s.toLevel)) continue;
    seen.add(s.toLevel);
    out.push(s);
  }
  return out;
}

export function stageRanges(stages) {
  const sorted = sortStages(stages);
  return sorted.map((s, i) => ({
    start: i === 0 ? 1 : sorted[i - 1].toLevel + 1,
    end: s.toLevel,
    toLevel: s.toLevel,
    changes: s.changes || {},
  }));
}

export function clampCap(stages, index, value) {
  const sorted = sortStages(stages);
  const start = index === 0 ? 1 : sorted[index - 1].toLevel + 1;
  const nextCap = index + 1 < sorted.length ? sorted[index + 1].toLevel - 1 : 135;
  return Math.min(nextCap, Math.max(start, Math.round(Number(value))));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/logic/gear.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/gear.js src/logic/gear.test.js
git commit -m "feat(gear): toLevel-based sortStages + stageRanges/clampCap helpers"
```

---

### Task 2: `build-url.js` — toLevel serialization + legacy fromLevel migration

**Files:**
- Modify: `src/state/build-url.js`
- Test: `src/state/build-url.test.js`

**Interfaces:**
- Consumes: `sortStages` (already imported from `../logic/gear.js`).
- Produces: `normalizeStages(rawStages, isValidItem?) -> [{ toLevel, changes }]` — drops invalid items via the optional predicate, migrates `fromLevel`-only lists to caps, clamps `toLevel` to `[1,135]`, dedupes + sorts. `sanitizeBuild` returns `gearStages` with `toLevel`.

- [ ] **Step 1: Update build-url.test.js**

Change the fixture to `toLevel` and add a legacy-migration test (keep the other tests; update the `fromLevel` assertion):

```js
const full = {
  baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 },
  gearStages: [{ toLevel: 10, changes: { weapon: 'abyss-shard' } }],
  attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, notes: 'hi',
};
// ...existing round-trip test using `full` stays...

it('migrates a legacy fromLevel build to toLevel caps', () => {
  const b = sanitizeBuild({
    baseClass: 'acolyte', advancedClass: null, levels: {},
    gearStages: [{ fromLevel: 1, changes: {} }, { fromLevel: 11, changes: {} }, { fromLevel: 26, changes: {} }],
    attributes: {}, notes: '',
  });
  expect(b.gearStages.map((s) => s.toLevel)).toEqual([10, 25, 135]);
});

it('clamps and drops invalid items in stages', () => {
  const b = sanitizeBuild({
    baseClass: 'acolyte', advancedClass: null, levels: {},
    gearStages: [{ toLevel: 200, changes: { weapon: 'abyss-shard', x: 'no' } }],
    attributes: {}, notes: '',
  });
  expect(b.gearStages[0].toLevel).toBe(135);
  expect(b.gearStages[0].changes).toEqual({ weapon: 'abyss-shard' });
});
```

(Remove/replace the old test asserting `b.gearStages[0].fromLevel === 135`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/state/build-url.test.js`
Expected: FAIL — sanitize still emits `fromLevel`.

- [ ] **Step 3: Implement**

In `src/state/build-url.js`, add `normalizeStages` and use it in `sanitizeBuild`. Replace the stage block (lines building `stages`/`clean.gearStages`):

```js
// Migrate legacy fromLevel-keyed stages to toLevel caps; pass through toLevel.
export function normalizeStages(raw, isValidItem) {
  const list = (raw || []).map((s) => {
    const changes = {};
    for (const [slot, item] of Object.entries(s.changes || {})) if (!isValidItem || isValidItem(item)) changes[slot] = item;
    return { ...s, changes };
  });
  const clamp = (n) => Math.min(135, Math.max(1, Math.round(Number(n) || 1)));
  let caps;
  if (list.some((s) => Number.isFinite(s.toLevel))) {
    caps = list.filter((s) => Number.isFinite(s.toLevel)).map((s) => ({ toLevel: clamp(s.toLevel), changes: s.changes }));
  } else {
    const byFrom = [...list].sort((a, b) => (a.fromLevel || 1) - (b.fromLevel || 1));
    caps = byFrom.map((s, i) => ({
      toLevel: i < byFrom.length - 1 ? clamp((byFrom[i + 1].fromLevel || 1) - 1) : 135,
      changes: s.changes,
    }));
  }
  return sortStages(caps);
}
```

Then in `sanitizeBuild`, replace the existing `const stages = ...` + `clean.gearStages = sortStages(stages);` block with:

```js
  clean.gearStages = normalizeStages(build.gearStages, (item) => gearItems[item]);
```

`encodeBuild`, `decodeBuild`, and `decodeLegacy` are unchanged — legacy links still decode to `fromLevel` and `normalizeStages` migrates them; new links carry `toLevel` and pass through.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/state/build-url.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/build-url.js src/state/build-url.test.js
git commit -m "feat(gear): serialize toLevel caps + migrate legacy fromLevel builds"
```

---

### Task 3: reducer — `addGearStage(toLevel)`, `setStageCap`, remove

**Files:**
- Modify: `src/state/store.jsx`
- Test: `src/state/store-build.test.js`

**Interfaces:**
- Consumes: `sortStages`, `clampCap` from `../logic/gear.js`.
- Produces reducer actions:
  - `{ type: 'addGearStage', toLevel }` — append `{ toLevel, changes: {} }`, sort by `toLevel`, select the new stage's index.
  - `{ type: 'setStageCap', index, toLevel }` — clamp via `clampCap`, set, re-sort, re-select.
  - `{ type: 'removeGearStage', index }` — unchanged.

- [ ] **Step 1: Update store-build.test.js stage tests**

Replace the `addGearStage` test and add a `setStageCap` test (keep the others; update any `fromLevel` literals in unrelated tests to `toLevel`):

```js
it('addGearStage adds a sorted stage by cap and selects it', () => {
  let s = reducer(withBase, { type: 'addGearStage', toLevel: 25 });
  s = reducer(s, { type: 'addGearStage', toLevel: 10 });
  expect(s.build.gearStages.map((x) => x.toLevel)).toEqual([10, 25]);
  expect(s.selectedStage).toBe(0);
});

it('setStageCap clamps a cap within its band and re-selects', () => {
  let s = reducer(withBase, { type: 'addGearStage', toLevel: 10 });
  s = reducer(s, { type: 'addGearStage', toLevel: 25 });
  s = reducer(s, { type: 'setStageCap', index: 0, toLevel: 99 }); // clamps to 24 (nextCap-1)
  expect(s.build.gearStages.map((x) => x.toLevel)).toEqual([24, 25]);
});
```

Also update the `selectClass`/`resetBuild` fixtures that contain `gearStages: [{ fromLevel: 1, changes: {} }]` to `gearStages: [{ toLevel: 1, changes: {} }]` (value semantics don't matter for those reset assertions, but keep the field consistent).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/state/store-build.test.js`
Expected: FAIL — `addGearStage` reads `action.fromLevel`; no `setStageCap`.

- [ ] **Step 3: Implement**

In `src/state/store.jsx`: add `import { sortStages, clampCap } from '../logic/gear.js';` to the imports. Replace the `addGearStage` and `setStageLevel` cases:

```js
    case 'addGearStage': {
      const stages = sortStages([...state.build.gearStages, { toLevel: action.toLevel, changes: {} }]);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: stages.findIndex((s) => s.toLevel === action.toLevel) };
    }
    case 'removeGearStage': {
      const stages = state.build.gearStages.filter((_, i) => i !== action.index);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: Math.max(0, Math.min(state.selectedStage, stages.length - 1)) };
    }
    case 'setStageCap': {
      const v = clampCap(state.build.gearStages, action.index, action.toLevel);
      const stages = sortStages(state.build.gearStages.map((s, i) => (i === action.index ? { ...s, toLevel: v } : s)));
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: stages.findIndex((s) => s.toLevel === v) };
    }
```

(Delete the old `setStageLevel` case entirely; `removeGearStage` keeps its existing behavior — shown here only because it sits between the others.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/state/store-build.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.jsx src/state/store-build.test.js
git commit -m "feat(gear): reducer addGearStage(toLevel) + setStageCap with clamp"
```

---

### Task 4: `GearLoadout.jsx` — "from Lv N" uses derived start

**Files:**
- Modify: `src/components/GearLoadout.jsx`
- Test: `src/components/GearLoadout.test.jsx`

**Interfaces:**
- Consumes: `stageRanges` from `../logic/gear.js`.

- [ ] **Step 1: Update GearLoadout.test.jsx**

Change the fixture stages to `toLevel` and assert the carried label shows the derived start. The existing test renders two stages where the 2nd stage (selected) carries `chest` from the 1st. With caps `[10, 20]` the 1st band starts at Lv 1, so the carried label is `from Lv 1`:

```js
const stages = [
  { toLevel: 10, changes: { weapon: weapon.slug, chest: chest.slug } },
  { toLevel: 20, changes: { weapon: weapon.slug } },
];
// ...render with selectedStage: 1...
// assert the carried chest slot shows "from Lv 1"
expect(screen.getByText(/from Lv 1/)).toBeInTheDocument();
```

(Adjust the existing assertions in the file to match `toLevel` fixtures; keep the test's overall intent.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/GearLoadout.test.jsx`
Expected: FAIL — `carriedFrom` returns `sorted[i].fromLevel` (undefined now).

- [ ] **Step 3: Implement**

In `src/components/GearLoadout.jsx`: import `stageRanges` and use the derived start:

```js
import { effectiveLoadout, sortStages, stageRanges } from '../logic/gear.js';
// ...
  const sorted = sortStages(stages);
  const ranges = stageRanges(sorted);
  const idx = Math.min(state.selectedStage, sorted.length - 1);
  const loadout = effectiveLoadout(sorted, idx);
  const changes = sorted[idx].changes || {};

  const carriedFrom = (slot) => {
    for (let i = idx - 1; i >= 0; i--) if (slot in (sorted[i].changes || {})) return ranges[i].start;
    return null;
  };
```

(The rest of the component is unchanged — it already renders `from Lv {from}`.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/components/GearLoadout.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GearLoadout.jsx src/components/GearLoadout.test.jsx
git commit -m "feat(gear): loadout 'carried from' label uses derived band start"
```

---

### Task 5: `GearStageRail.jsx` — cap-input UX (add / edit / remove)

**Files:**
- Modify: `src/components/GearStageRail.jsx`
- Modify: `src/styles/app.css`
- Test: `src/components/GearStageRail.test.jsx` (create)

**Interfaces:**
- Consumes: `stageRanges` from `../logic/gear.js`; reducer actions `addGearStage`/`setStageCap`/`removeGearStage`/`selectStage`.

- [ ] **Step 1: Write GearStageRail.test.jsx**

```js
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GearStageRail from './GearStageRail.jsx';
import { StoreProvider } from '../state/store.jsx';

const withBuild = (gearStages = []) => ({
  view: 'build', selectedStage: 0,
  build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages, notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } },
});

function addCap(value) {
  fireEvent.click(screen.getByRole('button', { name: /add stage/i }));
  const input = screen.getByRole('spinbutton');
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('GearStageRail', () => {
  it('first cap entry yields Lv 1–N', () => {
    render(<StoreProvider init={withBuild()}><GearStageRail /></StoreProvider>);
    addCap(10);
    expect(screen.getByText(/Lv 1[–-]/)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
  it('second cap chains from the first', () => {
    render(<StoreProvider init={withBuild([{ toLevel: 10, changes: {} }])}><GearStageRail /></StoreProvider>);
    addCap(25);
    expect(screen.getByText(/Lv 11[–-]/)).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });
  it('rejects a cap at or below the previous band with a hint', () => {
    render(<StoreProvider init={withBuild([{ toLevel: 10, changes: {} }])}><GearStageRail /></StoreProvider>);
    addCap(5);
    expect(screen.getByText(/must be ≥ 11/i)).toBeInTheDocument();
    // still only one band (cap 10)
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });
  it('removing a band re-chains the next one', () => {
    render(<StoreProvider init={withBuild([{ toLevel: 10, changes: {} }, { toLevel: 25, changes: {} }])}><GearStageRail /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /remove stage Lv 1[–-]10/i }));
    expect(screen.getByText(/Lv 1[–-]/)).toBeInTheDocument(); // the 25 band now starts at 1
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/GearStageRail.test.jsx`
Expected: FAIL — current rail uses `fromLevel`/`addGearStage{fromLevel}`; no cap number text, no hint.

- [ ] **Step 3: Implement the rail**

Replace `src/components/GearStageRail.jsx` entirely:

```jsx
import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { stageRanges } from '../logic/gear.js';

export default function GearStageRail() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages ?? [];
  const ranges = stageRanges(stages);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  const nextStart = ranges.length ? ranges[ranges.length - 1].toLevel + 1 : 1;
  const placeholder = Math.min(135, nextStart + 9);

  const submitAdd = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n)) { setAdding(false); setDraft(''); setHint(''); return; }
    if (n < nextStart) { setHint(`Cap must be ≥ ${nextStart} (above the previous band).`); return; }
    dispatch({ type: 'addGearStage', toLevel: Math.min(135, n) });
    setAdding(false); setDraft(''); setHint('');
  };
  const submitEdit = (i) => {
    const n = parseInt(editDraft, 10);
    if (Number.isFinite(n)) dispatch({ type: 'setStageCap', index: i, toLevel: n });
    setEditIdx(null); setEditDraft('');
  };

  return (
    <div className="stage-rail">
      <div className="label">GEAR STAGES</div>
      <div className="stage-chips">
        {ranges.map((r, i) => (
          <div key={i} className={`stage-chip${i === state.selectedStage ? ' on' : ''}`} onClick={() => dispatch({ type: 'selectStage', index: i })}>
            {editIdx === i ? (
              <span className="cap-edit" onClick={(e) => e.stopPropagation()}>
                Lv {r.start}–
                <input type="number" min={r.start} max="135" autoFocus value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(i); if (e.key === 'Escape') { setEditIdx(null); setEditDraft(''); } }}
                  onBlur={() => submitEdit(i)} />
              </span>
            ) : (
              <span>Lv {r.start}–<button className="cap" title="Edit cap" onClick={(e) => { e.stopPropagation(); setEditIdx(i); setEditDraft(String(r.toLevel)); }}>{r.toLevel}</button></span>
            )}
            <button className="chip-x" aria-label={`remove stage Lv ${r.start}–${r.toLevel}`} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'removeGearStage', index: i }); }}>✕</button>
          </div>
        ))}
        {adding ? (
          <span className="stage-add-input">
            <span className="pre">Lv {nextStart}–</span>
            <input type="number" min={nextStart} max="135" autoFocus value={draft} placeholder={String(placeholder)}
              onChange={(e) => { setDraft(e.target.value); setHint(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') { setAdding(false); setDraft(''); setHint(''); } }} />
            <button onClick={submitAdd}>add</button>
          </span>
        ) : (
          <button className="stage-add" onClick={() => { setDraft(''); setHint(''); setAdding(true); }}>＋ Add stage</button>
        )}
      </div>
      {hint && <div className="stage-hint">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Add CSS**

Append to `src/styles/app.css` (near the other gear/stage rules):

```css
.stage-chip .cap { background: none; border: 0; color: inherit; font: inherit; cursor: pointer; border-bottom: 1px dotted var(--muted); padding: 0; }
.stage-chip .cap-edit input, .stage-add-input input { width: 44px; background: transparent; border: 0; color: var(--text); font: inherit; outline: none; }
.stage-add-input .pre { color: var(--muted); }
.stage-hint { color: var(--route); font-size: 11px; margin-top: 6px; }
```

- [ ] **Step 5: Run tests + full suite**

Run: `npx vitest run src/components/GearStageRail.test.jsx`
Expected: PASS.
Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/GearStageRail.jsx src/components/GearStageRail.test.jsx src/styles/app.css
git commit -m "feat(gear): cap-based stage rail UX (add/edit/remove, validation)"
```

---

### Task 6: Full verification + visual check

**Files:** none (verification only).

- [ ] **Step 1: Build + test**

Run: `npm run data && npm test && npm run build`
Expected: data builds (48 sub-zones), all tests pass, production build succeeds.

- [ ] **Step 2: Manual visual check**

Launch `npm run dev`. In Builds → pick a class → Gear: add caps `10`, `25`, `40` and confirm chips read `Lv 1–10`, `Lv 11–25`, `Lv 26–40`; click a cap to edit it and confirm later bands re-chain; remove the middle band and confirm the next band's start shifts; confirm a cap ≤ the previous band shows the hint and does not add. Confirm an existing shared `?build=` link (legacy) still loads with sensible ranges.

- [ ] **Step 3: Commit (if any verification-driven fixups were needed)**

Otherwise proceed to finishing-a-development-branch.

---

## Self-Review

**Spec coverage:** toLevel model + derived start (Task 1) ✓; display caps at entered value (Task 1 `stageRanges`, Task 5 labels) ✓; add validation (Task 5) ✓; click-to-edit clamp (Task 1 `clampCap` + Task 3 `setStageCap` + Task 5 UI) ✓; remove re-chains (Task 3 + Task 5) ✓; legacy `fromLevel` migration in `sanitizeBuild` (Task 2) ✓; loadout "from Lv N" uses derived start (Task 4) ✓; unchanged delta/loadout/picker/statsheet ✓.

**Placeholder scan:** no TBD/TODO; every code + test step is concrete.

**Type consistency:** `toLevel` field, `stageRanges -> {start,end,toLevel,changes}`, `clampCap(stages,index,value)->number`, `normalizeStages(raw,isValidItem)`, and actions `addGearStage{toLevel}`/`setStageCap{index,toLevel}`/`removeGearStage{index}` are used identically across Tasks 1-5 and match the reducer + components.

## Out of scope

No auto level→stage mapping; no cross-neighbor reordering on edit (clamp prevents it); no catalog/drop/map changes.
