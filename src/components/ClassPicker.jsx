import { useStore } from '../state/store.jsx';
import { baseClasses, advancedFor } from '../data/classes-index.js';

export default function ClassPicker() {
  const { state, dispatch } = useStore();
  const { baseClass, advancedClass, levels, notes, gearStages } = state.build;
  const advOptions = baseClass ? advancedFor(baseClass) : [];

  // Switching base class wipes skills, gear, and notes — confirm first if there's
  // anything to lose, and ignore re-clicking the already-selected class.
  const pickBase = (slug) => {
    if (slug === baseClass) return;
    const hasData = Object.keys(levels || {}).length > 0 || (notes && notes.trim()) || (gearStages || []).length > 0;
    if (hasData && !window.confirm('Changing base class will clear your current build — skills, gear, and notes. Continue?')) return;
    dispatch({ type: 'selectClass', slug });
  };

  return (
    <div className="class-picker">
      <div className="label">BASE CLASS</div>
      <div className="class-row">
        {baseClasses.map((c) => (
          <button
            key={c.slug}
            className={`class-chip${c.slug === baseClass ? ' on' : ''}`}
            onClick={() => pickBase(c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>
      {advOptions.length > 0 && (
        <>
          <div className="label">ADVANCED</div>
          <div className="class-row">
            {advOptions.map((c) => (
              <button
                key={c.slug}
                className={`class-chip adv${c.slug === advancedClass ? ' on' : ''}`}
                onClick={() => dispatch({ type: 'selectAdvanced', slug: c.slug === advancedClass ? null : c.slug })}
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
