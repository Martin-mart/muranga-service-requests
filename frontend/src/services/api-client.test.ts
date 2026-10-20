import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('./supabase', () => ({ getAccessToken: vi.fn(() => Promise.resolve('jwt-token')) }));

const { apiRequest, ApiError } = await import('./api-client');

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('apiRequest', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('sends the bearer token, versioned path and query, and validates the response', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { ok: true } }));
    const result = await apiRequest('/requests', {
      query: { cursor: null, limit: 10, search: '' },
      schema: z.object({ data: z.object({ ok: z.boolean() }) }),
    });
    expect(result.data.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test.local/api/v1/requests?limit=10');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token');
  });

  it('omits the token on public endpoints', async () => {
    fetchMock.mockResolvedValue(json(200, { data: [] }));
    await apiRequest('/categories', {
      authenticated: false,
      schema: z.object({ data: z.array(z.unknown()) }),
    });
    expect(
      (fetchMock.mock.calls[0]![1]?.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it('turns the error envelope into an ApiError with field details', async () => {
    fetchMock.mockResolvedValue(
      json(422, {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Some fields are invalid',
          requestId: 'r1',
          details: [{ path: 'description', message: 'Too short' }],
        },
      }),
    );
    const error = await apiRequest('/requests', {
      method: 'POST',
      body: {},
      schema: z.unknown(),
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_FAILED', requestId: 'r1' });
    expect((error as InstanceType<typeof ApiError>).details[0]?.path).toBe('description');
  });

  it('reports network failures as status 0 so callers can queue offline work', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = await apiRequest('/requests', { schema: z.unknown() }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).isNetworkError).toBe(true);
  });

  it('rejects responses that break the contract', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { unexpected: 1 } }));
    await expect(
      apiRequest('/me', { schema: z.object({ data: z.object({ id: z.string() }) }) }),
    ).rejects.toMatchObject({
      code: 'CONTRACT_MISMATCH',
    });
  });
});
