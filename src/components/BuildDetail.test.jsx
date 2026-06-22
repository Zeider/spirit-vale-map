import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreProvider, useStore } from '../state/store.jsx';

const found = { id: 'b1', name: 'Frost Mage', base_class: 'mage', advanced_class: null, role: ['DPS'], content: ['Endgame'],
  description: 'aoe nuke', like_count: 3, created_at: '2026-06-21T00:00:00Z',
  build: { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } } };
const getBuild = vi.fn();
vi.mock('../state/gallery.js', () => ({ getBuild }));
const { default: BuildDetail } = await import('./BuildDetail.jsx');

function Probe() { const { state } = useStore(); return <div data-testid="view">{state.view}</div>; }
const renderD = (id) => render(
  <StoreProvider init={{ view: 'builds', galleryBuildId: id }}><BuildDetail /><Probe /></StoreProvider>
);

describe('BuildDetail', () => {
  it('renders the build header and copies into the planner', async () => {
    getBuild.mockResolvedValueOnce(found);
    renderD('b1');
    await screen.findByText('Frost Mage');
    expect(screen.getByText('aoe nuke')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /copy to my planner/i }));
    await waitFor(() => expect(screen.getByTestId('view').textContent).toBe('gear'));
  });
  it('shows a not-found state for missing/private builds', async () => {
    getBuild.mockResolvedValueOnce(null);
    renderD('gone');
    await screen.findByText(/not found or private/i);
  });
});
