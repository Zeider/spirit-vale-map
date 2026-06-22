import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

vi.mock('../state/useAuth.js', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Z' } }) }));
const listMyBuilds = vi.fn().mockResolvedValue([{ id: 'a', name: 'My Rogue', base_class: 'rogue', visibility: 'public', like_count: 3, role: ['DPS'], content: [], build: {} }]);
vi.mock('../state/gallery.js', () => ({ listMyBuilds, deleteBuild: vi.fn() }));
const { default: MyBuildsView } = await import('./MyBuildsView.jsx');

describe('MyBuildsView', () => {
  it('lists the user builds', async () => {
    render(<StoreProvider init={{ view: 'my-builds' }}><MyBuildsView /></StoreProvider>);
    await waitFor(() => expect(screen.getByText('My Rogue')).toBeInTheDocument());
  });
});
