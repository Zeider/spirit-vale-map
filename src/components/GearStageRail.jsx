import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { stageRanges } from '../logic/gear.js';
import AddGearStage from './AddGearStage.jsx';

export default function GearStageRail() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages ?? [];
  const ranges = stageRanges(stages);
  const [editIdx, setEditIdx] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  const submitEdit = (i) => {
    const n = parseInt(editDraft, 10);
    if (Number.isFinite(n)) dispatch({ type: 'setStageCap', index: i, toLevel: n });
    setEditIdx(null); setEditDraft('');
  };

  return (
    <div className="stage-rail">
      <div className="label">GEAR STAGES</div>
      <div className="stage-chips">
        {ranges.map((r, i) => (
          <div key={i} className={`stage-chip${i === state.selectedStage ? ' on' : ''}`} onClick={() => dispatch({ type: 'selectStage', index: i })}>
            {!state.readOnly && editIdx === i ? (
              <span className="cap-edit" onClick={(e) => e.stopPropagation()}>
                Lv {r.start}–
                <input type="number" min={r.start} max="135" autoFocus value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(i); if (e.key === 'Escape') { setEditIdx(null); setEditDraft(''); } }}
                  onBlur={() => submitEdit(i)} />
              </span>
            ) : (
              <span>Lv {r.start}–{state.readOnly ? <span>{r.toLevel}</span> : <button className="cap" title="Edit cap" onClick={(e) => { e.stopPropagation(); setEditIdx(i); setEditDraft(String(r.toLevel)); }}>{r.toLevel}</button>}</span>
            )}
            {!state.readOnly && <button className="chip-x" aria-label={`remove stage Lv ${r.start}–${r.toLevel}`} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'removeGearStage', index: i }); }}>✕</button>}
          </div>
        ))}
        {!state.readOnly && <AddGearStage />}
      </div>
    </div>
  );
}
