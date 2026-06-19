import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { stageRanges } from '../logic/gear.js';

// Inline "add a gear stage" control (button -> cap input). Shared by GearStageRail
// and RouteRail so a stage can be added without leaving the levelling-route view.
export default function AddGearStage({ label = '＋ Add stage' }) {
  const { state, dispatch } = useStore();
  const ranges = stageRanges(state.build.gearStages ?? []);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState('');

  const nextStart = ranges.length ? ranges[ranges.length - 1].toLevel + 1 : 1;
  const placeholder = Math.min(135, nextStart + 9);

  const submitAdd = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n)) { setAdding(false); setDraft(''); setHint(''); return; }
    if (n < nextStart) { setHint(`Cap must be ≥ ${nextStart} (above the previous band).`); return; }
    dispatch({ type: 'addGearStage', toLevel: Math.min(135, n) });
    setAdding(false); setDraft(''); setHint('');
  };

  return (
    <>
      {adding ? (
        <span className="stage-add-input">
          <span className="pre">Lv {nextStart}–</span>
          <input type="number" min={nextStart} max="135" autoFocus value={draft} placeholder={String(placeholder)}
            onChange={(e) => { setDraft(e.target.value); setHint(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') { setAdding(false); setDraft(''); setHint(''); } }} />
          <button onClick={submitAdd}>add</button>
        </span>
      ) : (
        <button className="stage-add" onClick={() => { setDraft(''); setHint(''); setAdding(true); }}>{label}</button>
      )}
      {hint && <div className="stage-hint">{hint}</div>}
    </>
  );
}
