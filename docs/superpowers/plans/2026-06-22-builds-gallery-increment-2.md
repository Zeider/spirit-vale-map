# Builds Gallery Increment 2 — Browse + Detail + Copy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone browse the public builds gallery (featured shelf + filterable/searchable card grid), open a build's read-only detail (full skills + gear), and copy it into their own planner.

**Architecture:** Server reads via the existing `gallery.js` (Supabase SDK, RLS-scoped). All filtering/sorting/relative-time is pure client logic in `logic/gallery-ui.js`. The detail view renders the **existing planner components inside a second, nested `StoreProvider`** seeded with the viewed build + a `readOnly` flag — so the planner shows someone else's build without touching the user's working session, and mutating controls disable themselves by reading `state.readOnly`. Routing stays query-param based: `?view=builds` (gallery), `?view=builds&b=<id>` (detail).

**Tech Stack:** React 18 + Vite, Context+reducer store, `@supabase/supabase-js` (already a dep on this branch), Vitest + @testing-library/react.

## Global Constraints

- Branch: `feat/builds-gallery` (Increment 1 — auth + publish + My Builds — already built here). Do NOT deploy; this is batched.
- Anon/publishable Supabase key is public + RLS-protected — safe to keep hardcoded in `supabaseClient.js`. Never paste the Discord client secret anywhere.
- Routing is query-param only (GitHub-Pages safe): allowed `view` values become `atlas | build | gear | my-builds | builds`. Detail = `?view=builds&b=<8-char id>`.
- Build payloads are read back through `sanitizeBuild` (never trust stored JSON). Copy/Fork hydrates `{ build: sanitizeBuild(payload), view: 'gear' }`.
- Fixed tag vocab — Role: `DPS, Tank, Support, Hybrid`; Content: `Leveling, Endgame, Boss`. Base classes: `acolyte, knight, mage, rogue, scout, summoner, warrior`.
- YAGNI for Increment 2: no likes UI (Increment 3), no pagination beyond a 200-row fetch cap (log the cap, don't hide it), no comments/ratings.
- Every task: TDD (failing test first), run the full suite (`npx vitest run`) before commit, commit at the end. Tests live next to source as `*.test.js[x]`.

---

### Task 1: `gallery.js` — `listBuilds()` + `getBuild(id)`

**Files:**
- Modify: `src/state/gallery.js` (append two exports; reuse existing `rowToBuild`)
- Test: `src/state/gallery.test.js` (create)

**Interfaces:**
- Consumes: existing `src/state/gallery.js` internals — `supabase` (from `./supabaseClient.js`), `rowToBuild(r)` → `{ ...r, build: sanitizeBuild(r.payload) }`.
- Produces:
  - `listBuilds(): Promise<Array<Row>>` — public, non-hidden builds, newest first, capped at 200. `Row` = a `builds` table row plus `.build` (sanitized payload).
  - `getBuild(id: string): Promise<Row | null>` — one build by id (RLS decides visibility); `null` when not found.

- [ ] **Step 1: Write the failing tests**

Create `src/state/gallery.test.js`. The Supabase client is a fluent builder; mock it so each method returns `this` and the chain is awaitable. `listBuilds` must request `.eq('visibility','public').eq('hidden',false).order('created_at',{ascending:false}).limit(200)`; `getBuild` must `.eq('id', id)` and return one row or null.

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls = {};
const builder = () => {
  const b = {};
  for (const m of ['select', 'eq', 'order', 'limit']) b[m] = vi.fn((...a) => { (calls[m] ||= []).push(a); return b; });
  b.maybeSingle = vi.fn(() => Promise.resolve(b._single));
  b.then = (resolve) => resolve(b._result); // awaiting the chain resolves the list query
  return b;
};
let current;
vi.mock('./supabaseClient.js', () => ({ supabase: { from: vi.fn(() => current) } }));
vi.mock('./build-url.js', () => ({ sanitizeBuild: (p) => ({ sanitized: true, from: p }) }));
const { listBuilds, getBuild } = await import('./gallery.js');

beforeEach(() => { for (const k of Object.keys(calls)) delete calls[k]; });

describe('listBuilds', () => {
  it('queries public non-hidden builds, newest first, capped, and sanitizes payloads', async () => {
    current = builder();
    current._result = { data: [{ id: 'a1', payload: { x: 1 } }], error: null };
    const out = await listBuilds();
    expect(calls.eq).toEqual(expect.arrayContaining([['visibility', 'public'], ['hidden', false]]));
    expect(calls.order[0]).toEqual(['created_at', { ascending: false }]);
    expect(calls.limit[0]).toEqual([200]);
    expect(out[0].build).toEqual({ sanitized: true, from: { x: 1 } });
  });
  it('throws on supabase error', async () => {
    current = builder();
    current._result = { data: null, error: { message: 'boom' } };
    await expect(listBuilds()).rejects.toBeTruthy();
  });
});

describe('getBuild', () => {
  it('fetches one build by id and sanitizes it', async () => {
    current = builder();
    current._single = { data: { id: 'zz', payload: { y: 2 } }, error: null };
    const out = await getBuild('zz');
    expect(calls.eq[0]).toEqual(['id', 'zz']);
    expect(out.build).toEqual({ sanitized: true, from: { y: 2 } });
  });
  it('returns null when not found', async () => {
    current = builder();
    current._single = { data: null, error: null };
    expect(await getBuild('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/gallery.test.js`
Expected: FAIL — `listBuilds`/`getBuild` are not exported.

- [ ] **Step 3: Implement**

Append to `src/state/gallery.js`:

```js
export async function listBuilds() {
  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .eq('visibility', 'public')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map(rowToBuild);
}

export async function getBuild(id) {
  const { data, error } = await supabase.from('builds').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToBuild(data) : null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state/gallery.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/gallery.js src/state/gallery.test.js
git commit -m "feat(gallery): listBuilds + getBuild read API"
```

---

### Task 2: `logic/gallery-ui.js` — pure filter/sort/format helpers

**Files:**
- Create: `src/logic/gallery-ui.js`
- Test: `src/logic/gallery-ui.test.js`

**Interfaces:**
- Produces:
  - `CLASS_COLORS: Record<string,string>` and `classColor(slug): string` (accent hex; fallback `#8ea0bf`).
  - `ROLES = ['DPS','Tank','Support','Hybrid']`, `CONTENT = ['Leveling','Endgame','Boss']`.
  - `relativeTime(iso: string, now = Date.now()): string` — e.g. `just now`, `5m`, `3h`, `2d`, `4w`, `1y`.
  - `filterSortBuilds(rows, { sort='newest', classFilter='', role=[], content=[], search='' }): Row[]` — pure. `sort` ∈ `newest | most-liked`. `classFilter` matches `base_class`. `role`/`content` are AND-any-match against the row's `role`/`content` arrays. `search` matches name+description (case-insensitive).

- [ ] **Step 1: Write the failing tests**

```js
import { describe, it, expect } from 'vitest';
import { classColor, relativeTime, filterSortBuilds, ROLES, CONTENT } from './gallery-ui.js';

describe('classColor', () => {
  it('maps known classes and falls back', () => {
    expect(classColor('mage')).toMatch(/^#/);
    expect(classColor('???')).toBe('#8ea0bf');
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-06-22T00:00:00Z');
  it('formats buckets', () => {
    expect(relativeTime('2026-06-21T23:59:30Z', now)).toBe('just now');
    expect(relativeTime('2026-06-21T23:30:00Z', now)).toBe('30m');
    expect(relativeTime('2026-06-21T21:00:00Z', now)).toBe('3h');
    expect(relativeTime('2026-06-20T00:00:00Z', now)).toBe('2d');
    expect(relativeTime('2026-06-01T00:00:00Z', now)).toBe('3w');
  });
});

describe('filterSortBuilds', () => {
  const rows = [
    { name: 'Frost Mage', description: 'aoe', base_class: 'mage', role: ['DPS'], content: ['Endgame'], like_count: 2, created_at: '2026-06-01T00:00:00Z' },
    { name: 'Holy Tank', description: 'survive', base_class: 'knight', role: ['Tank'], content: ['Boss'], like_count: 9, created_at: '2026-06-10T00:00:00Z' },
    { name: 'Level Rogue', description: 'fast xp', base_class: 'rogue', role: ['DPS'], content: ['Leveling'], like_count: 0, created_at: '2026-06-20T00:00:00Z' },
  ];
  it('sorts newest by default', () => {
    expect(filterSortBuilds(rows, {}).map((r) => r.name)).toEqual(['Level Rogue', 'Holy Tank', 'Frost Mage']);
  });
  it('sorts most-liked', () => {
    expect(filterSortBuilds(rows, { sort: 'most-liked' })[0].name).toBe('Holy Tank');
  });
  it('filters by class', () => {
    expect(filterSortBuilds(rows, { classFilter: 'mage' }).map((r) => r.name)).toEqual(['Frost Mage']);
  });
  it('filters by role (any match)', () => {
    expect(filterSortBuilds(rows, { role: ['DPS'] }).map((r) => r.name).sort()).toEqual(['Frost Mage', 'Level Rogue']);
  });
  it('filters by content and searches name/description', () => {
    expect(filterSortBuilds(rows, { content: ['Boss'] }).map((r) => r.name)).toEqual(['Holy Tank']);
    expect(filterSortBuilds(rows, { search: 'xp' }).map((r) => r.name)).toEqual(['Level Rogue']);
  });
  it('exposes the fixed tag vocab', () => {
    expect(ROLES).toEqual(['DPS', 'Tank', 'Support', 'Hybrid']);
    expect(CONTENT).toEqual(['Leveling', 'Endgame', 'Boss']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/logic/gallery-ui.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/logic/gallery-ui.js`:

```js
export const ROLES = ['DPS', 'Tank', 'Support', 'Hybrid'];
export const CONTENT = ['Leveling', 'Endgame', 'Boss'];

export const CLASS_COLORS = {
  acolyte: '#7CB2FC', knight: '#FFD25A', mage: '#b78cff', rogue: '#7CFC9B',
  scout: '#5ad1c4', summoner: '#ff9d5c', warrior: '#ff7c7c',
};
export const classColor = (slug) => CLASS_COLORS[slug] || '#8ea0bf';

export function relativeTime(iso, now = Date.now()) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7); if (w < 52) return `${w}w`;
  return `${Math.floor(d / 365)}y`;
}

export function filterSortBuilds(rows, { sort = 'newest', classFilter = '', role = [], content = [], search = '' } = {}) {
  const q = search.trim().toLowerCase();
  const out = (rows || []).filter((r) => {
    if (classFilter && r.base_class !== classFilter) return false;
    if (role.length && !role.some((x) => (r.role || []).includes(x))) return false;
    if (content.length && !content.some((x) => (r.content || []).includes(x))) return false;
    if (q && !`${r.name} ${r.description || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
  out.sort(sort === 'most-liked'
    ? (a, b) => b.like_count - a.like_count || Date.parse(b.created_at) - Date.parse(a.created_at)
    : (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/logic/gallery-ui.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/gallery-ui.js src/logic/gallery-ui.test.js
git commit -m "feat(gallery): pure filter/sort/relative-time helpers"
```

---

### Task 3: Store + routing for the gallery views

**Files:**
- Modify: `src/state/store.jsx` (initialState: add `readOnly`, `galleryBuildId`; new reducer case `setGalleryBuild`)
- Modify: `src/state/sync.js` (`loadInitialState` allow `builds` + read `b`; `usePersist` handle `builds`)
- Test: `src/state/store.test.js` (add cases), `src/state/sync.test.js` (create or extend if present)

**Interfaces:**
- Consumes: existing reducer + `loadInitialState`/`usePersist`.
- Produces:
  - store state fields `readOnly: boolean` (default `false`) and `galleryBuildId: string | null` (default `null`).
  - reducer action `{ type: 'setGalleryBuild', id: string|null }` → sets `view:'builds'`, `galleryBuildId:id`.
  - `loadInitialState()` returns `view:'builds'` + `galleryBuildId` from `?view=builds&b=<id>`.
  - `usePersist` writes `?view=builds` (+ `&b=<id>` when `galleryBuildId`) and does NOT serialize build/route on the gallery views.

- [ ] **Step 1: Write the failing tests**

Add to `src/state/store.test.js`:

```js
it('setGalleryBuild opens the gallery on a build id', () => {
  const s = reducer(initialState, { type: 'setGalleryBuild', id: 'abc123' });
  expect(s.view).toBe('builds');
  expect(s.galleryBuildId).toBe('abc123');
});
it('setGalleryBuild with null shows the gallery list', () => {
  const s = reducer({ ...initialState, galleryBuildId: 'x' }, { type: 'setGalleryBuild', id: null });
  expect(s.view).toBe('builds');
  expect(s.galleryBuildId).toBeNull();
});
it('initialState defaults readOnly false and galleryBuildId null', () => {
  expect(initialState.readOnly).toBe(false);
  expect(initialState.galleryBuildId).toBeNull();
});
```

Create `src/state/sync.test.js` (jsdom; stub the URL):

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('./supabaseClient.js', () => ({ supabase: { auth: {} } }));
const { loadInitialState } = await import('./sync.js');

const setUrl = (search) => { window.history.replaceState(null, '', `/${search}`); };
beforeEach(() => { localStorage.clear(); });

describe('loadInitialState routing', () => {
  it('reads the gallery list view', () => {
    setUrl('?view=builds');
    const s = loadInitialState();
    expect(s.view).toBe('builds');
    expect(s.galleryBuildId).toBeNull();
  });
  it('reads a gallery detail id', () => {
    setUrl('?view=builds&b=Abc12345');
    const s = loadInitialState();
    expect(s.view).toBe('builds');
    expect(s.galleryBuildId).toBe('Abc12345');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/store.test.js src/state/sync.test.js`
Expected: FAIL — `setGalleryBuild` unknown, `galleryBuildId` undefined, `view` falls back to `atlas`.

- [ ] **Step 3: Implement**

In `src/state/store.jsx` `initialState`, add after `gearOverlay: false,`:

```js
  readOnly: false,
  galleryBuildId: null,
```

Add a reducer case (next to `setView`):

```js
    case 'setGalleryBuild': return { ...state, view: 'builds', galleryBuildId: action.id };
```

In `src/state/sync.js` `loadInitialState`, change the two `view` computations to include `builds` and read `b`. Replace lines 22-27 region:

```js
  if (isOAuthCallback()) {
    const v = params.get('view');
    return { authCallback: true, view: ['build', 'gear', 'my-builds', 'builds'].includes(v) ? v : 'atlas' };
  }
  const v = params.get('view');
  const view = ['build', 'gear', 'my-builds', 'builds'].includes(v) ? v : 'atlas';
  const galleryBuildId = view === 'builds' ? (params.get('b') || null) : null;
```

And add `galleryBuildId` to the returned object:

```js
  return { view, playerLevel, route, galleryBuildId, ...(build ? { build } : {}) };
```

In `usePersist`, add a `builds` branch **before** the `my-builds` branch (so gallery URLs never carry build/route):

```js
    if (state.view === 'builds') {
      window.history.replaceState(null, '', `${path}?view=builds${state.galleryBuildId ? `&b=${state.galleryBuildId}` : ''}`);
      return;
    }
```

Add `state.galleryBuildId` to the `usePersist` effect deps array (so navigating list↔detail updates the URL):

```js
  }, [state.view, state.playerLevel, state.route, state.build, state.galleryBuildId, state.shareLoading]);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state/store.test.js src/state/sync.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.jsx src/state/sync.js src/state/store.test.js src/state/sync.test.js
git commit -m "feat(gallery): builds/detail routing + readOnly + galleryBuildId state"
```

---

### Task 4: Read-only mode in the planner components

**Files:**
- Modify: `src/components/SkillTree.jsx` (force steppers off when `state.readOnly`)
- Modify: `src/components/GearLoadout.jsx` (disable slot/pip clicks, hide "add all zones" when read-only)
- Modify: `src/components/GearProgression.jsx` (hide the add-gear-stage control when read-only)
- Modify: `src/components/BuildNotes.jsx` (render notes only, no editor, when read-only)
- Test: `src/components/ReadOnlyPlanner.test.jsx` (create)

**Interfaces:**
- Consumes: `useStore()` → `state.readOnly` (from Task 3). Each component reads it; default `false` keeps the editor unchanged.
- Produces: planner components that render display-only when `state.readOnly` is true. No new exports.

**Approach:** the nested `StoreProvider` in Task 7 seeds `readOnly: true`. Because every planner control already pulls from `useStore()`, the smallest correct change is to read `state.readOnly` in each and neutralize the mutating affordance — no prop drilling.

- [ ] **Step 1: Write the failing test**

Create `src/components/ReadOnlyPlanner.test.jsx`. Render each component inside a `StoreProvider` seeded `readOnly:true` with a minimal build, and assert the mutating affordance is gone/disabled.

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';
import SkillTree from './SkillTree.jsx';
import GearProgression from './GearProgression.jsx';
import BuildNotes from './BuildNotes.jsx';

const ro = (ui, build) => render(<StoreProvider init={{ readOnly: true, build }}>{ui}</StoreProvider>);
const baseBuild = { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], notes: 'farm **hard**', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } };

describe('read-only planner', () => {
  it('SkillTree disables its skill steppers', () => {
    ro(<SkillTree classSlug="mage" tree="base" />, baseBuild);
    // every increment/decrement control is disabled in read-only
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
  it('GearProgression hides the add-gear-stage control', () => {
    ro(<GearProgression />, baseBuild);
    expect(screen.queryByText(/add gear stage/i)).toBeNull();
  });
  it('BuildNotes renders notes without the editor toggle', () => {
    ro(<BuildNotes />, baseBuild);
    expect(screen.queryByRole('button', { name: /preview|edit/i })).toBeNull();
    expect(screen.getByText('hard')).toBeInTheDocument(); // markdown rendered
  });
});
```

> Note for implementer: `SkillCard` already disables its +/- buttons when `canInc`/`canDec` are false; forcing both false in read-only is what makes the first assertion pass. If `SkillCard` renders a non-button affordance, disable it the same way it handles `canInc===false` today — read `src/components/SkillCard.jsx` first and match its existing disabled pattern. Do not invent a new disabled mechanism.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/ReadOnlyPlanner.test.jsx`
Expected: FAIL — steppers still enabled, add-stage present, notes editor present.

- [ ] **Step 3: Implement**

`SkillTree.jsx` — read `readOnly` and force the stepper caps off:

```jsx
  const { state, dispatch } = useStore();
  const cls = classBySlug[classSlug];
  if (!cls) return null;
  const { build, selectedSkillId, readOnly } = state;
```

and in the `<SkillCard>` props:

```jsx
              canInc={!readOnly && id ? canIncrement(id, build) : false}
              canDec={!readOnly && id ? canDecrement(id, build) : false}
```

`GearProgression.jsx` — read `state.readOnly`; wrap the `AddGearStage` render so it's hidden when read-only. Read the file and guard the existing AddGearStage usage:

```jsx
  const { state } = useStore();
  // ...existing stage rendering...
  {!state.readOnly && <AddGearStage label="＋ Add gear stage" /* existing props */ />}
```

`GearLoadout.jsx` — read `const ro = state.readOnly;`. Guard the three mutating affordances: (a) the slot `onClick` (`onClick={ro ? undefined : () => { dispatch(selectItemSlot...); ... }}`), (b) each card pip button (`disabled={ro}` and `onClick={ro ? undefined : ...}`), (c) hide the "Add all N zones to route" button: `{!ro && <button className="farm-btn add-all-zones" ...>...</button>}`. Read the current file and apply these guards to the existing handlers — do not restructure.

`BuildNotes.jsx` — when `state.readOnly`, render the saved markdown directly instead of the `RichNote` editor. Read the file; it currently renders `<RichNote .../>`. Add at the top of the component body:

```jsx
  const { state, dispatch } = useStore();
  if (state.readOnly) {
    return (
      <div className="build-notes">
        <div className="label">NOTES</div>
        <div className="rich-preview" dangerouslySetInnerHTML={renderMarkdown(state.build.notes || '')} />
      </div>
    );
  }
```

and add `import { renderMarkdown } from '../logic/markdown.js';` if not already imported. (Match the existing label/wrapper markup the editor uses so styling is consistent — read the file first.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/ReadOnlyPlanner.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/SkillTree.jsx src/components/GearLoadout.jsx src/components/GearProgression.jsx src/components/BuildNotes.jsx src/components/ReadOnlyPlanner.test.jsx
git commit -m "feat(gallery): read-only mode for planner components"
```

---

### Task 5: `BuildCard` component

**Files:**
- Create: `src/components/BuildCard.jsx`
- Test: `src/components/BuildCard.test.jsx`
- Modify: `src/styles/app.css` (card styles — small block)

**Interfaces:**
- Consumes: `classColor` (Task 2), `relativeTime` (Task 2), `classBySlug` (`src/data/classes-index.js`, for the class display name).
- Produces: `BuildCard({ build, onOpen })` — `build` is a gallery Row; `onOpen(id)` fires on click. Renders class-accent left border, class label, title, role/content tag chips, ♥ like_count, relative date.

- [ ] **Step 1: Write the failing test**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BuildCard from './BuildCard.jsx';

const row = { id: 'b1', name: 'Frost Mage', base_class: 'mage', advanced_class: 'wizard',
  role: ['DPS'], content: ['Endgame'], like_count: 7, created_at: '2026-06-21T00:00:00Z' };

describe('BuildCard', () => {
  it('shows title, class, tags, likes and opens on click', () => {
    const onOpen = vi.fn();
    render(<BuildCard build={row} onOpen={onOpen} />);
    expect(screen.getByText('Frost Mage')).toBeInTheDocument();
    expect(screen.getByText(/Mage/)).toBeInTheDocument();
    expect(screen.getByText('DPS')).toBeInTheDocument();
    expect(screen.getByText('Endgame')).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /open Frost Mage/i }));
    expect(onOpen).toHaveBeenCalledWith('b1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/BuildCard.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/BuildCard.jsx`:

```jsx
import { classBySlug } from '../data/classes-index.js';
import { classColor, relativeTime } from '../logic/gallery-ui.js';

export default function BuildCard({ build, onOpen }) {
  const cls = classBySlug[build.base_class];
  const label = `${cls?.name || build.base_class}${build.advanced_class ? ` · ${classBySlug[build.advanced_class]?.name || build.advanced_class}` : ''}`;
  return (
    <button className="gcard" aria-label={`open ${build.name}`} onClick={() => onOpen(build.id)}
      style={{ borderLeftColor: classColor(build.base_class) }}>
      <div className="gcard-cls" style={{ color: classColor(build.base_class) }}>{label}</div>
      <div className="gcard-ttl">{build.name}</div>
      <div className="gcard-tags">
        {[...(build.role || []), ...(build.content || [])].map((t) => <span key={t} className="gtag">{t}</span>)}
      </div>
      <div className="gcard-meta">
        <span className="like">♥ {build.like_count}</span>
        <span className="ago">{relativeTime(build.created_at)}</span>
      </div>
    </button>
  );
}
```

Add to `src/styles/app.css`:

```css
.gcard { display: flex; flex-direction: column; gap: 6px; text-align: left; background: var(--panel); border: 1px solid var(--line); border-left: 4px solid var(--muted); border-radius: 8px; padding: 12px 14px; cursor: pointer; color: var(--text); }
.gcard:hover { border-color: var(--muted); }
.gcard-cls { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
.gcard-ttl { font-size: 15px; font-weight: 600; }
.gcard-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.gtag { font-size: 10px; background: #1a2336; border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; color: var(--muted); }
.gcard-meta { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 2px; }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/BuildCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BuildCard.jsx src/components/BuildCard.test.jsx src/styles/app.css
git commit -m "feat(gallery): BuildCard"
```

---

### Task 6: `GalleryView` — featured shelf + filter bar + grid

**Files:**
- Create: `src/components/GalleryView.jsx`
- Test: `src/components/GalleryView.test.jsx`
- Modify: `src/styles/app.css` (gallery layout — small block)

**Interfaces:**
- Consumes: `listBuilds` (Task 1), `filterSortBuilds`/`ROLES`/`CONTENT` (Task 2), `BuildCard` (Task 5), `baseClasses` (`src/data/classes-index.js`), `useStore` → `dispatch({type:'setGalleryBuild', id})`.
- Produces: `GalleryView()` — default export. Fetches once on mount; renders Featured shelf (rows with `featured`), a filter bar (class chips, role + content toggles, sort select, search box), and the filtered card grid. Card click → `dispatch({type:'setGalleryBuild', id})`.

- [ ] **Step 1: Write the failing test**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

const rows = [
  { id: 'm', name: 'Frost Mage', base_class: 'mage', role: ['DPS'], content: ['Endgame'], like_count: 1, created_at: '2026-06-01T00:00:00Z', featured: true },
  { id: 'k', name: 'Holy Tank', base_class: 'knight', role: ['Tank'], content: ['Boss'], like_count: 9, created_at: '2026-06-10T00:00:00Z', featured: false },
];
vi.mock('../state/gallery.js', () => ({ listBuilds: vi.fn(() => Promise.resolve(rows)) }));
const { default: GalleryView } = await import('./GalleryView.jsx');

const renderG = () => render(<StoreProvider init={{ view: 'builds' }}><GalleryView /></StoreProvider>);

describe('GalleryView', () => {
  it('lists builds and a featured shelf, and filters by search', async () => {
    renderG();
    await screen.findByText('Holy Tank');
    expect(screen.getByText(/featured/i)).toBeInTheDocument();
    expect(screen.getAllByText('Frost Mage').length).toBeGreaterThan(0); // shelf + grid
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'tank' } });
    await waitFor(() => expect(screen.queryByRole('button', { name: /open Frost Mage/i })).toBeNull());
    expect(screen.getByRole('button', { name: /open Holy Tank/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/GalleryView.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/GalleryView.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { listBuilds } from '../state/gallery.js';
import { filterSortBuilds, ROLES, CONTENT } from '../logic/gallery-ui.js';
import { baseClasses } from '../data/classes-index.js';
import BuildCard from './BuildCard.jsx';

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function GalleryView() {
  const { dispatch } = useStore();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(false);
  const [f, setF] = useState({ sort: 'newest', classFilter: '', role: [], content: [], search: '' });
  useEffect(() => { listBuilds().then(setRows).catch(() => setErr(true)); }, []);

  const open = (id) => dispatch({ type: 'setGalleryBuild', id });
  if (err) return <p className="muted build-empty">Couldn’t reach the gallery — try again later.</p>;
  if (rows === null) return <p className="muted build-empty">Loading gallery…</p>;

  const featured = rows.filter((r) => r.featured);
  const shown = filterSortBuilds(rows, f);

  return (
    <div className="gallery">
      <h2>Builds Gallery</h2>
      {featured.length > 0 && (
        <section className="g-featured">
          <div className="label">★ FEATURED</div>
          <div className="g-grid">{featured.map((b) => <BuildCard key={b.id} build={b} onOpen={open} />)}</div>
        </section>
      )}
      <div className="g-filters">
        <input type="search" placeholder="Search builds…" value={f.search}
          onChange={(e) => setF({ ...f, search: e.target.value })} />
        <select aria-label="sort" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })}>
          <option value="newest">Newest</option><option value="most-liked">Most liked</option>
        </select>
        <div className="g-chips">
          <button className={`gchip${f.classFilter === '' ? ' on' : ''}`} onClick={() => setF({ ...f, classFilter: '' })}>All classes</button>
          {baseClasses.map((c) => (
            <button key={c.slug} className={`gchip${f.classFilter === c.slug ? ' on' : ''}`}
              onClick={() => setF({ ...f, classFilter: f.classFilter === c.slug ? '' : c.slug })}>{c.name}</button>
          ))}
        </div>
        <div className="g-chips">
          {ROLES.map((r) => <button key={r} className={`gchip${f.role.includes(r) ? ' on' : ''}`} onClick={() => setF({ ...f, role: toggle(f.role, r) })}>{r}</button>)}
          {CONTENT.map((c) => <button key={c} className={`gchip${f.content.includes(c) ? ' on' : ''}`} onClick={() => setF({ ...f, content: toggle(f.content, c) })}>{c}</button>)}
        </div>
      </div>
      {shown.length === 0 ? <p className="muted">No builds match.</p>
        : <div className="g-grid">{shown.map((b) => <BuildCard key={b.id} build={b} onOpen={open} />)}</div>}
    </div>
  );
}
```

Add to `src/styles/app.css`:

```css
.gallery { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.g-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.g-featured { display: flex; flex-direction: column; gap: 8px; }
.g-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.g-filters input[type=search], .g-filters select { background: var(--panel); border: 1px solid var(--line); color: var(--text); border-radius: 6px; padding: 6px 8px; }
.g-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.gchip { background: var(--panel); border: 1px solid var(--line); color: var(--muted); border-radius: 999px; padding: 3px 10px; font-size: 12px; cursor: pointer; }
.gchip.on { border-color: var(--route); color: var(--text); }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/GalleryView.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GalleryView.jsx src/components/GalleryView.test.jsx src/styles/app.css
git commit -m "feat(gallery): GalleryView (featured shelf + filters + grid)"
```

---

### Task 7: `BuildDetail` + read-only planner mount + Copy/Fork

**Files:**
- Create: `src/components/BuildDetail.jsx`
- Create: `src/components/ReadOnlyBuild.jsx`
- Test: `src/components/BuildDetail.test.jsx`
- Modify: `src/styles/app.css` (detail header — small block)

**Interfaces:**
- Consumes: `getBuild` (Task 1), `useStore` (outer store — for Copy/Fork `dispatch` + reading `galleryBuildId`), `StoreProvider` (nested mount), `classColor`/`classBySlug`, the read-only planner components (Task 4): `SkillTree`, `GearProgression`, `BuildNotes`.
- Produces:
  - `ReadOnlyBuild({ build })` — wraps a nested `StoreProvider` seeded `{ build, readOnly: true, selectedStage: 0 }` and renders a class header + base/advanced `SkillTree` + `GearProgression` + `BuildNotes`, all read-only. No outer-store interaction.
  - `BuildDetail()` — reads `state.galleryBuildId` from the outer store, fetches `getBuild`, renders the gallery header (back, title, class, author, tags, description, **⎘ Copy to my planner**) + `ReadOnlyBuild`. Copy → `dispatch({type:'hydrate', state:{ build: row.build, view:'gear' }})`. Unknown/private id → "build not found or private".

- [ ] **Step 1: Write the failing test**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreProvider, useStore } from '../state/store.jsx';

const found = { id: 'b1', name: 'Frost Mage', base_class: 'mage', advanced_class: null, role: ['DPS'], content: ['Endgame'],
  description: 'aoe nuke', like_count: 3, created_at: '2026-06-21T00:00:00Z',
  build: { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } } };
const getBuild = vi.fn();
vi.mock('../state/gallery.js', () => ({ getBuild }));
const { default: BuildDetail } = await import('./BuildDetail.jsx');

function Probe() { const { state } = useStore(); return <div data-testid="view">{state.view}</div>; }
const renderD = (id) => render(
  <StoreProvider init={{ view: 'builds', galleryBuildId: id }}><BuildDetail /><Probe /></StoreProvider>
);

describe('BuildDetail', () => {
  it('renders the build header and copies into the planner', async () => {
    getBuild.mockResolvedValueOnce(found);
    renderD('b1');
    await screen.findByText('Frost Mage');
    expect(screen.getByText('aoe nuke')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /copy to my planner/i }));
    await waitFor(() => expect(screen.getByTestId('view').textContent).toBe('gear'));
  });
  it('shows a not-found state for missing/private builds', async () => {
    getBuild.mockResolvedValueOnce(null);
    renderD('gone');
    await screen.findByText(/not found or private/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/BuildDetail.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

Create `src/components/ReadOnlyBuild.jsx`:

```jsx
import { StoreProvider } from '../state/store.jsx';
import { classBySlug } from '../data/classes-index.js';
import { classColor } from '../logic/gallery-ui.js';
import SkillTree from './SkillTree.jsx';
import GearProgression from './GearProgression.jsx';
import BuildNotes from './BuildNotes.jsx';

// Renders a build read-only inside its OWN store, so viewing someone else's
// build never touches the user's working session. The planner components read
// state.readOnly (Task 4) and disable their controls.
export default function ReadOnlyBuild({ build }) {
  const base = build.baseClass;
  const adv = build.advancedClass;
  return (
    <StoreProvider init={{ build, readOnly: true, selectedStage: 0, view: 'build' }}>
      <div className="ro-build">
        <div className="ro-cls" style={{ color: classColor(base) }}>
          {classBySlug[base]?.name || base}{adv ? ` · ${classBySlug[adv]?.name || adv}` : ''}
        </div>
        <div className="trees">
          {base && <SkillTree classSlug={base} tree="base" />}
          {adv && <SkillTree classSlug={adv} tree="advanced" />}
        </div>
        <GearProgression />
        <BuildNotes />
      </div>
    </StoreProvider>
  );
}
```

Create `src/components/BuildDetail.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { getBuild } from '../state/gallery.js';
import { classBySlug } from '../data/classes-index.js';
import { classColor } from '../logic/gallery-ui.js';
import ReadOnlyBuild from './ReadOnlyBuild.jsx';

export default function BuildDetail() {
  const { state, dispatch } = useStore();
  const id = state.galleryBuildId;
  const [row, setRow] = useState(undefined); // undefined=loading, null=not found
  useEffect(() => { if (id) getBuild(id).then(setRow).catch(() => setRow(null)); }, [id]);

  const back = () => dispatch({ type: 'setGalleryBuild', id: null });
  if (row === undefined) return <p className="muted build-empty">Loading build…</p>;
  if (row === null) return (
    <div className="build-empty"><p className="muted">This build was not found or private.</p>
      <button onClick={back}>← Back to gallery</button></div>
  );

  const copy = () => dispatch({ type: 'hydrate', state: { build: row.build, view: 'gear', galleryBuildId: null } });
  return (
    <div className="build-detail">
      <div className="bd-head">
        <button className="link" onClick={back}>← Gallery</button>
        <h2 style={{ borderLeftColor: classColor(row.base_class) }}>{row.name}</h2>
        <div className="bd-sub" style={{ color: classColor(row.base_class) }}>
          {classBySlug[row.base_class]?.name || row.base_class}
          {row.advanced_class ? ` · ${classBySlug[row.advanced_class]?.name || row.advanced_class}` : ''}
        </div>
        <div className="bd-tags">{[...(row.role || []), ...(row.content || [])].map((t) => <span key={t} className="gtag">{t}</span>)}</div>
        {row.description && <p className="bd-desc">{row.description}</p>}
        <button className="bd-copy" onClick={copy}>⎘ Copy to my planner</button>
      </div>
      <ReadOnlyBuild build={row.build} />
    </div>
  );
}
```

Add to `src/styles/app.css`:

```css
.build-detail { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.bd-head { display: flex; flex-direction: column; gap: 6px; }
.bd-head h2 { border-left: 4px solid var(--muted); padding-left: 10px; margin: 4px 0 0; }
.bd-sub { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
.bd-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.bd-desc { color: var(--muted); max-width: 70ch; }
.bd-copy { align-self: flex-start; background: var(--route); color: #222; border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; }
.ro-build { display: flex; flex-direction: column; gap: 14px; }
.ro-cls { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/BuildDetail.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/BuildDetail.jsx src/components/ReadOnlyBuild.jsx src/components/BuildDetail.test.jsx src/styles/app.css
git commit -m "feat(gallery): BuildDetail + read-only planner mount + Copy/Fork"
```

---

### Task 8: Wire routing into the app shell + Gallery nav

**Files:**
- Modify: `src/App.jsx` (render gallery views)
- Modify: `src/components/TopBar.jsx` (Gallery nav tab)
- Test: `src/App.test.jsx` (create — view switching smoke test)

**Interfaces:**
- Consumes: `GalleryView` (Task 6), `BuildDetail` (Task 7), store `view`/`galleryBuildId`.
- Produces: the app renders `GalleryView` for `view==='builds'` with no `galleryBuildId`, and `BuildDetail` when `galleryBuildId` is set; TopBar has a "Gallery" tab that dispatches `setGalleryBuild(null)`.

- [ ] **Step 1: Write the failing test**

Create `src/App.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreProvider } from './state/store.jsx';

vi.mock('./state/gallery.js', () => ({ listBuilds: vi.fn(() => Promise.resolve([])), getBuild: vi.fn(() => Promise.resolve(null)) }));
vi.mock('./state/useAuth.js', () => ({ useAuth: () => ({ user: null }) }));
// App pulls sync hooks; stub them so the test renders the shell deterministically.
vi.mock('./state/sync.js', () => ({
  loadInitialState: () => ({ view: 'builds', galleryBuildId: null }),
  usePersist: () => {}, useShareHydrate: () => {}, useOAuthCallback: () => {},
}));
const { default: App } = await import('./App.jsx');

describe('App gallery routing', () => {
  it('renders the gallery list for ?view=builds', async () => {
    render(<App />);
    expect(await screen.findByText(/Builds Gallery/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/App.test.jsx`
Expected: FAIL — `view==='builds'` falls through to the atlas branch (no "Builds Gallery" heading).

- [ ] **Step 3: Implement**

In `src/App.jsx`, add imports:

```jsx
import GalleryView from './components/GalleryView.jsx';
import BuildDetail from './components/BuildDetail.jsx';
```

Add a branch to the view switch — put it before the final `else` (atlas):

```jsx
      ) : state.view === 'builds' ? (
        state.galleryBuildId ? <BuildDetail /> : <GalleryView />
      ) : (
```

In `src/components/TopBar.jsx`, add a Gallery tab to the nav. The existing `tab()` helper compares `state.view === v`; gallery uses a dedicated dispatch so detail also highlights it:

```jsx
      <nav className="view-toggle">
        {tab('atlas', '／Atlas')}{tab('build', 'Build')}{tab('gear', 'Gear')}
        <button className={state.view === 'builds' ? 'on' : ''} onClick={() => dispatch({ type: 'setGalleryBuild', id: null })}>Gallery</button>
      </nav>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/App.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite + commit**

Run: `npx vitest run`
Expected: PASS (all prior + new).

```bash
git add src/App.jsx src/components/TopBar.jsx src/App.test.jsx
git commit -m "feat(gallery): route builds/detail into the app shell + Gallery nav"
```

---

## Post-plan: live verification (controller, after Task 8)

Against the running dev server (`npx vite --port 5173 --strictPort`) with a signed-in Discord session and at least one published **public** build (from Increment 1):
1. Click **Gallery** → the public build appears as a card; filters/search narrow it.
2. Click the card → detail shows the read-only skills + gear + notes; mutating controls are inert.
3. **Copy to my planner** → lands on the Gear tab with the build loaded; the URL is the editor (not `?b=`).
4. A featured build (set `featured=true` via Supabase MCP `execute_sql` on a test row) appears in the Featured shelf.
5. `?view=builds&b=<unknown>` → "not found or private".

## Self-review notes (done by plan author)
- **Spec coverage:** GalleryView (featured+feed+filters+search) = T6; BuildCard = T5; BuildDetail read-only planner = T4+T7; Copy/Fork = T7; routing = T3+T8; `listBuilds`/`getBuild` = T1. Likes UI intentionally deferred to Increment 3 (spec build-sequence #3) — `like_count` is still displayed (read-only) on cards/detail.
- **Read-only via nested StoreProvider:** chosen over prop-drilling a `readOnly` prop through every control — fewer touch points, components already read `useStore()`. The nested provider never calls `usePersist` (only `Shell` does), so the detail view can't overwrite the user's URL/session.
- **Filtering is client-side** over a 200-row fetch (YAGNI vs. server-side filter indices for a small v1 dataset); the 200 cap is explicit in `listBuilds`.
