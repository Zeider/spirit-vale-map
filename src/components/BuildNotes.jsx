import { useStore } from '../state/store.jsx';
export default function BuildNotes() {
  const { state, dispatch } = useStore();
  return (
    <div className="build-notes">
      <div className="label">BUILD NOTES</div>
      <textarea className="build-notes-area" value={state.build.notes} placeholder="Build order, alternative gear, strategy…"
        onChange={(e) => dispatch({ type: 'setBuildNotes', notes: e.target.value })} />
    </div>
  );
}
