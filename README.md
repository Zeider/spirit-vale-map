# Spirit Vale Atlas

A map-centric levelling & drop planner for the idle RPG **Spirit Vale**. Click a zone to see its aggregated drops, build a level-aware levelling route, and share it via URL. Static site — no backend.

## Develop
- `npm install`
- `npm run data` — regenerate `src/data/zones.json` from `data/raw/`
- `npm run dev` — local dev server
- `npm test` — run the test suite
- `npm run build` — production build to `dist/`

## Map hotspot calibration
Zone click-areas live in `src/data/hotspots.js` as percentage rectangles. To re-position them visually, run `npm run dev` and open the app with `?calibrate` appended to the URL — pick each zone and click its top-left then bottom-right corner; copy the generated lines into `hotspots.js`.

## Updating game data
When `RandomGuy5555/SpiritValeInfo` publishes a newer snapshot:
1. Replace the files in `data/raw/` with the new `example-data/game/*.json`.
2. Run `npm run data` and commit the regenerated `src/data/zones.json`.

Build-planner data (classes/skills) comes from a vendored snapshot of spiritvalemarket's `/api/build-simulator` in `data/raw-builds/`. To refresh: re-download it, then `npm run data` (regenerates `src/data/classes.json`).

The current `gameVersion` is shown in the app header.

## Deploy
Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with `VITE_BASE=/spirit-vale-map/` and publishes `dist/` to GitHub Pages. In repo Settings → Pages, set Source = "GitHub Actions". If you rename the repo, update `VITE_BASE` in the workflow.

## Credits
See [`ATTRIBUTION.md`](./ATTRIBUTION.md).
