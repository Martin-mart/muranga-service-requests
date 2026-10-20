import { Router, type RequestHandler } from 'express';
import { createCommentController } from '../controllers/comment.controller.js';
import { createServiceRequestController } from '../controllers/service-request.controller.js';
import type { RateLimiters } from '../middleware/rate-limit.js';
import type { CommentService } from '../services/comment.service.js';
import type { ServiceRequestService } from '../services/service-request.service.js';

export function createServiceRequestRouter(
  services: { requests: ServiceRequestService; comments: CommentService },
  authenticate: RequestHandler,
  limits: RateLimiters,
): Router {
  const requests = createServiceRequestController(services.requests);
  const comments = createCommentController(services.comments);
  const router = Router();

  router.use('/requests', authenticate);
  router.post('/requests', limits.createRequest, requests.create);
  router.get('/requests', requests.listOwn);
  router.get('/requests/:id', requests.getOne);
  router.post('/requests/:id/image-upload-url', limits.upload, requests.createImageUploadUrl);
  router.get('/requests/:id/comments', comments.list);
  router.post('/requests/:id/comments', limits.writeComment, comments.create);
  return router;
}
