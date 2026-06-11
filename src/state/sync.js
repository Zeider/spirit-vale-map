import { useEffect } from 'react';
import { encodeState, decodeState } from './url.js';
import { keepKnownTileIds } from '../data/map-tiles.js';

const LS_KEY = 'sva.state.v1';

// Read initial state from URL first, then localStorage; validate route ids.
export function loadInitialState() {
  const fromUrl = decodeState(window.location.search.replace(/^\?/, ''));
  let base = fromUrl;
  if (!window.location.search && localStorage.getItem(LS_KEY)) {
    try { base = { ...base, ...JSON.parse(localStorage.getItem(LS_KEY)) }; } catch { /* ignore */ }
  }
  return { playerLevel: base.playerLevel ?? 1, route: keepKnownTileIds(base.route || []) };
}

// Persist level+route to URL (replaceState) and localStorage whenever they change.
export function usePersist(state) {
  useEffect(() => {
    const slice = { playerLevel: state.playerLevel, route: state.route };
    const qs = encodeState(slice);
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', url);
    localStorage.setItem(LS_KEY, JSON.stringify(slice));
  }, [state.playerLevel, state.route]);
}
