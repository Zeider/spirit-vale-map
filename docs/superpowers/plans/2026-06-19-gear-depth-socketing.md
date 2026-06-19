# Gear-Depth Socketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-level-band card sockets (in equipment) and 4 typed artifact slots (Rune/Jewel/Scroll/Relic) with gems, and fold their stats into the gear total.

**Architecture:** Each gear stage gains two optional, independently-accumulated channels (`cards`, `artifacts`) alongside `changes`. New pure helpers fold them like `effectiveLoadout`. A tolerant socket-stat parser sums card/gem/artifact stat strings. UI = inline card pips (Option A) + an interactive 4-typed-slot artifact panel, both driven by `selectedStage`. Serialization is purely additive (old `?build=` links still load).

**Tech Stack:** React 18 + Vite, Context+reducer store, Vitest + @testing-library/react. Data built by `scripts/lib/build-gear.mjs` into `src/data/gear.json`.

**Spec:** `docs/superpowers/specs/2026-06-19-gear-depth-socketing-design.md`

## Global Constraints

- Staged per band: `cards` and `artifacts` accumulate across stages like `changes` (later band overrides; absence = inherit; `null` = clear).
- 4 artifact types, fixed order: `rune`, `jewel`, `scroll`, `relic`. Each holds `{ set: artifactSlug, gem: gemSlug|null }`. 1 gem per slot.
- Full-set bonus only when **all 4** slots hold the **same** set; per-piece applies once per slot holding a given set.
- Cards keyed by **name** (matching `gear.json` cards); gems keyed by **slug**; artifacts keyed by **slug**.
- Card slots per item = `item.cardSlots` (max 3 in data). Cards filter by `equipSlot` (case-insensitive vs `categoryOf(slot)`); 2 slot-agnostic cards (`equipSlot === null`) always allowed.
- Serialization additive — **no version bump**; legacy links (no `cards`/`artifacts`) must decode unchanged.
- Stat summing is best-effort: parse what's parseable, leave the rest display-only (consistent with existing `raw` item lines). `per refine` is never summed.
- All existing tests must stay green; every task is TDD (failing test first).

---

### Task 1: Gems in the data pipeline

**Files:**
- Modify: `scripts/lib/build-gear.mjs`
- Modify: `scripts/build-gear.mjs` (no logic change; gems flow through `buildGear`)
- Modify: `src/data/gear-index.js`
- Test: `scripts/lib/build-gear.gems.test.mjs` (new)
- Regenerate: `src/data/gear.json`

**Interfaces:**
- Produces: `buildGear(...)` output gains `gems` (object keyed by slug); `gear-index.js` exports `gems` (object), `gemBySlug` (alias), `gemByName`, `artifactBySlug`.

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/build-gear.gems.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { buildGear } from './build-gear.mjs';

const catalog = {
  equipment: [],
  cards: [],
  gems: [
    { name: 'Atk Gem', slug: 'atk-gem', affix: 'None', description: 'd',
      stats: ['Atk: <span>+5</span>'] },
  ],
};

describe('buildGear gems', () => {
  it('builds gems keyed by slug with stripped stat strings', () => {
    const out = buildGear(catalog, {});
    expect(out.gems['atk-gem']).toMatchObject({ kind: 'gem', name: 'Atk Gem', slug: 'atk-gem', affix: 'None' });
    expect(out.gems['atk-gem'].stats).toEqual(['Atk: +5']);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run scripts/lib/build-gear.gems.test.mjs`
Expected: FAIL — `out.gems` is undefined.

- [ ] **Step 3: Implement `buildGems` in `scripts/lib/build-gear.mjs`**

Add a `gemOf` helper near `cardOf` (reuse the existing `stripHtml`):

```js
function gemOf(g) {
  return {
    kind: 'gem', name: g.name, slug: g.slug,
    affix: g.affix || '', description: g.description || '',
    stats: stripHtml(g.stats),
  };
}
```

In `buildGear`, build a `gems` object and include it in the return:

```js
  const gems = {};
  for (const g of catalog.gems || []) gems[g.slug] = gemOf(g);
  return { slots: SLOTS, items, cards, gems, artifacts: buildArtifacts(raw.artifacts || []) };
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run scripts/lib/build-gear.gems.test.mjs`
Expected: PASS.

- [ ] **Step 5: Regenerate `gear.json` and export from `gear-index.js`**

Run: `npm run data`
Expected: `Wrote src/data/gear.json` with item/override counts (unchanged) — and `gear.json` now contains a `gems` key with 129 entries.

Edit `src/data/gear-index.js` to add after the artifacts line:

```js
export const gems = data.gems || {};
export const gemBySlug = gems;
export const gemByName = {};
for (const g of Object.values(gems)) if (!(g.name in gemByName)) gemByName[g.name] = g;

export const artifactBySlug = {};
for (const a of artifacts) artifactBySlug[a.slug] = a;
```

- [ ] **Step 6: Verify gems count + full suite**

Run: `node -e "const g=require('./src/data/gear.json'); console.log(Object.keys(g.gems||{}).length)"`
Expected: `129`.
Run: `npm test`
Expected: all green (now includes the new gems test).

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/build-gear.mjs scripts/lib/build-gear.gems.test.mjs src/data/gear-index.js src/data/gear.json
git commit -m "feat(socketing): add gems to gear data pipeline"
```

---

### Task 2: Accumulation helpers `effectiveCards` / `effectiveArtifacts`

**Files:**
- Modify: `src/logic/gear.js`
- Test: `src/logic/gear-sockets.test.js` (new)

**Interfaces:**
- Consumes: `sortStages` (already in `gear.js`).
- Produces:
  - `effectiveCards(stages, idx) -> { [slot]: (string|null)[] }`
  - `effectiveArtifacts(stages, idx) -> { [type]: { set: string, gem: string|null } }`
  - `ARTIFACT_TYPES = ['rune','jewel','scroll','relic']` (exported const)

- [ ] **Step 1: Write the failing test**

Create `src/logic/gear-sockets.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { effectiveCards, effectiveArtifacts, ARTIFACT_TYPES } from './gear.js';

const stages = [
  { toLevel: 10, changes: { weapon: 'bonefang' }, cards: { weapon: ['Boar Card', null] },
    artifacts: { rune: { set: 'spellweaver', gem: 'atk-gem' } } },
  { toLevel: 20, changes: {}, cards: { weapon: ['Boar Card', 'Wasp Card'] },
    artifacts: { rune: null, jewel: { set: 'spellweaver', gem: null } } },
];

describe('effectiveCards / effectiveArtifacts', () => {
  it('exposes the four artifact types in order', () => {
    expect(ARTIFACT_TYPES).toEqual(['rune', 'jewel', 'scroll', 'relic']);
  });
  it('accumulates cards per slot (later band overrides)', () => {
    expect(effectiveCards(stages, 0)).toEqual({ weapon: ['Boar Card', null] });
    expect(effectiveCards(stages, 1)).toEqual({ weapon: ['Boar Card', 'Wasp Card'] });
  });
  it('accumulates artifacts per type and clears on null', () => {
    expect(effectiveArtifacts(stages, 0)).toEqual({ rune: { set: 'spellweaver', gem: 'atk-gem' } });
    expect(effectiveArtifacts(stages, 1)).toEqual({ jewel: { set: 'spellweaver', gem: null } });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/logic/gear-sockets.test.js`
Expected: FAIL — exports not defined.

- [ ] **Step 3: Implement the helpers in `src/logic/gear.js`**

Add (mirrors `effectiveLoadout`'s fold):

```js
export const ARTIFACT_TYPES = ['rune', 'jewel', 'scroll', 'relic'];

export function effectiveCards(stages, index) {
  const sorted = sortStages(stages);
  const out = {};
  for (let i = 0; i <= index && i < sorted.length; i++) {
    for (const [slot, cards] of Object.entries(sorted[i].cards || {})) {
      if (cards == null) delete out[slot];
      else out[slot] = cards;
    }
  }
  return out;
}

export function effectiveArtifacts(stages, index) {
  const sorted = sortStages(stages);
  const out = {};
  for (let i = 0; i <= index && i < sorted.length; i++) {
    for (const [type, val] of Object.entries(sorted[i].artifacts || {})) {
      if (val == null) delete out[type];
      else out[type] = val;
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/logic/gear-sockets.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/gear.js src/logic/gear-sockets.test.js
git commit -m "feat(socketing): effectiveCards/effectiveArtifacts accumulation helpers"
```

---

### Task 3: Socket stat parser + `sumSocketStats`

**Files:**
- Modify: `src/logic/gear-stats.js` (add `parseSocketStat`)
- Modify: `src/logic/stats.js` (add `sumSocketStats`)
- Test: `src/logic/socket-stats.test.js` (new)

**Interfaces:**
- Consumes: `gear-index` data shapes — `items[slug].cardSlots`, `cards[name].stats[]`, `gems[slug].stats[]`, `artifacts[].{slug,perPiece,fullSet}`.
- Produces:
  - `parseSocketStat(line) -> { label, value, percent } | { label, raw:true }`
  - `sumSocketStats({ cards, artifacts }, { itemsBySlot, cardByName, gemBySlug, artifactBySlug }) -> { label, value, percent }[]`
    - `cards` = effectiveCards output; `artifacts` = effectiveArtifacts output.
    - `itemsBySlot` = `{ [slot]: item }` (effective loadout resolved to items) so card arrays can be capped to `cardSlots`.

- [ ] **Step 1: Write the failing test**

Create `src/logic/socket-stats.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseSocketStat } from './gear-stats.js';
import { sumSocketStats } from './stats.js';

describe('parseSocketStat', () => {
  it('parses value-first stat strings', () => {
    expect(parseSocketStat('+10 Atk')).toEqual({ label: 'Atk', value: 10, percent: false });
    expect(parseSocketStat('+5% Max HP')).toEqual({ label: 'Max HP', value: 5, percent: true });
    expect(parseSocketStat('-15% Max MP')).toEqual({ label: 'Max MP', value: -15, percent: true });
  });
  it('parses colon stat strings (per-refine ignored)', () => {
    expect(parseSocketStat('Atk Spd: +5% +1% per refine')).toEqual({ label: 'Atk Spd', value: 5, percent: true });
  });
  it('leaves skill-damage / unparseable lines raw', () => {
    expect(parseSocketStat('Aerial Shot Damage +2% per refine')).toEqual({ label: 'Aerial Shot Damage +2% per refine', raw: true });
  });
});

describe('sumSocketStats', () => {
  const data = {
    itemsBySlot: { weapon: { cardSlots: 2 }, chest: { cardSlots: 1 } },
    cardByName: { 'Atk Card': { stats: ['+10 Atk'] }, 'HP Card': { stats: ['+5% Max HP'] } },
    gemBySlug: { 'atk-gem': { stats: ['Atk: +3'] } },
    artifactBySlug: {
      spellweaver: { slug: 'spellweaver', perPiece: ['+5 Matk'], fullSet: ['+20 Matk'] },
      warglyph: { slug: 'warglyph', perPiece: ['+5 Atk'], fullSet: ['+10 Atk'] },
    },
  };
  const byLabel = (rows) => Object.fromEntries(rows.map((r) => [r.label, r.value]));

  it('sums card stats capped to cardSlots, ignoring extra/empty entries', () => {
    const rows = sumSocketStats({ cards: { weapon: ['Atk Card', null, 'HP Card'] }, artifacts: {} }, data);
    expect(byLabel(rows)).toEqual({ Atk: 10 }); // 3rd entry beyond cardSlots=2 ignored; null skipped
  });
  it('sums artifact per-piece x count and full-set when all four match', () => {
    const all = { rune: { set: 'spellweaver' }, jewel: { set: 'spellweaver' }, scroll: { set: 'spellweaver' }, relic: { set: 'spellweaver' } };
    const rows = sumSocketStats({ cards: {}, artifacts: all }, data);
    expect(byLabel(rows)).toEqual({ Matk: 40 }); // 5*4 per-piece + 20 full-set
  });
  it('per-piece only when sets are mixed', () => {
    const mixed = { rune: { set: 'spellweaver' }, jewel: { set: 'warglyph' } };
    const rows = sumSocketStats({ cards: {}, artifacts: mixed }, data);
    expect(byLabel(rows)).toEqual({ Matk: 5, Atk: 5 });
  });
  it('sums gem stats', () => {
    const rows = sumSocketStats({ cards: {}, artifacts: { rune: { set: 'spellweaver', gem: 'atk-gem' } } }, data);
    expect(byLabel(rows)).toEqual({ Matk: 5, Atk: 3 });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/logic/socket-stats.test.js`
Expected: FAIL — `parseSocketStat` / `sumSocketStats` not defined.

- [ ] **Step 3: Implement `parseSocketStat` in `src/logic/gear-stats.js`**

Append:

```js
// Parse a flat stat string into { label, value, percent } for summing.
// Handles two shapes: "Label: +value[%] [+x per refine]" and "+value[%] Label".
// Anything else (e.g. skill-damage lines) is returned raw and not summed.
export function parseSocketStat(line) {
  const s = String(line).trim();
  let m = s.match(/^(.+?):\s*([+-]?\d+(?:\.\d+)?)(%?)/);
  if (m) return { label: m[1].trim(), value: Number(m[2]), percent: m[3] === '%' };
  m = s.match(/^([+-]?\d+(?:\.\d+)?)(%?)\s+(.+)$/);
  if (m && !/\bper\s+refine\b/i.test(m[3])) return { label: m[3].trim(), value: Number(m[1]), percent: m[2] === '%' };
  return { label: s, raw: true };
}
```

- [ ] **Step 4: Implement `sumSocketStats` in `src/logic/stats.js`**

Append:

```js
import { parseSocketStat } from './gear-stats.js';

// Sum socket contributions: cards (capped to cardSlots), gems, and artifacts
// (per-piece x slots-with-that-set, plus full-set when all 4 slots share a set).
export function sumSocketStats({ cards = {}, artifacts = {} }, data) {
  const { itemsBySlot = {}, cardByName = {}, gemBySlug = {}, artifactBySlug = {} } = data;
  const totals = new Map();
  const add = (lines) => {
    for (const line of lines || []) {
      const st = parseSocketStat(line);
      if (st.raw) continue;
      const cur = totals.get(st.label) || { label: st.label, value: 0, percent: st.percent };
      cur.value += st.value;
      totals.set(st.label, cur);
    }
  };

  // Cards (capped to the slot item's cardSlots).
  for (const [slot, names] of Object.entries(cards)) {
    const cap = itemsBySlot[slot]?.cardSlots || 0;
    (names || []).slice(0, cap).forEach((name) => { if (name && cardByName[name]) add(cardByName[name].stats); });
  }

  // Artifacts: count sets across the (up to) 4 typed slots.
  const counts = {};
  for (const v of Object.values(artifacts)) {
    if (!v?.set) continue;
    counts[v.set] = (counts[v.set] || 0) + 1;
    if (v.gem && gemBySlug[v.gem]) add(gemBySlug[v.gem].stats);
  }
  for (const [set, n] of Object.entries(counts)) {
    const art = artifactBySlug[set];
    if (!art) continue;
    for (let i = 0; i < n; i++) add(art.perPiece);
    if (n === 4) add(art.fullSet);
  }
  return [...totals.values()];
}
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `npx vitest run src/logic/socket-stats.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/logic/gear-stats.js src/logic/stats.js src/logic/socket-stats.test.js
git commit -m "feat(socketing): tolerant socket-stat parser + sumSocketStats"
```

---

### Task 4: Reducer actions

**Files:**
- Modify: `src/state/store.jsx`
- Test: `src/state/store-sockets.test.js` (new)

**Interfaces:**
- Produces reducer actions (all operate on `action.stageIndex`):
  - `setCardSlot { stageIndex, slot, index, card }` — sets `cards[slot][index] = card` (card name or `null`); creates the array/object as needed.
  - `setArtifact { stageIndex, type, set }` — `set` truthy → `artifacts[type] = { set, gem: prevGem ?? null }`; `set === null` → `artifacts[type] = null`.
  - `setArtifactGem { stageIndex, type, gem }` — sets `artifacts[type].gem = gem` only if `artifacts[type]?.set` exists; otherwise no-op.

- [ ] **Step 1: Write the failing test**

Create `src/state/store-sockets.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

const withStage = () => ({
  ...initialState,
  build: { ...initialState.build, gearStages: [{ toLevel: 10, changes: {} }] },
});

describe('socket reducer actions', () => {
  it('setCardSlot sets and clears a card at an index', () => {
    let s = reducer(withStage(), { type: 'setCardSlot', stageIndex: 0, slot: 'weapon', index: 1, card: 'Boar Card' });
    expect(s.build.gearStages[0].cards.weapon[1]).toBe('Boar Card');
    s = reducer(s, { type: 'setCardSlot', stageIndex: 0, slot: 'weapon', index: 1, card: null });
    expect(s.build.gearStages[0].cards.weapon[1]).toBe(null);
  });
  it('setArtifact sets a set keeping prior gem, and clears on null', () => {
    let s = reducer(withStage(), { type: 'setArtifact', stageIndex: 0, type: 'rune', set: 'spellweaver' });
    expect(s.build.gearStages[0].artifacts.rune).toEqual({ set: 'spellweaver', gem: null });
    s = reducer(s, { type: 'setArtifactGem', stageIndex: 0, type: 'rune', gem: 'atk-gem' });
    expect(s.build.gearStages[0].artifacts.rune).toEqual({ set: 'spellweaver', gem: 'atk-gem' });
    s = reducer(s, { type: 'setArtifact', stageIndex: 0, type: 'rune', set: 'warglyph' });
    expect(s.build.gearStages[0].artifacts.rune).toEqual({ set: 'warglyph', gem: 'atk-gem' });
    s = reducer(s, { type: 'setArtifact', stageIndex: 0, type: 'rune', set: null });
    expect(s.build.gearStages[0].artifacts.rune).toBe(null);
  });
  it('setArtifactGem is a no-op without a set', () => {
    const s = reducer(withStage(), { type: 'setArtifactGem', stageIndex: 0, type: 'jewel', gem: 'atk-gem' });
    expect(s.build.gearStages[0].artifacts?.jewel ?? undefined).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/state/store-sockets.test.js`
Expected: FAIL — actions fall through to `default`, state unchanged.

- [ ] **Step 3: Implement the actions in `src/state/store.jsx`**

Add cases before `default:` (mirror the immutable `setGearSlot` pattern):

```js
    case 'setCardSlot': {
      const stages = state.build.gearStages.map((s, i) => {
        if (i !== action.stageIndex) return s;
        const cards = { ...(s.cards || {}) };
        const arr = [...(cards[action.slot] || [])];
        arr[action.index] = action.card;
        cards[action.slot] = arr;
        return { ...s, cards };
      });
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
    case 'setArtifact': {
      const stages = state.build.gearStages.map((s, i) => {
        if (i !== action.stageIndex) return s;
        const artifacts = { ...(s.artifacts || {}) };
        if (action.set == null) artifacts[action.type] = null;
        else artifacts[action.type] = { set: action.set, gem: artifacts[action.type]?.gem ?? null };
        return { ...s, artifacts };
      });
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
    case 'setArtifactGem': {
      const stages = state.build.gearStages.map((s, i) => {
        if (i !== action.stageIndex) return s;
        const cur = (s.artifacts || {})[action.type];
        if (!cur?.set) return s;
        const artifacts = { ...(s.artifacts || {}), [action.type]: { ...cur, gem: action.gem } };
        return { ...s, artifacts };
      });
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/state/store-sockets.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.jsx src/state/store-sockets.test.js
git commit -m "feat(socketing): reducer actions for cards/artifacts/gems"
```

---

### Task 5: Serialization — carry + validate sockets

**Files:**
- Modify: `src/state/build-url.js`
- Test: `src/state/build-url-sockets.test.js` (new)

**Interfaces:**
- Consumes: `gear-index` (`items`, `cardByName`, `gemBySlug`, `artifactBySlug`), `ARTIFACT_TYPES` from `gear.js`.
- Produces: `normalizeStages`/`sanitizeBuild` preserve valid `cards`/`artifacts`; drop unknown card names, gems, sets; cap card arrays to 3; legacy stages (no channels) unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/state/build-url-sockets.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';
import { cardByName, gemBySlug, artifactBySlug } from '../data/gear-index.js';

const aCard = Object.keys(cardByName)[0];
const aGem = Object.keys(gemBySlug)[0];
const aSet = Object.keys(artifactBySlug)[0];

describe('socket serialization', () => {
  it('round-trips cards + artifacts and drops invalid ones', () => {
    const build = {
      baseClass: 'mage', advancedClass: null, levels: {}, attributes: undefined, notes: '',
      gearStages: [{ toLevel: 10, changes: {},
        cards: { weapon: [aCard, 'Not A Real Card'] },
        artifacts: { rune: { set: aSet, gem: aGem }, jewel: { set: 'nope', gem: aGem } } }],
    };
    const clean = sanitizeBuild(decodeBuild(encodeBuild(build)));
    const st = clean.gearStages[0];
    expect(st.cards.weapon).toEqual([aCard]); // invalid card dropped
    expect(st.artifacts.rune).toEqual({ set: aSet, gem: aGem });
    expect(st.artifacts.jewel).toBeUndefined(); // invalid set dropped
  });
  it('legacy stages without channels still load', () => {
    const clean = sanitizeBuild({ baseClass: 'mage', gearStages: [{ toLevel: 10, changes: {} }] });
    expect(clean.gearStages[0].cards).toBeUndefined();
    expect(clean.gearStages[0].artifacts).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/state/build-url-sockets.test.js`
Expected: FAIL — channels stripped by `normalizeStages` (which rebuilds stage objects).

- [ ] **Step 3: Implement validation in `src/state/build-url.js`**

Add imports at top:

```js
import { items as gearItems, cardByName, gemBySlug, artifactBySlug } from '../data/gear-index.js';
import { sortStages, ARTIFACT_TYPES } from '../logic/gear.js';
```

(Replace the existing `gearItems`/`sortStages` imports with these consolidated lines.)

Add a sanitizer for the two channels:

```js
function cleanCards(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const out = {};
  for (const [slot, arr] of Object.entries(raw)) {
    if (!Array.isArray(arr)) continue;
    const cleaned = arr.slice(0, 3).map((c) => (c && cardByName[c] ? c : null));
    while (cleaned.length && cleaned[cleaned.length - 1] === null) cleaned.pop();
    if (cleaned.length) out[slot] = cleaned;
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanArtifacts(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const out = {};
  for (const t of ARTIFACT_TYPES) {
    const v = raw[t];
    if (v === null) { out[t] = null; continue; }
    if (v && artifactBySlug[v.set]) out[t] = { set: v.set, gem: (v.gem && gemBySlug[v.gem]) ? v.gem : null };
  }
  return Object.keys(out).length ? out : undefined;
}
```

In `normalizeStages`, when building each normalized stage, carry the cleaned channels. Update the `.map` that produces `{ ...s, changes }` and the cap-builders so the final stage objects include `cards`/`artifacts` only when present. Concretely, change the two places that emit `{ toLevel, changes }` / `{ ...s, changes }` to spread in:

```js
    const cards = cleanCards(s.cards);
    const artifacts = cleanArtifacts(s.artifacts);
    const extra = { ...(cards ? { cards } : {}), ...(artifacts ? { artifacts } : {}) };
    return { ...s, changes, ...extra };
```

and in the `caps` mapping include `...extra` carried from each source stage (thread `cards`/`artifacts` through alongside `changes`).

> Implementer note: `normalizeStages` currently maps to an intermediate `list` (with `changes`) then to `caps`. Attach `cards`/`artifacts` to the `list` items, then carry them into the `caps` objects so both the toLevel branch and the legacy fromLevel branch preserve them.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/state/build-url-sockets.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite (serialization is load-bearing)**

Run: `npm test`
Expected: all green (existing build-url tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/state/build-url.js src/state/build-url-sockets.test.js
git commit -m "feat(socketing): serialize + validate card/artifact channels (back-compat)"
```

---

### Task 6: Generic searchable `Picker` + open-state

**Files:**
- Create: `src/components/Picker.jsx`
- Modify: `src/state/store.jsx` (open-state + close action)
- Test: `src/components/Picker.test.jsx` (new)

**Interfaces:**
- Produces: `<Picker title options value onPick onClose />` where `options = [{ key, name, hint?, tooltip? }]`, `onPick(key|null)`, `onClose()`. Renders a search box filtering by `name`, a "None" / clear row, and a scrollable list. `value` highlights the current selection.
- Store: add `openPicker` state (`null | { kind:'card'|'artifact'|'gem', ... }`) and a `closePicker` action; `selectItemSlot`/`openSlot` is unchanged (items keep their existing picker).

- [ ] **Step 1: Write the failing test**

Create `src/components/Picker.test.jsx`:

```js
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Picker from './Picker.jsx';

const opts = [{ key: 'a', name: 'Alpha' }, { key: 'b', name: 'Beta' }];

describe('Picker', () => {
  it('filters by search and picks an option', () => {
    const onPick = vi.fn();
    render(<Picker title="Pick" options={opts} value={null} onPick={onPick} onClose={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'bet' } });
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Beta'));
    expect(onPick).toHaveBeenCalledWith('b');
  });
  it('offers a clear/none option', () => {
    const onPick = vi.fn();
    render(<Picker title="Pick" options={opts} value="a" onPick={onPick} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /none/i }));
    expect(onPick).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/components/Picker.test.jsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/components/Picker.jsx`**

```js
import { useState } from 'react';

export default function Picker({ title, options, value, onPick, onClose }) {
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const list = ql ? options.filter((o) => o.name.toLowerCase().includes(ql)) : options;
  return (
    <div className="picker">
      <div className="picker-head">
        <span className="label">{title}</span>
        <button className="picker-x" aria-label="close picker" onClick={onClose}>✕</button>
      </div>
      <input type="search" className="picker-search" autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="picker-opt none" onClick={() => onPick(null)}>None</button>
      <ul className="picker-list">
        {list.map((o) => (
          <li key={o.key}>
            <button className={`picker-opt${o.key === value ? ' on' : ''}`} onClick={() => onPick(o.key)}>
              <span>{o.name}</span>{o.hint && <span className="muted">{o.hint}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Add open-state + close action to `src/state/store.jsx`**

Add `openPicker: null` to `initialState`, and a case:

```js
    case 'setPicker': return { ...state, openPicker: action.picker };
```

(Components set `{ type:'setPicker', picker: {...} }` to open and `picker: null` to close.)

- [ ] **Step 5: Add minimal Picker CSS to `src/styles/app.css`**

```css
.picker { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 320px; }
.picker-head { display: flex; align-items: center; justify-content: space-between; }
.picker-x { background: transparent; border: 0; color: var(--muted); cursor: pointer; }
.picker-search { background: #0e1422; color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 5px 8px; }
.picker-list { list-style: none; margin: 0; padding: 0; overflow: auto; display: flex; flex-direction: column; gap: 2px; }
.picker-opt { width: 100%; text-align: left; background: #0e1422; color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 6px 8px; cursor: pointer; display: flex; justify-content: space-between; gap: 8px; }
.picker-opt.on { border-color: var(--on); }
.picker-opt.none { color: var(--muted); }
```

- [ ] **Step 6: Run the test + commit**

Run: `npx vitest run src/components/Picker.test.jsx`
Expected: PASS.

```bash
git add src/components/Picker.jsx src/components/Picker.test.jsx src/state/store.jsx src/styles/app.css
git commit -m "feat(socketing): generic searchable Picker + open-state"
```

---

### Task 7: Card pips in `GearLoadout`

**Files:**
- Modify: `src/components/GearLoadout.jsx`
- Modify: `src/styles/app.css` (pip styles)
- Test: `src/components/GearLoadout.test.jsx` (extend)

**Interfaces:**
- Consumes: `effectiveCards`, `categoryOf` (gear.js); `cards`/`cardByName` (gear-index); `Picker`; `setCardSlot`/`setPicker` actions; `state.openPicker`.
- Behavior: for each filled slot, render `item.cardSlots` pips from `effectiveCards()[slot]`. Clicking pip *n* opens a card Picker filtered to `equipSlot` matching `categoryOf(slot)` (case-insensitive) plus slot-agnostic cards; picking dispatches `setCardSlot`.

- [ ] **Step 1: Write the failing test**

Extend `src/components/GearLoadout.test.jsx` with:

```js
it('opens a card picker from a slot pip and sockets a card', () => {
  const init = { view: 'gear', selectedStage: 0,
    build: { baseClass: 'rogue', advancedClass: null, levels: {}, notes: '',
      attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
      gearStages: [{ toLevel: 10, changes: { weapon: 'bonefang' } }] } };
  render(<StoreProvider init={init}><GearLoadout /></StoreProvider>);
  // Bonefang has 3 card slots -> at least one empty pip is clickable.
  fireEvent.click(screen.getAllByRole('button', { name: /card slot/i })[0]);
  expect(screen.getByRole('searchbox')).toBeInTheDocument();
});
```

(Use the test's existing imports/`StoreProvider`. Confirm `bonefang` exists in `gear.json` with `cardSlots: 3`.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/components/GearLoadout.test.jsx`
Expected: FAIL — no card-slot buttons.

- [ ] **Step 3: Implement pips + picker in `GearLoadout.jsx`**

Add imports: `effectiveCards`, `categoryOf` from `gear.js`; `cards as allCards, cardByName` from gear-index; `Picker`. Read `const stageCards = effectiveCards(sorted, idx);` and `const op = state.openPicker;`.

Inside the slot render, after the slot name, when `item`:

```jsx
{item.cardSlots > 0 && (
  <div className="card-pips" onClick={(e) => e.stopPropagation()}>
    {Array.from({ length: item.cardSlots }, (_, n) => {
      const name = (stageCards[slot] || [])[n] || null;
      return (
        <button key={n} className={`pip${name ? ' filled' : ''}`} aria-label={`card slot ${n + 1} ${SLOT_LABELS[slot]}`}
          onClick={() => dispatch({ type: 'setPicker', picker: { kind: 'card', slot, index: n } })}>
          {name ? (cardByName[name]?.name ?? name) : '＋'}
        </button>
      );
    })}
  </div>
)}
```

After the loadout grid, render the card picker when open:

```jsx
{op?.kind === 'card' && (() => {
  const cat = categoryOf(op.slot);
  const options = Object.values(allCards)
    .filter((c) => !c.equipSlot || c.equipSlot.toLowerCase() === cat)
    .map((c) => ({ key: c.name, name: c.name, hint: (c.stats || [])[0] }));
  const current = (stageCards[op.slot] || [])[op.index] || null;
  return (
    <Picker title={`${SLOT_LABELS[op.slot]} card`} options={options} value={current}
      onPick={(card) => { dispatch({ type: 'setCardSlot', stageIndex: idx, slot: op.slot, index: op.index, card }); dispatch({ type: 'setPicker', picker: null }); }}
      onClose={() => dispatch({ type: 'setPicker', picker: null })} />
  );
})()}
```

- [ ] **Step 4: Add pip CSS to `src/styles/app.css`**

```css
.card-pips { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
.card-pips .pip { font-size: 10px; padding: 2px 6px; border-radius: 999px; background: #1f2430; border: 1px dashed #353d4e; color: #7b8499; cursor: pointer; }
.card-pips .pip.filled { background: #243a2e; border-style: solid; border-color: #356b4d; color: #9fe7be; }
```

- [ ] **Step 5: Run the test (+ full suite) to confirm pass**

Run: `npx vitest run src/components/GearLoadout.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/GearLoadout.jsx src/components/GearLoadout.test.jsx src/styles/app.css
git commit -m "feat(socketing): inline card pips + card picker in GearLoadout"
```

---

### Task 8: Interactive artifact panel (replace `ArtifactPanel`)

**Files:**
- Rewrite: `src/components/ArtifactPanel.jsx`
- Modify: `src/styles/app.css` (artifact-slot styles)
- Test: `src/components/ArtifactPanel.test.jsx` (rewrite)

**Interfaces:**
- Consumes: `effectiveArtifacts`, `ARTIFACT_TYPES` (gear.js); `artifacts` (array), `artifactBySlug`, `gems`, `gemBySlug` (gear-index); `Picker`; `setArtifact`/`setArtifactGem`/`setPicker`; `state.selectedStage`, `state.openPicker`, `state.build.gearStages`.
- Behavior: render 4 rows (Rune/Jewel/Scroll/Relic). Each row: a set button (opens artifact-set Picker) and, when a set is chosen, a gem button (opens gem Picker). Footer shows "Full-set N/4 \<set\>" (N = max count of any single set), highlighted when N === 4.

- [ ] **Step 1: Write the failing test**

Rewrite `src/components/ArtifactPanel.test.jsx`:

```js
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArtifactPanel from './ArtifactPanel.jsx';
import { StoreProvider } from '../state/store.jsx';
import { artifacts } from '../data/gear-index.js';

const init = (gearStages = [{ toLevel: 10, changes: {} }]) => ({
  view: 'gear', selectedStage: 0,
  build: { baseClass: 'rogue', advancedClass: null, levels: {}, notes: '',
    attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, gearStages },
});

describe('ArtifactPanel', () => {
  it('renders the four typed slots', () => {
    render(<StoreProvider init={init()}><ArtifactPanel /></StoreProvider>);
    for (const t of ['Rune', 'Jewel', 'Scroll', 'Relic']) expect(screen.getByText(t)).toBeInTheDocument();
  });
  it('opens a set picker from a slot', () => {
    render(<StoreProvider init={init()}><ArtifactPanel /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /pick rune set/i }));
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getAllByText(artifacts[0].name).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/components/ArtifactPanel.test.jsx`
Expected: FAIL (old static panel has no typed slots / picker).

- [ ] **Step 3: Rewrite `src/components/ArtifactPanel.jsx`**

```js
import { useStore } from '../state/store.jsx';
import { artifacts, artifactBySlug, gems, gemBySlug } from '../data/gear-index.js';
import { effectiveArtifacts, ARTIFACT_TYPES, sortStages } from '../logic/gear.js';
import Picker from './Picker.jsx';

const TYPE_LABEL = { rune: 'Rune', jewel: 'Jewel', scroll: 'Scroll', relic: 'Relic' };

export default function ArtifactPanel() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages;
  if (!stages.length) return null;
  const sorted = sortStages(stages);
  const idx = Math.min(state.selectedStage, sorted.length - 1);
  const eff = effectiveArtifacts(sorted, idx);
  const op = state.openPicker;

  const counts = {};
  for (const v of Object.values(eff)) if (v?.set) counts[v.set] = (counts[v.set] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  const setOpts = artifacts.map((a) => ({ key: a.slug, name: a.name, hint: (a.perPiece || [])[0] }));
  const gemOpts = Object.values(gems).map((g) => ({ key: g.slug, name: g.name, hint: g.affix }));

  return (
    <div className="artifact-panel">
      <h3>Artifacts</h3>
      <ul className="artifact-slots">
        {ARTIFACT_TYPES.map((t) => {
          const cur = eff[t];
          const set = cur?.set ? artifactBySlug[cur.set] : null;
          const gem = cur?.gem ? gemBySlug[cur.gem] : null;
          return (
            <li key={t} className="artifact-slot">
              <span className="atype">{TYPE_LABEL[t]}</span>
              <button className="aset" aria-label={`pick ${t} set`} onClick={() => dispatch({ type: 'setPicker', picker: { kind: 'artifact', atype: t } })}>
                {set ? set.name : '＋ pick set'}
              </button>
              {set && (
                <button className="agem" aria-label={`pick ${t} gem`} onClick={() => dispatch({ type: 'setPicker', picker: { kind: 'gem', atype: t } })}>
                  {gem ? `💎 ${gem.name}` : '＋ gem'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {top && <div className={`artifact-setbar${top[1] === 4 ? ' full' : ''}`}>✦ Full-set: {top[1]}/4 {artifactBySlug[top[0]]?.name}</div>}

      {op?.kind === 'artifact' && (
        <Picker title={`${TYPE_LABEL[op.atype]} set`} options={setOpts} value={eff[op.atype]?.set || null}
          onPick={(set) => { dispatch({ type: 'setArtifact', stageIndex: idx, type: op.atype, set }); dispatch({ type: 'setPicker', picker: null }); }}
          onClose={() => dispatch({ type: 'setPicker', picker: null })} />
      )}
      {op?.kind === 'gem' && (
        <Picker title={`${TYPE_LABEL[op.atype]} gem`} options={gemOpts} value={eff[op.atype]?.gem || null}
          onPick={(gem) => { dispatch({ type: 'setArtifactGem', stageIndex: idx, type: op.atype, gem }); dispatch({ type: 'setPicker', picker: null }); }}
          onClose={() => dispatch({ type: 'setPicker', picker: null })} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Replace artifact CSS in `src/styles/app.css`**

Replace the old `.artifact-list`/`.artifact` rules with:

```css
.artifact-slots { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.artifact-slot { display: flex; align-items: center; gap: 8px; }
.artifact-slot .atype { width: 54px; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--route); }
.artifact-slot .aset, .artifact-slot .agem { background: #0e1422; color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 12px; }
.artifact-setbar { margin-top: 8px; font-size: 11px; color: var(--muted); }
.artifact-setbar.full { color: var(--on); }
```

- [ ] **Step 5: Run the test (+ full suite)**

Run: `npx vitest run src/components/ArtifactPanel.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ArtifactPanel.jsx src/components/ArtifactPanel.test.jsx src/styles/app.css
git commit -m "feat(socketing): interactive 4-typed-slot artifact panel + gem pickers"
```

---

### Task 9: Fold sockets into StatSheet totals

**Files:**
- Modify: `src/components/StatSheet.jsx`
- Test: `src/components/StatSheet.test.jsx` (extend)

**Interfaces:**
- Consumes: `effectiveLoadout`, `effectiveCards`, `effectiveArtifacts` (gear.js); `items`, `cardByName`, `gemBySlug`, `artifactBySlug` (gear-index); `sumLoadoutStats`, `sumSocketStats` (stats.js).
- Behavior: total = `sumLoadoutStats(loadout, items)` merged by label with `sumSocketStats({ cards, artifacts }, { itemsBySlot, cardByName, gemBySlug, artifactBySlug })`, where `itemsBySlot[slot] = items[loadout[slot]]`.

- [ ] **Step 1: Write the failing test**

Extend `src/components/StatSheet.test.jsx`. `Bee Card` is a real Weapon card whose
only stat is `+25 Hit`, and `bonefang` has no "Hit" stat — so "Hit" in the total
must come from the socketed card:

```js
it('includes socketed card stats in the total', () => {
  const init = { view: 'gear', selectedStage: 0,
    build: { baseClass: 'rogue', advancedClass: null, levels: {}, notes: '',
      attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
      gearStages: [{ toLevel: 10, changes: { weapon: 'bonefang' }, cards: { weapon: ['Bee Card'] } }] } };
  render(<StoreProvider init={init}><StatSheet /></StoreProvider>);
  expect(screen.getByText('Hit')).toBeInTheDocument();
  expect(screen.getByText('+25')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/components/StatSheet.test.jsx`
Expected: FAIL — StatSheet sums only item stats, so "Hit" is absent.

- [ ] **Step 3: Implement the merge in `src/components/StatSheet.jsx`**

```js
import { effectiveLoadout, effectiveCards, effectiveArtifacts, sortStages } from '../logic/gear.js';
import { items, cardByName, gemBySlug, artifactBySlug } from '../data/gear-index.js';
import { sumLoadoutStats, sumSocketStats } from '../logic/stats.js';
```

Replace the totals computation:

```js
  const sorted = stages.length ? sortStages(stages) : [];
  const idx = Math.min(state.selectedStage, sorted.length - 1);
  const loadout = sorted.length ? effectiveLoadout(sorted, idx) : {};
  const cards = sorted.length ? effectiveCards(sorted, idx) : {};
  const artifacts = sorted.length ? effectiveArtifacts(sorted, idx) : {};
  const itemsBySlot = Object.fromEntries(Object.entries(loadout).map(([s, slug]) => [s, items[slug]]));

  const merged = new Map();
  for (const r of [...sumLoadoutStats(loadout, items),
                   ...sumSocketStats({ cards, artifacts }, { itemsBySlot, cardByName, gemBySlug, artifactBySlug })]) {
    const cur = merged.get(r.label) || { label: r.label, value: 0, percent: r.percent };
    cur.value += r.value;
    merged.set(r.label, cur);
  }
  const totals = [...merged.values()].sort((a, b) => a.label.localeCompare(b.label));
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/components/StatSheet.test.jsx`
Expected: PASS — "Hit" / "+25" now appear.

- [ ] **Step 5: Full suite + commit**

Run: `npm test`
Expected: all green.

```bash
git add src/components/StatSheet.jsx src/components/StatSheet.test.jsx
git commit -m "feat(socketing): fold card/gem/artifact stats into the gear total"
```

---

## Final verification (after all tasks)

- [ ] `npm test` — all green.
- [ ] `npm run build` — clean production build.
- [ ] Live (Playwright, `npm run dev`): on the Gear tab, socket a card via a slot pip, pick a Rune set + gem, confirm the full-set bar updates and TOTAL STATS reflects the socketed stats; then verify a `?build=` link copied from a socketed build reloads with the sockets intact, and a legacy (pre-socketing) link still loads.
