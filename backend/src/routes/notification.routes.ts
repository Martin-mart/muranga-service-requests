import { Router, type RequestHandler } from 'express';
import { createNotificationController } from '../controllers/notification.controller.js';
import type { NotificationService } from '../services/notification.service.js';

export function createNotificationRouter(
  service: NotificationService,
  authenticate: RequestHandler,
): Router {
  const controller = createNotificationController(service);
  const router = Router();
  router.use('/notifications', authenticate);
  router.get('/notifications', controller.list);
  router.patch('/notifications/:id/read', controller.markRead);
  return router;
}
