# Builds Gallery — Design

**Status:** Approved design, pre-implementation.
**Date:** 2026-06-21
**Depends on:** the live Supabase project "Spirit Vale" (`eytahjvbhllvrlirgxfg`) + the shipped short-link feature (`src/state/shortlink.js`).

## Goal

A public **builds gallery** in Spirit Vale Atlas: signed-in users publish builds, browse/discover others', and copy any build into their own planner. Not a 1:1 clone of base44/Maxroll/pobb.in — a focused, owned, discoverable build library with light social signal (likes), no comments/ratings in v1.

## Decisions (from brainstorming)

- **Identity:** Sign in with **Discord** (Supabase Auth OAuth). Owns your builds. No passwords.
- **Gallery:** public **open feed + Featured shelf** (layout "A" — visual card grid). Builds default **private**; creator flips to **Public** (in gallery) or **Unlisted** (link-only). Moderation = a maintainer `hidden` flag (+ future report).
- **Interactions (v1):** View · **Copy/Fork** into the planner · **Like/Favorite**. No comments, no ratings.
- **Metadata:** `name` (required) + `description`; class auto-detected; fixed tags — **Role** (DPS/Tank/Support/Hybrid) + **Content** (Leveling/Endgame/Boss).
- **Discovery:** sort Newest / Most-liked / Featured · filter by class + role + content · search by name/description.

## External setup (done by user)

Discord application **Spirit Vale Atlas** (Client ID `1518447984847622164`), redirect `https://eytahjvbhllvrlirgxfg.supabase.co/auth/v1/callback`; Discord provider enabled in Supabase with Site URL `https://zeider.github.io/spirit-vale-map/` + redirect allowlist incl. `http://localhost:5173/**`. **No Discord app verification needed** (OAuth login is exempt; verification is bot-only).

## Data model (Supabase) — two new tables; `shared_builds` unchanged

```sql
-- Owned, listable builds.
create table public.builds (
  id text primary key,                       -- 8-char base62 (client-generated, like shared_builds)
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(coalesce(description,'')) <= 2000),
  base_class text not null,
  advanced_class text,
  role text[] not null default '{}',         -- subset of DPS/Tank/Support/Hybrid
  content text[] not null default '{}',      -- subset of Leveling/Endgame/Boss
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  payload jsonb not null,                     -- the build state ({baseClass, advancedClass, levels, gearStages, attributes, notes})
  like_count int not null default 0,
  hidden boolean not null default false,      -- maintainer moderation
  featured boolean not null default false,    -- maintainer-curated Featured shelf
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builds_payload_size check (pg_column_size(payload) < 100000)
);
create index builds_public_idx on public.builds (created_at desc) where visibility = 'public' and not hidden;
create index builds_owner_idx on public.builds (owner_id);

-- One row per like.
create table public.build_likes (
  build_id text not null references public.builds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (build_id, user_id)
);
```

**`like_count` maintenance:** an `after insert/delete` trigger on `build_likes` increments/decrements `builds.like_count` (denormalized for cheap Most-liked sorting).

**`updated_at`:** a `before update` trigger sets `updated_at = now()`.

## Security (RLS) — both tables `enable row level security`

- **builds SELECT:** `(visibility in ('public','unlisted') and not hidden) or owner_id = auth.uid()`. → gallery lists with `visibility = 'public'`; unlisted readable by id (link-only); private + hidden only by owner.
- **builds INSERT:** `with check (owner_id = auth.uid())`.
- **builds UPDATE / DELETE:** `using (owner_id = auth.uid())`. A `before update` trigger blocks any non-service-role from changing `hidden` or `featured` (so an owner can't un-hide their own hidden build or self-feature) — those two columns are maintainer-only (set via dashboard/service role).
- **build_likes SELECT:** `user_id = auth.uid()` (each user reads only their own likes — for "did I like this" + favorites; public counts come from `builds.like_count`).
- **build_likes INSERT / DELETE:** `with check / using (user_id = auth.uid())`.
- **Moderation:** maintainer flips `hidden` via the Supabase dashboard/SQL (service role bypasses RLS). No admin UI in v1.

The anon/publishable key stays public; all writes are gated by `auth.uid()` from the Discord session.

## Client architecture

**Dependency:** add `@supabase/supabase-js` — it handles the OAuth redirect/PKCE flow, session persistence, token refresh, and RLS-authenticated queries. (The existing anonymous `shortlink.js` stays raw-fetch; only the gallery/auth use the SDK.)

- **`src/state/supabaseClient.js`** — `createClient(URL, anonKey)` singleton.
- **`src/state/useAuth.js`** — `{ user, signInWithDiscord(), signOut(), loading }` over `supabase.auth` (`onAuthStateChange`, `signInWithOAuth({ provider:'discord', options:{ redirectTo } })`).
- **`src/state/gallery.js`** — API: `listBuilds({ sort, classFilter, role, content, search })`, `getBuild(id)`, `createBuild(fields)` (generates an 8-char id, retries on PK collision like `saveShare`), `updateBuild(id, fields)`, `deleteBuild(id)`, `toggleLike(id)`, `listMyBuilds()`, `listFavorites()`. All return plain objects; sanitize `payload` through `sanitizeBuild` on read.
- **Routing:** query-param based (GitHub-Pages safe, matches existing `?view=`): `?view=builds` (gallery), `?view=builds&b=<id>` (detail), `?view=my-builds`. Extend the store `view` + `loadInitialState`.

### Components
- **`AuthButton`** (in `TopBar`): "Sign in with Discord" when logged out; Discord avatar + menu (My Builds, Sign out) when logged in.
- **`GalleryView`**: Featured shelf (curated `hidden=false, featured`… see note) + filter bar (class chips, role/content tags, sort, search) + responsive **card grid**.
  - *Featured* = reuse a boolean: add `featured boolean default false` to `builds` (maintainer-set). Shelf = `where featured and visibility='public'`.
- **`BuildCard`**: class-accent left border, class label, title, author (Discord avatar + name), ♥ like count, tag chips, relative date. Click → detail.
- **`BuildDetail`** (`?b=<id>`): gallery header (breadcrumb, title, class, author, tags, description, **♥ Like**, **⎘ Copy to my planner**) + the build rendered with the **existing planner components in read-only mode** (skill trees + gear workbench, non-editable) so the whole build is visible. (Reusing the planner read-only is less new code than a bespoke preview and shows everything.)
- **`PublishModal`** (opened from a "Publish" button in the Build/Gear editor): name*, description, auto class, Role + Content tag pickers, Visibility segmented (Private/Unlisted/Public). Create or update.
- **`MyBuildsView`** (`?view=my-builds`): the same cards scoped to `owner_id`, each with edit / delete / visibility toggle / view-in-gallery.

### Read-only planner mode
Thread a `readOnly` prop through `SkillTree` / `GearProgression` (and children) that disables the mutating controls (steppers, slot clicks, pickers) and hides edit affordances. Default `false` (editor unchanged).

### Copy / Fork
"Copy to my planner" → `dispatch({type:'hydrate', state:{ build: sanitizeBuild(payload.build ?? payload), view:'gear' }})` and navigate to the editor. The forked build is unsaved until the user publishes it as their own.

## Error handling
- Not signed in + publish/like → prompt sign-in (no silent failure).
- Supabase unreachable → toast "couldn't reach the gallery, try again"; the planner itself keeps working (gallery is additive).
- Unknown/private `?b=<id>` → "build not found or private" detail state.
- Oversized payload (>100k) on publish → friendly error (rare; same cap as short links).

## Build sequence (the plan will phase this — large feature)
1. **Auth + data + publish + My Builds** — sign in with Discord; `builds`/`build_likes` tables + RLS + triggers; PublishModal; MyBuildsView. (You can create/own/manage builds.)
2. **Gallery browse + detail + copy** — GalleryView (featured + feed + filters + search), BuildCard, BuildDetail (read-only planner), Copy/Fork.
3. **Likes** — toggleLike, like_count trigger, Most-liked sort, Favorites in My Builds.

## Out of scope (v1, YAGNI)
Comments, star ratings, follows/profiles, build versioning/patch tags, image/video thumbnails, an in-app admin/moderation UI (maintainer uses the dashboard), search beyond name/description, pagination beyond a simple "load more".

## Testing
- `gallery.js` + `useAuth` with a mocked supabase client (list/create/like/sign-in paths).
- Components: `BuildCard`, `PublishModal` (validation + visibility), filter/sort logic, read-only planner mode (controls disabled).
- Serialization: `payload` round-trips through `sanitizeBuild`; Copy/Fork hydrates correctly.
- Live: against the real project — sign in with Discord, publish, appears in gallery, like, copy, RLS denies editing someone else's build.
