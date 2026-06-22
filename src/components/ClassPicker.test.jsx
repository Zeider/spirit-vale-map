import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClassPicker from './ClassPicker.jsx';
import { StoreProvider, useStore } from '../state/store.jsx';

function Probe() {
  const { state } = useStore();
  return <output data-testid="cls">{String(state.build.baseClass)}|{Object.keys(state.build.levels).length}</output>;
}

const withBuild = (build) => ({
  view: 'build',
  build: { advancedClass: null, notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, ...build },
});

afterEach(() => vi.restoreAllMocks());

describe('ClassPicker class-change guard', () => {
  it('switches freely when the build is empty (no confirm)', () => {
    const spy = vi.spyOn(window, 'confirm');
    render(<StoreProvider init={withBuild({ baseClass: null, levels: {}, gearStages: [] })}><ClassPicker /><Probe /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Mage' }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByTestId('cls').textContent).toBe('mage|0');
  });
  it('cancelling the confirm keeps the existing build', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<StoreProvider init={withBuild({ baseClass: 'rogue', levels: { x: 5 }, gearStages: [] })}><ClassPicker /><Probe /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Mage' }));
    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByTestId('cls').textContent).toBe('rogue|1'); // unchanged
  });
  it('accepting the confirm switches + wipes the build', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<StoreProvider init={withBuild({ baseClass: 'rogue', levels: { x: 5 }, gearStages: [] })}><ClassPicker /><Probe /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Mage' }));
    expect(screen.getByTestId('cls').textContent).toBe('mage|0');
  });
});
