import { useStore } from '../state/store.jsx';
import { items } from '../data/gear-index.js';
import { itemTiles } from '../logic/gear.js';

export default function ItemDetail() {
  const { state, dispatch } = useStore();
  const item = state.selectedItemSlug ? items[state.selectedItemSlug] : null;
  if (!item) return <div className="item-detail empty"><p className="muted">Select a gear piece to see its stats and sources.</p></div>;

  const tiles = itemTiles(item); // drop zones + craft zone
  const addZones = () => tiles.forEach((id) => dispatch({ type: 'addToRoute', id, want: item.slug }));

  return (
    <div className="item-detail">
      <h3>{item.name} <span className="label">{item.type}{item.cardSlots ? ` · ${item.cardSlots} card slots` : ''}</span></h3>
      {item.statsPrimary.map((s, i) => <div key={i} className="stat-line">{s}</div>)}
      {item.statsSecondary.map((s, i) => <div key={i} className="stat-line muted">{s}</div>)}
      {item.setBonus.length > 0 && <div className="set-bonus"><span className="label">Set</span> {item.setBonus.join(' · ')}</div>}
      <div className="label" style={{ marginTop: 8 }}>DROP SOURCES</div>
      {item.sources.length === 0 ? (
        <p className="muted">No drop source{item.craft ? ` — crafted at ${item.craft.zoneName}` : ' — craft only'}.</p>
      ) : (
        <ul className="src-list">
          {item.sources.slice(0, 8).map((s, i) => (
            <li key={i}><span className="src-zone">{s.zoneName}</span> <span className="muted">Lv {s.minLevel}–{s.maxLevel}</span> <span className="src-chance">{s.chance}%</span> <span className="muted">{s.monster}{s.isBoss ? ' (boss)' : ''}</span></li>
          ))}
        </ul>
      )}
      <button className="farm-btn" disabled={tiles.length === 0} onClick={addZones}>＋ Add {tiles.length} zone{tiles.length === 1 ? '' : 's'} to route</button>
    </div>
  );
}
