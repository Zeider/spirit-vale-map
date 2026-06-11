import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from './TopBar.jsx';
import { StoreProvider, useStore } from '../state/store.jsx';

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
});
