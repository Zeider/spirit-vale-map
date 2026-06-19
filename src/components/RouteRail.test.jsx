import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteRail from './RouteRail.jsx';
import { StoreProvider } from '../state/store.jsx';

describe('RouteRail', () => {
  it('shows an empty hint with no route', () => {
    render(<StoreProvider><RouteRail /></StoreProvider>);
    expect(screen.getByText(/no zones yet/i)).toBeInTheDocument();
  });
  it('expands a zone to show notes + wants', () => {
    render(<StoreProvider init={{ route: [{ id: 'swamp', notes: 'farm', wants: ['abyss-shard'] }] }}><RouteRail /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /^expand swamp$/i }));
    expect(screen.getByDisplayValue('farm')).toBeInTheDocument();
    expect(screen.getAllByText(/Abyss Shard/i).length).toBeGreaterThan(0);
  });
  it('adds a gear stage from the route rail without leaving the view', () => {
    render(<StoreProvider><RouteRail /></StoreProvider>);
    expect(screen.getByText(/no gear stages yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add gear stage/i }));
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Lv 1–15')).toBeInTheDocument();
  });
});
