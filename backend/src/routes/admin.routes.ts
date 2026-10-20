import { Router, type RequestHandler } from 'express';
import { createAdminRequestController } from '../controllers/admin-request.controller.js';
import { createAnalyticsController } from '../controllers/analytics.controller.js';
import { privateCache } from '../middleware/cache-control.js';
import { requireRole } from '../middleware/require-role.js';
import type { AdminRequestService } from '../services/admin-request.service.js';
import type { AnalyticsService } from '../services/analytics.service.js';

export function createAdminRouter(
  services: { adminRequests: AdminRequestService; analytics: AnalyticsService },
  authenticate: RequestHandler,
): Router {
  const requests = createAdminRequestController(services.adminRequests);
  const analytics = createAnalyticsController(services.analytics);
  const router = Router();

  // Every /admin route: valid JWT + admin role from profiles. RLS re-checks.
  router.use('/admin', authenticate, requireRole('admin'));
  router.get('/admin/requests', requests.list);
  router.patch('/admin/requests/:id/status', requests.changeStatus);
  router.get('/admin/analytics', privateCache(60), analytics.get);
  return router;
}
