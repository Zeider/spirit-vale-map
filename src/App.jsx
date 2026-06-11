import { StoreProvider, useStore } from './state/store.jsx';
import { loadInitialState, usePersist } from './state/sync.js';
import TopBar from './components/TopBar.jsx';
import MapView from './components/MapView.jsx';
import RouteRail from './components/RouteRail.jsx';
import ZoneDrawer from './components/ZoneDrawer.jsx';
import BuildView from './components/BuildView.jsx';
import HotspotCalibrator from './components/HotspotCalibrator.jsx';
import { gameVersion } from './data/zones-index.js';

function Shell() {
  const { state } = useStore();
  usePersist(state);
  return (
    <div className="app">
      <TopBar />
      {state.view === 'builds' ? (
        <BuildView />
      ) : (
        <>
          <div className="main">
            <MapView />
            <RouteRail />
          </div>
          <ZoneDrawer />
        </>
      )}
      <footer className="app-footer">
        Game data v{gameVersion}. Data: SpiritValeInfo + spiritvalemarket.com. Map art: spiritvalemarket.com. Community tool, not affiliated with the game.
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
