import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { stageRanges } from '../logic/gear.js';

export default function GearStageRail() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages ?? [];
  const ranges = stageRanges(stages);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  const nextStart = ranges.length ? ranges[ranges.length - 1].toLevel + 1 : 1;
  const placeholder = Math.min(135, nextStart + 9);

  const submitAdd = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n)) { setAdding(false); setDraft(''); setHint(''); return; }
    if (n < nextStart) { setHint(`Cap must be ≥ ${nextStart} (above the previous band).`); return; }
    dispatch({ type: 'addGearStage', toLevel: Math.min(135, n) });
    setAdding(false); setDraft(''); setHint('');
  };
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
            {editIdx === i ? (
              <span className="cap-edit" onClick={(e) => e.stopPropagation()}>
                Lv {r.start}–
                <input type="number" min={r.start} max="135" autoFocus value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(i); if (e.key === 'Escape') { setEditIdx(null); setEditDraft(''); } }}
                  onBlur={() => submitEdit(i)} />
              </span>
            ) : (
              <span>Lv {r.start}–<button className="cap" title="Edit cap" onClick={(e) => { e.stopPropagation(); setEditIdx(i); setEditDraft(String(r.toLevel)); }}>{r.toLevel}</button></span>
            )}
            <button className="chip-x" aria-label={`remove stage Lv ${r.start}–${r.toLevel}`} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'removeGearStage', index: i }); }}>✕</button>
          </div>
        ))}
        {adding ? (
          <span className="stage-add-input">
            <span className="pre">Lv {nextStart}–</span>
            <input type="number" min={nextStart} max="135" autoFocus value={draft} placeholder={String(placeholder)}
              onChange={(e) => { setDraft(e.target.value); setHint(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') { setAdding(false); setDraft(''); setHint(''); } }} />
            <button onClick={submitAdd}>add</button>
          </span>
        ) : (
          <button className="stage-add" onClick={() => { setDraft(''); setHint(''); setAdding(true); }}>＋ Add stage</button>
        )}
      </div>
      {hint && <div className="stage-hint">{hint}</div>}
    </div>
  );
}
