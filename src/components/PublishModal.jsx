import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useAuth } from '../state/useAuth.js';
import { createBuild, updateBuild } from '../state/gallery.js';
import RichNote from './RichNote.jsx';

const ROLES = ['DPS', 'Tank', 'Support', 'Hybrid'];
const CONTENT = ['Leveling', 'Endgame', 'Boss'];

// mode 'create' = publish a new gallery entry; 'edit' = save name/description/tags
// (and the planner build + route) back into the build loaded from My Builds.
// Mount this only when open so the fields re-seed from editingMeta on each open.
export default function PublishModal({ mode = 'create', onClose }) {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const editing = mode === 'edit';
  const meta = editing ? (state.editingMeta || {}) : {};
  const [name, setName] = useState(meta.name || '');
  const [desc, setDesc] = useState(meta.description || '');
  const [role, setRole] = useState(meta.role || []);
  const [content, setContent] = useState(meta.content || []);
  const [visibility, setVisibility] = useState(meta.visibility || 'public');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const submit = async () => {
    if (!name.trim()) { setErr('Name is required.'); return; }
    setBusy(true); setErr('');
    try {
      if (editing) {
        await updateBuild(state.editingBuildId, {
          name: name.trim(), description: desc || null, role, content, visibility,
          base_class: state.build.baseClass, advanced_class: state.build.advancedClass || null,
          payload: { build: state.build, route: state.route },
        });
        // keep editingMeta in sync so reopening shows the saved values
        dispatch({ type: 'hydrate', state: { editingMeta: { name: name.trim(), description: desc, role, content, visibility } } });
      } else {
        await createBuild({ name: name.trim(), description: desc, role, content, visibility, build: state.build, route: state.route });
      }
      onClose(true);
    } catch { setErr(editing ? 'Could not save — try again.' : 'Could not publish — try again.'); } finally { setBusy(false); }
  };
  return (
    <div className="overlay-backdrop" onClick={() => onClose(false)}>
      <div className="overlay-panel publish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head"><h2>{editing ? 'Edit build' : 'Publish build'}</h2><button className="overlay-x" aria-label="close" onClick={() => onClose(false)}>✕</button></div>
        {!user && <p className="muted">Sign in with Discord to publish.</p>}
        <label className="pub-fld">Name<input aria-label="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="pub-fld">Description<RichNote value={desc} placeholder="Describe the build…" onChange={(e) => setDesc(e.target.value)} /></div>
        <div className="pub-fld">Role<div className="pub-pick">{ROLES.map((r) => <button key={r} className={`chip${role.includes(r) ? ' on' : ''}`} onClick={() => toggle(role, setRole, r)}>{r}</button>)}</div></div>
        <div className="pub-fld">Content<div className="pub-pick">{CONTENT.map((c) => <button key={c} className={`chip${content.includes(c) ? ' on' : ''}`} onClick={() => toggle(content, setContent, c)}>{c}</button>)}</div></div>
        <div className="pub-fld">Visibility<div className="pub-seg">{['private', 'unlisted', 'public'].map((v) => <button key={v} className={visibility === v ? 'on' : ''} onClick={() => setVisibility(v)}>{v}</button>)}</div></div>
        {err && <p className="pub-err">{err}</p>}
        <button className="pubbtn" disabled={busy || !user} onClick={submit}>
          {busy ? (editing ? 'Saving…' : 'Publishing…') : (editing ? 'Save changes' : 'Publish to gallery')}
        </button>
      </div>
    </div>
  );
}
