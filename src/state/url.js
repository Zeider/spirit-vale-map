export function encodeState({ playerLevel, route }) {
  const p = new URLSearchParams();
  if (playerLevel) p.set('lvl', String(playerLevel));
  if (route && route.length) p.set('route', route.join(','));
  return p.toString();
}

export function decodeState(search) {
  const p = new URLSearchParams(search);
  const lvl = parseInt(p.get('lvl'), 10);
  const route = (p.get('route') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return { playerLevel: Number.isFinite(lvl) ? lvl : 1, route };
}
