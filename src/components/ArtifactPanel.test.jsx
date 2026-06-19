import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArtifactPanel from './ArtifactPanel.jsx';
import { StoreProvider } from '../state/store.jsx';
import { artifacts } from '../data/gear-index.js';

const init = (gearStages = [{ toLevel: 10, changes: {} }]) => ({
  view: 'gear', selectedStage: 0,
  build: { baseClass: 'rogue', advancedClass: null, levels: {}, notes: '',
    attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, gearStages },
});

describe('ArtifactPanel', () => {
  it('renders the four typed slots', () => {
    render(<StoreProvider init={init()}><ArtifactPanel /></StoreProvider>);
    for (const t of ['Rune', 'Jewel', 'Scroll', 'Relic']) expect(screen.getByText(t)).toBeInTheDocument();
  });
  it('opens a set picker from a slot', () => {
    render(<StoreProvider init={init()}><ArtifactPanel /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /pick rune set/i }));
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getAllByText(artifacts[0].name).length).toBeGreaterThan(0);
  });
});
