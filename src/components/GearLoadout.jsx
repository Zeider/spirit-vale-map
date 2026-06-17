import { useStore } from '../state/store.jsx';
import { slots, items } from '../data/gear-index.js';
import { effectiveLoadout, sortStages, stageRanges } from '../logic/gear.js';

const SLOT_LABELS = {
  weapon: 'Weapon', shield: 'Shield', headgear: 'Headgear', face: 'Face', chest: 'Chest',
  legwear: 'Legwear', shoes: 'Shoes', accessory1: 'Accessory', accessory2: 'Accessory', utility: 'Utility',
};

export default function GearLoadout() {
  const { state, dispatch } = useStore();
  const stages = state.build.gearStages;
  if (!stages.length) return null;
  const sorted = sortStages(stages);
  const ranges = stageRanges(sorted);
  const idx = Math.min(state.selectedStage, sorted.length - 1);
  const loadout = effectiveLoadout(sorted, idx);
  const changes = sorted[idx].changes || {};

  const carriedFrom = (slot) => {
    for (let i = idx - 1; i >= 0; i--) if (slot in (sorted[i].changes || {})) return ranges[i].start;
    return null;
  };

  return (
    <div className="gear-loadout">
      {slots.map((slot) => {
        const itemSlug = loadout[slot];
        const item = itemSlug ? items[itemSlug] : null;
        const isChanged = slot in changes;
        const from = !isChanged && item ? carriedFrom(slot) : null;
        return (
          <div key={slot} data-testid="gear-slot" className={`gear-slot${item ? ' filled' : ''}${isChanged ? ' changed' : item ? ' carried' : ''}`}
            onClick={() => { dispatch({ type: 'selectItemSlot', slot }); if (item) dispatch({ type: 'selectItem', slug: itemSlug }); }}>
            <div className="gear-slot-label">{SLOT_LABELS[slot]}</div>
            <div className="gear-slot-item">{item ? item.name : '—'}</div>
            {from != null && <div className="gear-slot-from">from Lv {from}</div>}
          </div>
        );
      })}
    </div>
  );
}
