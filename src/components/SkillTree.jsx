import { useStore } from '../state/store.jsx';
import { classBySlug, skillById } from '../data/classes-index.js';
import { canIncrement, canDecrement, pointsUsed, budget } from '../logic/build.js';
import SkillCard from './SkillCard.jsx';
import BudgetBar from './BudgetBar.jsx';

export default function SkillTree({ classSlug, tree }) {
  const { state, dispatch } = useStore();
  const cls = classBySlug[classSlug];
  if (!cls) return null;
  const { build, selectedSkillId } = state;

  return (
    <div className="skill-tree">
      <div className="skill-tree-head">
        <span className="label">{tree === 'base' ? 'BASE CLASS' : 'ADVANCED'} · {cls.name}</span>
        <BudgetBar label="Points" used={pointsUsed(build, tree)} total={budget(build, tree)} />
      </div>
      {cls.grid.map((row, r) => (
        <div className="grid-row" key={r}>
          {row.map((id, c) => (
            <SkillCard
              key={c}
              skill={id ? skillById[id] : null}
              level={id ? build.levels[id] || 0 : 0}
              canInc={id ? canIncrement(id, build) : false}
              canDec={id ? canDecrement(id, build) : false}
              selected={id === selectedSkillId}
              onChange={(level) => {
                const curLvl = id ? (build.levels[id] || 0) : 0;
                if (level > curLvl) dispatch({ type: 'incrementSkill', id });
                else dispatch({ type: 'setSkillLevel', id, level });
              }}
              onSelect={(sid) => dispatch({ type: 'selectSkill', id: sid === selectedSkillId ? null : sid })}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
