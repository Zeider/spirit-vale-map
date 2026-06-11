import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteRail from './RouteRail.jsx';
import { StoreProvider } from '../state/store.jsx';
import { tileById } from '../data/map-tiles.js';

const a = tileById['island'];   // Stormreef Isle
const b = tileById['swamp'];    // Swamp

describe('RouteRail', () => {
  it('shows an empty hint with no route', () => {
    render(<StoreProvider><RouteRail /></StoreProvider>);
    expect(screen.getByText(/no zones yet/i)).toBeInTheDocument();
  });
  it('lists route tiles in order and removes one', () => {
    render(<StoreProvider init={{ route: [a.id, b.id] }}><RouteRail /></StoreProvider>);
    expect(screen.getByText(new RegExp(a.name))).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0]);
    expect(screen.queryByText(new RegExp(`^${a.name}`))).not.toBeInTheDocument();
  });
});
