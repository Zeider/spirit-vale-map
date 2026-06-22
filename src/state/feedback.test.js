import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendFeedback } from './feedback.js';

afterEach(() => vi.restoreAllMocks());

describe('sendFeedback', () => {
  it('posts the message + auto-captured context', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    await sendFeedback({ message: '  broken thing  ', type: 'bug' });
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(opts.method).toBe('POST');
    expect(body).toMatchObject({ message: 'broken thing', type: 'bug' }); // trimmed
    expect(typeof body.page_url).toBe('string');
    expect(typeof body.user_agent).toBe('string');
  });

  it('coerces an unknown type to "other"', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    await sendFeedback({ message: 'x', type: 'nonsense' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).type).toBe('other');
  });

  it('throws on a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(sendFeedback({ message: 'x', type: 'bug' })).rejects.toThrow();
  });
});
