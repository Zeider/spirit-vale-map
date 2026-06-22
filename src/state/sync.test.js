import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('./supabaseClient.js', () => ({ supabase: { auth: {} } }));
const { loadInitialState } = await import('./sync.js');

const setUrl = (search) => { window.history.replaceState(null, '', `/${search}`); };
beforeEach(() => { localStorage.clear(); });

describe('loadInitialState routing', () => {
  it('reads the gallery list view', () => {
    setUrl('?view=builds');
    const s = loadInitialState();
    expect(s.view).toBe('builds');
    expect(s.galleryBuildId).toBeNull();
  });
  it('reads a gallery detail id', () => {
    setUrl('?view=builds&b=Abc12345');
    const s = loadInitialState();
    expect(s.view).toBe('builds');
    expect(s.galleryBuildId).toBe('Abc12345');
  });
});
