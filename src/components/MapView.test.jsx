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
    expect(screen.getByRole('button', { name: /Forest Labyrinth/i })).toBeInTheDocument();
  });
  it('dispatches select on hotspot click', () => {
    renderWithStore();
    const btn = screen.getAllByRole('button')[0];
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed');
  });
});
