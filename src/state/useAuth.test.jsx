import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const authMock = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
};
vi.mock('./supabaseClient.js', () => ({ supabase: { auth: authMock } }));
const { useAuth } = await import('./useAuth.js');

beforeEach(() => { vi.clearAllMocks(); authMock.getSession.mockResolvedValue({ data: { session: null } }); });

describe('useAuth', () => {
  it('starts null then loads the session user', async () => {
    authMock.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1', user_metadata: { full_name: 'Zed', avatar_url: 'a.png' } } } } });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.user).toEqual({ id: 'u1', name: 'Zed', avatarUrl: 'a.png' }));
  });
  it('signInWithDiscord calls OAuth with discord + redirectTo', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signInWithDiscord(); });
    expect(authMock.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'discord' }));
  });
});
