import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

afterEach(() => cleanup());

vi.mock('../state/useAuth.js', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Z' } }) }));
vi.mock('../state/gallery.js', () => ({
  listMyBuilds: vi.fn(() => Promise.resolve([{ id: 'a', name: 'My Rogue', base_class: 'rogue', visibility: 'public', like_count: 3, role: ['DPS'], content: [], build: {} }])),
  deleteBuild: vi.fn(),
  listFavorites: vi.fn(() => Promise.resolve([])),
}));

import * as gallery from '../state/gallery.js';
const { default: MyBuildsView } = await import('./MyBuildsView.jsx');

const favRow = { id: 'f1', name: 'Liked Build', base_class: 'rogue', role: ['DPS'], content: ['Boss'], like_count: 5, created_at: '2026-06-20T00:00:00Z', build: {} };

describe('MyBuildsView', () => {
  it('lists the user builds', async () => {
    render(<StoreProvider init={{ view: 'my-builds' }}><MyBuildsView /></StoreProvider>);
    await waitFor(() => expect(screen.getByText('My Rogue')).toBeInTheDocument());
  });
});

describe('MyBuildsView favorites', () => {
  it('shows a Favorites shelf of liked builds', async () => {
    gallery.listMyBuilds.mockResolvedValueOnce([]);
    gallery.listFavorites.mockResolvedValueOnce([favRow]);
    render(<StoreProvider init={{ view: 'my-builds' }}><MyBuildsView /></StoreProvider>);
    await waitFor(() => expect(screen.getByText(/favorites/i)).toBeInTheDocument());
    expect(screen.getByText('Liked Build')).toBeInTheDocument();
  });
});
