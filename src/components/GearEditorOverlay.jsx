import { useStore } from '../state/store.jsx';
import GearProgression from './GearProgression.jsx';

// The gear workbench in a modal over the atlas, so you can equip/socket a stage's
// gear without leaving the map. Reuses the exact same editor as the Gear tab.
export default function GearEditorOverlay() {
  const { state, dispatch } = useStore();
  if (!state.gearOverlay) return null;
  const close = () => dispatch({ type: 'closeGearEditor' });
  return (
    <div className="overlay-backdrop" onClick={close}>
      <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <h2>Gear</h2>
          <button className="overlay-x" aria-label="close gear editor" onClick={close}>✕</button>
        </div>
        {!state.build.baseClass && (
          <p className="muted overlay-note">Pick a class on the Build tab to save this gear to your share link.</p>
        )}
        <div className="overlay-body">
          <GearProgression />
        </div>
      </div>
    </div>
  );
}
