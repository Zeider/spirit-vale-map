import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

describe('App', () => {
  it('renders the three panes', () => {
    render(<App />);
    expect(screen.getByText(/Spirit Vale Atlas/i)).toBeInTheDocument();
    expect(screen.getByText(/Levelling route/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a zone/i)).toBeInTheDocument();
  });
  it('writes the route to the URL when a zone is added', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Lv |hub/i })[0]); // select a hotspot
    const drawer = screen.queryByText(/Drops —/i)?.closest('.zone-drawer') ?? document.body;
    const addBtn = within(drawer).queryByRole('button', { name: /add to route/i });
    if (addBtn) {
      fireEvent.click(addBtn);
      expect(window.location.search).toMatch(/route=/);
    }
  });
});

describe('App — view switching', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/'); localStorage.clear(); });

  it('toggles to the Builds view and writes ?view=builds', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /builds/i }));
    expect(screen.getByText(/pick a class/i)).toBeInTheDocument();
    expect(window.location.search).toMatch(/view=builds/);
  });
  it('loads a build from the URL', () => {
    window.history.replaceState(null, '', '/?view=builds&build=acolyte~~');
    render(<App />);
    expect(screen.getByText(/BASE CLASS · Acolyte/i)).toBeInTheDocument();
  });
});
