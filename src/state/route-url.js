import { tileById } from '../data/map-tiles.js';
import { items as gearItems } from '../data/gear-index.js';

function b64encode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64decode(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

export function encodeRoute(route) {
  if (!route || !route.length) return '';
  return b64encode(route.map((e) => ({ id: e.id, notes: e.notes || '', wants: e.wants || [] })));
}

export function decodeRoute(str) {
  if (!str) return [];
  try {
    const arr = b64decode(str);
    if (!Array.isArray(arr)) return [];
    return arr.map((e) => ({ id: e.id, notes: typeof e.notes === 'string' ? e.notes : '', wants: Array.isArray(e.wants) ? e.wants : [] }));
  } catch {
    return str.split(',').filter(Boolean).map((id) => ({ id, notes: '', wants: [] }));
  }
}

export function sanitizeRoute(route) {
  return (route || [])
    .filter((e) => tileById[e.id])
    .map((e) => ({ id: e.id, notes: typeof e.notes === 'string' ? e.notes : '', wants: (e.wants || []).filter((w) => gearItems[w]) }));
}
