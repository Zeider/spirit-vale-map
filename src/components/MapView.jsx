import { useStore } from '../state/store.jsx';
import { mapTiles, tileById } from '../data/map-tiles.js';
import { classifyLevel } from '../logic/levels.js';

export default function MapView() {
  const { state, dispatch } = useStore();
  const { playerLevel, route, selectedZoneId } = state;

  const center = (id) => {
    const t = tileById[id];
    return t ? { cx: t.x + t.w / 2, cy: t.y + t.h / 2 } : null;
  };
  const routeIds = route.map((e) => e.id);
  const routePoints = routeIds.map(center).filter(Boolean);

  return (
    <div className="map-view">
      <img className="map-img" src={`${import.meta.env.BASE_URL}world-map.png`} alt="Spirit Vale world map" />
      <svg className="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        {routePoints.length > 1 && (
          <polyline
            points={routePoints.map((p) => `${p.cx},${p.cy}`).join(' ')}
            fill="none" stroke="#FFD25A" strokeWidth="0.6" strokeDasharray="1.6 1.2"
          />
        )}
      </svg>
      {mapTiles.map((t) => {
        const cls = t.isHub ? 'hub' : classifyLevel(t.minLevel, t.maxLevel, playerLevel);
        const inRoute = routeIds.includes(t.id);
        const selected = selectedZoneId === t.id;
        const pending = t.zoneId === null && !t.isHub;
        return (
          <button
            key={t.id}
            className={`hotspot lvl-${cls}${inRoute ? ' in-route' : ''}${selected ? ' selected' : ''}${pending ? ' pending' : ''}`}
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
