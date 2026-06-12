import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuildTab from './BuildTab.jsx';
import { StoreProvider } from '../state/store.jsx';

describe('BuildTab', () => {
  it('prompts to pick a class', () => {
    render(<StoreProvider init={{ view: 'build' }}><BuildTab /></StoreProvider>);
    expect(screen.getByText(/pick a class/i)).toBeInTheDocument();
  });
  it('renders the base tree + build notes after a class is picked', () => {
    render(<StoreProvider init={{ view: 'build', build: { baseClass: 'acolyte', advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } } }}><BuildTab /></StoreProvider>);
    expect(screen.getByText(/BASE CLASS · Acolyte/i)).toBeInTheDocument();
    expect(screen.getByText(/build notes/i)).toBeInTheDocument();
  });
});
