import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { useAuth } from '../state/useAuth.js';
import { listMyBuilds, deleteBuild, listFavorites } from '../state/gallery.js';
import BuildCard from './BuildCard.jsx';

export default function MyBuildsView() {
  const { user } = useAuth();
  const { dispatch } = useStore();
  const [builds, setBuilds] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const uid = user?.id;
  useEffect(() => { if (uid) listMyBuilds().then(setBuilds).catch(() => setBuilds([])); }, [uid]);
  useEffect(() => { if (uid) listFavorites().then(setFavorites).catch(() => setFavorites([])); }, [uid]);
  if (!user) return <p className="muted build-empty">Sign in with Discord to see your builds.</p>;
  if (builds === null) return <p className="muted build-empty">Loading…</p>;
  const edit = (b) => { dispatch({ type: 'hydrate', state: { build: b.build, route: b.route || [], view: 'gear', editingBuildId: b.id,
    editingMeta: { name: b.name, description: b.description || '', role: b.role || [], content: b.content || [], visibility: b.visibility || 'private' } } }); };
  const remove = async (b) => { await deleteBuild(b.id); setBuilds((bs) => bs.filter((x) => x.id !== b.id)); };
  return (
    <div className="my-builds">
      <h2>My Builds</h2>
      {builds.length === 0
        ? <p className="muted build-empty">No builds yet — publish one from the Build or Gear tab.</p>
        : (
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
        )}
      {favorites.length > 0 && (
        <section className="my-favorites">
          <h2>♥ Favorites</h2>
          <div className="g-grid">
            {favorites.map((b) => <BuildCard key={b.id} build={b} onOpen={(fid) => dispatch({ type: 'setGalleryBuild', id: fid })} />)}
          </div>
        </section>
      )}
    </div>
  );
}
