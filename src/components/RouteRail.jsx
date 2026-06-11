import { useStore } from '../state/store.jsx';
import { subZoneById } from '../data/zones-index.js';
import { classifyLevel, computeGaps } from '../logic/levels.js';

export default function RouteRail() {
  const { state, dispatch } = useStore();
  const zones = state.route.map((id) => subZoneById[id]).filter(Boolean);
  const gaps = computeGaps(zones.map((z) => ({ minLevel: z.minLevel, maxLevel: z.maxLevel })));
  const min = zones.length ? Math.min(...zones.map((z) => z.minLevel)) : null;
  const max = zones.length ? Math.max(...zones.map((z) => z.maxLevel)) : null;

  return (
    <aside className="route-rail">
      <h2>Levelling route</h2>
      {zones.length === 0 ? (
        <p className="muted">No zones yet — click a zone and "Add to route".</p>
      ) : (
        <>
          <ol>
            {zones.map((z, i) => (
              <li key={z.id} className={`route-item lvl-${classifyLevel(z.minLevel, z.maxLevel, state.playerLevel)}`}>
                <span className="route-pos">{i + 1}</span>
                <button className="link" onClick={() => dispatch({ type: 'select', id: z.id })}>
                  {z.name} <span className="muted">Lv {z.minLevel}–{z.maxLevel}</span>
                </button>
                <span className="route-actions">
                  <button aria-label={`move ${z.name} up`} disabled={i === 0} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: -1 })}>↑</button>
                  <button aria-label={`move ${z.name} down`} disabled={i === zones.length - 1} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: 1 })}>↓</button>
                  <button aria-label={`remove ${z.name}`} onClick={() => dispatch({ type: 'removeFromRoute', id: z.id })}>✕</button>
                </span>
              </li>
            ))}
          </ol>
          <div className="route-summary">
            <span>Covers Lv {min}–{max} · {zones.length} zones</span>
            {gaps.length > 0 && (
              <span className="gaps">Gaps: {gaps.map((g) => (g.from === g.to ? g.from : `${g.from}–${g.to}`)).join(', ')}</span>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
