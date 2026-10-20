import { Router, type RequestHandler } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';
import type { RateLimiters } from '../middleware/rate-limit.js';
import type { AuthService } from '../services/auth.service.js';

export function createAuthRouter(
  service: AuthService,
  authenticate: RequestHandler,
  limits: RateLimiters,
): Router {
  const controller = createAuthController(service);
  const router = Router();
  router.post('/auth/register', limits.register, controller.register);
  router.get('/me', authenticate, controller.me);
  return router;
}
