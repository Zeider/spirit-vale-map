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

  // Track zone names already used so accessible labels stay unique across
  // sub-zones that share the same display name (e.g. the 4 Forest Labyrinth bands).
  const seenNames = {};

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

        // First occurrence: full name + level; duplicates: just level range + id.
        const nameCount = seenNames[z.name] || 0;
        seenNames[z.name] = nameCount + 1;
        const ariaLabel = z.isHub
          ? `${z.name} hub`
          : nameCount === 0
            ? `${z.name} level ${z.minLevel} to ${z.maxLevel}`
            : `zone ${id} levels ${z.minLevel} to ${z.maxLevel}`;

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
