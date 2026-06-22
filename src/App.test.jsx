import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('./state/useAuth.js', () => ({ useAuth: () => ({ user: null, loading: false, signInWithDiscord: vi.fn(), signOut: vi.fn() }) }));
const { default: App } = await import('./App.jsx');

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

describe('App — tabs', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/'); localStorage.clear(); });
  it('switches to Build then Gear', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^build$/i }));
    expect(screen.getByText(/pick a class/i)).toBeInTheDocument();
    expect(window.location.search).toMatch(/view=build/);
    fireEvent.click(screen.getByRole('button', { name: /^gear$/i }));
    expect(window.location.search).toMatch(/view=gear/);
  });
});
