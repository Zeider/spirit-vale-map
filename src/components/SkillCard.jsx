export default function SkillCard({ skill, level, canInc, canDec, selected, onChange, onSelect, disabled }) {
  if (!skill) return <div className="sk-cell empty" aria-hidden="true" />;
  return (
    <div className={`sk-cell skill${level > 0 ? ' filled' : ''}${selected ? ' selected' : ''}`}>
      <button className="sk-face" disabled={disabled} onClick={() => onSelect(skill.id)} title={skill.name}>
        <span className={`sk-badge ${skill.isPassive ? 'passive' : 'active'}`}>{skill.isPassive ? 'PASSIVE' : 'SKILL'}</span>
        <span className="sk-name">{skill.name}</span>
      </button>
      <div className="sk-step">
        <button aria-label={`decrease ${skill.name}`} disabled={!canDec} onClick={() => onChange(level - 1)}>−</button>
        <span>{level}/{skill.maxLevel}</span>
        <button aria-label={`increase ${skill.name}`} disabled={!canInc} onClick={() => onChange(level + 1)}>+</button>
      </div>
    </div>
  );
}
