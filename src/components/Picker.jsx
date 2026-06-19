import { useState } from 'react';

export default function Picker({ title, options, value, onPick, onClose }) {
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  // Match against the option's full searchable text (name + stats) when provided,
  // so e.g. "hit" surfaces every card that grants Hit, not just name matches.
  const list = ql ? options.filter((o) => (o.search || o.name).toLowerCase().includes(ql)) : options;
  return (
    <div className="picker">
      <div className="picker-head">
        <span className="label">{title}</span>
        <button className="picker-x" aria-label="close picker" onClick={onClose}>✕</button>
      </div>
      <input type="search" className="picker-search" autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="picker-opt none" onClick={() => onPick(null)}>None</button>
      <ul className="picker-list">
        {list.map((o) => (
          <li key={o.key}>
            <button className={`picker-opt${o.key === value ? ' on' : ''}`} onClick={() => onPick(o.key)}>
              <span>{o.name}</span>{o.hint && <span className="muted">{o.hint}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
