import { classBySlug } from '../data/classes-index.js';
import { classColor, relativeTime } from '../logic/gallery-ui.js';

export default function BuildCard({ build, onOpen }) {
  const cls = classBySlug[build.base_class];
  const label = `${cls?.name || build.base_class}${build.advanced_class ? ` · ${classBySlug[build.advanced_class]?.name || build.advanced_class}` : ''}`;
  return (
    <button className="gcard" aria-label={`open ${build.name}`} onClick={() => onOpen(build.id)}
      style={{ borderLeftColor: classColor(build.base_class) }}>
      <div className="gcard-cls" style={{ color: classColor(build.base_class) }}>{label}</div>
      <div className="gcard-ttl">{build.name}</div>
      <div className="gcard-tags">
        {[...(build.role || []), ...(build.content || [])].map((t) => <span key={t} className="gtag">{t}</span>)}
      </div>
      <div className="gcard-meta">
        <span className="like">♥ {build.like_count}</span>
        <span className="ago">{relativeTime(build.created_at)}</span>
      </div>
    </button>
  );
}
