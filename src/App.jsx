import { StoreProvider, useStore } from './state/store.jsx';
import { loadInitialState, usePersist } from './state/sync.js';
import TopBar from './components/TopBar.jsx';
import MapView from './components/MapView.jsx';
import RouteRail from './components/RouteRail.jsx';
import ZoneDrawer from './components/ZoneDrawer.jsx';
import BuildTab from './components/BuildTab.jsx';
import GearTab from './components/GearTab.jsx';
import GearEditorOverlay from './components/GearEditorOverlay.jsx';
import HotspotCalibrator from './components/HotspotCalibrator.jsx';
import { gameVersion } from './data/zones-index.js';

function Shell() {
  const { state } = useStore();
  usePersist(state);
  return (
    <div className="app">
      <TopBar />
      {state.view === 'build' ? (
        <BuildTab />
      ) : state.view === 'gear' ? (
        <GearTab />
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
