import { useEffect } from 'react';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';
import { encodeRoute, decodeRoute, sanitizeRoute } from './route-url.js';
import { loadShare } from './shortlink.js';

const LS_KEY = 'sva.state.v2';

export function loadInitialState() {
  const params = new URLSearchParams(window.location.search);
  // A short link (?s=<id>) resolves asynchronously — flag it so the app shows a
  // loader and usePersist doesn't overwrite the ?s= URL before it loads.
  if (params.get('s')) return { shareLoading: true };
  const v = params.get('view');
  const view = ['build', 'gear', 'my-builds'].includes(v) ? v : 'atlas';
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

// Resolve a ?s=<id> short link on mount and hydrate the full saved state.
export function useShareHydrate(dispatch) {
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('s');
    if (!id) return;
    loadShare(id).then((payload) => {
      const next = { shareLoading: false };
      if (payload && typeof payload === 'object') {
        next.view = ['build', 'gear', 'atlas'].includes(payload.view) ? payload.view : 'atlas';
        next.playerLevel = Number.isFinite(payload.lvl) ? payload.lvl : 1;
        next.route = sanitizeRoute(payload.route || []);
        const build = sanitizeBuild(payload.build);
        if (build) next.build = build;
      }
      dispatch({ type: 'hydrate', state: next });
    }).catch(() => dispatch({ type: 'hydrate', state: { shareLoading: false } }));
  }, [dispatch]);
}

export function usePersist(state) {
  useEffect(() => {
    if (state.shareLoading) return; // don't clobber a ?s= link before it resolves
    const path = window.location.pathname;
    if (state.view === 'my-builds') {
      window.history.replaceState(null, '', `${path}?view=my-builds`);
      localStorage.setItem(LS_KEY, JSON.stringify({ playerLevel: state.playerLevel, route: state.route }));
      return;
    }
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
  }, [state.view, state.playerLevel, state.route, state.build, state.shareLoading]);
}
