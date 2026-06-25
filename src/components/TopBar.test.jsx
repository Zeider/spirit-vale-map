import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreProvider, useStore } from '../state/store.jsx';

vi.mock('../state/useAuth.js', () => ({ useAuth: () => ({ user: { id: 'u1' }, loading: false, signInWithDiscord: vi.fn(), signOut: vi.fn() }) }));
const updateBuild = vi.fn().mockResolvedValue(undefined);
vi.mock('../state/gallery.js', () => ({ updateBuild, createBuild: vi.fn() }));
const { default: TopBar } = await import('./TopBar.jsx');

function Probe() {
  const { state } = useStore();
  return <output data-testid="lvl">{state.playerLevel}-{state.dropFilter}</output>;
}

describe('TopBar', () => {
  it('updates player level', () => {
    render(<StoreProvider><TopBar /><Probe /></StoreProvider>);
    fireEvent.change(screen.getByLabelText(/level/i), { target: { value: '50' } });
    expect(screen.getByTestId('lvl').textContent).toBe('50-all');
  });
  it('updates drop filter', () => {
    render(<StoreProvider><TopBar /><Probe /></StoreProvider>);
    fireEvent.change(screen.getByLabelText(/filter/i), { target: { value: 'gem' } });
    expect(screen.getByTestId('lvl').textContent).toBe('1-gem');
  });
  it('when editing a published build: shows "Update build", relabels Publish, opens the edit modal and saves build+route+metadata in place', async () => {
    const build = { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: {} };
    const route = [{ id: 'cemetery', notes: '', wants: [] }];
    const editingMeta = { name: 'My Build', description: '', role: ['DPS'], content: [], visibility: 'public' };
    render(<StoreProvider init={{ view: 'gear', editingBuildId: 'bid1', editingMeta, build, route }}><TopBar /></StoreProvider>);
    expect(screen.getByText('Publish as new')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /update build/i }));
    // opens the edit modal pre-filled; saving writes name/tags + payload back in place
    fireEvent.click(await screen.findByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updateBuild).toHaveBeenCalledWith('bid1',
      expect.objectContaining({ name: 'My Build', role: ['DPS'], base_class: 'mage', payload: { build, route } })));
  });
  it('hides the Update button when not editing', () => {
    render(<StoreProvider init={{ view: 'gear', build: { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: {} } }}><TopBar /></StoreProvider>);
    expect(screen.queryByRole('button', { name: /update build/i })).toBeNull();
    expect(screen.getByText('Publish')).toBeInTheDocument();
  });
});
