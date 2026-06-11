import { useStore } from '../state/store.jsx';
import { subZoneById } from '../data/zones-index.js';
import { hotspots } from '../data/hotspots.js';
import { classifyLevel } from '../logic/levels.js';

export default function MapView() {
  const { state, dispatch } = useStore();
  const { playerLevel, route, selectedZoneId } = state;

  const center = (id) => {
    const h = hotspots[id];
    return h ? { cx: h.x + h.w / 2, cy: h.y + h.h / 2 } : null;
  };
  const routePoints = route.map(center).filter(Boolean);

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
      {Object.entries(hotspots).map(([id, h]) => {
        const z = subZoneById[id];
        if (!z) return null;
        const cls = z.isHub ? 'hub' : classifyLevel(z.minLevel, z.maxLevel, playerLevel);
        const inRoute = route.includes(id);
        const selected = selectedZoneId === id;

        // Labels stay unique across same-named sub-zones because the level band differs
        // (e.g. the 4 Forest Labyrinth tiles read "... level 6 to 10", "... 11 to 15", ...).
        const ariaLabel = z.isHub
          ? `${z.name} hub`
          : `${z.name} level ${z.minLevel} to ${z.maxLevel}`;

        return (
          <button
            key={id}
            className={`hotspot lvl-${cls}${inRoute ? ' in-route' : ''}${selected ? ' selected' : ''}`}
            style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
            title={z.isHub ? `${z.name} (hub)` : `${z.name} · Lv ${z.minLevel}-${z.maxLevel}`}
            aria-label={ariaLabel}
            aria-pressed={selected}
            onClick={() => dispatch({ type: 'select', id })}
          />
        );
      })}
    </div>
  );
}
