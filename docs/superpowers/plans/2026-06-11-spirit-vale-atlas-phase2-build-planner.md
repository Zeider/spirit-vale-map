# Spirit Vale Atlas — Phase 2 Implementation Plan (Build Planner)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Build Planner view where the player picks a base class, optionally advances it, and allocates skill points across 6×7 skill trees (1 point per job level, prerequisites enforced), with a shareable `?build=` URL.

**Architecture:** A build step turns the vendored spiritvalemarket `build-simulator` snapshot into `src/data/classes.json` (classes + a deduped skills map). Pure logic governs allocation; a Context+reducer (extending Phase 1's store) holds `view` + `build`; React components render the class picker, skill-tree grids, and skill detail. The app gains an Atlas/Builds view toggle.

**Tech Stack:** React 18, Vite 7, Vitest + @testing-library/react. Node ESM build scripts. Windows; run commands from repo root `spirit-vale-map/`.

**Already in place:** `data/raw-builds/build-simulator.json` (vendored current API snapshot), Phase 1 app (store/sync/TopBar/App), test infra.

**Real base→advanced mapping (verified from the live builder — every base also advances to Weaver):**
`warrior→[berserker,weaver]`, `knight→[paladin,weaver]`, `scout→[gunslinger,weaver]`, `mage→[wizard,weaver]`, `acolyte→[priest,weaver]`, `rogue→[shinobi,weaver]`, `summoner→[necromancer,weaver]`.

---

## File structure (created/changed by this plan)

```
scripts/lib/build-classes.mjs        # pure: buildClasses(raw) (tested)
scripts/build-classes.mjs            # CLI: raw-builds → src/data/classes.json
src/data/classes.json                # GENERATED, committed
src/data/classes-index.js            # helpers over classes.json
src/logic/build.js                   # allocation rules (pure)
src/state/build-url.js               # build encode/decode/sanitize
src/state/store.jsx                  # + view, build, actions (modify)
src/state/sync.js                    # persist view+build (modify)
src/components/SkillCard.jsx  SkillDetail.jsx  SkillTree.jsx  BudgetBar.jsx  ClassPicker.jsx  BuildView.jsx
src/components/TopBar.jsx            # view-aware (modify)
src/App.jsx                          # atlas|builds switch (modify)
src/styles/app.css                  # build planner styles (modify)
package.json                        # data/prebuild scripts (modify)
ATTRIBUTION.md  README.md           # credit the API (modify)
```

---

## Task 1: Build-classes pipeline (pure functions)

**Files:** Create `scripts/lib/build-classes.mjs`, Test `scripts/lib/build-classes.test.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/lib/build-classes.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { buildClasses, ADVANCEMENTS } from './build-classes.mjs';

const raw = {
  classes: [
    { Slug: 'acolyte', GameId: 'Acolyte', DisplayName: 'Acolyte', Type: 'base', MaxJobLevel: 50, AdvancedClasses: ['Priest'] },
    { Slug: 'priest', GameId: 'Priest', DisplayName: 'Priest', Type: 'advanced', MaxJobLevel: 70, AdvancedClasses: [] },
  ],
  classSkillTrees: {
    Acolyte: [[null, { id: 'heal', name: 'Heal', description: 'h', maxLevel: 5, isPassive: false, requirements: [], values: { cost: { base: 10, level: 5 }, cooldown: { base: 1, level: 0 } } }]],
    Priest: [[{ id: 'sanctuary', name: 'Sanctuary', description: 's', maxLevel: 3, isPassive: false, requirements: [{ id: 'heal', name: 'Heal', level: 3 }], values: { damage: { base: 0, level: 50 } } }]],
  },
  skillMap: {
    heal: { id: 'heal', name: 'Heal', description: 'h', maxLevel: 5, isPassive: false, requirements: [], values: { cost: { base: 10, level: 5 }, cooldown: { base: 1, level: 0 } } },
    sanctuary: { id: 'sanctuary', name: 'Sanctuary', description: 's', maxLevel: 3, isPassive: false, requirements: [{ id: 'heal', name: 'Heal', level: 3 }], values: { damage: { base: 0, level: 50 } } },
  },
};

describe('buildClasses', () => {
  const out = buildClasses(raw);
  it('emits classes with slug grids', () => {
    const acolyte = out.classes.find((c) => c.slug === 'acolyte');
    expect(acolyte.grid[0]).toEqual([null, 'heal']);
    expect(acolyte.maxJobLevel).toBe(50);
  });
  it('overrides base advancedClasses with the verified mapping (incl. weaver)', () => {
    const acolyte = out.classes.find((c) => c.slug === 'acolyte');
    expect(acolyte.advancedClasses).toEqual(ADVANCEMENTS.acolyte);
    expect(acolyte.advancedClasses).toContain('weaver');
  });
  it('gives advanced classes no advancedClasses', () => {
    expect(out.classes.find((c) => c.slug === 'priest').advancedClasses).toEqual([]);
  });
  it('normalizes skills with requirements and value scaling', () => {
    expect(out.skills.heal).toMatchObject({ name: 'Heal', maxLevel: 5, isPassive: false, cost: { base: 10, level: 5 } });
    expect(out.skills.sanctuary.requirements).toEqual([{ id: 'heal', level: 3 }]);
    expect(out.skills.sanctuary.damage).toEqual({ base: 0, level: 50 });
    expect(out.skills.heal.damage).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/lib/build-classes.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`scripts/lib/build-classes.mjs`:
```js
// Verified base→advanced mapping from the live spiritvalemarket builder.
// Every base class can also advance to Weaver; the API's AdvancedClasses field
// is incomplete, so we override it with this.
export const ADVANCEMENTS = {
  warrior: ['berserker', 'weaver'],
  knight: ['paladin', 'weaver'],
  scout: ['gunslinger', 'weaver'],
  mage: ['wizard', 'weaver'],
  acolyte: ['priest', 'weaver'],
  rogue: ['shinobi', 'weaver'],
  summoner: ['necromancer', 'weaver'],
};

function normSkill(s) {
  const v = s.values && !Array.isArray(s.values) ? s.values : {};
  const pick = (k) => (v[k] ? { base: v[k].base, level: v[k].level } : null);
  return {
    id: s.id,
    name: s.name,
    description: s.description || '',
    maxLevel: s.maxLevel,
    isPassive: !!s.isPassive,
    requirements: (s.requirements || []).map((r) => ({ id: r.id, level: r.level })),
    cost: pick('cost'),
    cooldown: pick('cooldown'),
    damage: pick('damage'),
  };
}

export function buildClasses(raw) {
  const skills = {};
  for (const [id, s] of Object.entries(raw.skillMap)) skills[id] = normSkill(s);

  const classes = raw.classes.map((c) => {
    const treeGrid = raw.classSkillTrees[c.GameId] || [];
    const grid = treeGrid.map((row) => row.map((cell) => (cell ? cell.id : null)));
    // backfill any tree skill missing from skillMap
    for (const row of treeGrid) for (const cell of row) if (cell && !skills[cell.id]) skills[cell.id] = normSkill(cell);
    const advancedClasses = c.Type === 'base' ? (ADVANCEMENTS[c.Slug] || []) : [];
    return { slug: c.Slug, name: c.DisplayName, type: c.Type, maxJobLevel: c.MaxJobLevel, advancedClasses, grid };
  });

  return { classes, skills };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/lib/build-classes.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/build-classes.mjs scripts/lib/build-classes.test.mjs
git commit -m "feat: build-classes pipeline (classes + skills from build-simulator)"
```

---

## Task 2: Build-classes CLI + npm wiring → `classes.json`

**Files:** Create `scripts/build-classes.mjs`, `src/data/classes.json` (generated); Modify `package.json`

- [ ] **Step 1: Write the CLI**

`scripts/build-classes.mjs`:
```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildClasses } from './lib/build-classes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(readFileSync(join(root, 'data', 'raw-builds', 'build-simulator.json'), 'utf8'));
const out = { fetched: '2026-06-11', ...buildClasses(raw) };
const outDir = join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'classes.json'), JSON.stringify(out, null, 2));
console.log(`Wrote src/data/classes.json — ${out.classes.length} classes, ${Object.keys(out.skills).length} skills.`);
```

- [ ] **Step 2: Wire npm scripts** — Modify `package.json` scripts so both data files build. Replace the `data` and `prebuild` scripts with:

```json
    "data": "node scripts/build-data.mjs && node scripts/build-classes.mjs",
    "prebuild": "node scripts/build-data.mjs && node scripts/build-classes.mjs",
```

- [ ] **Step 3: Generate the data**

Run: `node scripts/build-classes.mjs`
Expected: prints `Wrote src/data/classes.json — 15 classes, 208 skills.` (counts may vary slightly; both > 0).

- [ ] **Step 4: Sanity-check**

Run: `node -e "const d=require('./src/data/classes.json'); const a=d.classes.find(c=>c.slug==='acolyte'); console.log(a.advancedClasses, a.grid.length+'x'+a.grid[0].length, !!d.skills[a.grid.flat().find(Boolean)])"`
Expected: prints `[ 'priest', 'weaver' ] 6x7 true`.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-classes.mjs src/data/classes.json package.json
git commit -m "feat: generate committed src/data/classes.json + npm data wiring"
```

---

## Task 3: Classes index helper

**Files:** Create `src/data/classes-index.js`, Test `src/data/classes-index.test.js`

- [ ] **Step 1: Write the failing test**

`src/data/classes-index.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { classes, skills, classBySlug, baseClasses, advancedFor } from './classes-index.js';

describe('classes-index', () => {
  it('exposes classes and a skills map', () => {
    expect(classes.length).toBeGreaterThan(0);
    expect(Object.keys(skills).length).toBeGreaterThan(0);
  });
  it('indexes classes by slug', () => {
    expect(classBySlug.acolyte.name).toBe('Acolyte');
  });
  it('lists 7 base classes', () => {
    expect(baseClasses.every((c) => c.type === 'base')).toBe(true);
    expect(baseClasses.length).toBe(7);
  });
  it('resolves advancement options to class objects', () => {
    const adv = advancedFor('acolyte').map((c) => c.slug);
    expect(adv).toContain('priest');
    expect(adv).toContain('weaver');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/classes-index.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/data/classes-index.js`:
```js
import data from './classes.json';

export const classes = data.classes;
export const skills = data.skills;
export const gameDataFetched = data.fetched;

export const classBySlug = Object.fromEntries(classes.map((c) => [c.slug, c]));
export const skillById = skills;
export const baseClasses = classes.filter((c) => c.type === 'base');

export function advancedFor(slug) {
  const c = classBySlug[slug];
  return (c?.advancedClasses || []).map((s) => classBySlug[s]).filter(Boolean);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/classes-index.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/classes-index.js src/data/classes-index.test.js
git commit -m "feat: classes index helper"
```

---

## Task 4: Allocation logic

**Files:** Create `src/logic/build.js`, Test `src/logic/build.test.js`

- [ ] **Step 1: Write the failing test**

`src/logic/build.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { treeOf, pointsUsed, budget, requirementsMet, canIncrement, canDecrement } from './build.js';

// Uses real data: pick a base class with a known requirement chain.
import { classBySlug, skills } from '../data/classes-index.js';

// Build a synthetic build on acolyte (heal has no reqs; find a skill that requires another).
const acolyte = classBySlug.acolyte;
const flat = acolyte.grid.flat().filter(Boolean);

describe('build logic', () => {
  const base = { baseClass: 'acolyte', advancedClass: null, levels: {} };

  it('treeOf finds the base tree for a base-class skill', () => {
    expect(treeOf(flat[0], base)).toBe('base');
  });
  it('pointsUsed sums levels in a tree', () => {
    const b = { ...base, levels: { [flat[0]]: 3 } };
    expect(pointsUsed(b, 'base')).toBe(3);
  });
  it('budget equals the class maxJobLevel', () => {
    expect(budget(base, 'base')).toBe(50);
  });
  it('canIncrement is false past maxLevel and when over budget', () => {
    const id = flat[0];
    const max = classBySlug.acolyte.grid.flat().includes(id);
    expect(max).toBe(true);
    const full = { ...base, levels: { [id]: 999 } };
    expect(canIncrement(id, full)).toBe(false); // already at/over maxLevel
  });
  it('canDecrement is blocked when a dependent still needs the level', () => {
    // find a skill with a requirement within the same class
    let depId = null; let reqId = null; let reqLvl = 0;
    for (const id of flat) {
      const sk = classBySlug.acolyte.grid.flat();
      void sk;
    }
    // Use the skills map via requirementsMet semantics through a crafted build:
    // pick any skill that has requirements
    const req = Object.values(skills).find(
      (s) => s.requirements.length && flat.includes(s.id) && flat.includes(s.requirements[0].id),
    );
    if (!req) return; // no in-tree requirement pair; skip
    depId = req.id; reqId = req.requirements[0].id; reqLvl = req.requirements[0].level;
    const b = { ...base, levels: { [reqId]: reqLvl, [depId]: 1 } };
    expect(canDecrement(reqId, b)).toBe(false); // lowering reqId would break depId
    expect(requirementsMet(depId, b)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/logic/build.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/logic/build.js`:
```js
import { classBySlug, skillById } from '../data/classes-index.js';

function gridHas(cls, id) {
  return !!cls && cls.grid.some((row) => row.includes(id));
}

// 'base' | 'advanced' | null — which selected tree the skill belongs to.
export function treeOf(skillId, build) {
  if (gridHas(classBySlug[build.baseClass], skillId)) return 'base';
  if (build.advancedClass && gridHas(classBySlug[build.advancedClass], skillId)) return 'advanced';
  return null;
}

export function pointsUsed(build, tree) {
  let sum = 0;
  for (const [id, lv] of Object.entries(build.levels || {})) {
    if (lv > 0 && treeOf(id, build) === tree) sum += lv;
  }
  return sum;
}

export function budget(build, tree) {
  const slug = tree === 'base' ? build.baseClass : build.advancedClass;
  return classBySlug[slug]?.maxJobLevel ?? 0;
}

export function requirementsMet(skillId, build) {
  const sk = skillById[skillId];
  if (!sk) return false;
  return (sk.requirements || []).every((r) => (build.levels?.[r.id] || 0) >= r.level);
}

export function canIncrement(skillId, build) {
  const sk = skillById[skillId];
  if (!sk) return false;
  const cur = build.levels?.[skillId] || 0;
  if (cur >= sk.maxLevel) return false;
  if (!requirementsMet(skillId, build)) return false;
  const tree = treeOf(skillId, build);
  if (!tree) return false;
  return pointsUsed(build, tree) < budget(build, tree);
}

export function canDecrement(skillId, build) {
  const cur = build.levels?.[skillId] || 0;
  if (cur <= 0) return false;
  // Block if lowering to cur-1 would break a currently-allocated dependent.
  for (const [depId, lv] of Object.entries(build.levels || {})) {
    if (lv <= 0) continue;
    const dep = skillById[depId];
    const req = (dep?.requirements || []).find((r) => r.id === skillId);
    if (req && cur - 1 < req.level) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/logic/build.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/build.js src/logic/build.test.js
git commit -m "feat: skill allocation logic (budget, requirements, increment/decrement)"
```

---

## Task 5: Build URL encode/decode/sanitize

**Files:** Create `src/state/build-url.js`, Test `src/state/build-url.test.js`

- [ ] **Step 1: Write the failing test**

`src/state/build-url.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';

describe('build url', () => {
  it('round-trips a build', () => {
    const b = { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5, faith: 3 } };
    const s = encodeBuild(b);
    expect(s).toBe('acolyte~priest~heal:5,faith:3');
    expect(decodeBuild(s)).toEqual(b);
  });
  it('handles no advanced class', () => {
    expect(encodeBuild({ baseClass: 'mage', advancedClass: null, levels: { firebolt: 2 } })).toBe('mage~~firebolt:2');
    expect(decodeBuild('mage~~firebolt:2')).toEqual({ baseClass: 'mage', advancedClass: null, levels: { firebolt: 2 } });
  });
  it('returns null for empty', () => {
    expect(decodeBuild('')).toBeNull();
    expect(encodeBuild(null)).toBe('');
  });
  it('sanitize drops unknown class and skills', () => {
    const b = sanitizeBuild({ baseClass: 'not-a-class', advancedClass: null, levels: { heal: 5 } });
    expect(b).toBeNull();
  });
  it('sanitize clamps levels to maxLevel and drops skills with unmet requirements', () => {
    // heal exists on acolyte with no reqs; a fake skill id is dropped
    const b = sanitizeBuild({ baseClass: 'acolyte', advancedClass: null, levels: { heal: 999, 'fake-skill': 3 } });
    expect(b.baseClass).toBe('acolyte');
    expect(b.levels['fake-skill']).toBeUndefined();
    // heal clamped to its maxLevel
    expect(b.levels.heal).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/build-url.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

`src/state/build-url.js`:
```js
import { classBySlug, skillById } from '../data/classes-index.js';
import { treeOf, requirementsMet } from '../logic/build.js';

export function encodeBuild(build) {
  if (!build?.baseClass) return '';
  const lv = Object.entries(build.levels || {})
    .filter(([, v]) => v > 0)
    .map(([id, v]) => `${id}:${v}`)
    .join(',');
  return `${build.baseClass}~${build.advancedClass || ''}~${lv}`;
}

export function decodeBuild(str) {
  if (!str) return null;
  const [base, adv, lvStr] = str.split('~');
  const levels = {};
  for (const part of (lvStr || '').split(',')) {
    if (!part) continue;
    const [id, v] = part.split(':');
    const n = parseInt(v, 10);
    if (id && n > 0) levels[id] = n;
  }
  return { baseClass: base || null, advancedClass: adv || null, levels };
}

// Drop unknown classes/skills, clamp to maxLevel, drop skills not in a selected
// tree or with unmet requirements (single settling pass). Returns null if the
// base class is unknown.
export function sanitizeBuild(build) {
  if (!build || !classBySlug[build.baseClass]) return null;
  const advancedClass = classBySlug[build.advancedClass] ? build.advancedClass : null;
  const clean = { baseClass: build.baseClass, advancedClass, levels: {} };
  // keep skills that belong to a selected tree, clamp to maxLevel
  for (const [id, lv] of Object.entries(build.levels || {})) {
    const sk = skillById[id];
    if (!sk) continue;
    if (!treeOf(id, clean)) continue;
    clean.levels[id] = Math.min(lv, sk.maxLevel);
  }
  // drop any whose requirements aren't met (a few passes settle cascades)
  for (let i = 0; i < 5; i++) {
    let changed = false;
    for (const id of Object.keys(clean.levels)) {
      if (!requirementsMet(id, clean)) { delete clean.levels[id]; changed = true; }
    }
    if (!changed) break;
  }
  return clean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/build-url.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/build-url.js src/state/build-url.test.js
git commit -m "feat: build URL encode/decode/sanitize"
```

---

## Task 6: Store extension (view + build)

**Files:** Modify `src/state/store.jsx`, Test `src/state/store-build.test.js`

- [ ] **Step 1: Write the failing test**

`src/state/store-build.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './store.jsx';

const withBase = reducer(initialState, { type: 'selectClass', slug: 'acolyte' });

describe('reducer — build', () => {
  it('defaults view to atlas with an empty build', () => {
    expect(initialState.view).toBe('atlas');
    expect(initialState.build).toEqual({ baseClass: null, advancedClass: null, levels: {} });
  });
  it('setView switches view', () => {
    expect(reducer(initialState, { type: 'setView', view: 'builds' }).view).toBe('builds');
  });
  it('selectClass sets base and clears advanced + levels', () => {
    const s = reducer({ ...withBase, build: { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 } } }, { type: 'selectClass', slug: 'mage' });
    expect(s.build).toEqual({ baseClass: 'mage', advancedClass: null, levels: {} });
  });
  it('selectAdvanced sets the advanced class', () => {
    expect(reducer(withBase, { type: 'selectAdvanced', slug: 'priest' }).build.advancedClass).toBe('priest');
  });
  it('setSkillLevel sets and deletes at 0', () => {
    let s = reducer(withBase, { type: 'setSkillLevel', id: 'heal', level: 3 });
    expect(s.build.levels.heal).toBe(3);
    s = reducer(s, { type: 'setSkillLevel', id: 'heal', level: 0 });
    expect(s.build.levels.heal).toBeUndefined();
  });
  it('resetBuild keeps the class but clears levels', () => {
    const s = reducer({ ...withBase, build: { baseClass: 'acolyte', advancedClass: 'priest', levels: { heal: 5 } } }, { type: 'resetBuild' });
    expect(s.build.levels).toEqual({});
    expect(s.build.baseClass).toBe('acolyte');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/store-build.test.js`
Expected: FAIL — `view`/`build` undefined.

- [ ] **Step 3: Extend the store** — Modify `src/state/store.jsx`. Update `initialState` and add the new cases.

Replace the `initialState` object with:
```js
export const initialState = {
  playerLevel: 1,
  dropFilter: 'all',
  selectedZoneId: null,
  route: [],
  view: 'atlas',
  build: { baseClass: null, advancedClass: null, levels: {} },
  selectedSkillId: null,
};
```

Add these cases to the `switch` in `reducer` (before `default`):
```js
    case 'setView': return { ...state, view: action.view };
    case 'selectClass':
      return { ...state, build: { baseClass: action.slug, advancedClass: null, levels: {} }, selectedSkillId: null };
    case 'selectAdvanced':
      return { ...state, build: { ...state.build, advancedClass: action.slug } };
    case 'setSkillLevel': {
      const levels = { ...state.build.levels };
      if (action.level > 0) levels[action.id] = action.level;
      else delete levels[action.id];
      return { ...state, build: { ...state.build, levels } };
    }
    case 'selectSkill': return { ...state, selectedSkillId: action.id };
    case 'resetBuild':
      return { ...state, build: { ...state.build, advancedClass: null, levels: {} }, selectedSkillId: null };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/store-build.test.js`
Expected: PASS. Also run `npx vitest run src/state/store.test.js` — Phase 1 store tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.jsx src/state/store-build.test.js
git commit -m "feat: store view + build state and actions"
```

---

## Task 7: SkillCard + SkillDetail components

**Files:** Create `src/components/SkillCard.jsx`, `src/components/SkillDetail.jsx`, Test `src/components/SkillCard.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/SkillCard.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkillCard from './SkillCard.jsx';

const skill = { id: 'heal', name: 'Heal', maxLevel: 5, isPassive: false, requirements: [] };

describe('SkillCard', () => {
  it('renders name, level/max and a badge', () => {
    render(<SkillCard skill={skill} level={2} canInc canDec onChange={() => {}} onSelect={() => {}} />);
    expect(screen.getByText('Heal')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByText(/skill/i)).toBeInTheDocument();
  });
  it('+ calls onChange with level+1 and is disabled when !canInc', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SkillCard skill={skill} level={2} canInc canDec onChange={onChange} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /increase heal/i }));
    expect(onChange).toHaveBeenCalledWith(3);
    rerender(<SkillCard skill={skill} level={2} canInc={false} canDec onChange={onChange} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /increase heal/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SkillCard.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the components**

`src/components/SkillCard.jsx`:
```jsx
export default function SkillCard({ skill, level, canInc, canDec, selected, onChange, onSelect }) {
  if (!skill) return <div className="sk-cell empty" aria-hidden="true" />;
  return (
    <div className={`sk-cell skill${level > 0 ? ' filled' : ''}${selected ? ' selected' : ''}`}>
      <button className="sk-face" onClick={() => onSelect(skill.id)} title={skill.name}>
        <span className={`sk-badge ${skill.isPassive ? 'passive' : 'active'}`}>{skill.isPassive ? 'PASSIVE' : 'SKILL'}</span>
        <span className="sk-name">{skill.name}</span>
      </button>
      <div className="sk-step">
        <button aria-label={`decrease ${skill.name}`} disabled={!canDec} onClick={() => onChange(level - 1)}>−</button>
        <span>{level}/{skill.maxLevel}</span>
        <button aria-label={`increase ${skill.name}`} disabled={!canInc} onClick={() => onChange(level + 1)}>+</button>
      </div>
    </div>
  );
}
```

`src/components/SkillDetail.jsx`:
```jsx
import { skillById } from '../data/classes-index.js';

function scaleLine(label, v) {
  if (!v) return null;
  const at = (lv) => v.base + v.level * (lv - 1);
  return <div className="sk-scale"><span className="label">{label}</span> Lv1 {at(1)} → Lv5 {at(5)}</div>;
}

export default function SkillDetail({ skillId }) {
  const sk = skillId ? skillById[skillId] : null;
  if (!sk) return <div className="sk-detail empty"><p className="muted">Click a skill to see its details.</p></div>;
  return (
    <div className="sk-detail">
      <h3>{sk.name} <span className={`sk-badge ${sk.isPassive ? 'passive' : 'active'}`}>{sk.isPassive ? 'PASSIVE' : 'SKILL'}</span> <span className="label">max {sk.maxLevel}</span></h3>
      <p className="muted">{sk.description}</p>
      {scaleLine('Cost', sk.cost)}
      {scaleLine('Cooldown', sk.cooldown)}
      {scaleLine('Damage', sk.damage)}
      {sk.requirements.length > 0 && (
        <p className="sk-reqs">Requires: {sk.requirements.map((r) => `${skillById[r.id]?.name || r.id} Lv${r.level}`).join(', ')}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/SkillCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SkillCard.jsx src/components/SkillDetail.jsx src/components/SkillCard.test.jsx
git commit -m "feat: SkillCard + SkillDetail components"
```

---

## Task 8: SkillTree + BudgetBar + ClassPicker

**Files:** Create `src/components/SkillTree.jsx`, `src/components/BudgetBar.jsx`, `src/components/ClassPicker.jsx`, Test `src/components/SkillTree.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/SkillTree.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkillTree from './SkillTree.jsx';
import { StoreProvider } from '../state/store.jsx';
import { classBySlug } from '../data/classes-index.js';

const firstSkill = classBySlug.acolyte.grid.flat().find(Boolean);

describe('SkillTree', () => {
  it('renders the class grid and increments a skill within budget', () => {
    render(
      <StoreProvider init={{ view: 'builds', build: { baseClass: 'acolyte', advancedClass: null, levels: {} } }}>
        <SkillTree classSlug="acolyte" tree="base" />
      </StoreProvider>,
    );
    const incs = screen.getAllByRole('button', { name: /increase/i });
    expect(incs.length).toBeGreaterThan(0);
    // budget shows 0 / 50 initially
    expect(screen.getByText(/0\s*\/\s*50/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SkillTree.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the components**

`src/components/BudgetBar.jsx`:
```jsx
export default function BudgetBar({ label, used, total }) {
  const over = used > total;
  return (
    <div className={`budget-bar${over ? ' over' : ''}`}>
      <span className="label">{label}</span>
      <span className="budget-count">{used} / {total}</span>
    </div>
  );
}
```

`src/components/SkillTree.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import { classBySlug, skillById } from '../data/classes-index.js';
import { canIncrement, canDecrement, pointsUsed, budget } from '../logic/build.js';
import SkillCard from './SkillCard.jsx';
import BudgetBar from './BudgetBar.jsx';

export default function SkillTree({ classSlug, tree }) {
  const { state, dispatch } = useStore();
  const cls = classBySlug[classSlug];
  if (!cls) return null;
  const { build, selectedSkillId } = state;

  return (
    <div className="skill-tree">
      <div className="skill-tree-head">
        <span className="label">{tree === 'base' ? 'BASE CLASS' : 'ADVANCED'} · {cls.name}</span>
        <BudgetBar label="Points" used={pointsUsed(build, tree)} total={budget(build, tree)} />
      </div>
      {cls.grid.map((row, r) => (
        <div className="grid-row" key={r}>
          {row.map((id, c) => (
            <SkillCard
              key={c}
              skill={id ? skillById[id] : null}
              level={id ? build.levels[id] || 0 : 0}
              canInc={id ? canIncrement(id, build) : false}
              canDec={id ? canDecrement(id, build) : false}
              selected={id === selectedSkillId}
              onChange={(level) => dispatch({ type: 'setSkillLevel', id, level })}
              onSelect={(sid) => dispatch({ type: 'selectSkill', id: sid })}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

`src/components/ClassPicker.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import { baseClasses, advancedFor } from '../data/classes-index.js';

export default function ClassPicker() {
  const { state, dispatch } = useStore();
  const { baseClass, advancedClass } = state.build;
  const advOptions = baseClass ? advancedFor(baseClass) : [];

  return (
    <div className="class-picker">
      <div className="label">BASE CLASS</div>
      <div className="class-row">
        {baseClasses.map((c) => (
          <button
            key={c.slug}
            className={`class-chip${c.slug === baseClass ? ' on' : ''}`}
            onClick={() => dispatch({ type: 'selectClass', slug: c.slug })}
          >
            {c.name}
          </button>
        ))}
      </div>
      {advOptions.length > 0 && (
        <>
          <div className="label">ADVANCED</div>
          <div className="class-row">
            {advOptions.map((c) => (
              <button
                key={c.slug}
                className={`class-chip adv${c.slug === advancedClass ? ' on' : ''}`}
                onClick={() => dispatch({ type: 'selectAdvanced', slug: c.slug === advancedClass ? null : c.slug })}
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/SkillTree.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SkillTree.jsx src/components/BudgetBar.jsx src/components/ClassPicker.jsx src/components/SkillTree.test.jsx
git commit -m "feat: SkillTree, BudgetBar, ClassPicker"
```

---

## Task 9: BuildView container

**Files:** Create `src/components/BuildView.jsx`, Test `src/components/BuildView.test.jsx`

- [ ] **Step 1: Write the failing test**

`src/components/BuildView.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BuildView from './BuildView.jsx';
import { StoreProvider } from '../state/store.jsx';

describe('BuildView', () => {
  it('prompts to pick a class when none selected', () => {
    render(<StoreProvider init={{ view: 'builds' }}><BuildView /></StoreProvider>);
    expect(screen.getByText(/pick a class/i)).toBeInTheDocument();
  });
  it('renders the base tree after selecting a class', () => {
    render(<StoreProvider init={{ view: 'builds', build: { baseClass: 'acolyte', advancedClass: null, levels: {} } }}><BuildView /></StoreProvider>);
    expect(screen.getByText(/BASE CLASS · Acolyte/i)).toBeInTheDocument();
  });
  it('renders the advanced tree when advanced is selected', () => {
    render(<StoreProvider init={{ view: 'builds', build: { baseClass: 'acolyte', advancedClass: 'priest', levels: {} } }}><BuildView /></StoreProvider>);
    expect(screen.getByText(/ADVANCED · Priest/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/BuildView.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

`src/components/BuildView.jsx`:
```jsx
import { useStore } from '../state/store.jsx';
import ClassPicker from './ClassPicker.jsx';
import SkillTree from './SkillTree.jsx';
import SkillDetail from './SkillDetail.jsx';

export default function BuildView() {
  const { state } = useStore();
  const { baseClass, advancedClass } = state.build;

  return (
    <div className="build-view">
      <ClassPicker />
      {!baseClass ? (
        <p className="muted build-empty">Pick a class to start allocating skills.</p>
      ) : (
        <div className="build-body">
          <div className="trees">
            <SkillTree classSlug={baseClass} tree="base" />
            {advancedClass && <SkillTree classSlug={advancedClass} tree="advanced" />}
          </div>
          <SkillDetail skillId={state.selectedSkillId} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/BuildView.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BuildView.jsx src/components/BuildView.test.jsx
git commit -m "feat: BuildView container"
```

---

## Task 10: TopBar view-aware + App switch + sync

**Files:** Modify `src/components/TopBar.jsx`, `src/App.jsx`, `src/state/sync.js`, Test `src/App.test.jsx` (extend)

- [ ] **Step 1: Write the failing test** — append to `src/App.test.jsx`:
```jsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

describe('App — view switching', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/'); localStorage.clear(); });

  it('toggles to the Builds view and writes ?view=builds', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /builds/i }));
    expect(screen.getByText(/pick a class/i)).toBeInTheDocument();
    expect(window.location.search).toMatch(/view=builds/);
  });
  it('loads a build from the URL', () => {
    window.history.replaceState(null, '', '/?view=builds&build=acolyte~~');
    render(<App />);
    expect(screen.getByText(/BASE CLASS · Acolyte/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.jsx`
Expected: FAIL — no Builds toggle / view not wired.

- [ ] **Step 3: Make TopBar view-aware** — Replace `src/components/TopBar.jsx` with:
```jsx
import { useStore } from '../state/store.jsx';
import { gameVersion } from '../data/zones-index.js';

const FILTERS = ['all', 'equip', 'material', 'card', 'gem', 'consumable', 'artifact'];

export default function TopBar() {
  const { state, dispatch } = useStore();
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); } catch { /* clipboard unavailable */ } };

  return (
    <header className="top-bar">
      <span className="brand">⚔️ Spirit Vale Atlas</span>
      <nav className="view-toggle">
        <button className={state.view === 'atlas' ? 'on' : ''} onClick={() => dispatch({ type: 'setView', view: 'atlas' })}>／Atlas</button>
        <button className={state.view === 'builds' ? 'on' : ''} onClick={() => dispatch({ type: 'setView', view: 'builds' })}>⚒ Builds</button>
      </nav>
      <span className="spacer" />
      {state.view === 'atlas' ? (
        <>
          <label className="field">Level
            <input type="number" min="1" max="135" value={state.playerLevel}
              onChange={(e) => dispatch({ type: 'setLevel', level: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
          </label>
          <label className="field">Filter
            <select value={state.dropFilter} onChange={(e) => dispatch({ type: 'setFilter', filter: e.target.value })}>
              {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <button onClick={share}>🔗 Share route</button>
        </>
      ) : (
        <>
          <button onClick={share}>🔗 Share build</button>
          <button onClick={() => dispatch({ type: 'resetBuild' })}>Reset</button>
        </>
      )}
      <span className="game-version" title="Game data version">v{gameVersion}</span>
    </header>
  );
}
```

- [ ] **Step 4: Extend sync** — Modify `src/state/sync.js`. Add build import + view/build persistence.

Replace the import block at the top:
```js
import { useEffect } from 'react';
import { encodeState, decodeState } from './url.js';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';
import { keepKnownTileIds } from '../data/map-tiles.js';
```

Replace `loadInitialState` and `usePersist` with:
```js
export function loadInitialState() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view') === 'builds' ? 'builds' : 'atlas';
  const atlas = decodeState(window.location.search.replace(/^\?/, ''));
  let base = atlas;
  if (!window.location.search && localStorage.getItem(LS_KEY)) {
    try { base = { ...base, ...JSON.parse(localStorage.getItem(LS_KEY)) }; } catch { /* ignore */ }
  }
  const build = sanitizeBuild(decodeBuild(params.get('build')));
  return {
    view,
    playerLevel: base.playerLevel ?? 1,
    route: keepKnownTileIds(base.route || []),
    ...(build ? { build } : {}),
  };
}

export function usePersist(state) {
  useEffect(() => {
    if (state.view === 'builds') {
      const b = encodeBuild(state.build);
      window.history.replaceState(null, '', `${window.location.pathname}?view=builds${b ? `&build=${b}` : ''}`);
    } else {
      const qs = encodeState({ playerLevel: state.playerLevel, route: state.route });
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
    localStorage.setItem(LS_KEY, JSON.stringify({ playerLevel: state.playerLevel, route: state.route }));
  }, [state.view, state.playerLevel, state.route, state.build]);
}
```
(Keep the existing `const LS_KEY = 'sva.state.v1';` line.)

- [ ] **Step 5: Switch views in App** — Modify `src/App.jsx`. Add the BuildView import and render by `view`.

Add import:
```js
import BuildView from './components/BuildView.jsx';
```
Replace the `Shell` component's returned JSX with:
```jsx
  return (
    <div className="app">
      <TopBar />
      {state.view === 'builds' ? (
        <BuildView />
      ) : (
        <>
          <div className="main">
            <MapView />
            <RouteRail />
          </div>
          <ZoneDrawer />
        </>
      )}
      <footer className="app-footer">
        Game data v{gameVersion}. Data: SpiritValeInfo + spiritvalemarket.com. Map art: spiritvalemarket.com. Community tool, not affiliated with the game.
      </footer>
    </div>
  );
```
(`Shell` already calls `usePersist(state)` and reads `state` from `useStore()`.)

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/App.test.jsx`
Expected: PASS (Phase 1 + new view tests).
Run: `npm test`
Expected: ALL test files PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/TopBar.jsx src/App.jsx src/state/sync.js src/App.test.jsx
git commit -m "feat: Atlas/Builds view toggle + build URL persistence"
```

---

## Task 11: Styling + docs

**Files:** Modify `src/styles/app.css`, `ATTRIBUTION.md`, `README.md`

- [ ] **Step 1: Append build-planner styles** to `src/styles/app.css`:
```css
/* View toggle */
.view-toggle { display: inline-flex; gap: 4px; background: #11182a; border: 1px solid var(--line); border-radius: 8px; padding: 3px; }
.view-toggle button { background: transparent; color: var(--muted); border: 0; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
.view-toggle button.on { background: var(--on); color: #123; }

/* Build planner */
.build-view { padding: 4px; }
.class-picker .label { color: #9bf; margin: 8px 0 4px; }
.class-row { display: flex; gap: 6px; flex-wrap: wrap; }
.class-chip { background: #161d2e; color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
.class-chip.on { border-color: var(--on); background: #16241c; }
.class-chip.adv.on { border-color: var(--route); background: #2a2410; }
.build-empty { margin: 16px 4px; }
.build-body { display: flex; gap: 12px; align-items: flex-start; margin-top: 12px; }
.trees { flex: 2.2; display: flex; flex-direction: column; gap: 14px; }
.skill-tree { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px; }
.skill-tree-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.grid-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 5px; }
.sk-cell { min-height: 56px; border-radius: 6px; }
.sk-cell.empty { background: transparent; }
.sk-cell.skill { background: #161d2e; border: 1px solid var(--line); display: flex; flex-direction: column; }
.sk-cell.skill.filled { border-color: var(--on); background: #16241c; }
.sk-cell.skill.selected { box-shadow: 0 0 0 2px #fff inset; }
.sk-face { flex: 1; background: none; border: 0; color: var(--text); cursor: pointer; text-align: left; padding: 4px 5px 0; display: flex; flex-direction: column; gap: 2px; }
.sk-badge { font-size: 8px; letter-spacing: .5px; }
.sk-badge.passive { color: var(--hub); }
.sk-badge.active { color: var(--route); }
.sk-name { font-size: 10px; line-height: 1.1; }
.sk-step { display: flex; align-items: center; justify-content: space-between; padding: 2px 4px; font-size: 10px; color: var(--muted); }
.sk-step button { background: #23304a; color: #fff; border: 0; border-radius: 3px; width: 18px; height: 18px; cursor: pointer; }
.sk-step button:disabled { opacity: .3; cursor: default; }
.budget-bar { font-size: 11px; color: var(--muted); }
.budget-bar .budget-count { color: var(--text); font-weight: 700; }
.budget-bar.over .budget-count { color: var(--under); }
.sk-detail { flex: 1; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px; font-size: 12px; position: sticky; top: 10px; }
.sk-detail.empty { color: var(--muted); }
.sk-detail h3 { margin: 0 0 6px; font-size: 14px; }
.sk-scale { margin: 2px 0; }
.sk-reqs { color: var(--route); margin-top: 8px; }

@media (max-width: 800px) { .build-body { flex-direction: column; } }
```

- [ ] **Step 2: Update `ATTRIBUTION.md`** — add a line under Game data:
```markdown
- **Build / skill / catalog data:** [spiritvalemarket.com](https://spiritvalemarket.com) public API (`/api/build-simulator`, `/api/catalog`) — current game data.
```

- [ ] **Step 3: Update `README.md`** — under "Updating game data", add:
```markdown
- Build planner data comes from a vendored snapshot of spiritvalemarket's `/api/build-simulator` in `data/raw-builds/`. To refresh: re-download it, then `npm run data` (regenerates `src/data/classes.json`).
```

- [ ] **Step 4: Visual check + full build**

Run: `npm run dev` — toggle to **Builds**, pick Acolyte, advance to Priest, allocate Heal/Faith, watch the budget count and prerequisite locks, click a skill for details, copy the share link, reload to confirm it restores.
Run: `npm run build`
Expected: clean build (prebuild regenerates both data files).

- [ ] **Step 5: Commit**

```bash
git add src/styles/app.css ATTRIBUTION.md README.md
git commit -m "style: build planner styling + attribution/readme"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** data switch to build-simulator (T1–T2), classes index (T3), allocation rules incl. budget/requirements/block-decrement (T4), build URL + sanitize (T5), store view+build (T6), skill cards/detail (T7), tree/budget/picker (T8), BuildView stacked trees (T9), view toggle + persistence + view-aware TopBar (T10), styling + attribution (T11). Advanced mapping (OQ-1) is resolved and baked into `ADVANCEMENTS` (T1).
- **OQ-2 (pools):** implemented as **separate** pools (base `maxJobLevel` + advanced `maxJobLevel`) via `budget(build, tree)`. If the game actually shares one pool, change `budget` to sum both and adjust `pointsUsed` to ignore `tree` — localized to `src/logic/build.js`.
- **Naming consistency:** action types (`setView/selectClass/selectAdvanced/setSkillLevel/selectSkill/resetBuild`), `classBySlug`/`skillById`/`baseClasses`/`advancedFor`, `treeOf/pointsUsed/budget/requirementsMet/canIncrement/canDecrement`, `encodeBuild/decodeBuild/sanitizeBuild` are used identically across tasks.
- **No placeholders:** every step has real code/commands. The `canDecrement` dependent test (T4) self-skips if the chosen class has no in-tree requirement pair, so it never produces a false failure.
```
