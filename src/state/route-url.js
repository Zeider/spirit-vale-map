import { tileById } from '../data/map-tiles.js';
import { items as gearItems } from '../data/gear-index.js';
import { pack, unpack } from './urlcodec.js';

export function encodeRoute(route) {
  if (!route || !route.length) return '';
  return pack(route.map((e) => ({ id: e.id, notes: e.notes || '', wants: e.wants || [] })));
}

export function decodeRoute(str) {
  if (!str) return [];
  try {
    const arr = unpack(str);
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
