import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import type { AnalyticsService } from '../services/analytics.service.js';
import { parseOrThrow } from '../utils/validate.js';
import { analyticsQuerySchema } from '../validators/request.validators.js';

export function createAnalyticsController(service: AnalyticsService) {
  return {
    get: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const range = parseOrThrow(analyticsQuerySchema, req.query);
      res.json({ data: await service.get(ctx, range) });
    },
  };
}
