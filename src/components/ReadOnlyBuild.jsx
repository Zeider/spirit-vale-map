import { StoreProvider } from '../state/store.jsx';
import { classBySlug } from '../data/classes-index.js';
import { classColor } from '../logic/gallery-ui.js';
import SkillTree from './SkillTree.jsx';
import GearProgression from './GearProgression.jsx';
import BuildNotes from './BuildNotes.jsx';

// Renders a build read-only inside its OWN store, so viewing someone else's
// build never touches the user's working session. The planner components read
// state.readOnly (Task 4) and disable their controls.
export default function ReadOnlyBuild({ build }) {
  const base = build.baseClass;
  const adv = build.advancedClass;
  return (
    <StoreProvider init={{ build, readOnly: true, selectedStage: 0, view: 'build' }}>
      <div className="ro-build">
        <div className="ro-cls" style={{ color: classColor(base) }}>
          {classBySlug[base]?.name || base}{adv ? ` · ${classBySlug[adv]?.name || adv}` : ''}
        </div>
        <div className="trees">
          {base && <SkillTree classSlug={base} tree="base" />}
          {adv && <SkillTree classSlug={adv} tree="advanced" />}
        </div>
        <GearProgression />
        <BuildNotes />
      </div>
    </StoreProvider>
  );
}
