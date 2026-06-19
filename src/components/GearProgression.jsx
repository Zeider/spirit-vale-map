import { useStore } from '../state/store.jsx';
import GearStageRail from './GearStageRail.jsx';
import GearLoadout from './GearLoadout.jsx';
import GearPicker from './GearPicker.jsx';
import ItemDetail from './ItemDetail.jsx';
import StatSheet from './StatSheet.jsx';
import ArtifactPanel from './ArtifactPanel.jsx';

export default function GearProgression() {
  const { state } = useStore();
  const hasStages = (state.build.gearStages ?? []).length > 0;
  return (
    <div className="gear-progression">
      <GearStageRail />
      {!hasStages ? (
        <p className="muted gear-empty">Add a gear stage to plan your loadout for a level band.</p>
      ) : (
        <>
          <div className="gear-workbench">
            <GearLoadout />
            <ArtifactPanel />
            <StatSheet />
          </div>
          {state.openSlot && <GearPicker />}
          <ItemDetail />
        </>
      )}
    </div>
  );
}
