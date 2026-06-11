import { useStore } from '../state/store.jsx';
import { subZoneById } from '../data/zones-index.js';

const TYPE_LABELS = {
  all: 'All', equip: 'Equipment', material: 'Materials',
  card: 'Cards', gem: 'Gems', consumable: 'Consumables', artifact: 'Artifacts',
};

export default function ZoneDrawer() {
  const { state, dispatch } = useStore();
  const zone = state.selectedZoneId ? subZoneById[state.selectedZoneId] : null;

  if (!zone) {
    return <div className="zone-drawer empty"><p>Select a zone on the map to see its drops.</p></div>;
  }

  const inRoute = state.route.includes(zone.id);
  const drops = state.dropFilter === 'all' ? zone.drops : zone.drops.filter((d) => d.type === state.dropFilter);

  return (
    <div className="zone-drawer">
      <div className="zone-drawer-head">
        <h2>{zone.name}</h2>
        {zone.isHub ? (
          <span className="badge hub">Hub — no monsters</span>
        ) : (
          <>
            <span className="badge">Lv {zone.minLevel}–{zone.maxLevel}</span>
            {zone.boss && <span className="badge boss">Boss: {zone.boss}</span>}
            <button onClick={() => dispatch({ type: inRoute ? 'removeFromRoute' : 'addToRoute', id: zone.id })}>
              {inRoute ? 'Remove from route' : '+ Add to route'}
            </button>
          </>
        )}
      </div>

      {!zone.isHub && (
        <div className="zone-drawer-body">
          <div className="monsters">
            <h3>Monsters ({zone.monsters.length})</h3>
            <p>{zone.monsters.join(' · ')}</p>
          </div>
          <div className="drops">
            <h3>Drops — {TYPE_LABELS[state.dropFilter]} ({drops.length})</h3>
            {drops.length === 0 ? (
              <p className="muted">No {TYPE_LABELS[state.dropFilter].toLowerCase()} drops.</p>
            ) : (
              <ul>
                {drops.map((d) => (
                  <li key={`${d.type}:${d.id}`} className={`drop drop-${d.type}`}>
                    <span className="drop-name">{d.name}</span>
                    <span className="drop-type">{d.type}</span>
                    <span className="drop-chance" title="raw drop weight from game data">{d.chance}%</span>
                    {d.bossOnly && <span className="badge boss small">boss</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
