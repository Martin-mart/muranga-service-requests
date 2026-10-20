import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_TOKEN,
  CITIZEN_TOKEN,
  ORPHAN_TOKEN,
  REQUEST_ID,
  buildTestApp,
} from '../helpers/test-app.js';
import { AppError } from '../../src/utils/errors.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const validRequest = {
  categoryId: '3c0c2f0f-2b3c-4d4e-9f50-000000000001',
  subCountyId: '3c0c2f0f-2b3c-4d4e-9f50-000000000002',
  locationText: 'Kenol bus stage',
  description: 'Water pipe burst and flooding the road.',
  latitude: -0.9,
  longitude: 37.15,
};

describe('health probes', () => {
  it('GET /health is a cheap liveness check', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('GET /ready returns 503 when a dependency is down', async () => {
    const { app, services } = buildTestApp();
    services.health.readiness.mockResolvedValue({
      status: 'unavailable',
      instance: 't',
      uptimeSeconds: 1,
    });
    await request(app).get('/ready').expect(503);
  });
});

describe('authentication', () => {
  it('rejects requests without a bearer token', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/v1/me').expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects malformed and invalid tokens', async () => {
    const { app } = buildTestApp();
    await request(app).get('/api/v1/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
    await request(app).get('/api/v1/me').set(auth('aaa.unknown.sig')).expect(401);
  });

  it('rejects a valid token whose profile does not exist', async () => {
    const { app } = buildTestApp();
    await request(app).get('/api/v1/me').set(auth(ORPHAN_TOKEN)).expect(401);
  });

  it('returns the trusted profile role on /me', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/v1/me').set(auth(CITIZEN_TOKEN)).expect(200);
    expect(res.body.data.role).toBe('citizen');
  });
});

describe('role guard', () => {
  it('blocks citizens from admin routes', async () => {
    const { app, services } = buildTestApp();
    const res = await request(app)
      .get('/api/v1/admin/requests')
      .set(auth(CITIZEN_TOKEN))
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(services.adminRequests.list).not.toHaveBeenCalled();
  });

  it('allows admins and passes validated filters', async () => {
    const { app, services } = buildTestApp();
    services.adminRequests.list.mockResolvedValue({ items: [], nextCursor: null });
    await request(app)
      .get('/api/v1/admin/requests?status=pending&search=%3Cb%3Eburst%3C%2Fb%3E&limit=10')
      .set(auth(ADMIN_TOKEN))
      .expect(200);
    expect(services.adminRequests.list).toHaveBeenCalledWith(
      expect.anything(),
      { status: 'pending', search: 'burst' },
      { cursor: null, limit: 10 },
    );
  });

  it('blocks citizens from analytics', async () => {
    const { app } = buildTestApp();
    await request(app).get('/api/v1/admin/analytics').set(auth(CITIZEN_TOKEN)).expect(403);
  });
});

describe('validation', () => {
  it('returns 422 with field details for an invalid request', async () => {
    const { app, services } = buildTestApp();
    const res = await request(app)
      .post('/api/v1/requests')
      .set(auth(CITIZEN_TOKEN))
      .send({ ...validRequest, description: 'short', latitude: 10 })
      .expect(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['description', 'latitude']));
    expect(services.requests.create).not.toHaveBeenCalled();
  });

  it('rejects a non-uuid id parameter', async () => {
    const { app } = buildTestApp();
    await request(app).get('/api/v1/requests/1%20or%201=1').set(auth(CITIZEN_TOKEN)).expect(422);
  });

  it('rejects disallowed image types before touching storage', async () => {
    const { app, services } = buildTestApp();
    await request(app)
      .post(`/api/v1/requests/${REQUEST_ID}/image-upload-url`)
      .set(auth(CITIZEN_TOKEN))
      .send({ contentType: 'image/svg+xml', sizeBytes: 100 })
      .expect(422);
    expect(services.requests.createImageUpload).not.toHaveBeenCalled();
  });

  it('rejects a status transition back to pending', async () => {
    const { app } = buildTestApp();
    await request(app)
      .patch(`/api/v1/admin/requests/${REQUEST_ID}/status`)
      .set(auth(ADMIN_TOKEN))
      .send({ status: 'pending' })
      .expect(422);
  });

  it('rejects an invalid idempotency key', async () => {
    const { app } = buildTestApp();
    await request(app)
      .post('/api/v1/requests')
      .set(auth(CITIZEN_TOKEN))
      .set('Idempotency-Key', 'not-a-uuid')
      .send(validRequest)
      .expect(422);
  });
});

describe('service requests', () => {
  it('creates a request (201) and replays an idempotent retry (200)', async () => {
    const { app, services } = buildTestApp();
    services.requests.create
      .mockResolvedValueOnce({ request: { id: REQUEST_ID }, created: true })
      .mockResolvedValueOnce({ request: { id: REQUEST_ID }, created: false });
    const key = '0b8f2f5e-7a1c-4b9e-9d2a-5f3e8c1a2b3c';

    const first = await request(app)
      .post('/api/v1/requests')
      .set(auth(CITIZEN_TOKEN))
      .set('Idempotency-Key', key)
      .send(validRequest)
      .expect(201);
    expect(first.headers.location).toBe(`/api/v1/requests/${REQUEST_ID}`);
    await request(app)
      .post('/api/v1/requests')
      .set(auth(CITIZEN_TOKEN))
      .set('Idempotency-Key', key)
      .send(validRequest)
      .expect(200);
    expect(services.requests.create).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ locationText: 'Kenol bus stage' }),
      key,
    );
  });

  it('marks personal data as non-cacheable', async () => {
    const { app, services } = buildTestApp();
    services.requests.listOwn.mockResolvedValue({ items: [], nextCursor: null });
    const res = await request(app).get('/api/v1/requests').set(auth(CITIZEN_TOKEN)).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ data: [], page: { nextCursor: null } });
  });

  it('surfaces the database daily limit as 429', async () => {
    const { app, services } = buildTestApp();
    services.requests.create.mockRejectedValue(new AppError(429, 'DAILY_LIMIT_REACHED', 'limit'));
    const res = await request(app)
      .post('/api/v1/requests')
      .set(auth(CITIZEN_TOKEN))
      .send(validRequest)
      .expect(429);
    expect(res.body.error.code).toBe('DAILY_LIMIT_REACHED');
  });
});

describe('reference data caching', () => {
  it('sends Cache-Control and ETag, and answers 304 on revalidation', async () => {
    const { app, services } = buildTestApp();
    services.reference.categories.mockResolvedValue([
      { id: '1', slug: 'water', name: 'Water', description: null },
    ]);

    const first = await request(app).get('/api/v1/categories').expect(200);
    expect(first.headers['cache-control']).toContain('public, max-age=300');
    expect(first.headers.etag).toBeTruthy();

    await request(app)
      .get('/api/v1/categories')
      .set('If-None-Match', first.headers.etag as string)
      .expect(304);
  });
});

describe('rate limiting', () => {
  it('limits registration attempts per IP', async () => {
    const { app, services } = buildTestApp();
    services.auth.register.mockResolvedValue(undefined);
    const body = {
      email: 'w@example.org',
      password: 'Str0ngPassword',
      fullName: 'Wanjiru Kamau',
      captchaToken: 't',
    };

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/v1/auth/register').send(body).expect(202);
    }
    const res = await request(app).post('/api/v1/auth/register').send(body).expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers.ratelimit).toBeTruthy();
  });
});

describe('error handling and hardening', () => {
  it('never returns stack traces or internal messages', async () => {
    const { app, services } = buildTestApp();
    services.requests.listOwn.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432'));
    const res = await request(app).get('/api/v1/requests').set(auth(CITIZEN_TOKEN)).expect(500);
    expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
    expect(res.body.error).toEqual({
      code: 'INTERNAL',
      message: 'Something went wrong. Please try again later.',
      requestId: res.headers['x-request-id'],
    });
  });

  it('returns JSON 404 for unknown routes', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/api/v1/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects oversized bodies with 413', async () => {
    const { app } = buildTestApp();
    await request(app)
      .post('/api/v1/requests')
      .set(auth(CITIZEN_TOKEN))
      .send({ ...validRequest, description: 'x'.repeat(5000) })
      .expect(413);
  });

  it('rejects malformed JSON with 400', async () => {
    const { app } = buildTestApp();
    await request(app)
      .post('/api/v1/requests')
      .set(auth(CITIZEN_TOKEN))
      .set('Content-Type', 'application/json')
      .send('{"broken":')
      .expect(400);
  });

  it('enforces the CORS allowlist', async () => {
    const { app } = buildTestApp();
    const ok = await request(app)
      .get('/health')
      .set('Origin', 'https://app.example.org')
      .expect(200);
    expect(ok.headers['access-control-allow-origin']).toBe('https://app.example.org');
    await request(app).get('/health').set('Origin', 'https://evil.example').expect(403);
  });

  it('sets security headers', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toContain('max-age=63072000');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('replaces an unsafe incoming request id', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get('/health').set('X-Request-Id', '<script>alert(1)</script>');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
