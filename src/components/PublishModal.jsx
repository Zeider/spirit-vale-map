import { useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useAuth } from '../state/useAuth.js';
import { createBuild } from '../state/gallery.js';

const ROLES = ['DPS', 'Tank', 'Support', 'Hybrid'];
const CONTENT = ['Leveling', 'Endgame', 'Boss'];

export default function PublishModal({ open, onClose }) {
  const { state } = useStore();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [role, setRole] = useState([]);
  const [content, setContent] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!open) return null;
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const submit = async () => {
    if (!name.trim()) { setErr('Name is required.'); return; }
    setBusy(true); setErr('');
    try { await createBuild({ name: name.trim(), description: desc, role, content, visibility, build: state.build, route: state.route }); onClose(true); }
    catch { setErr('Could not publish — try again.'); } finally { setBusy(false); }
  };
  return (
    <div className="overlay-backdrop" onClick={() => onClose(false)}>
      <div className="overlay-panel publish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head"><h2>Publish build</h2><button className="overlay-x" aria-label="close" onClick={() => onClose(false)}>✕</button></div>
        {!user && <p className="muted">Sign in with Discord to publish.</p>}
        <label className="pub-fld">Name<input aria-label="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="pub-fld">Description<textarea aria-label="description" rows="2" value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
        <div className="pub-fld">Role<div className="pub-pick">{ROLES.map((r) => <button key={r} className={`chip${role.includes(r) ? ' on' : ''}`} onClick={() => toggle(role, setRole, r)}>{r}</button>)}</div></div>
        <div className="pub-fld">Content<div className="pub-pick">{CONTENT.map((c) => <button key={c} className={`chip${content.includes(c) ? ' on' : ''}`} onClick={() => toggle(content, setContent, c)}>{c}</button>)}</div></div>
        <div className="pub-fld">Visibility<div className="pub-seg">{['private', 'unlisted', 'public'].map((v) => <button key={v} className={visibility === v ? 'on' : ''} onClick={() => setVisibility(v)}>{v}</button>)}</div></div>
        {err && <p className="pub-err">{err}</p>}
        <button className="pubbtn" disabled={busy || !user} onClick={submit}>{busy ? 'Publishing…' : 'Publish to gallery'}</button>
      </div>
    </div>
  );
}
