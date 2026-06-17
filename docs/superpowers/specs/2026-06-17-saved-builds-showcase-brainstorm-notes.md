# Saved Builds Showcase — Brainstorming Groundwork (pre-design)

**Date:** 2026-06-17
**Status:** GROUNDWORK ONLY — exploration + options, prepared autonomously while
you were asleep. NOT an approved design. We'll turn this into a real spec via
the normal brainstorming flow once you answer the open questions below.

## Current state (what exists today)

- A **build** (base class, advanced class, skill levels, gear stages, attributes,
  notes) is encoded entirely in the `?build=` URL as base64url-JSON
  (`src/state/build-url.js`). The "🔗 Share build" button (`TopBar.jsx`) just
  copies the current URL to the clipboard.
- A **route** is encoded in `?route=`. `localStorage` (key in `sync.js`)
  persists ONLY the Atlas's `playerLevel` + `route` — a single working state,
  not builds, and not a collection.
- There is **no way to save multiple named builds**, and **no gallery/browse
  UI**. The app is a static GitHub Pages site — **no backend**.

So "showcase saved builds" is net-new functionality. The encoding/sharing
machinery already exists (every build round-trips through a URL); what's missing
is **persistence of a collection** and a **gallery UI**.

## What "showcase saved builds" needs

1. Save a build under a **name** (+ optional metadata: class, tags, description,
   author, thumbnail).
2. Store a **collection** of builds.
3. A **gallery** UI to browse / open / compare / delete saved builds.
4. (Optional) **Share / discover** builds across users.

## The crux: storage (you flagged this)

Three tiers, increasing capability and cost:

**A. localStorage gallery (device-local)** — save builds in the browser.
- Pros: zero infrastructure, ships on the current static app today, private,
  instant.
- Cons: per-device only (no cross-device sync, no shared gallery), lost if the
  user clears site data, no cross-user discovery. (Individual builds are still
  shareable via their `?build=` URL.)
- Natural first increment: a **"My Builds"** view — save/name/open/delete
  locally; each entry opens through the existing build URL.

**B. Static curated JSON (maintainer-curated public gallery)** — a
`featured-builds.json` committed to the repo; the app renders a public
"Featured Builds" gallery from it.
- Pros: a real public showcase, still zero backend, shareable + discoverable.
- Cons: only you curate (no user submissions); adding a build is a git commit.

**C. Backend (Supabase / Firebase / similar)** — users save builds to a database;
public gallery with submissions, search, likes.
- Pros: multi-user, persistent, cross-device, discoverable — the full showcase.
- Cons: needs hosting + (likely) auth + light moderation. This is the "longer
  storage" you said you'd look into.

## Recommended path (to discuss)

Start with **A — localStorage "My Builds"** as the first increment: shippable
now on the static app, immediately useful, and it forces the save/name/gallery
UI we'd reuse later. Then optionally add **B — curated Featured gallery** for a
public, backend-free showcase. Reserve **C — backend** for when you want
user-submitted, cross-device, discoverable builds.

This sequencing means we get value on day one with no infra, and each step
reuses the prior step's UI rather than throwing it away.

## Open questions for you (answer these and we'll run the real brainstorm)

1. **Home:** a new "Builds gallery" view inside spirit-vale-map, or a separate
   project/repo? (Builds belong to this planner, so a new view is the lower-
   friction default — but you said "new project," so confirm.)
2. **Audience:** just you across your own devices, or a public community
   showcase others browse?
3. **First increment:** device-local "My Builds", or jump straight to a
   public/curated gallery?
4. **Backend now or later:** start backend-free (A/B), or stand up storage now
   (C)? You mentioned looking into longer storage tomorrow.
5. **What a saved build stores** beyond the encoded build string: name,
   description, tags, author, a thumbnail/preview?

Once you weigh in, I'll do the proper brainstorming → design spec → plan →
implementation, with a visual mockup of the gallery as we go.
