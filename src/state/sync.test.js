import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('./supabaseClient.js', () => ({ supabase: { auth: {} } }));
const { loadInitialState } = await import('./sync.js');
const { encodeRoute } = await import('./route-url.js');

const setUrl = (rel) => { window.history.replaceState(null, '', `/${rel}`); };
beforeEach(() => { localStorage.clear(); setUrl(''); });

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
  it('reads lvl + route from the hash (new self-contained links)', () => {
    const r = encodeRoute([{ id: 'cemetery', notes: '', wants: [] }]);
    setUrl(`#lvl=42&route=${r}`);
    const s = loadInitialState();
    expect(s.playerLevel).toBe(42);
    expect(s.route.map((e) => e.id)).toEqual(['cemetery']);
  });
  it('still reads lvl + route from the query string (old links, back-compat)', () => {
    const r = encodeRoute([{ id: 'cemetery', notes: '', wants: [] }]);
    setUrl(`?lvl=7&route=${r}`);
    const s = loadInitialState();
    expect(s.playerLevel).toBe(7);
    expect(s.route.map((e) => e.id)).toEqual(['cemetery']);
  });
});
