import { describe, it, expect, vi, afterEach } from 'vitest';
import { genId, saveShare, loadShare } from './shortlink.js';

afterEach(() => vi.restoreAllMocks());

describe('shortlink', () => {
  it('genId makes an 8-char base62 id', () => {
    expect(genId()).toMatch(/^[A-Za-z0-9]{8}$/);
  });

  it('saveShare posts the payload and returns an id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    const id = await saveShare({ a: 1 });
    expect(id).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toMatchObject({ id, payload: { a: 1 } });
  });

  it('saveShare retries on a 409 id collision', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 409 })
      .mockResolvedValueOnce({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(saveShare({})).resolves.toMatch(/^[A-Za-z0-9]{8}$/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('saveShare throws on other errors so the caller can fall back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(saveShare({})).rejects.toThrow();
  });

  it('loadShare returns the payload, or null when missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ payload: { x: 1 } }] }));
    expect(await loadShare('abc')).toEqual({ x: 1 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    expect(await loadShare('nope')).toBeNull();
  });
});
