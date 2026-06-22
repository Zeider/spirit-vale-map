import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useAuth } from '../state/useAuth.js';
import { listMyBuilds, deleteBuild } from '../state/gallery.js';

export default function MyBuildsView() {
  const { user } = useAuth();
  const { dispatch } = useStore();
  const [builds, setBuilds] = useState(null);
  useEffect(() => { if (user) listMyBuilds().then(setBuilds).catch(() => setBuilds([])); }, [user]);
  if (!user) return <p className="muted build-empty">Sign in with Discord to see your builds.</p>;
  if (builds === null) return <p className="muted build-empty">Loading…</p>;
  if (!builds.length) return <p className="muted build-empty">No builds yet — publish one from the Build or Gear tab.</p>;
  const edit = (b) => { dispatch({ type: 'hydrate', state: { build: b.build, view: 'gear' } }); };
  const remove = async (b) => { await deleteBuild(b.id); setBuilds((bs) => bs.filter((x) => x.id !== b.id)); };
  return (
    <div className="my-builds">
      <h2>My Builds</h2>
      <div className="build-grid">
        {builds.map((b) => (
          <div key={b.id} className="bcard">
            <div className="bcard-cls">{b.base_class}{b.advanced_class ? ` · ${b.advanced_class}` : ''}</div>
            <div className="bcard-ttl">{b.name}</div>
            <div className="bcard-meta"><span className="vis">{b.visibility}</span><span className="like">♥ {b.like_count}</span></div>
            <div className="bcard-actions"><button onClick={() => edit(b)}>Edit</button><button onClick={() => remove(b)}>Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
