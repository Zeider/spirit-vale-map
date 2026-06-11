import { useState } from 'react';
import { subZones } from '../data/zones-index.js';

// Dev-only tool: pick a sub-zone, click TOP-LEFT then BOTTOM-RIGHT on the map.
// It prints a hotspots.js line you paste into src/data/hotspots.js.
// Reach it by adding ?calibrate to the app URL.
export default function HotspotCalibrator() {
  const [i, setI] = useState(0);
  const [corner, setCorner] = useState(null);
  const [out, setOut] = useState([]);
  const zone = subZones[i];

  const onClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = +(((e.clientX - r.left) / r.width) * 100).toFixed(2);
    const y = +(((e.clientY - r.top) / r.height) * 100).toFixed(2);
    if (!corner) { setCorner({ x, y }); return; }
    const line = `  '${zone.id}': { x: ${Math.min(corner.x, x)}, y: ${Math.min(corner.y, y)}, w: ${Math.abs(x - corner.x).toFixed(2)}, h: ${Math.abs(y - corner.y).toFixed(2)} }, // ${zone.name} ${zone.minLevel}-${zone.maxLevel}`;
    setOut((o) => [...o, line]);
    setCorner(null);
    setI((n) => Math.min(n + 1, subZones.length - 1));
  };

  return (
    <div style={{ padding: 12 }}>
      <p>
        Zone {i + 1}/{subZones.length}: <b>{zone.name}</b> (Lv {zone.minLevel}-{zone.maxLevel}) —
        click {corner ? 'BOTTOM-RIGHT' : 'TOP-LEFT'} corner.
        {' '}<button onClick={() => setI((n) => Math.min(n + 1, subZones.length - 1))}>skip</button>
        {' '}<button onClick={() => setI((n) => Math.max(n - 1, 0))}>back</button>
      </p>
      <div style={{ position: 'relative', width: '100%', maxWidth: 1178 }}>
        <img src={`${import.meta.env.BASE_URL}world-map.png`} style={{ width: '100%', display: 'block', cursor: 'crosshair' }} onClick={onClick} alt="calibrate" />
      </div>
      <textarea readOnly value={out.join('\n')} style={{ width: '100%', height: 200, marginTop: 8 }} />
    </div>
  );
}
