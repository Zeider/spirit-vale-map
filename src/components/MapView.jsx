import { useStore } from '../state/store.jsx';
import { mapTiles, tileById } from '../data/map-tiles.js';
import { classifyLevel } from '../logic/levels.js';

export default function MapView() {
  const { state, dispatch } = useStore();
  const { playerLevel, route, selectedZoneId, openRouteId } = state;

  const center = (id) => {
    const t = tileById[id];
    return t ? { cx: t.x + t.w / 2, cy: t.y + t.h / 2 } : null;
  };
  const routeIds = route.map((e) => e.id);
  const routeEntries = route.map((e) => ({ id: e.id, tile: tileById[e.id] })).filter((e) => e.tile);
  const routePoints = routeEntries.map((e) => center(e.id));

  // The full path is a faint "phantom"; the part you've reached colours in solid —
  // up to the open route tab AND/OR the zone matching your level, whichever is further.
  const levelIdx = routeEntries.reduce((acc, e, i) => (e.tile.minLevel <= playerLevel ? i : acc), -1);
  const tabIdx = openRouteId ? routeEntries.findIndex((e) => e.id === openRouteId) : -1;
  const progressIdx = Math.max(levelIdx, tabIdx);
  const ptsStr = (pts) => pts.map((p) => `${p.cx},${p.cy}`).join(' ');

  return (
    <div className="map-view">
      <img className="map-img" src={`${import.meta.env.BASE_URL}world-map.png`} alt="Spirit Vale world map" />
      <svg className="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        {routePoints.length > 1 && (
          <polyline className="route-line phantom"
            points={ptsStr(routePoints)}
            fill="none" strokeOpacity="0.5" strokeWidth="0.6" strokeDasharray="1.6 1.2"
          />
        )}
        {progressIdx >= 1 && (
          <polyline className="route-line progress"
            points={ptsStr(routePoints.slice(0, progressIdx + 1))}
            fill="none" strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round"
          />
        )}
      </svg>
      {mapTiles.map((t) => {
        const cls = t.isHub ? 'hub' : classifyLevel(t.minLevel, t.maxLevel, playerLevel);
        const inRoute = routeIds.includes(t.id);
        const selected = selectedZoneId === t.id;
        const routeOpen = openRouteId === t.id; // the expanded route entry — gold glow
        const pending = t.zoneId === null && !t.isHub;
        return (
          <button
            key={t.id}
            className={`hotspot lvl-${cls}${inRoute ? ' in-route' : ''}${selected ? ' selected' : ''}${routeOpen ? ' route-open' : ''}${pending ? ' pending' : ''}`}
            style={{ left: `${t.x}%`, top: `${t.y}%`, width: `${t.w}%`, height: `${t.h}%` }}
            title={t.isHub ? `${t.name} (hub)` : `${t.name} · Lv ${t.minLevel}-${t.maxLevel}${pending ? ' · drops pending' : ''}`}
            aria-label={`${t.name} ${t.isHub ? 'hub' : `level ${t.minLevel} to ${t.maxLevel}`}`}
            aria-pressed={selected}
            onClick={() => dispatch({ type: 'select', id: t.id })}
          />
        );
      })}
    </div>
  );
}
