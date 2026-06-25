import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { getBuild, toggleLike, hasLiked } from '../state/gallery.js';
import { useAuth } from '../state/useAuth.js';
import { classBySlug } from '../data/classes-index.js';
import { classColor } from '../logic/gallery-ui.js';
import ReadOnlyBuild from './ReadOnlyBuild.jsx';

export default function BuildDetail() {
  const { state, dispatch } = useStore();
  const id = state.galleryBuildId;
  const [row, setRow] = useState(undefined); // undefined=loading, null=not found
  // Reset to loading on id change so navigating detail→detail shows the loader,
  // not the previous build, while the new one fetches.
  useEffect(() => { if (!id) return; setRow(undefined); getBuild(id).then(setRow).catch(() => setRow(null)); }, [id]);

  const { user, signInWithDiscord } = useAuth();
  const uid = user?.id;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  useEffect(() => { setLikeCount(row ? row.like_count : 0); }, [row]);
  useEffect(() => { if (id && uid) hasLiked(id).then(setLiked); else setLiked(false); }, [id, uid]);

  const like = async () => {
    if (!user) { signInWithDiscord(); return; }
    const next = !liked;
    setLiked(next); setLikeCount((c) => c + (next ? 1 : -1)); // optimistic
    try { await toggleLike(row.id); }
    catch { setLiked(!next); setLikeCount((c) => c + (next ? -1 : 1)); } // revert
  };

  const back = () => dispatch({ type: 'setGalleryBuild', id: null });
  if (row === undefined) return <p className="muted build-empty">Loading build…</p>;
  if (row === null) return (
    <div className="build-empty"><p className="muted">This build was not found or private.</p>
      <button onClick={back}>← Back to gallery</button></div>
  );

  // Load the whole guide — build AND its Atlas route/pathing. Land on the Atlas
  // when there's a route so the pathing is right there; otherwise the gear editor.
  const copy = () => dispatch({ type: 'hydrate', state: {
    build: row.build, route: row.route || [],
    view: (row.route || []).length ? 'atlas' : 'gear', galleryBuildId: null, editingBuildId: null,
  } });
  return (
    <div className="build-detail">
      <div className="bd-head">
        <button className="link" onClick={back}>← Gallery</button>
        <h2 style={{ borderLeftColor: classColor(row.base_class) }}>{row.name}</h2>
        <div className="bd-sub" style={{ color: classColor(row.base_class) }}>
          {classBySlug[row.base_class]?.name || row.base_class}
          {row.advanced_class ? ` · ${classBySlug[row.advanced_class]?.name || row.advanced_class}` : ''}
        </div>
        <div className="bd-tags">{[...(row.role || []), ...(row.content || [])].map((t) => <span key={t} className="gtag">{t}</span>)}</div>
        {row.description && <p className="bd-desc">{row.description}</p>}
        <div className="bd-actions">
          <button className={`bd-like${liked ? ' on' : ''}`} aria-label="like build" onClick={like}>
            {liked ? '♥' : '♡'} {likeCount}
          </button>
          <button className="bd-copy" onClick={copy}>⎘ Copy to my planner</button>
        </div>
      </div>
      <ReadOnlyBuild build={row.build} />
    </div>
  );
}
