import { useEffect } from 'react';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';
import { encodeRoute, decodeRoute, sanitizeRoute } from './route-url.js';

const LS_KEY = 'sva.state.v2';

export function loadInitialState() {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('view');
  const view = v === 'build' || v === 'gear' ? v : 'atlas';
  const lvl = parseInt(params.get('lvl'), 10);
  let route = sanitizeRoute(decodeRoute(params.get('route') || ''));
  let playerLevel = Number.isFinite(lvl) ? lvl : 1;
  if (!params.get('route') && !params.get('lvl') && localStorage.getItem(LS_KEY)) {
    try {
      const ls = JSON.parse(localStorage.getItem(LS_KEY));
      route = sanitizeRoute(ls.route || []);
      playerLevel = ls.playerLevel ?? 1;
    } catch { /* ignore */ }
  }
  const build = sanitizeBuild(decodeBuild(params.get('build')));
  return { view, playerLevel, route, ...(build ? { build } : {}) };
}

export function usePersist(state) {
  useEffect(() => {
    const path = window.location.pathname;
    if (state.view === 'build' || state.view === 'gear') {
      const b = encodeBuild(state.build);
      window.history.replaceState(null, '', `${path}?view=${state.view}${b ? `&build=${b}` : ''}`);
    } else {
      const p = new URLSearchParams();
      if (state.playerLevel) p.set('lvl', String(state.playerLevel));
      const r = encodeRoute(state.route);
      if (r) p.set('route', r);
      // Carry the build too (gear can be edited from the atlas overlay) so it
      // persists on reload and rides along in shared route links.
      const b = encodeBuild(state.build);
      if (b) p.set('build', b);
      const qs = p.toString();
      window.history.replaceState(null, '', `${path}${qs ? `?${qs}` : ''}`);
    }
    localStorage.setItem(LS_KEY, JSON.stringify({ playerLevel: state.playerLevel, route: state.route }));
  }, [state.view, state.playerLevel, state.route, state.build]);
}
