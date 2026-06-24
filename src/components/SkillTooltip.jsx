import { skillById } from '../data/classes-index.js';
import { formatEffects } from '../logic/skill-effects.js';

// Lv1 → LvMax scaling for a {base, level} field (value at lv = base + level*(lv-1)).
function scale(label, v, max) {
  if (!v) return null;
  const at = (lv) => v.base + v.level * (lv - 1);
  return (
    <div className="tip-stat"><span className="label">{label}</span> {max > 1 ? `Lv1 ${at(1)} → Lv${max} ${at(max)}` : at(1)}</div>
  );
}

// Hover tooltip for a skill cell — same info as the click-through SkillDetail panel,
// surfaced on hover (mirrors ItemTooltip for gear). Reuses the .item-tip box styling.
export default function SkillTooltip({ skill }) {
  if (!skill) return null;
  return (
    <div className="item-tip">
      <b>{skill.name}</b> <span className="muted">{skill.isPassive ? 'PASSIVE' : 'SKILL'} · max {skill.maxLevel}</span>
      {skill.description && <div className="tip-stat muted">{skill.description}</div>}
      {formatEffects(skill.effects).map((line, i) => <div key={`e${i}`} className="tip-eff">{line}</div>)}
      {scale('Cost', skill.cost, skill.maxLevel)}
      {scale('Cooldown', skill.cooldown, skill.maxLevel)}
      {scale('Damage', skill.damage, skill.maxLevel)}
      {skill.requirements?.length > 0 && (
        <div className="tip-stat sk-reqs">Requires: {skill.requirements.map((r) => `${skillById[r.id]?.name || r.id} Lv${r.level}`).join(', ')}</div>
      )}
    </div>
  );
}
