import { describe, it, expect, vi, beforeEach } from 'vitest';

const insert = vi.fn();
const order = vi.fn();
const eq = vi.fn();
const from = vi.fn();
vi.mock('./supabaseClient.js', () => ({ supabase: { from, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) } } }));
const { createBuild, listMyBuilds } = await import('./gallery.js');

beforeEach(() => { vi.clearAllMocks(); });

describe('gallery', () => {
  it('createBuild inserts the build + payload and returns an id', async () => {
    from.mockReturnValue({ insert: insert.mockResolvedValue({ error: null }) });
    const out = await createBuild({ name: 'My Rogue', description: 'x', role: ['DPS'], content: ['Endgame'], visibility: 'public',
      build: { baseClass: 'rogue', advancedClass: 'assassin', levels: {}, gearStages: [], attributes: {}, notes: '' } });
    expect(out.id).toMatch(/^[A-Za-z0-9]{8}$/);
    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({ name: 'My Rogue', base_class: 'rogue', advanced_class: 'assassin', visibility: 'public', role: ['DPS'] });
    expect(row.payload.baseClass).toBe('rogue');
  });
  it('listMyBuilds returns rows with sanitized build', async () => {
    order.mockResolvedValue({ data: [{ id: 'a', name: 'B', base_class: 'mage', visibility: 'private', payload: { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], attributes: {}, notes: '' } }], error: null });
    from.mockReturnValue({ select: () => ({ eq: () => ({ order }) }) });
    const list = await listMyBuilds();
    expect(list[0].id).toBe('a');
    expect(list[0].build.baseClass).toBe('mage');
  });
});
