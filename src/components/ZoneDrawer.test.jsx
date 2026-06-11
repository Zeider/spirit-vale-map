import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoneDrawer from './ZoneDrawer.jsx';
import { StoreProvider } from '../state/store.jsx';
import { mapTiles } from '../data/map-tiles.js';
import { subZoneById } from '../data/zones-index.js';

const combatTile = mapTiles.find((t) => t.zoneId && !t.isHub && subZoneById[t.zoneId].drops.length > 0);
const pendingTile = mapTiles.find((t) => t.zoneId === null && !t.isHub);

describe('ZoneDrawer', () => {
  it('prompts to pick a zone when none selected', () => {
    render(<StoreProvider><ZoneDrawer /></StoreProvider>);
    expect(screen.getByText(/select a zone/i)).toBeInTheDocument();
  });
  it('shows the tile name and an add-to-route button', () => {
    render(<StoreProvider init={{ selectedZoneId: combatTile.id }}><ZoneDrawer /></StoreProvider>);
    expect(screen.getByRole('heading', { name: combatTile.name })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to route/i })).toBeInTheDocument();
  });
  it('toggles route membership on click', () => {
    render(<StoreProvider init={{ selectedZoneId: combatTile.id }}><ZoneDrawer /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /add to route/i }));
    expect(screen.getByRole('button', { name: /remove from route/i })).toBeInTheDocument();
  });
  it('shows a pending message for tiles not in the data snapshot', () => {
    render(<StoreProvider init={{ selectedZoneId: pendingTile.id }}><ZoneDrawer /></StoreProvider>);
    expect(screen.getByText(/v0\.13\.1 snapshot/i)).toBeInTheDocument();
  });
});
