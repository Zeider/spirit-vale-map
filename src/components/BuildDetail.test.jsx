import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreProvider, useStore } from '../state/store.jsx';

const found = { id: 'b1', name: 'Frost Mage', base_class: 'mage', advanced_class: null, role: ['DPS'], content: ['Endgame'],
  description: 'aoe nuke', like_count: 3, created_at: '2026-06-21T00:00:00Z',
  build: { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } } };
const getBuild = vi.fn();
const hasLiked = vi.fn(() => Promise.resolve(false));
const toggleLike = vi.fn();
vi.mock('../state/gallery.js', () => ({ getBuild, hasLiked, toggleLike }));

let useAuthValue = { user: { id: 'u1' }, signInWithDiscord: vi.fn() };
vi.mock('../state/useAuth.js', () => ({ useAuth: () => useAuthValue }));

const { default: BuildDetail } = await import('./BuildDetail.jsx');

function Probe() { const { state } = useStore(); return <div data-testid="view">{state.view}</div>; }
const renderD = (id) => render(
  <StoreProvider init={{ view: 'builds', galleryBuildId: id }}><BuildDetail /><Probe /></StoreProvider>
);

beforeEach(() => {
  useAuthValue = { user: { id: 'u1' }, signInWithDiscord: vi.fn() };
  hasLiked.mockImplementation(() => Promise.resolve(false));
  toggleLike.mockReset();
});

describe('BuildDetail', () => {
  it('renders the build header and copies into the planner', async () => {
    getBuild.mockResolvedValueOnce(found);
    renderD('b1');
    await screen.findByText('Frost Mage');
    expect(screen.getByText('aoe nuke')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /open levelling route/i }));
    await waitFor(() => expect(screen.getByTestId('view').textContent).toBe('atlas'));
  });
  it('shows a not-found state for missing/private builds', async () => {
    getBuild.mockResolvedValueOnce(null);
    renderD('gone');
    await screen.findByText(/not found or private/i);
  });
  it('likes a build optimistically when signed in', async () => {
    hasLiked.mockResolvedValueOnce(false);
    toggleLike.mockResolvedValueOnce({ liked: true });
    getBuild.mockResolvedValueOnce({ ...found, like_count: 3 });
    renderD('b1');
    const likeBtn = await screen.findByRole('button', { name: /like/i });
    expect(likeBtn).toHaveTextContent('3');
    fireEvent.click(likeBtn);
    await waitFor(() => expect(likeBtn).toHaveTextContent('4')); // optimistic +1
    expect(toggleLike).toHaveBeenCalledWith('b1');
  });
  it('prompts sign-in when a signed-out user clicks like', async () => {
    useAuthValue = { user: null, signInWithDiscord: vi.fn() };
    getBuild.mockResolvedValueOnce({ ...found, like_count: 0 });
    renderD('b1');
    const likeBtn = await screen.findByRole('button', { name: /like/i });
    fireEvent.click(likeBtn);
    expect(useAuthValue.signInWithDiscord).toHaveBeenCalled();
    expect(toggleLike).not.toHaveBeenCalled();
  });
});
