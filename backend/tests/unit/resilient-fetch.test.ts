import { afterEach, describe, expect, it, vi } from 'vitest';
import { createResilientFetch } from '../../src/utils/resilient-fetch.js';

const options = { timeoutMs: 1000, retries: 2, baseDelayMs: 1 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createResilientFetch', () => {
  it('retries idempotent GETs on 503 and returns the eventual success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await createResilientFetch(options)('https://x.test/rest');
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries writes (they may already have been committed)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await createResilientFetch(options)('https://x.test/rest', { method: 'POST' });
    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after the configured retries on network errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('socket hang up'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(createResilientFetch(options)('https://x.test/rest')).rejects.toThrow(
      'socket hang up',
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
