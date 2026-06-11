import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { itemsForSlot } from '../logic/gear.js';

export default function GearPicker() {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const slot = state.openSlot;
  if (!slot) return null;

  const list = itemsForSlot(slot).filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const pick = (slug) => { dispatch({ type: 'setGearSlot', stageIndex: state.selectedStage, slot, item: slug }); dispatch({ type: 'selectItem', slug }); dispatch({ type: 'selectItemSlot', slot: null }); };

  return (
    <div className="gear-picker">
      <div className="gear-picker-head">
        <input placeholder={`Search ${slot}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <button onClick={() => { dispatch({ type: 'clearGearSlot', stageIndex: state.selectedStage, slot }); dispatch({ type: 'selectItemSlot', slot: null }); }}>Revert to carried</button>
        <button onClick={() => dispatch({ type: 'selectItemSlot', slot: null })}>✕</button>
      </div>
      <ul className="gear-picker-list">
        {list.map((i) => (
          <li key={i.slug}><button onClick={() => pick(i.slug)}>{i.name} <span className="muted">{i.type}</span></button></li>
        ))}
      </ul>
    </div>
  );
}
