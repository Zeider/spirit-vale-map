import { useStore } from '../state/store.jsx';
import { items } from '../data/gear-index.js';
import { effectiveLoadout, sortStages } from '../logic/gear.js';
import { sumLoadoutStats } from '../logic/stats.js';

const ATTRS = [['str', '💪 STR'], ['agi', '⚡ AGI'], ['vit', '❤️ VIT'], ['int', '🧠 INT'], ['dex', '🎯 DEX'], ['luk', '🍀 LUK']];

export default function StatSheet() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages;
  const loadout = stages.length ? effectiveLoadout(sortStages(stages), Math.min(state.selectedStage, stages.length - 1)) : {};
  const totals = sumLoadoutStats(loadout, items).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="stat-sheet">
      <div className="label">TOTAL STATS (from gear)</div>
      {totals.length === 0 ? (
        <p className="muted">Equip gear to see totals.</p>
      ) : (
        <ul className="stat-totals">
          {totals.map((s) => (
            <li key={s.label} className={/^(matk|atk)$/i.test(s.label) ? 'stat-atk' : undefined}><span>{s.label}</span><b>+{s.value}{s.percent ? '%' : ''}</b></li>
          ))}
        </ul>
      )}
      <div className="label" style={{ marginTop: 10 }}>ATTRIBUTES</div>
      <div className="attrs">
        {ATTRS.map(([key, label]) => (
          <div key={key} className="attr">
            <span>{label}</span>
            <button aria-label={`decrease ${key}`} onClick={() => dispatch({ type: 'setAttribute', key, value: state.build.attributes[key] - 1 })}>−</button>
            <b data-testid={`attr-${key}`}>{state.build.attributes[key]}</b>
            <button aria-label={`increase ${key}`} onClick={() => dispatch({ type: 'setAttribute', key, value: state.build.attributes[key] + 1 })}>+</button>
          </div>
        ))}
      </div>
      <p className="muted stat-note">Base gear totals only — no refine/attribute/skill scaling (formulas aren't in the game data).</p>
    </div>
  );
}
