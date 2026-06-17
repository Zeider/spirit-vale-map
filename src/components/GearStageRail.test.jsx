import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GearStageRail from './GearStageRail.jsx';
import { StoreProvider } from '../state/store.jsx';

const withBuild = (gearStages = []) => ({
  view: 'build', selectedStage: 0,
  build: { baseClass: 'rogue', advancedClass: null, levels: {}, gearStages, notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } },
});

function addCap(value) {
  fireEvent.click(screen.getByRole('button', { name: /add stage/i }));
  const input = screen.getByRole('spinbutton');
  fireEvent.change(input, { target: { value: String(value) } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('GearStageRail', () => {
  it('first cap entry yields Lv 1–N', () => {
    render(<StoreProvider init={withBuild()}><GearStageRail /></StoreProvider>);
    addCap(10);
    expect(screen.getByText(/Lv 1[–-]/)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
  it('second cap chains from the first', () => {
    render(<StoreProvider init={withBuild([{ toLevel: 10, changes: {} }])}><GearStageRail /></StoreProvider>);
    addCap(25);
    expect(screen.getByText(/Lv 11[–-]/)).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });
  it('rejects a cap at or below the previous band with a hint', () => {
    render(<StoreProvider init={withBuild([{ toLevel: 10, changes: {} }])}><GearStageRail /></StoreProvider>);
    addCap(5);
    expect(screen.getByText(/must be ≥ 11/i)).toBeInTheDocument();
    // still only one band (cap 10)
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });
  it('removing a band re-chains the next one', () => {
    render(<StoreProvider init={withBuild([{ toLevel: 10, changes: {} }, { toLevel: 25, changes: {} }])}><GearStageRail /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /remove stage Lv 1[–-]10/i }));
    expect(screen.getByText(/Lv 1[–-]/)).toBeInTheDocument(); // the 25 band now starts at 1
  });
  it('click-to-edit a cap updates the band', () => {
    render(<StoreProvider init={withBuild([{ toLevel: 10, changes: {} }])}><GearStageRail /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: '10' })); // the cap number
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });
  it('clamps an out-of-range cap edit (reducer clampCap defends)', () => {
    render(<StoreProvider init={withBuild([{ toLevel: 10, changes: {} }, { toLevel: 25, changes: {} }])}><GearStageRail /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: '10' })); // edit first band's cap
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '99' } }); // above the next band (25) -> clamps to 24
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('24')).toBeInTheDocument();
  });
});
