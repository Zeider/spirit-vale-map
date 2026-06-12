import { artifacts } from '../data/gear-index.js';

export default function ArtifactPanel() {
  if (!artifacts.length) return null;
  return (
    <div className="artifact-panel">
      <h3>Artifacts</h3>
      <p className="muted artifact-intro">Set bonuses apply when wearing the full artifact set.</p>
      <ul className="artifact-list">
        {artifacts.map((a) => (
          <li key={a.slug || a.name} className="artifact">
            <div className="artifact-name">{a.name}</div>
            {a.description && <div className="artifact-desc muted">{a.description}</div>}
            {a.fullSet.length > 0 && (
              <div className="artifact-grp"><span className="label">Set bonus</span>{a.fullSet.map((s, i) => <div key={i} className="tip-stat stat-skill">{s}</div>)}</div>
            )}
            {a.perPiece.length > 0 && (
              <div className="artifact-grp"><span className="label">Per piece</span>{a.perPiece.map((s, i) => <div key={i} className="tip-stat">{s}</div>)}</div>
            )}
            {a.perRefine.length > 0 && (
              <div className="artifact-grp"><span className="label">Per refine</span>{a.perRefine.map((s, i) => <div key={i} className="tip-stat">{s}</div>)}</div>
            )}
            {a.zones.length > 0 && <div className="artifact-zones muted">Found in: {a.zones.join(', ')}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
