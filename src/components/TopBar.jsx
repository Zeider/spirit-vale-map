import { useStore } from '../state/store.jsx';
import { gameVersion } from '../data/zones-index.js';

const FILTERS = ['all', 'equip', 'material', 'card', 'gem', 'consumable', 'artifact'];

export default function TopBar() {
  const { state, dispatch } = useStore();

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* clipboard unavailable */ }
  };

  return (
    <header className="top-bar">
      <span className="brand">⚔️ Spirit Vale Atlas</span>
      <span className="spacer" />
      <label className="field">
        Level
        <input
          type="number" min="1" max="135" value={state.playerLevel}
          onChange={(e) => dispatch({ type: 'setLevel', level: Math.max(1, parseInt(e.target.value, 10) || 1) })}
        />
      </label>
      <label className="field">
        Filter
        <select value={state.dropFilter} onChange={(e) => dispatch({ type: 'setFilter', filter: e.target.value })}>
          {FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
      <button onClick={share}>🔗 Share route</button>
      <span className="game-version" title="Game data version">v{gameVersion}</span>
    </header>
  );
}
