import { useEffect, useState } from 'react';
import { useStore } from '../state/store.jsx';
import { listBuilds } from '../state/gallery.js';
import { filterSortBuilds, ROLES, CONTENT } from '../logic/gallery-ui.js';
import { baseClasses } from '../data/classes-index.js';
import BuildCard from './BuildCard.jsx';

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function GalleryView() {
  const { dispatch } = useStore();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(false);
  const [f, setF] = useState({ sort: 'newest', classFilter: '', role: [], content: [], search: '' });
  useEffect(() => { listBuilds().then(setRows).catch(() => setErr(true)); }, []);

  const open = (id) => dispatch({ type: 'setGalleryBuild', id });
  if (err) return <p className="muted build-empty">Couldn't reach the gallery — try again later.</p>;
  if (rows === null) return <p className="muted build-empty">Loading gallery…</p>;

  const allFeatured = rows.filter((r) => r.featured);
  const shown = filterSortBuilds(rows, f);
  const featured = filterSortBuilds(allFeatured, f);

  return (
    <div className="gallery">
      <h2>Builds Gallery</h2>
      {featured.length > 0 && (
        <section className="g-featured">
          <div className="label">★ FEATURED</div>
          <div className="g-grid">{featured.map((b) => <BuildCard key={b.id} build={b} onOpen={open} />)}</div>
        </section>
      )}
      <div className="g-filters">
        <input type="search" placeholder="Search builds…" value={f.search}
          onChange={(e) => setF({ ...f, search: e.target.value })} />
        <select aria-label="sort" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })}>
          <option value="newest">Newest</option><option value="most-liked">Most liked</option>
        </select>
        <div className="g-chips">
          <button className={`gchip${f.classFilter === '' ? ' on' : ''}`} onClick={() => setF({ ...f, classFilter: '' })}>All classes</button>
          {baseClasses.map((c) => (
            <button key={c.slug} className={`gchip${f.classFilter === c.slug ? ' on' : ''}`}
              onClick={() => setF({ ...f, classFilter: f.classFilter === c.slug ? '' : c.slug })}>{c.name}</button>
          ))}
        </div>
        <div className="g-chips">
          {ROLES.map((r) => <button key={r} className={`gchip${f.role.includes(r) ? ' on' : ''}`} onClick={() => setF({ ...f, role: toggle(f.role, r) })}>{r}</button>)}
          {CONTENT.map((c) => <button key={c} className={`gchip${f.content.includes(c) ? ' on' : ''}`} onClick={() => setF({ ...f, content: toggle(f.content, c) })}>{c}</button>)}
        </div>
      </div>
      {shown.length === 0 ? <p className="muted">No builds match.</p>
        : <div className="g-grid">{shown.map((b) => <BuildCard key={b.id} build={b} onOpen={open} />)}</div>}
    </div>
  );
}
