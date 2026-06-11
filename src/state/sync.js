import { useEffect } from 'react';
import { encodeState, decodeState } from './url.js';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';
import { keepKnownTileIds } from '../data/map-tiles.js';

const LS_KEY = 'sva.state.v1';

export function loadInitialState() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view') === 'builds' ? 'builds' : 'atlas';
  const atlas = decodeState(window.location.search.replace(/^\?/, ''));
  let base = atlas;
  if (!window.location.search && localStorage.getItem(LS_KEY)) {
    try { base = { ...base, ...JSON.parse(localStorage.getItem(LS_KEY)) }; } catch { /* ignore */ }
  }
  const build = sanitizeBuild(decodeBuild(params.get('build')));
  return {
    view,
    playerLevel: base.playerLevel ?? 1,
    route: keepKnownTileIds(base.route || []),
    ...(build ? { build } : {}),
  };
}

export function usePersist(state) {
  useEffect(() => {
    if (state.view === 'builds') {
      const b = encodeBuild(state.build);
      window.history.replaceState(null, '', `${window.location.pathname}?view=builds${b ? `&build=${b}` : ''}`);
    } else {
      const qs = encodeState({ playerLevel: state.playerLevel, route: state.route });
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
    localStorage.setItem(LS_KEY, JSON.stringify({ playerLevel: state.playerLevel, route: state.route }));
  }, [state.view, state.playerLevel, state.route, state.build]);
}
