import { StoreProvider, useStore } from './state/store.jsx';
import { loadInitialState, usePersist, useShareHydrate, useOAuthCallback } from './state/sync.js';
import TopBar from './components/TopBar.jsx';
import MapView from './components/MapView.jsx';
import RouteRail from './components/RouteRail.jsx';
import ZoneDrawer from './components/ZoneDrawer.jsx';
import BuildTab from './components/BuildTab.jsx';
import GearTab from './components/GearTab.jsx';
import GearEditorOverlay from './components/GearEditorOverlay.jsx';
import HotspotCalibrator from './components/HotspotCalibrator.jsx';
import MyBuildsView from './components/MyBuildsView.jsx';
import GalleryView from './components/GalleryView.jsx';
import BuildDetail from './components/BuildDetail.jsx';
import { gameVersion } from './data/zones-index.js';

function Shell() {
  const { state, dispatch } = useStore();
  usePersist(state);
  useShareHydrate(dispatch);
  useOAuthCallback(dispatch);
  if (state.authCallback) {
    return <div className="app"><p className="muted share-loading">Signing in…</p></div>;
  }
  if (state.shareLoading) {
    return <div className="app"><p className="muted share-loading">Loading shared build…</p></div>;
  }
  return (
    <div className="app">
      {state.authError && (
        <div className="auth-error" role="alert">
          Sign-in failed: {state.authError}
          <button aria-label="dismiss" onClick={() => dispatch({ type: 'hydrate', state: { authError: null } })}>✕</button>
        </div>
      )}
      <TopBar />
      {state.view === 'build' ? (
        <BuildTab />
      ) : state.view === 'gear' ? (
        <GearTab />
      ) : state.view === 'my-builds' ? (
        <MyBuildsView />
      ) : state.view === 'builds' ? (
        state.galleryBuildId ? <BuildDetail /> : <GalleryView />
      ) : (
        <>
          <div className="main"><MapView /><RouteRail /></div>
          <ZoneDrawer />
          <GearEditorOverlay />
        </>
      )}
      <footer className="app-footer">
        Game data: {gameVersion}. Data: spirit-vale-builder (base44) + spiritvalemarket.com. Map art: spiritvalemarket.com. Community tool, not affiliated with the game.
      </footer>
    </div>
  );
}

export default function App() {
  // Dev hotspot-calibration tool, reachable at ?calibrate
  if (typeof window !== 'undefined' && window.location.search.includes('calibrate')) {
    return <HotspotCalibrator />;
  }
  return (
    <StoreProvider init={loadInitialState()}>
      <Shell />
    </StoreProvider>
  );
}
