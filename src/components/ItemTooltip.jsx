import { categorizeGearStats } from '../logic/gear-stats.js';

const atkCls = (s) => (/(^|\s)m?atk(:|$)/i.test(s) ? ' stat-atk' : '');

export default function ItemTooltip({ item }) {
  if (!item) return null;
  if (item.kind === 'card') {
    return (
      <div className="item-tip">
        <b>{item.name}</b> <span className="muted">Card{item.equipSlot ? ` · fits ${item.equipSlot}` : ''}{item.affix ? ` · ${item.affix}` : ''}</span>
        {(item.stats || []).map((s, i) => (
          <div key={`c${i}`} className={`tip-stat${atkCls(s)}`}>{s}</div>
        ))}
        {item.description && <div className="tip-stat muted">{item.description}</div>}
      </div>
    );
  }
  if (item.kind === 'gem') {
    return (
      <div className="item-tip">
        <b>{item.name}</b> <span className="muted">Gem{item.affix ? ` · ${item.affix}` : ''}</span>
        {(item.stats || []).map((s, i) => <div key={`g${i}`} className={`tip-stat${atkCls(s)}`}>{s}</div>)}
        {item.description && <div className="tip-stat muted">{item.description}</div>}
      </div>
    );
  }
  if (item.perPiece || item.fullSet) { // artifact set
    return (
      <div className="item-tip">
        <b>{item.name}</b> <span className="muted">Artifact set</span>
        {(item.perPiece || []).map((s, i) => <div key={`p${i}`} className={`tip-stat${atkCls(s)}`}>{s}</div>)}
        {(item.fullSet || []).length > 0 && (
          <>
            <div className="tip-sep" />
            <div className="tip-setname">Full set (4):</div>
            {item.fullSet.map((s, i) => <div key={`f${i}`} className="tip-stat stat-skill">{s}</div>)}
          </>
        )}
        {item.description && <div className="tip-stat muted">{item.description}</div>}
      </div>
    );
  }
  const src = item.sources && item.sources[0];
  const g = categorizeGearStats(item.statsPrimary, item.statsSecondary);
  const groups = [
    g.skill.length && <div key="skill">{g.skill.map((s, i) => <div key={i} className="tip-stat stat-skill">{s}</div>)}</div>,
    g.base.length && <div key="base">{g.base.map((s, i) => <div key={i} className="tip-stat stat-atk">{s}</div>)}</div>,
    g.other.length && <div key="other">{g.other.map((s, i) => <div key={i} className="tip-stat">{s}</div>)}</div>,
  ].filter(Boolean);
  return (
    <div className="item-tip">
      <b>{item.name}</b> <span className="muted">{item.type} · {item.cardSlots} card slot{item.cardSlots === 1 ? '' : 's'}</span>
      {groups.map((blk, i) => (
        <div key={i}>{i > 0 && <div className="tip-sep" />}{blk}</div>
      ))}
      {item.setName && <div className="tip-setname">Set: {item.setName}</div>}
      {src && <div className="tip-drop">Drops: {src.monster}{src.isBoss ? ' (boss)' : ''} · {src.zoneName} · {src.chance}%</div>}
      {item.craft && (
        <div className="tip-craft">Craft @ {item.craft.zoneName}{item.craft.materials.length ? `: ${item.craft.materials.map((m) => `${m.name} ×${m.count}`).join(', ')}` : ''}</div>
      )}
    </div>
  );
}
