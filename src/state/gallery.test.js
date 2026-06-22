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
vi.mock('./supabaseClient.js', () => ({
  supabase: {
    from: fromFn,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
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
