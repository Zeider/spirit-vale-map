export default function ItemTooltip({ item }) {
  if (!item) return null;
  const src = item.sources && item.sources[0];
  return (
    <div className="item-tip">
      <b>{item.name}</b> <span className="muted">{item.type} · {item.cardSlots} card slot{item.cardSlots === 1 ? '' : 's'}</span>
      {(item.statsPrimary || []).map((s, i) => <div key={`p${i}`} className="tip-stat">{s}</div>)}
      {(item.statsSecondary || []).slice(0, 4).map((s, i) => <div key={`s${i}`} className="tip-stat muted">{s}</div>)}
      {item.setBonus && item.setBonus.length > 0 && <div className="tip-set">Set: {item.setBonus.join(' · ')}</div>}
      {src && <div className="tip-drop">Drops: {src.monster}{src.isBoss ? ' (boss)' : ''} · {src.zoneName} · {src.chance}%</div>}
      {item.craft && (
        <div className="tip-craft">Craft @ {item.craft.zoneName}{item.craft.materials.length ? `: ${item.craft.materials.map((m) => `${m.name} ×${m.count}`).join(', ')}` : ''}</div>
      )}
    </div>
  );
}
