import { Router } from 'express';
import { createReferenceController } from '../controllers/reference.controller.js';
import { publicCache } from '../middleware/cache-control.js';
import type { ReferenceService } from '../services/reference.service.js';

const FIVE_MINUTES = 300;

export function createReferenceRouter(service: ReferenceService): Router {
  const controller = createReferenceController(service);
  const router = Router();
  router.get('/categories', publicCache(FIVE_MINUTES), controller.categories);
  router.get('/sub-counties', publicCache(FIVE_MINUTES), controller.subCounties);
  return router;
}
