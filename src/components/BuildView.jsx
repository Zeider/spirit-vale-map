import { useStore } from '../state/store.jsx';
import ClassPicker from './ClassPicker.jsx';
import SkillTree from './SkillTree.jsx';
import SkillDetail from './SkillDetail.jsx';

export default function BuildView() {
  const { state } = useStore();
  const { baseClass, advancedClass } = state.build;

  return (
    <div className="build-view">
      <ClassPicker />
      {!baseClass ? (
        <p className="muted build-empty">Pick a class to start allocating skills.</p>
      ) : (
        <div className="build-body">
          <div className="trees">
            <SkillTree classSlug={baseClass} tree="base" />
            {advancedClass && <SkillTree classSlug={advancedClass} tree="advanced" />}
          </div>
          <SkillDetail skillId={state.selectedSkillId} />
        </div>
      )}
    </div>
  );
}
