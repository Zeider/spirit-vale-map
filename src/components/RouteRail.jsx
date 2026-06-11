import { useStore } from '../state/store.jsx';
import { tileById } from '../data/map-tiles.js';
import { classifyLevel, computeGaps } from '../logic/levels.js';

export default function RouteRail() {
  const { state, dispatch } = useStore();
  const tiles = state.route.map((id) => tileById[id]).filter(Boolean);
  const gaps = computeGaps(tiles.map((t) => ({ minLevel: t.minLevel, maxLevel: t.maxLevel })));
  const min = tiles.length ? Math.min(...tiles.map((t) => t.minLevel)) : null;
  const max = tiles.length ? Math.max(...tiles.map((t) => t.maxLevel)) : null;

  return (
    <aside className="route-rail">
      <h2>Levelling route</h2>
      {tiles.length === 0 ? (
        <p className="muted">No zones yet — click a zone and "Add to route".</p>
      ) : (
        <>
          <ol>
            {tiles.map((t, i) => (
              <li key={t.id} className={`route-item lvl-${classifyLevel(t.minLevel, t.maxLevel, state.playerLevel)}`}>
                <span className="route-pos">{i + 1}</span>
                <button className="link" onClick={() => dispatch({ type: 'select', id: t.id })}>
                  {t.name} <span className="muted">Lv {t.minLevel}–{t.maxLevel}</span>
                </button>
                <span className="route-actions">
                  <button aria-label={`move ${t.name} up`} disabled={i === 0} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: -1 })}>↑</button>
                  <button aria-label={`move ${t.name} down`} disabled={i === tiles.length - 1} onClick={() => dispatch({ type: 'moveInRoute', index: i, dir: 1 })}>↓</button>
                  <button aria-label={`remove ${t.name}`} onClick={() => dispatch({ type: 'removeFromRoute', id: t.id })}>✕</button>
                </span>
              </li>
            ))}
          </ol>
          <div className="route-summary">
            <span>Covers Lv {min}–{max} · {tiles.length} zones</span>
            {gaps.length > 0 && (
              <span className="gaps">Gaps: {gaps.map((g) => (g.from === g.to ? g.from : `${g.from}–${g.to}`)).join(', ')}</span>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
