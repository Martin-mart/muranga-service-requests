import type { Request, Response } from 'express';
import type { HealthService } from '../services/health.service.js';

export function createHealthController(service: HealthService) {
  return {
    live: (_req: Request, res: Response): void => {
      res.setHeader('Cache-Control', 'no-store');
      res.json(service.liveness());
    },

    ready: async (_req: Request, res: Response): Promise<void> => {
      const report = await service.readiness();
      res.setHeader('Cache-Control', 'no-store');
      res.status(report.status === 'ok' ? 200 : 503).json(report);
    },
  };
}
