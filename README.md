# Spirit Vale Atlas

A map-centric levelling & drop planner for the idle RPG **Spirit Vale**. Click a zone to see its aggregated drops, build a level-aware levelling route, and share it via URL. Static site — no backend.

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
