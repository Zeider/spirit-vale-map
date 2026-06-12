const atkCls = (s) => (/^(matk|atk)\b/i.test(s) ? ' stat-atk' : '');

export default function ItemTooltip({ item }) {
  if (!item) return null;
  if (item.kind === 'card') {
    return (
      <div className="item-tip">
        <b>{item.name}</b> <span className="muted">Card{item.equipSlot ? ` · fits ${item.equipSlot}` : ''}{item.affix ? ` · ${item.affix}` : ''}</span>
        {item.description && <div className="tip-stat muted">{item.description}</div>}
      </div>
    );
  }
  const src = item.sources && item.sources[0];
  return (
    <div className="item-tip">
      <b>{item.name}</b> <span className="muted">{item.type} · {item.cardSlots} card slot{item.cardSlots === 1 ? '' : 's'}</span>
      {(item.statsPrimary || []).map((s, i) => <div key={`p${i}`} className={`tip-stat${atkCls(s)}`}>{s}</div>)}
      {(item.statsSecondary || []).slice(0, 4).map((s, i) => <div key={`s${i}`} className={`tip-stat muted${atkCls(s)}`}>{s}</div>)}
      {item.setBonus && item.setBonus.length > 0 && <div className="tip-set">Set: {item.setBonus.join(' · ')}</div>}
      {src && <div className="tip-drop">Drops: {src.monster}{src.isBoss ? ' (boss)' : ''} · {src.zoneName} · {src.chance}%</div>}
      {item.craft && (
        <div className="tip-craft">Craft @ {item.craft.zoneName}{item.craft.materials.length ? `: ${item.craft.materials.map((m) => `${m.name} ×${m.count}`).join(', ')}` : ''}</div>
      )}
    </div>
  );
}
