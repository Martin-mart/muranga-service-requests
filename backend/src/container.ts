import { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { AppDeps } from './app.js';
import type { Env } from './config/env.js';
import { createSupabaseFactory } from './config/supabase.js';
import { createAuthenticate } from './middleware/authenticate.js';
import { createRateLimiters, type StoreFactory } from './middleware/rate-limit.js';
import { analyticsRepository } from './repositories/analytics.repository.js';
import { authRepository } from './repositories/auth.repository.js';
import { commentRepository } from './repositories/comment.repository.js';
import { healthRepository } from './repositories/health.repository.js';
import { notificationRepository } from './repositories/notification.repository.js';
import { profileRepository } from './repositories/profile.repository.js';
import { referenceRepository } from './repositories/reference.repository.js';
import { serviceRequestRepository } from './repositories/service-request.repository.js';
import { storageRepository } from './repositories/storage.repository.js';
import { createAdminRequestService } from './services/admin-request.service.js';
import { createAnalyticsService } from './services/analytics.service.js';
import { createAuthService } from './services/auth.service.js';
import { createCommentService } from './services/comment.service.js';
import { createHealthService, type Lifecycle } from './services/health.service.js';
import { createNotificationService } from './services/notification.service.js';
import { createReferenceService } from './services/reference.service.js';
import { createServiceRequestService } from './services/service-request.service.js';
import { createTokenVerifier } from './services/token-verifier.js';

export interface Container {
  deps: AppDeps;
  lifecycle: Lifecycle;
  /** Releases external connections during graceful shutdown. */
  close(): Promise<void>;
}

function createStoreFactory(
  env: Env,
  logger: Logger,
): { factory: StoreFactory; redis: Redis | null } {
  if (!env.REDIS_URL) {
    logger.warn('REDIS_URL not set: rate limits are enforced per instance');
    return { factory: () => undefined, redis: null };
  }
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
  redis.on('error', (error) => {
    logger.error({ err: error }, 'redis error');
  });
  return {
    redis,
    factory: (prefix) =>
      new RedisStore({
        prefix,
        sendCommand: (command: string, ...args: string[]) =>
          redis.call(command, ...args) as Promise<RedisReply>,
      }),
  };
}

/** Composition root: the only place concrete implementations are wired together. */
export function createContainer(env: Env, logger: Logger): Container {
  const supabase = createSupabaseFactory(env);
  const lifecycle: Lifecycle = { shuttingDown: false };
  const { factory, redis } = createStoreFactory(env, logger);

  const deps: AppDeps = {
    env,
    logger,
    rateLimiters: createRateLimiters(factory, { globalMax: env.RATE_LIMIT_GLOBAL_MAX }),
    authenticate: createAuthenticate({
      verifier: createTokenVerifier(env),
      supabase,
      profiles: profileRepository,
    }),
    services: {
      auth: createAuthService({
        authRepo: authRepository,
        supabase,
        redirectTo: env.AUTH_REDIRECT_URL,
        captchaRequired: env.CAPTCHA_REQUIRED,
      }),
      reference: createReferenceService({ repo: referenceRepository, supabase }),
      requests: createServiceRequestService({
        requests: serviceRequestRepository,
        storage: storageRepository,
        signedUrlTtlSeconds: env.SIGNED_URL_TTL_SECONDS,
      }),
      adminRequests: createAdminRequestService({ requests: serviceRequestRepository }),
      comments: createCommentService({ comments: commentRepository }),
      notifications: createNotificationService({ notifications: notificationRepository }),
      analytics: createAnalyticsService({ analytics: analyticsRepository }),
      health: createHealthService({ repo: healthRepository, supabase, lifecycle }),
    },
  };

  return {
    deps,
    lifecycle,
    async close() {
      if (redis) {
        await redis.quit();
      }
    },
  };
}
