import { useState } from 'react';
import { useStore } from '../state/store.jsx';

export default function GearStageRail() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages ?? [];
  const [adding, setAdding] = useState(false);
  const [lvl, setLvl] = useState('');

  const labelFor = (i) => {
    const from = stages[i].fromLevel;
    const to = i + 1 < stages.length ? stages[i + 1].fromLevel - 1 : 135;
    return `Lv ${from}–${to}`;
  };
  const submit = () => {
    const n = parseInt(lvl, 10);
    if (Number.isFinite(n)) dispatch({ type: 'addGearStage', fromLevel: Math.min(135, Math.max(1, n)) });
    setAdding(false); setLvl('');
  };
  const defaultLvl = stages.length ? Math.min(135, Math.max(...stages.map((s) => s.fromLevel)) + 10) : 1;

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
        {adding ? (
          <span className="stage-add-input">
            <input type="number" min="1" max="135" autoFocus value={lvl} placeholder={String(defaultLvl)}
              onChange={(e) => setLvl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false); }} />
            <button onClick={submit}>add at Lv {lvl || defaultLvl}</button>
          </span>
        ) : (
          <button className="stage-add" onClick={() => { setLvl(''); setAdding(true); }}>＋ Add stage</button>
        )}
      </div>
    </div>
  );
}
