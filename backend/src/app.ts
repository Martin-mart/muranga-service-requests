import compression from 'compression';
import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import type { Env } from './config/env.js';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createHttpLogger } from './middleware/http-logger.js';
import type { RateLimiters } from './middleware/rate-limit.js';
import { requestId } from './middleware/request-id.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createApiRouter } from './routes/index.js';
import type { Services } from './services/index.js';
import { forbidden } from './utils/errors.js';

export interface AppDeps {
  env: Pick<Env, 'CORS_ORIGINS' | 'BODY_LIMIT' | 'TRUST_PROXY_HOPS'>;
  logger: Logger;
  services: Services;
  authenticate: RequestHandler;
  rateLimiters: RateLimiters;
}

function corsMiddleware(allowedOrigins: string[]): RequestHandler {
  const allow = new Set(allowedOrigins);
  return cors({
    origin(origin, callback) {
      // No Origin header: same-origin, curl, health probes. CORS is a browser
      // protection, so these are allowed; auth still applies to every route.
      if (!origin || allow.has(origin)) {
        callback(null, true);
        return;
      }
      callback(forbidden('Origin not allowed'));
    },
    // Bearer tokens, not cookies: credentials mode is unnecessary, which also
    // removes the classic CSRF vector.
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After', 'Location'],
    maxAge: 600,
  });
}

export function createApp(deps: AppDeps): Express {
  const app = express();

  app.set('trust proxy', deps.env.TRUST_PROXY_HOPS);
  app.set('etag', 'strong');
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(createHttpLogger(deps.logger));
  app.use(
    helmet({
      // JSON API: nothing should ever be rendered or framed.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
    }),
  );
  app.use(corsMiddleware(deps.env.CORS_ORIGINS));
  app.use(compression());
  app.use(express.json({ limit: deps.env.BODY_LIMIT, strict: true, type: 'application/json' }));

  app.use(createHealthRouter(deps.services.health));
  app.use('/api/v1', createApiRouter(deps.services, deps.authenticate, deps.rateLimiters));

  app.use(notFoundHandler);
  app.use(createErrorHandler(deps.logger));
  return app;
}
