import { useStore } from '../state/store.jsx';
import { effectiveLoadout, effectiveCards, effectiveArtifacts, sortStages } from '../logic/gear.js';
import { items, cardByName, gemBySlug, artifactBySlug } from '../data/gear-index.js';
import { sumLoadoutStats, sumSocketStats } from '../logic/stats.js';

const ATTRS = [['str', '💪 STR'], ['agi', '⚡ AGI'], ['vit', '❤️ VIT'], ['int', '🧠 INT'], ['dex', '🎯 DEX'], ['luk', '🍀 LUK']];

export default function StatSheet() {
  const { state, dispatch } = useStore();
  const ro = state.readOnly;
  const stages = state.build.gearStages;

  const sorted = stages.length ? sortStages(stages) : [];
  const idx = Math.min(state.selectedStage, sorted.length - 1);
  const loadout = sorted.length ? effectiveLoadout(sorted, idx) : {};
  const cards = sorted.length ? effectiveCards(sorted, idx) : {};
  const artifacts = sorted.length ? effectiveArtifacts(sorted, idx) : {};
  const itemsBySlot = Object.fromEntries(Object.entries(loadout).map(([s, slug]) => [s, items[slug]]));

  const merged = new Map();
  for (const r of [...sumLoadoutStats(loadout, items),
                   ...sumSocketStats({ cards, artifacts }, { itemsBySlot, cardByName, gemBySlug, artifactBySlug })]) {
    const cur = merged.get(r.label) || { label: r.label, value: 0, percent: r.percent };
    cur.value += r.value;
    merged.set(r.label, cur);
  }
  const totals = [...merged.values()].sort((a, b) => a.label.localeCompare(b.label));

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
            <button aria-label={`decrease ${key}`} disabled={ro} onClick={ro ? undefined : () => dispatch({ type: 'setAttribute', key, value: state.build.attributes[key] - 1 })}>−</button>
            <input type="number" min="1" max="99" className="attr-input" aria-label={key} data-testid={`attr-${key}`}
              readOnly={ro}
              value={state.build.attributes[key]}
              onChange={ro ? undefined : (e) => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) dispatch({ type: 'setAttribute', key, value: v }); }} />
            <button aria-label={`increase ${key}`} disabled={ro} onClick={ro ? undefined : () => dispatch({ type: 'setAttribute', key, value: state.build.attributes[key] + 1 })}>+</button>
          </div>
        ))}
      </div>
      <p className="muted stat-note">Base gear totals only — no refine/attribute/skill scaling (formulas aren't in the game data).</p>
    </div>
  );
}
