# Spirit Vale Atlas

A map-centric planner for the idle RPG **Spirit Vale**: chart a levelling route across the world map, plan your skill build and gear-by-level loadouts, and publish or copy builds from a community gallery.

**▶ Live: https://zeider.github.io/spirit-vale-map/**

Everything except the gallery works with no sign-in; your work lives in the URL, so a shared link restores the whole plan.

---

## How to use

The top bar switches between four views — **Atlas**, **Build**, **Gear**, **Gallery** — plus **🔗 Share**, **💬 Feedback**, and Discord sign-in.

### 🗺️ Atlas — the map & levelling route
- Set your **Level** (top bar). Zones tint by how they compare to you: green = on-level, blue = over-level, red = under-level.
- **Filter** the map by drop type (equip, material, card, gem, consumable, artifact, or all).
- **Click a zone** to open its drawer — the monsters there and every item they drop, aggregated. Hit **+ Add to route** to add it to your levelling plan.
- The **Levelling route** panel (right) lists your zones in order:
  - Expand an entry to set **WANT HERE** items (the **＋** opens a picker filtered to what actually drops in that zone) and per-zone **notes**.
  - Reorder with **↑ / ↓**, remove with **✕**. New zones slot in by level automatically.
  - Selecting an entry **highlights its tile** on the map. The summary shows your level coverage and any **gaps**.
- **🔗 Share route** copies a short link that restores the whole route + build.

### 🧙 Build — skills
- Pick a **base class**, then an **advanced class**. (Changing the base class warns first — it clears the build.)
- Allocate points in the **skill trees**; the budget bar tracks points used. Click a skill for its details.
- Add **build notes** with the markdown toolbar (bold, italic, code, headings, lists, links, **colour**). The toolbar stays pinned as you scroll a long note.

### ⚔️ Gear — loadouts by level band
- Add **gear stages** — each is the loadout you aim for over a level band (e.g. Lv 11–25).
- Click a slot to pick an item. The picker is **searchable by stat** — type "hit" to see every item in that slot granting Hit.
- **Socket cards** into items (the ◆ pips) and equip **artifacts** (Rune / Jewel / Scroll / Relic) with **gems**. The stat sheet totals everything, including sockets.
- **＋ Add all N zones to route** drops the zones where this stage's gear actually *farms* (its drop zones) straight into your levelling route.
- **🔗 Share build** copies a short link; **Publish** sends it to the gallery.

### 🏛️ Gallery — discover & share builds
- **Sign in with Discord** to publish, like, and own builds (browsing and copying need no account).
- Browse the **Featured** shelf and the full feed; **filter** by class, role (DPS/Tank/Support/Hybrid) and content (Leveling/Endgame/Boss), **sort** by Newest or Most-liked, or **search** by name.
- Open any build for a **read-only view** of its full skills + gear + notes. **🗺 Open levelling route** forks it into your own editor (landing on the Atlas) so you can follow or tweak the pathing.
- **♥ Like** builds you rate. **My Builds** lists what you've published — **Edit** reopens a build in the planner where **💾 Update build** lets you change its name, description (rich text), role/content tags, visibility, and saved build + route in place — plus a **♥ Favorites** shelf of builds you've liked.
- **Publish** (from the Build or Gear tab) sets a name, description, role/content tags, and visibility — **Private**, **Unlisted** (link-only), or **Public** (listed in the gallery).

### 💬 Feedback
The **💬 Feedback** button sends a bug, idea, or note straight to the maintainer — with a link to exactly what you're looking at, so it's easy to reproduce.

---

## Develop
- `npm install`
- `npm run data` — regenerate `src/data/zones.json` from `data/raw-base44/`
- `npm run dev` — local dev server
- `npm test` — run the test suite
- `npm run build` — production build to `dist/`

## Map hotspot calibration
Zone click-areas live in `src/data/hotspots.js` as percentage rectangles. To re-position them visually, run `npm run dev` and open the app with `?calibrate` appended to the URL — pick each zone and click its top-left then bottom-right corner; copy the generated lines into `hotspots.js`.

## Updating game data
Zone, monster, and drop data is fetched from the [spirit-vale-builder](https://spirit-vale-builder.base44.app) (base44) `GameData` API and vendored locally:
1. Run `node scripts/fetch-base44.mjs` to pull fresh data into `data/raw-base44/`.
2. Run `npm run data` to regenerate `src/data/zones.json` from those files.
3. Commit both the raw files and the regenerated `zones.json`.

Build-planner data (classes/skills) comes from a vendored snapshot of spiritvalemarket's `/api/build-simulator` in `data/raw-builds/`. Gear/catalog data is fetched from `/api/catalog`. To refresh: re-download those files, then `npm run data` (regenerates `src/data/classes.json` and `src/data/gear.json`).

The current `gameVersion` is shown in the app header.

## Deploy
Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with `VITE_BASE=/spirit-vale-map/` and publishes `dist/` to GitHub Pages. In repo Settings → Pages, set Source = "GitHub Actions". If you rename the repo, update `VITE_BASE` in the workflow.

## Credits
See [`ATTRIBUTION.md`](./ATTRIBUTION.md).
