import type { Request, Response } from 'express';
import type { ReferenceService } from '../services/reference.service.js';

export function createReferenceController(service: ReferenceService) {
  return {
    categories: async (_req: Request, res: Response): Promise<void> => {
      res.json({ data: await service.categories() });
    },

    subCounties: async (_req: Request, res: Response): Promise<void> => {
      res.json({ data: await service.subCounties() });
    },
  };
}
