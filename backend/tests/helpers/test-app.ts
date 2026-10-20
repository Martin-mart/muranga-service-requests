import type { SupabaseClient } from '@supabase/supabase-js';
import { pino } from 'pino';
import { vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { createAuthenticate } from '../../src/middleware/authenticate.js';
import { createRateLimiters } from '../../src/middleware/rate-limit.js';
import type { Profile } from '../../src/models/user.js';
import type { Services } from '../../src/services/index.js';
import { unauthenticated } from '../../src/utils/errors.js';

export const CITIZEN_ID = '2b9b1f9e-1a2b-4c3d-8e4f-111111111111';
export const ADMIN_ID = '2b9b1f9e-1a2b-4c3d-8e4f-222222222222';
export const REQUEST_ID = '3c0c2f0f-2b3c-4d4e-9f50-333333333333';

// Syntactically valid JWT shapes; the fake verifier maps them to identities.
export const CITIZEN_TOKEN = 'aaa.citizen.sig';
export const ADMIN_TOKEN = 'aaa.admin.sig';
export const ORPHAN_TOKEN = 'aaa.orphan.sig';

const profiles: Record<string, Profile> = {
  [CITIZEN_ID]: {
    id: CITIZEN_ID,
    fullName: 'Wanjiru Kamau',
    phone: null,
    role: 'citizen',
    createdAt: '2026-01-01T00:00:00+00:00',
  },
  [ADMIN_ID]: {
    id: ADMIN_ID,
    fullName: 'County Officer',
    phone: null,
    role: 'admin',
    createdAt: '2026-01-01T00:00:00+00:00',
  },
};

const tokenToUser: Record<string, string> = {
  [CITIZEN_TOKEN]: CITIZEN_ID,
  [ADMIN_TOKEN]: ADMIN_ID,
  [ORPHAN_TOKEN]: '2b9b1f9e-1a2b-4c3d-8e4f-999999999999',
};

/** Every service method is a vi.fn so tests can stub exactly what they need. */
export function createServiceMocks() {
  return {
    auth: { register: vi.fn(), me: vi.fn((user: unknown) => user) },
    reference: { categories: vi.fn(), subCounties: vi.fn() },
    requests: { create: vi.fn(), listOwn: vi.fn(), getView: vi.fn(), createImageUpload: vi.fn() },
    adminRequests: { list: vi.fn(), changeStatus: vi.fn() },
    comments: { list: vi.fn(), create: vi.fn() },
    notifications: { list: vi.fn(), markRead: vi.fn() },
    analytics: { get: vi.fn() },
    health: {
      liveness: vi.fn(() => ({ status: 'ok', instance: 'test', uptimeSeconds: 1 })),
      readiness: vi.fn(),
    },
  };
}

export type ServiceMocks = ReturnType<typeof createServiceMocks>;

export function buildTestApp(services: ServiceMocks = createServiceMocks()) {
  const authenticate = createAuthenticate({
    verifier: {
      verify: (token) => {
        const userId = tokenToUser[token];
        return userId
          ? Promise.resolve({ userId, email: `${userId}@test.local` })
          : Promise.reject(
              unauthenticated('Your session is invalid or has expired. Please sign in again.'),
            );
      },
    },
    supabase: { forUser: () => ({}) as SupabaseClient },
    profiles: { findById: (_db, id) => Promise.resolve(profiles[id] ?? null) },
  });

  const app = createApp({
    env: { CORS_ORIGINS: ['https://app.example.org'], BODY_LIMIT: '1kb', TRUST_PROXY_HOPS: 0 },
    logger: pino({ level: 'silent' }),
    services: services as unknown as Services,
    authenticate,
    rateLimiters: createRateLimiters(() => undefined),
  });

  return { app, services };
}
