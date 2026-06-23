import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- shared mock state ---
const calls = {};
const builder = () => {
  const b = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete']) {
    b[m] = vi.fn((...a) => { (calls[m] ||= []).push(a); return b; });
  }
  b.maybeSingle = vi.fn(() => Promise.resolve(b._single));
  b.then = (resolve) => resolve(b._result); // awaiting the chain resolves the list query
  return b;
};
let current;
const fromFn = vi.fn(() => current);
// Hoisted so likes tests can override per-test via mockResolvedValueOnce
const getUserMock = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } });
vi.mock('./supabaseClient.js', () => ({
  supabase: {
    from: fromFn,
    auth: { getUser: getUserMock },
  },
}));
vi.mock('./build-url.js', () => ({ sanitizeBuild: (p) => ({ sanitized: true, from: p }) }));
const { createBuild, listMyBuilds, listBuilds, getBuild } = await import('./gallery.js');

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(calls)) delete calls[k];
  fromFn.mockImplementation(() => current);
});

// --- Increment 1: createBuild / listMyBuilds ---
describe('gallery (increment 1)', () => {
  it('createBuild inserts the build + payload and returns an id', async () => {
    current = { insert: vi.fn().mockResolvedValue({ error: null }) };
    const out = await createBuild({
      name: 'My Rogue', description: 'x', role: ['DPS'], content: ['Endgame'], visibility: 'public',
      build: { baseClass: 'rogue', advancedClass: 'assassin', levels: {}, gearStages: [], attributes: {}, notes: '' },
    });
    expect(out.id).toMatch(/^[A-Za-z0-9]{8}$/);
    const row = current.insert.mock.calls[0][0];
    expect(row).toMatchObject({ name: 'My Rogue', base_class: 'rogue', advanced_class: 'assassin', visibility: 'public', role: ['DPS'] });
    expect(row.payload.baseClass).toBe('rogue');
  });
  it('listMyBuilds returns rows with sanitized build', async () => {
    const orderFn = vi.fn().mockResolvedValue({
      data: [{ id: 'a', name: 'B', base_class: 'mage', visibility: 'private', payload: { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], attributes: {}, notes: '' } }],
      error: null,
    });
    current = { select: () => ({ eq: () => ({ order: orderFn }) }) };
    const list = await listMyBuilds();
    expect(list[0].id).toBe('a');
    expect(list[0].build.from.baseClass).toBe('mage');
  });
});

// --- Increment 2: listBuilds / getBuild ---
describe('listBuilds', () => {
  it('queries public non-hidden builds, newest first, capped, and sanitizes payloads', async () => {
    current = builder();
    current._result = { data: [{ id: 'a1', payload: { x: 1 } }], error: null };
    const out = await listBuilds();
    expect(calls.eq).toEqual(expect.arrayContaining([['visibility', 'public'], ['hidden', false]]));
    expect(calls.order[0]).toEqual(['created_at', { ascending: false }]);
    expect(calls.limit[0]).toEqual([200]);
    expect(out[0].build).toEqual({ sanitized: true, from: { x: 1 } });
  });
  it('throws on supabase error', async () => {
    current = builder();
    current._result = { data: null, error: { message: 'boom' } };
    await expect(listBuilds()).rejects.toBeTruthy();
  });
});

describe('getBuild', () => {
  it('fetches one build by id and sanitizes it', async () => {
    current = builder();
    current._single = { data: { id: 'zz', payload: { y: 2 } }, error: null };
    const out = await getBuild('zz');
    expect(calls.eq[0]).toEqual(['id', 'zz']);
    expect(out.build).toEqual({ sanitized: true, from: { y: 2 } });
  });
  it('returns null when not found', async () => {
    current = builder();
    current._single = { data: null, error: null };
    expect(await getBuild('nope')).toBeNull();
  });
});

// --- Increment 3: toggleLike / hasLiked / listFavorites ---
const { toggleLike, hasLiked, listFavorites } = await import('./gallery.js');

describe('likes', () => {
  it('toggleLike inserts when not yet liked, returns liked:true', async () => {
    // Set up two different from() responses: first call = select (check existing), second = insert
    // Use a stateful from that returns a chain supporting maybeSingle (no like found) then insert
    const insertFn = vi.fn(() => Promise.resolve({ error: null }));
    const selChain = {
      eq: vi.fn(function () { return this; }),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
    };
    fromFn.mockImplementation(() => ({ select: vi.fn(() => selChain), insert: insertFn, delete: vi.fn() }));
    const result = await toggleLike('b1');
    expect(result).toEqual({ liked: true });
    expect(insertFn).toHaveBeenCalledWith({ build_id: 'b1', user_id: 'u1' });
  });

  it('toggleLike deletes (scoped by build_id + user_id) when already liked, returns liked:false', async () => {
    const eqFn = vi.fn(function () { return this; });
    const delChain = { eq: eqFn, then: (r) => r({ error: null }) };
    const deleteFn = vi.fn(() => delChain);
    const selChain = {
      eq: vi.fn(function () { return this; }),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { build_id: 'b1' } })),
    };
    fromFn.mockImplementation(() => ({ select: vi.fn(() => selChain), delete: deleteFn, insert: vi.fn() }));
    const result = await toggleLike('b1');
    expect(result).toEqual({ liked: false });
    expect(deleteFn).toHaveBeenCalled();
    expect(eqFn).toHaveBeenCalledWith('build_id', 'b1'); // delete scoped to this build…
    expect(eqFn).toHaveBeenCalledWith('user_id', 'u1');  // …and this user only
  });

  it('toggleLike throws when signed out', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    await expect(toggleLike('b1')).rejects.toThrow(/not signed in/i);
  });

  it('hasLiked returns false when signed out', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    expect(await hasLiked('b1')).toBe(false);
  });

  it("listFavorites maps the user's liked builds through rowToBuild", async () => {
    const likeChain = { eq: vi.fn(() => Promise.resolve({ data: [{ build_id: 'b1' }, { build_id: 'b2' }] })) };
    const inFn = vi.fn(() => Promise.resolve({ data: [{ id: 'b1', payload: { z: 1 } }], error: null }));
    const buildsChain = { in: inFn };
    fromFn.mockImplementation((t) =>
      t === 'build_likes'
        ? { select: vi.fn(() => likeChain) }
        : { select: vi.fn(() => buildsChain) }
    );
    const favs = await listFavorites();
    expect(favs[0].build).toEqual({ sanitized: true, from: { z: 1 } });
  });
});
