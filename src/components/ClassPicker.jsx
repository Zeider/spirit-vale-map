import { useStore } from '../state/store.jsx';
import { baseClasses, advancedFor } from '../data/classes-index.js';

export default function ClassPicker() {
  const { state, dispatch } = useStore();
  const { baseClass, advancedClass } = state.build;
  const advOptions = baseClass ? advancedFor(baseClass) : [];

  return (
    <div className="class-picker">
      <div className="label">BASE CLASS</div>
      <div className="class-row">
        {baseClasses.map((c) => (
          <button
            key={c.slug}
            className={`class-chip${c.slug === baseClass ? ' on' : ''}`}
            onClick={() => dispatch({ type: 'selectClass', slug: c.slug })}
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
