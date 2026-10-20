import { Router } from 'express';
import { createHealthController } from '../controllers/health.controller.js';
import type { HealthService } from '../services/health.service.js';

/** Unversioned, unauthenticated probes for load balancers and orchestrators. */
export function createHealthRouter(service: HealthService): Router {
  const controller = createHealthController(service);
  const router = Router();
  router.get('/health', controller.live);
  router.get('/ready', controller.ready);
  return router;
}
