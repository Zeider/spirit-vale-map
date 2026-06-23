# Builds Gallery Increment 3 — Likes + Favorites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users can like/unlike any public build from its detail page (with live count), and see the builds they've liked as a Favorites shelf in My Builds.

**Architecture:** Pure client work on top of the existing DB — `build_likes` (owner-scoped RLS) and the `build_likes_count` trigger that maintains `builds.like_count` already exist. Add `toggleLike`/`hasLiked`/`listFavorites` to `gallery.js`; make the `BuildDetail` heart interactive (optimistic, prompts sign-in when logged out); add a Favorites section to `MyBuildsView`. Most-liked sort already ships (Increment 2's `filterSortBuilds` + the GalleryView sort dropdown) — no work needed there.

**Tech Stack:** React 18 + Vite, Context+reducer store, `@supabase/supabase-js`, Vitest + @testing-library/react.

## Global Constraints

- Branch: `feat/builds-gallery` (Increments 1 + 2 already built here). Do NOT deploy; batching.
- DB is ready — do NOT write migrations. `build_likes(build_id, user_id, created_at)`, PK `(build_id,user_id)`; RLS: SELECT/INSERT/DELETE all `user_id = auth.uid()`; trigger `build_likes_count` keeps `builds.like_count` correct. Anon can read `like_count` (it's a column on public builds) but cannot read `build_likes` rows.
- Likes require auth (RLS). Not signed in + click Like → trigger Discord sign-in via `useAuth().signInWithDiscord()` (no silent failure).
- Optimistic UI: flip liked + adjust the local count immediately; revert on error. The server `like_count` (trigger-maintained) stays authoritative for other viewers.
- Reads still go through `rowToBuild` (sanitized `payload`).
- YAGNI: like button lives on **BuildDetail only** (cards keep the display-only count — avoids per-card auth/optimistic churn on the grid). No like animations, no liker lists.
- Every task: TDD (failing test first), full suite green (`npx vitest run`) before commit, commit at end. Commit bodies end with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `gallery.js` — `toggleLike` + `hasLiked` + `listFavorites`

**Files:**
- Modify: `src/state/gallery.js` (append three exports; reuse `supabase`, `rowToBuild`)
- Test: `src/state/gallery.test.js` (add cases to the existing file)

**Interfaces:**
- Consumes: `supabase` (`./supabaseClient.js`), existing `rowToBuild`.
- Produces:
  - `toggleLike(id: string): Promise<{ liked: boolean }>` — for the current user, deletes the like row if present (→ `{liked:false}`) else inserts one (→ `{liked:true}`). Throws `Error('not signed in')` if no session.
  - `hasLiked(id: string): Promise<boolean>` — whether the current user has liked `id` (`false` if signed out).
  - `listFavorites(): Promise<Array<Row>>` — builds the current user has liked, mapped through `rowToBuild` (`[]` if signed out or none).

- [ ] **Step 1: Write the failing tests**

Add to `src/state/gallery.test.js`. The existing file mocks `./supabaseClient.js` and `./build-url.js` (sanitizeBuild → `{sanitized:true, from:p}`). Reuse that mock shape; these tests drive `supabase.auth.getUser` and the `build_likes`/`builds` query chains. Append a new `describe` block (do not disturb existing tests):

```jsx
describe('likes', () => {
  it('toggleLike inserts when not yet liked, returns liked:true', async () => {
    const auth = { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })) };
    const insert = vi.fn(() => Promise.resolve({ error: null }));
    const selChain = { eq: vi.fn(function () { return this; }), maybeSingle: vi.fn(() => Promise.resolve({ data: null })) };
    const from = vi.fn(() => ({ select: vi.fn(() => selChain), insert, delete: vi.fn() }));
    supabaseMock.auth = auth; supabaseMock.from = from;
    const { toggleLike } = await import('./gallery.js');
    expect(await toggleLike('b1')).toEqual({ liked: true });
    expect(insert).toHaveBeenCalledWith({ build_id: 'b1', user_id: 'u1' });
  });
  it('toggleLike deletes when already liked, returns liked:false', async () => {
    const auth = { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })) };
    const delChain = { eq: vi.fn(function () { return this; }), then: (r) => r({ error: null }) };
    const selChain = { eq: vi.fn(function () { return this; }), maybeSingle: vi.fn(() => Promise.resolve({ data: { build_id: 'b1' } })) };
    const del = vi.fn(() => delChain);
    supabaseMock.auth = auth;
    supabaseMock.from = vi.fn(() => ({ select: vi.fn(() => selChain), delete: del, insert: vi.fn() }));
    const { toggleLike } = await import('./gallery.js');
    expect(await toggleLike('b1')).toEqual({ liked: false });
    expect(del).toHaveBeenCalled();
  });
  it('toggleLike throws when signed out', async () => {
    supabaseMock.auth = { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) };
    const { toggleLike } = await import('./gallery.js');
    await expect(toggleLike('b1')).rejects.toThrow(/not signed in/i);
  });
  it('hasLiked returns false when signed out', async () => {
    supabaseMock.auth = { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) };
    const { hasLiked } = await import('./gallery.js');
    expect(await hasLiked('b1')).toBe(false);
  });
  it('listFavorites maps the user’s liked builds through rowToBuild', async () => {
    const auth = { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })) };
    const likeChain = { eq: vi.fn(() => Promise.resolve({ data: [{ build_id: 'b1' }, { build_id: 'b2' }] })) };
    const buildsChain = { in: vi.fn(() => Promise.resolve({ data: [{ id: 'b1', payload: { z: 1 } }], error: null })) };
    supabaseMock.auth = auth;
    supabaseMock.from = vi.fn((t) => (t === 'build_likes' ? { select: vi.fn(() => likeChain) } : { select: vi.fn(() => buildsChain) }));
    const { listFavorites } = await import('./gallery.js');
    const favs = await listFavorites();
    expect(favs[0].build).toEqual({ sanitized: true, from: { z: 1 } });
  });
});
```

> Implementer note: the existing `gallery.test.js` defines a shared `supabaseMock` object that the `vi.mock('./supabaseClient.js')` returns as `{ supabase: supabaseMock }`. If the current file structures its mock differently, adapt these tests to the file's existing mock handle (read the top of `gallery.test.js` first) — keep the assertions identical.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/state/gallery.test.js`
Expected: FAIL — `toggleLike`/`hasLiked`/`listFavorites` not exported.

- [ ] **Step 3: Implement**

Append to `src/state/gallery.js`:

```js
async function currentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
}

export async function toggleLike(id) {
  const user = await currentUser();
  if (!user) throw new Error('not signed in');
  const { data: existing } = await supabase.from('build_likes')
    .select('build_id').eq('build_id', id).eq('user_id', user.id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('build_likes').delete().eq('build_id', id).eq('user_id', user.id);
    if (error) throw error;
    return { liked: false };
  }
  const { error } = await supabase.from('build_likes').insert({ build_id: id, user_id: user.id });
  if (error) throw error;
  return { liked: true };
}

export async function hasLiked(id) {
  const user = await currentUser();
  if (!user) return false;
  const { data } = await supabase.from('build_likes')
    .select('build_id').eq('build_id', id).eq('user_id', user.id).maybeSingle();
  return Boolean(data);
}

export async function listFavorites() {
  const user = await currentUser();
  if (!user) return [];
  const { data: likes } = await supabase.from('build_likes').select('build_id').eq('user_id', user.id);
  const ids = (likes || []).map((l) => l.build_id);
  if (!ids.length) return [];
  const { data, error } = await supabase.from('builds').select('*').in('id', ids);
  if (error) throw error;
  return (data || []).map(rowToBuild);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/state/gallery.test.js`
Expected: PASS (5 new + existing).

- [ ] **Step 5: Commit**

```bash
git add src/state/gallery.js src/state/gallery.test.js
git commit -m "feat(gallery): toggleLike + hasLiked + listFavorites"
```

---

### Task 2: Interactive Like button on `BuildDetail`

**Files:**
- Modify: `src/components/BuildDetail.jsx`
- Modify: `src/styles/app.css` (like-button styles — small block)
- Test: `src/components/BuildDetail.test.jsx` (add cases)

**Interfaces:**
- Consumes: `toggleLike`, `hasLiked` (Task 1); `useAuth` (`../state/useAuth.js`) → `{ user, signInWithDiscord }`. `getBuild` already imported.
- Produces: BuildDetail renders a `♥ <count>` toggle button. Signed in → clicking toggles like (optimistic count + filled/empty state); signed out → clicking calls `signInWithDiscord()`.

- [ ] **Step 1: Write the failing test**

Add to `src/components/BuildDetail.test.jsx`. The existing file mocks `../state/gallery.js` with `getBuild`; extend that mock to also expose `toggleLike` + `hasLiked`, and mock `../state/useAuth.js`.

```jsx
// at top, alongside the existing getBuild mock — ensure the gallery mock object includes:
//   toggleLike: vi.fn(), hasLiked: vi.fn(() => Promise.resolve(false))
// and add:
//   vi.mock('../state/useAuth.js', () => ({ useAuth: () => useAuthValue }));
// with a mutable `let useAuthValue = { user: { id: 'u1' }, signInWithDiscord: vi.fn() };`

it('likes a build optimistically when signed in', async () => {
  hasLiked.mockResolvedValueOnce(false);
  toggleLike.mockResolvedValueOnce({ liked: true });
  getBuild.mockResolvedValueOnce({ ...found, like_count: 3 });
  renderD('b1');
  const likeBtn = await screen.findByRole('button', { name: /like/i });
  expect(likeBtn).toHaveTextContent('3');
  fireEvent.click(likeBtn);
  await waitFor(() => expect(likeBtn).toHaveTextContent('4')); // optimistic +1
  expect(toggleLike).toHaveBeenCalledWith('b1');
});

it('prompts sign-in when a signed-out user clicks like', async () => {
  useAuthValue = { user: null, signInWithDiscord: vi.fn() };
  getBuild.mockResolvedValueOnce({ ...found, like_count: 0 });
  renderD('b1');
  const likeBtn = await screen.findByRole('button', { name: /like/i });
  fireEvent.click(likeBtn);
  expect(useAuthValue.signInWithDiscord).toHaveBeenCalled();
  expect(toggleLike).not.toHaveBeenCalled();
});
```

> Implementer note: read the current `BuildDetail.test.jsx` to match its existing mock setup (the `found` fixture, `renderD`, and how `getBuild` is exposed). Wire `toggleLike`/`hasLiked` into the SAME `vi.mock('../state/gallery.js', …)` factory. Make `useAuthValue` a reassignable `let` reset in a `beforeEach` so the two tests don't bleed.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/BuildDetail.test.jsx`
Expected: FAIL — no Like button.

- [ ] **Step 3: Implement**

In `src/components/BuildDetail.jsx`, add imports:

```jsx
import { getBuild, toggleLike, hasLiked } from '../state/gallery.js';
import { useAuth } from '../state/useAuth.js';
```

(adjust the existing `getBuild` import line to include the new names). Inside `BuildDetail`, after the existing `row` state and effect, add like state seeded from the row, plus a liked-status fetch:

```jsx
  const { user, signInWithDiscord } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  useEffect(() => { setLikeCount(row && row !== null ? row.like_count : 0); }, [row]);
  useEffect(() => { if (id && user) hasLiked(id).then(setLiked); else setLiked(false); }, [id, user]);

  const like = async () => {
    if (!user) { signInWithDiscord(); return; }
    const next = !liked;
    setLiked(next); setLikeCount((c) => c + (next ? 1 : -1)); // optimistic
    try { await toggleLike(row.id); }
    catch { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); } // revert
  };
```

Render the button in the `bd-head` block, next to the Copy button:

```jsx
        <div className="bd-actions">
          <button className={`bd-like${liked ? ' on' : ''}`} aria-label="like build" onClick={like}>
            {liked ? '♥' : '♡'} {likeCount}
          </button>
          <button className="bd-copy" onClick={copy}>⎘ Copy to my planner</button>
        </div>
```

(Replace the existing standalone `bd-copy` button with this `bd-actions` wrapper containing both.)

Add to `src/styles/app.css`:

```css
.bd-actions { display: flex; gap: 8px; align-items: center; }
.bd-like { background: var(--panel); border: 1px solid var(--line); color: var(--text); border-radius: 6px; padding: 8px 14px; cursor: pointer; font-weight: 600; }
.bd-like.on { border-color: #ff7c9a; color: #ff7c9a; }
.bd-like:hover { border-color: #ff7c9a; }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/BuildDetail.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BuildDetail.jsx src/styles/app.css src/components/BuildDetail.test.jsx
git commit -m "feat(gallery): interactive Like button on build detail (optimistic, sign-in prompt)"
```

---

### Task 3: Favorites shelf in `MyBuildsView`

**Files:**
- Modify: `src/components/MyBuildsView.jsx`
- Test: `src/components/MyBuildsView.test.jsx` (create or extend)

**Interfaces:**
- Consumes: `listFavorites` (Task 1), `BuildCard` (`./BuildCard.jsx`), `useStore` → `dispatch({type:'setGalleryBuild', id})`.
- Produces: below the owned-builds grid, a "♥ Favorites" section rendering the user's liked builds as `BuildCard`s; clicking one opens its gallery detail. Hidden when there are no favorites.

- [ ] **Step 1: Write the failing test**

Create/extend `src/components/MyBuildsView.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

const favRow = { id: 'f1', name: 'Liked Build', base_class: 'rogue', role: ['DPS'], content: ['Boss'], like_count: 5, created_at: '2026-06-20T00:00:00Z', build: {} };
vi.mock('../state/gallery.js', () => ({
  listMyBuilds: vi.fn(() => Promise.resolve([])),
  deleteBuild: vi.fn(),
  listFavorites: vi.fn(() => Promise.resolve([favRow])),
}));
vi.mock('../state/useAuth.js', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
const { default: MyBuildsView } = await import('./MyBuildsView.jsx');

describe('MyBuildsView favorites', () => {
  it('shows a Favorites shelf of liked builds', async () => {
    render(<StoreProvider init={{ view: 'my-builds' }}><MyBuildsView /></StoreProvider>);
    expect(await screen.findByText(/favorites/i)).toBeInTheDocument();
    expect(screen.getByText('Liked Build')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/MyBuildsView.test.jsx`
Expected: FAIL — no Favorites section / `listFavorites` not used.

- [ ] **Step 3: Implement**

In `src/components/MyBuildsView.jsx`: import `listFavorites` and `BuildCard`, fetch favorites alongside owned builds, and render the shelf. Read the current file first; apply these minimal additions:

```jsx
import { listMyBuilds, deleteBuild, listFavorites } from '../state/gallery.js';
import BuildCard from './BuildCard.jsx';
```

Add favorites state + fetch next to the existing owned-builds effect:

```jsx
  const [favorites, setFavorites] = useState([]);
  useEffect(() => { if (user) listFavorites().then(setFavorites).catch(() => setFavorites([])); }, [user]);
```

After the existing owned-builds `build-grid` block (still inside the signed-in return), add:

```jsx
      {favorites.length > 0 && (
        <section className="my-favorites">
          <h2>♥ Favorites</h2>
          <div className="g-grid">
            {favorites.map((b) => <BuildCard key={b.id} build={b} onOpen={(fid) => dispatch({ type: 'setGalleryBuild', id: fid })} />)}
          </div>
        </section>
      )}
```

(`dispatch` is already obtained from `useStore()` in this component. Reuse the existing `.g-grid` class from the gallery. If the early-returns for "not signed in"/"loading"/"no builds" would skip the favorites render, restructure so the Favorites section still shows when the user has favorites but no owned builds — i.e. only the "sign in" early-return should suppress favorites; the "no owned builds yet" message and the Favorites shelf can coexist.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/MyBuildsView.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite + commit**

Run: `npx vitest run`
Expected: PASS (all prior + new).

```bash
git add src/components/MyBuildsView.jsx src/components/MyBuildsView.test.jsx
git commit -m "feat(gallery): Favorites shelf in My Builds"
```

---

## Post-plan: live verification (controller, after Task 3)

Against the dev server (port 5173) signed in as Discord:
1. Open a public build's detail → click ♥ → count increments, heart fills; re-click → decrements/empties. Confirm the row in `public.build_likes` appears/disappears and `builds.like_count` tracks it (via Supabase MCP `execute_sql`).
2. Go to My Builds → the liked build appears under "♥ Favorites"; click it → opens its detail.
3. Gallery → sort "Most liked" → the liked build ranks by its count.
4. Sign out → on a detail page, clicking ♥ triggers the Discord sign-in flow (no silent no-op).

## Self-review notes (plan author)
- **Spec coverage (build sequence #3):** `toggleLike` = T1; like_count trigger = pre-existing (verified in DB); Most-liked sort = already shipped (Increment 2); Favorites in My Builds = T3. Interactive Like surface = T2.
- **No migration:** DB verified — `build_likes` + RLS (read/insert/delete own) + `build_likes_count` trigger + `like_count` default all present.
- **Auth boundary:** likes require a session (RLS); signed-out Like triggers sign-in. Anon can still read `like_count` (public column) and see counts on cards/detail.
- **Optimistic + revert:** local count/liked flip immediately, revert on `toggleLike` rejection; server trigger remains source of truth for other viewers.
