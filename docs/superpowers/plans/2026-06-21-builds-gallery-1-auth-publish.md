# Builds Gallery — Increment 1 (Auth + Publish + My Builds) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. NOTE: Task 1 (DB migration) and Task 9 (live Discord sign-in) are coordinator/interactive steps, not pure subagent code tasks.

**Goal:** A signed-in user can sign in with Discord, publish a build (with name/tags/visibility), and manage their builds in a "My Builds" view.

**Architecture:** Supabase (Discord OAuth + `builds`/`build_likes` tables with RLS) reached from the React app via `@supabase/supabase-js`. New client modules: a Supabase singleton, a `useAuth` hook, a `gallery.js` API, and three UI pieces (AuthButton, PublishModal, MyBuildsView) wired into the existing query-param routing.

**Tech Stack:** React 18 + Vite, Context+reducer store, Supabase (Postgres + Auth), `@supabase/supabase-js`, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-06-21-builds-gallery-design.md`

## Global Constraints

- Supabase project ref `eytahjvbhllvrlirgxfg`, URL `https://eytahjvbhllvrlirgxfg.supabase.co`, anon JWT already in `src/state/shortlink.js` (reuse it; public-safe).
- Discord OAuth is configured (Client ID `1518447984847622164`); provider enabled in Supabase. No app code stores the client secret.
- Build `id` = 8-char base62, client-generated, retry on PK collision (reuse the `genId` pattern from `shortlink.js`).
- `payload` jsonb = the build state `{baseClass, advancedClass, levels, gearStages, attributes, notes}`; sanitize through `sanitizeBuild` (`src/state/build-url.js`) on read.
- Routing is query-param based: `?view=my-builds` (and existing `?view=atlas|build|gear`). No path routes (GitHub Pages).
- Tags: Role ∈ {DPS, Tank, Support, Hybrid}; Content ∈ {Leveling, Endgame, Boss}. Visibility ∈ {private, unlisted, public}.
- All writes gated by RLS (`owner_id = auth.uid()`); `hidden`/`featured` are maintainer-only.
- Every code task is TDD; all existing tests stay green.

## File structure
- `src/state/supabaseClient.js` (new) — the `@supabase/supabase-js` singleton.
- `src/state/useAuth.js` (new) — Discord auth hook.
- `src/state/gallery.js` (new) — builds API (create/update/delete/listMyBuilds; list/get/like come in increments 2–3).
- `src/components/AuthButton.jsx` (new) — sign-in / avatar menu in TopBar.
- `src/components/PublishModal.jsx` (new) — publish form.
- `src/components/MyBuildsView.jsx` (new) — owner's builds + manage.
- Modify: `src/components/TopBar.jsx` (AuthButton + Publish button), `src/App.jsx` (route `my-builds`), `src/styles/app.css`.

---

### Task 1: Supabase schema (coordinator, via MCP)

**Files:** none in-repo. Applied with the Supabase MCP `apply_migration` against project `eytahjvbhllvrlirgxfg`.

**Interfaces:**
- Produces tables `public.builds` and `public.build_likes` with RLS, the `set_updated_at`, `guard_moderation_cols`, and `bump_like_count` triggers.

- [ ] **Step 1: Apply the migration** (MCP `apply_migration`, name `builds_gallery`):

```sql
create table public.builds (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(coalesce(description,'')) <= 2000),
  base_class text not null,
  advanced_class text,
  role text[] not null default '{}',
  content text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  payload jsonb not null,
  like_count int not null default 0,
  hidden boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builds_payload_size check (pg_column_size(payload) < 100000)
);
create index builds_public_idx on public.builds (created_at desc) where visibility = 'public' and not hidden;
create index builds_owner_idx on public.builds (owner_id);

create table public.build_likes (
  build_id text not null references public.builds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (build_id, user_id)
);

alter table public.builds enable row level security;
alter table public.build_likes enable row level security;

create policy "read public/unlisted/own builds" on public.builds for select
  using ((visibility in ('public','unlisted') and not hidden) or owner_id = auth.uid());
create policy "insert own builds" on public.builds for insert with check (owner_id = auth.uid());
create policy "update own builds" on public.builds for update using (owner_id = auth.uid());
create policy "delete own builds" on public.builds for delete using (owner_id = auth.uid());

create policy "read own likes" on public.build_likes for select using (user_id = auth.uid());
create policy "like as self" on public.build_likes for insert with check (user_id = auth.uid());
create policy "unlike as self" on public.build_likes for delete using (user_id = auth.uid());

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger builds_updated_at before update on public.builds
  for each row execute function public.set_updated_at();

-- hidden/featured are maintainer-only: revert changes attempted by an authenticated user.
create or replace function public.guard_moderation_cols() returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(),'') = 'authenticated'
     and (new.hidden is distinct from old.hidden or new.featured is distinct from old.featured) then
    new.hidden := old.hidden; new.featured := old.featured;
  end if;
  return new;
end $$;
create trigger builds_guard_moderation before update on public.builds
  for each row execute function public.guard_moderation_cols();

create or replace function public.bump_like_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then update public.builds set like_count = like_count + 1 where id = new.build_id;
  elsif tg_op = 'DELETE' then update public.builds set like_count = like_count - 1 where id = old.build_id;
  end if;
  return null;
end $$;
create trigger build_likes_count after insert or delete on public.build_likes
  for each row execute function public.bump_like_count();
```

- [ ] **Step 2: Verify** — MCP `get_advisors` (type `security`): expect no new CRITICAL/ERROR lints on `builds`/`build_likes` (the public-read WARN on builds SELECT is intentional, like `shared_builds`). MCP `list_tables`: confirm both tables exist with the columns above.

---

### Task 2: Supabase client singleton

**Files:**
- Create: `src/state/supabaseClient.js`
- Test: `src/state/supabaseClient.test.js`
- Modify: `package.json` (add dependency)

**Interfaces:**
- Produces: `export const supabase` — a `@supabase/supabase-js` client with `.auth` and `.from()`.

- [ ] **Step 1: Add the dependency**

Run: `npm install @supabase/supabase-js`
Expected: added to `package.json` dependencies.

- [ ] **Step 2: Write the failing test** (`src/state/supabaseClient.test.js`)

```js
import { describe, it, expect } from 'vitest';
import { supabase } from './supabaseClient.js';

describe('supabaseClient', () => {
  it('exposes auth + from()', () => {
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.from).toBe('function');
  });
});
```

- [ ] **Step 3: Run it — FAIL** (`npx vitest run src/state/supabaseClient.test.js`) — module missing.

- [ ] **Step 4: Implement** (`src/state/supabaseClient.js`)

```js
import { createClient } from '@supabase/supabase-js';

// Public, RLS-protected (same project as the short-link store).
const SUPABASE_URL = 'https://eytahjvbhllvrlirgxfg.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dGFoanZiaGxsdnJsaXJneGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzE0MDAsImV4cCI6MjA5NzQ0NzQwMH0.3NP4Xa108czFfBAJSF_hqCOW_rSVkw8V9muWxlbJl_c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
```

- [ ] **Step 5: Run it — PASS**; then `npm test` green. Commit.

```bash
git add package.json package-lock.json src/state/supabaseClient.js src/state/supabaseClient.test.js
git commit -m "feat(gallery): @supabase/supabase-js client singleton"
```

---

### Task 3: useAuth hook (Discord)

**Files:**
- Create: `src/state/useAuth.js`
- Test: `src/state/useAuth.test.jsx`

**Interfaces:**
- Consumes: `supabase` (Task 2).
- Produces: `useAuth() -> { user, loading, signInWithDiscord(), signOut() }`. `user` is `null` or `{ id, name, avatarUrl }` derived from the Supabase session's `user_metadata`.

- [ ] **Step 1: Write the failing test** (`src/state/useAuth.test.jsx`) — mock the client:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const authMock = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
};
vi.mock('./supabaseClient.js', () => ({ supabase: { auth: authMock } }));
const { useAuth } = await import('./useAuth.js');

beforeEach(() => { vi.clearAllMocks(); authMock.getSession.mockResolvedValue({ data: { session: null } }); });

describe('useAuth', () => {
  it('starts null then loads the session user', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', user_metadata: { full_name: 'Zed', avatar_url: 'a.png' } } } } });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.user).toEqual({ id: 'u1', name: 'Zed', avatarUrl: 'a.png' }));
  });
  it('signInWithDiscord calls OAuth with discord + redirectTo', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signInWithDiscord(); });
    expect(authMock.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'discord' }));
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** (`src/state/useAuth.js`)

```js
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

const toUser = (session) => {
  const u = session?.user;
  if (!u) return null;
  const m = u.user_metadata || {};
  return { id: u.id, name: m.full_name || m.name || m.user_name || 'Player', avatarUrl: m.avatar_url || null };
};

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(toUser(data.session)); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(toUser(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  const signInWithDiscord = () =>
    supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.href } });
  const signOut = () => supabase.auth.signOut();
  return { user, loading, signInWithDiscord, signOut };
}
```

- [ ] **Step 4: Run — PASS**; `npm test` green. Commit `feat(gallery): useAuth Discord hook`.

---

### Task 4: gallery.js — create/update/delete/listMyBuilds

**Files:**
- Create: `src/state/gallery.js`
- Test: `src/state/gallery.test.js`

**Interfaces:**
- Consumes: `supabase` (Task 2), `genId` pattern, `sanitizeBuild`.
- Produces:
  - `createBuild({ name, description, role, content, visibility, build }) -> { id }` — generates an 8-char id, inserts `{ id, name, description, base_class, advanced_class, role, content, visibility, payload:{...build} }`; retries once on PK conflict (Postgres code `23505`).
  - `updateBuild(id, fields) -> void`
  - `deleteBuild(id) -> void`
  - `listMyBuilds() -> Build[]` (rows ordered by `updated_at desc`, `payload.build` sanitized into `.build`).

- [ ] **Step 1: Write the failing test** (`src/state/gallery.test.js`) — mock the client's query builder:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insert = vi.fn();
const order = vi.fn();
const eq = vi.fn();
const from = vi.fn();
vi.mock('./supabaseClient.js', () => ({ supabase: { from, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) } } }));
const { createBuild, listMyBuilds } = await import('./gallery.js');

beforeEach(() => { vi.clearAllMocks(); });

describe('gallery', () => {
  it('createBuild inserts the build + payload and returns an id', async () => {
    from.mockReturnValue({ insert: insert.mockResolvedValue({ error: null }) });
    const out = await createBuild({ name: 'My Rogue', description: 'x', role: ['DPS'], content: ['Endgame'], visibility: 'public',
      build: { baseClass: 'rogue', advancedClass: 'assassin', levels: {}, gearStages: [], attributes: {}, notes: '' } });
    expect(out.id).toMatch(/^[A-Za-z0-9]{8}$/);
    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({ name: 'My Rogue', base_class: 'rogue', advanced_class: 'assassin', visibility: 'public', role: ['DPS'] });
    expect(row.payload.baseClass).toBe('rogue');
  });
  it('listMyBuilds returns rows with sanitized build', async () => {
    order.mockResolvedValue({ data: [{ id: 'a', name: 'B', base_class: 'mage', visibility: 'private', payload: { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], attributes: {}, notes: '' } }], error: null });
    from.mockReturnValue({ select: () => ({ order }) });
    const list = await listMyBuilds();
    expect(list[0].id).toBe('a');
    expect(list[0].build.baseClass).toBe('mage');
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** (`src/state/gallery.js`)

```js
import { supabase } from './supabaseClient.js';
import { sanitizeBuild } from './build-url.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const genId = (n = 8) => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHABET[b % 62]).join('');

const rowToBuild = (r) => ({ ...r, build: sanitizeBuild(r.payload) });

export async function createBuild({ name, description, role, content, visibility, build }) {
  const base = { name, description: description || null, base_class: build.baseClass, advanced_class: build.advancedClass || null,
    role: role || [], content: content || [], visibility: visibility || 'private', payload: build };
  for (let i = 0; i < 2; i++) {
    const id = genId();
    const { error } = await supabase.from('builds').insert({ id, ...base });
    if (!error) return { id };
    if (error.code !== '23505') throw error; // 23505 = unique_violation (id collision) -> retry
  }
  throw new Error('createBuild: id collisions');
}

export async function updateBuild(id, fields) {
  const { error } = await supabase.from('builds').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteBuild(id) {
  const { error } = await supabase.from('builds').delete().eq('id', id);
  if (error) throw error;
}

export async function listMyBuilds() {
  const { data, error } = await supabase.from('builds').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToBuild);
}
```

> Note: `listMyBuilds` relies on RLS — an authenticated user's `select *` returns their own + public/unlisted rows; for a strict "mine only" list, filter `.eq('owner_id', user.id)`. Implementer: add `.eq('owner_id', (await supabase.auth.getUser()).data.user.id)` to scope to the owner. (The mock above stubs `auth.getUser`.)

- [ ] **Step 4: Run — PASS**; `npm test` green. Commit `feat(gallery): builds API (create/update/delete/listMyBuilds)`.

---

### Task 5: AuthButton in TopBar

**Files:**
- Create: `src/components/AuthButton.jsx`
- Modify: `src/components/TopBar.jsx`, `src/styles/app.css`
- Test: `src/components/AuthButton.test.jsx`

**Interfaces:**
- Consumes: `useAuth` (Task 3).
- Produces: `<AuthButton />` — "Sign in with Discord" button when `!user`; avatar + dropdown (My Builds → `setView('my-builds')`, Sign out) when `user`.

- [ ] **Step 1: Write the failing test** (`src/components/AuthButton.test.jsx`)

```js
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

const signInWithDiscord = vi.fn();
vi.mock('../state/useAuth.js', () => ({ useAuth: () => ({ user: null, loading: false, signInWithDiscord, signOut: vi.fn() }) }));
const { default: AuthButton } = await import('./AuthButton.jsx');

describe('AuthButton', () => {
  it('signed out: shows Discord sign-in and calls it', () => {
    render(<StoreProvider><AuthButton /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /discord/i }));
    expect(signInWithDiscord).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** (`src/components/AuthButton.jsx`)

```js
import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useAuth } from '../state/useAuth.js';

export default function AuthButton() {
  const { user, signInWithDiscord, signOut } = useAuth();
  const { dispatch } = useStore();
  const [open, setOpen] = useState(false);
  if (!user) return <button className="discord-btn" onClick={signInWithDiscord}>Sign in with Discord</button>;
  return (
    <span className="auth-menu">
      <button className="auth-avatar" onClick={() => setOpen((o) => !o)}>
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="av" />}{user.name} ▾
      </button>
      {open && (
        <div className="auth-pop" onMouseLeave={() => setOpen(false)}>
          <button onClick={() => { dispatch({ type: 'setView', view: 'my-builds' }); setOpen(false); }}>My Builds</button>
          <button onClick={() => { signOut(); setOpen(false); }}>Sign out</button>
        </div>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Wire into `TopBar.jsx`** — import `AuthButton`; render `<AuthButton />` just before the `game-version` span in the header (both atlas and build/gear branches share the header tail). CSS in `app.css`:

```css
.discord-btn { background:#5865F2; color:#fff; border:0; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; }
.auth-menu { position:relative; }
.auth-avatar { display:inline-flex; align-items:center; gap:5px; background:#161d2e; color:var(--text); border:1px solid var(--line); border-radius:6px; padding:4px 8px; cursor:pointer; font-size:12px; }
.auth-avatar img { width:18px; height:18px; border-radius:50%; }
.auth-avatar .av { width:18px; height:18px; border-radius:50%; background:#5865F2; }
.auth-pop { position:absolute; right:0; top:110%; background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:4px; display:flex; flex-direction:column; z-index:20; }
.auth-pop button { background:none; border:0; color:var(--text); text-align:left; padding:6px 10px; cursor:pointer; border-radius:5px; font-size:12px; }
.auth-pop button:hover { background:#1a2236; }
```

- [ ] **Step 5: Run — PASS**; `npm test` green. Commit `feat(gallery): Discord AuthButton in TopBar`.

---

### Task 6: PublishModal

**Files:**
- Create: `src/components/PublishModal.jsx`
- Modify: `src/components/TopBar.jsx` (a "Publish" button on build/gear views that opens it), `src/styles/app.css`
- Test: `src/components/PublishModal.test.jsx`

**Interfaces:**
- Consumes: `useStore` (current `state.build`), `useAuth` (must be signed in), `createBuild` (Task 4).
- Produces: `<PublishModal open onClose />` — name (required), description, Role/Content tag pickers, Visibility segmented; on submit calls `createBuild` with `state.build` and closes.

- [ ] **Step 1: Write the failing test** (`src/components/PublishModal.test.jsx`)

```js
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

const createBuild = vi.fn().mockResolvedValue({ id: 'abc12345' });
vi.mock('../state/gallery.js', () => ({ createBuild }));
vi.mock('../state/useAuth.js', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Z' } }) }));
const { default: PublishModal } = await import('./PublishModal.jsx');

const init = { build: { baseClass: 'rogue', advancedClass: 'assassin', levels: {}, gearStages: [], notes: '', attributes: { str:1,agi:1,vit:1,int:1,dex:1,luk:1 } } };

describe('PublishModal', () => {
  it('requires a name, then publishes the current build', async () => {
    render(<StoreProvider init={init}><PublishModal open onClose={() => {}} /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(createBuild).not.toHaveBeenCalled(); // name empty
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Venomblade' } });
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    await waitFor(() => expect(createBuild).toHaveBeenCalledWith(expect.objectContaining({ name: 'Venomblade', build: expect.objectContaining({ baseClass: 'rogue' }) })));
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** (`src/components/PublishModal.jsx`)

```js
import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useAuth } from '../state/useAuth.js';
import { createBuild } from '../state/gallery.js';

const ROLES = ['DPS', 'Tank', 'Support', 'Hybrid'];
const CONTENT = ['Leveling', 'Endgame', 'Boss'];

export default function PublishModal({ open, onClose }) {
  const { state } = useStore();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [role, setRole] = useState([]);
  const [content, setContent] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!open) return null;
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const submit = async () => {
    if (!name.trim()) { setErr('Name is required.'); return; }
    setBusy(true); setErr('');
    try { await createBuild({ name: name.trim(), description: desc, role, content, visibility, build: state.build }); onClose(true); }
    catch { setErr('Could not publish — try again.'); } finally { setBusy(false); }
  };
  return (
    <div className="overlay-backdrop" onClick={() => onClose(false)}>
      <div className="overlay-panel publish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head"><h2>Publish build</h2><button className="overlay-x" aria-label="close" onClick={() => onClose(false)}>✕</button></div>
        {!user && <p className="muted">Sign in with Discord to publish.</p>}
        <label className="pub-fld">Name<input aria-label="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="pub-fld">Description<textarea aria-label="description" rows="2" value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
        <div className="pub-fld">Role<div className="pub-pick">{ROLES.map((r) => <button key={r} className={`chip${role.includes(r) ? ' on' : ''}`} onClick={() => toggle(role, setRole, r)}>{r}</button>)}</div></div>
        <div className="pub-fld">Content<div className="pub-pick">{CONTENT.map((c) => <button key={c} className={`chip${content.includes(c) ? ' on' : ''}`} onClick={() => toggle(content, setContent, c)}>{c}</button>)}</div></div>
        <div className="pub-fld">Visibility<div className="pub-seg">{['private', 'unlisted', 'public'].map((v) => <button key={v} className={visibility === v ? 'on' : ''} onClick={() => setVisibility(v)}>{v}</button>)}</div></div>
        {err && <p className="pub-err">{err}</p>}
        <button className="pubbtn" disabled={busy || !user} onClick={submit}>{busy ? 'Publishing…' : 'Publish to gallery'}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire the opener in `TopBar.jsx`** — on build/gear views add a `<button onClick={() => setShowPublish(true)}>Publish</button>` next to "Share build", render `<PublishModal open={showPublish} onClose={() => setShowPublish(false)} />`. Add CSS for `.publish-modal`, `.pub-fld`, `.pub-pick`, `.pub-seg`, `.pubbtn`, `.pub-err` (reuse `.overlay-*`, `.chip`, `.seg` patterns).

- [ ] **Step 5: Run — PASS**; `npm test` green. Commit `feat(gallery): PublishModal`.

---

### Task 7: MyBuildsView + routing

**Files:**
- Create: `src/components/MyBuildsView.jsx`
- Modify: `src/App.jsx` (render for `view === 'my-builds'`), `src/state/sync.js` (accept `my-builds` view), `src/styles/app.css`
- Test: `src/components/MyBuildsView.test.jsx`

**Interfaces:**
- Consumes: `useAuth`, `listMyBuilds`/`deleteBuild` (Task 4), `useStore` (to load a build into the editor on "Edit").
- Produces: `<MyBuildsView />` — lists the signed-in user's builds (cards) with Edit (hydrate `build` into the editor + `setView('gear')`), Delete, and a visibility label. Signed-out → a sign-in prompt.

- [ ] **Step 1: Write the failing test** (`src/components/MyBuildsView.test.jsx`)

```js
import { describe, it, expect, vi, waitFor } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

vi.mock('../state/useAuth.js', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Z' } }) }));
const listMyBuilds = vi.fn().mockResolvedValue([{ id: 'a', name: 'My Rogue', base_class: 'rogue', visibility: 'public', like_count: 3, role: ['DPS'], content: [], build: {} }]);
vi.mock('../state/gallery.js', () => ({ listMyBuilds, deleteBuild: vi.fn() }));
const { default: MyBuildsView } = await import('./MyBuildsView.jsx');

describe('MyBuildsView', () => {
  it('lists the user builds', async () => {
    render(<StoreProvider init={{ view: 'my-builds' }}><MyBuildsView /></StoreProvider>);
    await waitFor(() => expect(screen.getByText('My Rogue')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** (`src/components/MyBuildsView.jsx`)

```js
import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useAuth } from '../state/useAuth.js';
import { listMyBuilds, deleteBuild } from '../state/gallery.js';

export default function MyBuildsView() {
  const { user } = useAuth();
  const { dispatch } = useStore();
  const [builds, setBuilds] = useState(null);
  useEffect(() => { if (user) listMyBuilds().then(setBuilds).catch(() => setBuilds([])); }, [user]);
  if (!user) return <p className="muted build-empty">Sign in with Discord to see your builds.</p>;
  if (builds === null) return <p className="muted build-empty">Loading…</p>;
  if (!builds.length) return <p className="muted build-empty">No builds yet — publish one from the Build or Gear tab.</p>;
  const edit = (b) => { dispatch({ type: 'hydrate', state: { build: b.build, view: 'gear' } }); };
  const remove = async (b) => { await deleteBuild(b.id); setBuilds((bs) => bs.filter((x) => x.id !== b.id)); };
  return (
    <div className="my-builds">
      <h2>My Builds</h2>
      <div className="build-grid">
        {builds.map((b) => (
          <div key={b.id} className="bcard">
            <div className="bcard-cls">{b.base_class}{b.advanced_class ? ` · ${b.advanced_class}` : ''}</div>
            <div className="bcard-ttl">{b.name}</div>
            <div className="bcard-meta"><span className="vis">{b.visibility}</span><span className="like">♥ {b.like_count}</span></div>
            <div className="bcard-actions"><button onClick={() => edit(b)}>Edit</button><button onClick={() => remove(b)}>Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Route it** — in `src/App.jsx` Shell, render `<MyBuildsView />` when `state.view === 'my-builds'`. In `src/state/sync.js` `loadInitialState`, accept `my-builds` as a valid `view` (`const view = ['build','gear','my-builds'].includes(v) ? v : 'atlas';`) and in `usePersist` write `?view=my-builds` (the build/gear branch already handles non-atlas views — extend its condition to include `my-builds`, persisting just `?view=my-builds`). Add CSS for `.my-builds`, `.build-grid`, `.bcard*` (reuse the gallery card look from the mockup).

- [ ] **Step 5: Run — PASS**; `npm test` green. Commit `feat(gallery): MyBuildsView + ?view=my-builds`.

---

### Task 8: Final whole-increment review + build

- [ ] `npm test` green; `npm run build` clean.
- [ ] Dispatch the final code-reviewer over Tasks 2–7 (auth/RLS-adjacent code — check no secret leakage beyond the public anon key, no missing null-guards on `user`, query shapes match the schema).

---

### Task 9: Live verification (coordinator + user)

- [ ] Run `npm run dev`; open the app. Click **Sign in with Discord** → complete the real Discord OAuth (interactive — the user performs the login). Confirm the avatar + name appear.
- [ ] On the Gear tab, **Publish** a build (name + tags + Public) → confirm success.
- [ ] Open **My Builds** → the build appears; **Edit** loads it into the editor; **Delete** removes it.
- [ ] In the Supabase dashboard (or MCP `execute_sql`), confirm the `builds` row exists with the right `owner_id`. Confirm RLS: a second account cannot update the first's build.

## Self-review notes
- Spec coverage: tables+RLS+triggers (T1), client (T2), auth (T3), API (T4), AuthButton (T5), PublishModal (T6), MyBuilds+routing (T7). Gallery browse/detail/copy + likes UI are **Increments 2–3** (out of scope here, by design).
- The `listMyBuilds` owner filter is called out explicitly (Task 4 note) to avoid returning non-owned rows.
- Discord login can't be unit-tested (real OAuth) → Task 9 is the live gate.
