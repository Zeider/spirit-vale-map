import { skillById } from '../data/classes-index.js';
import { formatEffects } from '../logic/skill-effects.js';

function scaleLine(label, v) {
  if (!v) return null;
  const at = (lv) => v.base + v.level * (lv - 1);
  return <div className="sk-scale"><span className="label">{label}</span> Lv1 {at(1)} → Lv5 {at(5)}</div>;
}

export default function SkillDetail({ skillId }) {
  const sk = skillId ? skillById[skillId] : null;
  if (!sk) return <div className="sk-detail empty"><p className="muted">Click a skill to see its details.</p></div>;
  return (
    <div className="sk-detail">
      <h3>{sk.name} <span className={`sk-badge ${sk.isPassive ? 'passive' : 'active'}`}>{sk.isPassive ? 'PASSIVE' : 'SKILL'}</span> <span className="label">max {sk.maxLevel}</span></h3>
      <p className="muted">{sk.description}</p>
      {formatEffects(sk.effects).map((line, i) => <div key={`e${i}`} className="sk-eff">{line}</div>)}
      {scaleLine('Cost', sk.cost)}
      {scaleLine('Cooldown', sk.cooldown)}
      {scaleLine('Damage', sk.damage)}
      {sk.requirements.length > 0 && (
        <p className="sk-reqs">Requires: {sk.requirements.map((r) => `${skillById[r.id]?.name || r.id} Lv${r.level}`).join(', ')}</p>
      )}
    </div>
  );
}
