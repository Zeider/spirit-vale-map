import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GearEditorOverlay from './GearEditorOverlay.jsx';
import RouteRail from './RouteRail.jsx';
import { StoreProvider } from '../state/store.jsx';

const build = {
  baseClass: 'rogue', advancedClass: null, levels: {}, gearStages: [{ toLevel: 10, changes: {} }],
  notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
};

describe('GearEditorOverlay', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<StoreProvider init={{ gearOverlay: false, build }}><GearEditorOverlay /></StoreProvider>);
    expect(container).toBeEmptyDOMElement();
  });
  it('renders the gear workbench when open', () => {
    render(<StoreProvider init={{ gearOverlay: true, selectedStage: 0, build }}><GearEditorOverlay /></StoreProvider>);
    expect(screen.getByRole('heading', { name: 'Gear' })).toBeInTheDocument();
    expect(screen.getAllByTestId('gear-slot')).toHaveLength(10);
  });
  it('opens from a route-rail stage chip without leaving the atlas', () => {
    render(<StoreProvider init={{ view: 'atlas', selectedStage: 0, build }}><RouteRail /><GearEditorOverlay /></StoreProvider>);
    expect(screen.queryByRole('heading', { name: 'Gear' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Lv 1[–-]10/ }));
    expect(screen.getByRole('heading', { name: 'Gear' })).toBeInTheDocument();
  });
});
