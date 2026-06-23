import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';

const signInWithDiscord = vi.fn();
vi.mock('../state/useAuth.js', () => ({ useAuth: () => ({ user: null, loading: false, signInWithDiscord, signOut: vi.fn() }) }));
const { default: AuthButton } = await import('./AuthButton.jsx');

describe('AuthButton', () => {
  it('signed out: shows Discord sign-in and calls it', () => {
    render(<StoreProvider><AuthButton /></StoreProvider>);
    fireEvent.click(screen.getByRole('button', { name: /discord/i }));
    expect(signInWithDiscord).toHaveBeenCalled();
  });
});
