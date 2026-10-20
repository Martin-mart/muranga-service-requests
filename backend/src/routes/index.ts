import { Router, type RequestHandler } from 'express';
import { noStore } from '../middleware/cache-control.js';
import type { RateLimiters } from '../middleware/rate-limit.js';
import type { Services } from '../services/index.js';
import { createAdminRouter } from './admin.routes.js';
import { createAuthRouter } from './auth.routes.js';
import { createNotificationRouter } from './notification.routes.js';
import { createReferenceRouter } from './reference.routes.js';
import { createServiceRequestRouter } from './service-request.routes.js';

/** Mounted at /api/v1. Versioned so breaking changes can ship as /api/v2. */
export function createApiRouter(
  services: Services,
  authenticate: RequestHandler,
  limits: RateLimiters,
): Router {
  const router = Router();
  router.use(limits.global, noStore);
  router.use(createReferenceRouter(services.reference));
  router.use(createAuthRouter(services.auth, authenticate, limits));
  router.use(createServiceRequestRouter(services, authenticate, limits));
  router.use(createNotificationRouter(services.notifications, authenticate));
  router.use(createAdminRouter(services, authenticate));
  return router;
}
