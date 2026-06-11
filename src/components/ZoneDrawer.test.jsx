import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoneDrawer from './ZoneDrawer.jsx';
import { StoreProvider } from '../state/store.jsx';
import { subZones } from '../data/zones-index.js';

const combatZone = subZones.find((s) => !s.isHub && s.drops.length > 0);

describe('ZoneDrawer', () => {
  it('prompts to pick a zone when none selected', () => {
    render(<StoreProvider><ZoneDrawer /></StoreProvider>);
    expect(screen.getByText(/select a zone/i)).toBeInTheDocument();
  });
  it('shows zone name and an add-to-route button', () => {
    render(<StoreProvider init={{ selectedZoneId: combatZone.id }}><ZoneDrawer /></StoreProvider>);
    expect(screen.getByRole('heading', { name: new RegExp(combatZone.name) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to route/i })).toBeInTheDocument();
  });
  it('toggles route membership on click', () => {
    render(<StoreProvider init={{ selectedZoneId: combatZone.id }}><ZoneDrawer /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /add to route/i }));
    expect(screen.getByRole('button', { name: /remove from route/i })).toBeInTheDocument();
  });
});
