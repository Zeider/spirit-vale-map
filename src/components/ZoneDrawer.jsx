import { useStore } from '../state/store.jsx';
import { tileById } from '../data/map-tiles.js';
import { subZoneById } from '../data/zones-index.js';
import { gearByName, cardByName } from '../data/gear-index.js';
import ItemTooltip from './ItemTooltip.jsx';

const TYPE_LABELS = {
  all: 'All', equip: 'Equipment', material: 'Materials',
  card: 'Cards', gem: 'Gems', consumable: 'Consumables', artifact: 'Artifacts',
};

export default function ZoneDrawer() {
  const { state, dispatch } = useStore();
  const tile = state.selectedZoneId ? tileById[state.selectedZoneId] : null;

  if (!tile) {
    return <div className="zone-drawer empty"><p>Select a zone on the map to see its drops.</p></div>;
  }

  const zone = tile.zoneId ? subZoneById[tile.zoneId] : null;
  const inRoute = state.route.some((e) => e.id === tile.id);
  const drops = zone
    ? (state.dropFilter === 'all' ? zone.drops : zone.drops.filter((d) => d.type === state.dropFilter))
    : [];

  return (
    <div className="zone-drawer">
      <div className="zone-drawer-head">
        <h2>{tile.name}</h2>
        {tile.isHub ? (
          <span className="badge hub">Hub — no monsters</span>
        ) : (
          <>
            <span className="badge">Lv {tile.minLevel}–{tile.maxLevel}</span>
            {zone?.boss && <span className="badge boss">Boss: {zone.boss}</span>}
            {!zone && <span className="badge pending">Drops pending</span>}
            <button onClick={() => dispatch({ type: inRoute ? 'removeFromRoute' : 'addToRoute', id: tile.id })}>
              {inRoute ? 'Remove from route' : '+ Add to route'}
            </button>
          </>
        )}
      </div>

      {!tile.isHub && (zone ? (
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
                  <li key={`${d.type}:${d.id}`} className={`drop drop-${d.type} tip-anchor`}>
                    <span className="drop-name">{d.name}</span>
                    <span className="drop-type">{d.type}</span>
                    <span className="drop-chance" title="raw drop weight from game data">{d.chance}%</span>
                    {d.bossOnly && <span className="badge boss small">boss</span>}
                    {d.type === 'equip' && gearByName[d.name] && (
                      <span className="tip-host"><ItemTooltip item={gearByName[d.name]} /></span>
                    )}
                    {d.type === 'card' && cardByName[d.name] && (
                      <span className="tip-host"><ItemTooltip item={cardByName[d.name]} /></span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="zone-drawer-body">
          <p className="muted">
            Drop data for this zone isn’t in the v0.13.1 snapshot — it was added to the game after
            our data was captured. It’ll appear automatically when the next data update lands.
          </p>
        </div>
      ))}
    </div>
  );
}
