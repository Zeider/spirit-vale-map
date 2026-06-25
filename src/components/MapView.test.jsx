import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MapView from './MapView.jsx';
import { StoreProvider } from '../state/store.jsx';

function renderWithStore(init) {
  return render(<StoreProvider init={init}><MapView /></StoreProvider>);
}

describe('MapView', () => {
  it('renders a hotspot button per sub-zone that has coordinates', () => {
    renderWithStore();
    // Same-named tiles are disambiguated by level band; target one explicitly.
    expect(screen.getByRole('button', { name: /Forest Labyrinth level 6 to 10/i })).toBeInTheDocument();
  });
  it('dispatches select on hotspot click', () => {
    renderWithStore();
    const btn = screen.getAllByRole('button')[0];
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed');
  });
  it('draws a faint full-route line + a solid progress line up to the player level', () => {
    const route = [{ id: 'forest-field-1', notes: '', wants: [] }, { id: 'sunny-meadows-2-6', notes: '', wants: [] }, { id: 'forest-field-1-11', notes: '', wants: [] }];
    const { container } = renderWithStore({ route, playerLevel: 8 }); // reaches Lv1-5 + Lv6-10, not Lv11-15
    const phantom = container.querySelector('polyline.phantom');
    const progress = container.querySelector('polyline.progress');
    expect(phantom.getAttribute('points').trim().split(' ').length).toBe(3); // all 3 zones
    expect(progress.getAttribute('points').trim().split(' ').length).toBe(2); // first two reached
  });
  it('extends the progress line to an open route tab beyond the player level', () => {
    const route = [{ id: 'forest-field-1', notes: '', wants: [] }, { id: 'sunny-meadows-2-6', notes: '', wants: [] }, { id: 'forest-field-1-11', notes: '', wants: [] }];
    const { container } = renderWithStore({ route, playerLevel: 1, openRouteId: 'forest-field-1-11' }); // tab on the 3rd zone
    expect(container.querySelector('polyline.progress').getAttribute('points').trim().split(' ').length).toBe(3);
  });
  it('highlights the open route entry tile with .route-open', () => {
    const { container } = renderWithStore({ openRouteId: 'cemetery' });
    const open = container.querySelectorAll('.hotspot.route-open');
    expect(open.length).toBe(1);
    expect(open[0].getAttribute('title')).toMatch(/Festering Woods 1/);
  });
});
