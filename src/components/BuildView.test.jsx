import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BuildView from './BuildView.jsx';
import { StoreProvider } from '../state/store.jsx';

describe('BuildView', () => {
  it('prompts to pick a class when none selected', () => {
    render(<StoreProvider init={{ view: 'builds' }}><BuildView /></StoreProvider>);
    expect(screen.getByText(/pick a class/i)).toBeInTheDocument();
  });
  it('renders the base tree after selecting a class', () => {
    render(<StoreProvider init={{ view: 'builds', build: { baseClass: 'acolyte', advancedClass: null, levels: {} } }}><BuildView /></StoreProvider>);
    expect(screen.getByText(/BASE CLASS · Acolyte/i)).toBeInTheDocument();
  });
  it('renders the advanced tree when advanced is selected', () => {
    render(<StoreProvider init={{ view: 'builds', build: { baseClass: 'acolyte', advancedClass: 'priest', levels: {} } }}><BuildView /></StoreProvider>);
    expect(screen.getByText(/ADVANCED · Priest/i)).toBeInTheDocument();
  });
});
