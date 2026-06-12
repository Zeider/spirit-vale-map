import { useStore } from '../state/store.jsx';
import GearProgression from './GearProgression.jsx';
import StatSheet from './StatSheet.jsx';
import ArtifactPanel from './ArtifactPanel.jsx';

export default function GearTab() {
  const { state } = useStore();
  if (!state.build.baseClass) return <p className="muted build-empty">Pick a class on the Build tab first.</p>;
  return (
    <div className="gear-view">
      <GearProgression />
      <StatSheet />
      <ArtifactPanel />
    </div>
  );
}
