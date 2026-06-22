import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

const rows = [
  { id: 'm', name: 'Frost Mage', base_class: 'mage', role: ['DPS'], content: ['Endgame'], like_count: 1, created_at: '2026-06-01T00:00:00Z', featured: true },
  { id: 'k', name: 'Holy Tank', base_class: 'knight', role: ['Tank'], content: ['Boss'], like_count: 9, created_at: '2026-06-10T00:00:00Z', featured: false },
];
vi.mock('../state/gallery.js', () => ({ listBuilds: vi.fn(() => Promise.resolve(rows)) }));
const { default: GalleryView } = await import('./GalleryView.jsx');

const renderG = () => render(<StoreProvider init={{ view: 'builds' }}><GalleryView /></StoreProvider>);

describe('GalleryView', () => {
  it('lists builds and a featured shelf, and filters by search', async () => {
    renderG();
    await screen.findByText('Holy Tank');
    expect(screen.getByText(/featured/i)).toBeInTheDocument();
    expect(screen.getAllByText('Frost Mage').length).toBeGreaterThan(0); // shelf + grid
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'tank' } });
    await waitFor(() => expect(screen.queryByRole('button', { name: /open Frost Mage/i })).toBeNull());
    expect(screen.getByRole('button', { name: /open Holy Tank/i })).toBeInTheDocument();
  });
});
