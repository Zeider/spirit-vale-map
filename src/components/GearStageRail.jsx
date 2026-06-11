import { useStore } from '../state/store.jsx';

function nextDefaultLevel(stages) {
  if (!stages.length) return 1;
  return Math.min(135, Math.max(...stages.map((s) => s.fromLevel)) + 10);
}

export default function GearStageRail() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages;

  const labelFor = (i) => {
    const from = stages[i].fromLevel;
    const to = i + 1 < stages.length ? stages[i + 1].fromLevel - 1 : 135;
    return `Lv ${from}–${to}`;
  };

  return (
    <div className="stage-rail">
      <div className="label">GEAR STAGES</div>
      <div className="stage-chips">
        {stages.map((s, i) => (
          <div key={i} className={`stage-chip${i === state.selectedStage ? ' on' : ''}`} onClick={() => dispatch({ type: 'selectStage', index: i })}>
            <span>{labelFor(i)}</span>
            <button aria-label={`remove stage ${labelFor(i)}`} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'removeGearStage', index: i }); }}>✕</button>
          </div>
        ))}
        <button className="stage-add" onClick={() => {
          const lvl = parseInt(window.prompt('New stage starts at level:', String(nextDefaultLevel(stages))), 10);
          if (Number.isFinite(lvl)) dispatch({ type: 'addGearStage', fromLevel: Math.min(135, Math.max(1, lvl)) });
        }}>＋ Add stage</button>
      </div>
    </div>
  );
}
