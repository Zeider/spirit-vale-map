import { useStore } from '../state/store.jsx';
import { slots, items, cards as allCards, cardByName } from '../data/gear-index.js';
import { effectiveLoadout, effectiveCards, cardCategoryOf, sortStages, stageRanges, loadoutRouteTargets } from '../logic/gear.js';
import Picker from './Picker.jsx';
import ItemTooltip from './ItemTooltip.jsx';

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
  const stageCards = effectiveCards(sorted, idx);
  const op = state.openPicker;
  const ro = state.readOnly;

  const carriedFrom = (slot) => {
    for (let i = idx - 1; i >= 0; i--) if (slot in (sorted[i].changes || {})) return ranges[i].start;
    return null;
  };

  // One-click: add every equipped item's zones (drops + craft) for this stage to the route.
  const targets = loadoutRouteTargets(loadout);
  const zoneCount = new Set(targets.map((t) => t.id)).size;
  const addAllZones = () => targets.forEach((t) => dispatch({ type: 'addToRoute', id: t.id, want: t.want }));

  const range = ranges[idx];

  return (
    <div className="gear-col">
    <div className="gear-panel">
      <div className="gear-panel-head">Gear · Lv {range.start}–{range.toLevel}</div>
      <div className="gear-rows">
        {slots.map((slot) => {
          const itemSlug = loadout[slot];
          const item = itemSlug ? items[itemSlug] : null;
          const isChanged = slot in changes;
          // changes[slot] === null = deliberately emptied here (e.g. drop the shield
          // to two-hand), distinct from a slot that was simply never filled.
          const removed = isChanged && !item;
          const from = !isChanged && item ? carriedFrom(slot) : null;
          return (
            <div key={slot} data-testid="gear-slot" className={`gear-row${item ? ' filled tip-anchor' : ''}${isChanged ? ' changed' : item ? ' carried' : ''}${removed ? ' removed' : ''}`}
              onClick={ro ? undefined : () => { dispatch({ type: 'selectItemSlot', slot }); if (item) dispatch({ type: 'selectItem', slug: itemSlug }); }}>
              <span className="gear-row-label">{SLOT_LABELS[slot]}</span>
              <span className="gear-row-item">{item ? item.name : (removed ? '✕ none' : '—')}</span>
              {item && <span className="tip-host"><ItemTooltip item={item} /></span>}
              {from != null && <span className="gear-row-from">from Lv {from}</span>}
              {!ro && item && (
                <button className="gear-row-clear" aria-label={`clear ${SLOT_LABELS[slot]}`}
                  title="Empty this slot for this stage (e.g. drop a shield to two-hand)"
                  onClick={(e) => { e.stopPropagation(); dispatch({ type: 'setGearSlot', stageIndex: idx, slot, item: null }); }}>✕</button>
              )}
              {item && item.cardSlots > 0 && (
                <span className="card-pips" onClick={(e) => e.stopPropagation()}>
                  {Array.from({ length: item.cardSlots }, (_, n) => {
                    const name = (stageCards[slot] || [])[n] || null;
                    return (
                      <button key={n} className={`pip${name ? ' filled' : ''}`} aria-label={`card slot ${n + 1} ${SLOT_LABELS[slot]}`}
                        disabled={ro}
                        onClick={ro ? undefined : () => dispatch({ type: 'setPicker', picker: { kind: 'card', slot, index: n } })}>
                        {name ? `◆ ${cardByName[name]?.name ?? name}` : '＋'}
                      </button>
                    );
                  })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
    {!ro && <button className="farm-btn add-all-zones" disabled={!zoneCount} onClick={addAllZones}>
      ＋ Add all {zoneCount} zone{zoneCount === 1 ? '' : 's'} to route
    </button>}
    {op?.kind === 'card' && (() => {
      const cat = cardCategoryOf(op.slot);
      const options = Object.values(allCards)
        .filter((c) => !c.equipSlot || c.equipSlot.toLowerCase() === cat)
        .map((c) => ({ key: c.name, name: c.name, hint: (c.stats || []).join(' · '), search: `${c.name} ${(c.stats || []).join(' ')}` }));
      const current = (stageCards[op.slot] || [])[op.index] || null;
      return (
        <Picker title={`${SLOT_LABELS[op.slot]} card`} options={options} value={current}
          onPick={(card) => { dispatch({ type: 'setCardSlot', stageIndex: idx, slot: op.slot, index: op.index, card }); dispatch({ type: 'setPicker', picker: null }); }}
          onClose={() => dispatch({ type: 'setPicker', picker: null })} />
      );
    })()}
    </div>
  );
}
