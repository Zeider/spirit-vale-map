import { useEffect } from 'react';
import { encodeBuild, decodeBuild, sanitizeBuild } from './build-url.js';
import { encodeRoute, decodeRoute, sanitizeRoute } from './route-url.js';
import { loadShare } from './shortlink.js';
import { supabase } from './supabaseClient.js';

const LS_KEY = 'sva.state.v2';

// A Discord OAuth redirect returns with ?code=… (PKCE) or ?error=…
function isOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  // Hash check is key-form (#access_token=/#error=) on purpose: the build/route
  // payload now also lives in the hash and must NOT be mistaken for an OAuth hash.
  return Boolean(params.get('code') || params.get('error')) || /[#&](access_token|error)=/.test(window.location.hash);
}

export function loadInitialState() {
  const params = new URLSearchParams(window.location.search);
  // A short link (?s=<id>) resolves asynchronously — flag it so the app shows a
  // loader and usePersist doesn't overwrite the ?s= URL before it loads.
  if (params.get('s')) return { shareLoading: true };
  // OAuth callback in progress — hold the URL so supabase can read ?code= before
  // usePersist rewrites it (otherwise the session is never established).
  if (isOAuthCallback()) {
    const v = params.get('view');
    return { authCallback: true, view: ['build', 'gear', 'my-builds', 'builds'].includes(v) ? v : 'atlas' };
  }
  const v = params.get('view');
  const view = ['build', 'gear', 'my-builds', 'builds'].includes(v) ? v : 'atlas';
  const galleryBuildId = view === 'builds' ? (params.get('b') || null) : null;
  // The large build/route/lvl payload now lives in the URL HASH so the server
  // never sees it (avoids HTTP 414 on long self-contained links). Old links kept
  // it in the query string — fall back to that so already-shared links still open.
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const getP = (k) => hash.get(k) ?? params.get(k);
  const lvl = parseInt(getP('lvl'), 10);
  let route = sanitizeRoute(decodeRoute(getP('route') || ''));
  let playerLevel = Number.isFinite(lvl) ? lvl : 1;
  if (!getP('route') && !getP('lvl') && localStorage.getItem(LS_KEY)) {
    try {
      const ls = JSON.parse(localStorage.getItem(LS_KEY));
      route = sanitizeRoute(ls.route || []);
      playerLevel = ls.playerLevel ?? 1;
    } catch { /* ignore */ }
  }
  const build = sanitizeBuild(decodeBuild(getP('build')));
  return { view, playerLevel, route, galleryBuildId, ...(build ? { build } : {}) };
}

// Explicitly exchange the OAuth ?code= for a session, then clear the flag so
// usePersist resumes and cleans the URL. Surfaces any error to state.authError.
// Module-scoped guard: the auth code is single-use, and React StrictMode runs
// effects twice in dev — without this the 2nd exchange fails ("Unable to
// exchange external code") and clobbers the successful first one.
let oauthExchangeStarted = false;
export function useOAuthCallback(dispatch) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthErr = params.get('error_description') || params.get('error');
    if (!code && !oauthErr) return;
    if (oauthExchangeStarted) return;
    oauthExchangeStarted = true;
    (async () => {
      let authError = oauthErr || null;
      if (code && !authError) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) authError = error.message;
      }
      if (authError) console.error('Discord sign-in failed:', authError);
      dispatch({ type: 'hydrate', state: { authCallback: false, authError } });
    })();
  }, [dispatch]);
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
    if (state.shareLoading || state.authCallback) return; // don't clobber a ?s= or OAuth ?code= URL
    const path = window.location.pathname;
    if (state.view === 'builds') {
      window.history.replaceState(null, '', `${path}?view=builds${state.galleryBuildId ? `&b=${state.galleryBuildId}` : ''}`);
      return;
    }
    if (state.view === 'my-builds') {
      window.history.replaceState(null, '', `${path}?view=my-builds`);
      localStorage.setItem(LS_KEY, JSON.stringify({ playerLevel: state.playerLevel, route: state.route }));
      return;
    }
    // Atlas/build/gear: the (short) view stays in the query, but the large
    // build/route/lvl payload goes in the HASH. The fragment is never sent to the
    // server, so long self-contained links can't trigger HTTP 414 "URI Too Long".
    const h = new URLSearchParams();
    const b = encodeBuild(state.build);
    if (state.view === 'build' || state.view === 'gear') {
      if (b) h.set('build', b);
      const hs = h.toString();
      window.history.replaceState(null, '', `${path}?view=${state.view}${hs ? `#${hs}` : ''}`);
    } else {
      if (state.playerLevel) h.set('lvl', String(state.playerLevel));
      const r = encodeRoute(state.route);
      if (r) h.set('route', r);
      // Carry the build too (gear can be edited from the atlas overlay) so it
      // persists on reload and rides along in shared route links.
      if (b) h.set('build', b);
      const hs = h.toString();
      window.history.replaceState(null, '', `${path}${hs ? `#${hs}` : ''}`);
    }
    localStorage.setItem(LS_KEY, JSON.stringify({ playerLevel: state.playerLevel, route: state.route }));
  }, [state.view, state.playerLevel, state.route, state.build, state.galleryBuildId, state.shareLoading]);
}
