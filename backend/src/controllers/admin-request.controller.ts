import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import type { AdminRequestService } from '../services/admin-request.service.js';
import { parseOrThrow } from '../utils/validate.js';
import { idParamSchema } from '../validators/common.validators.js';
import { adminListQuerySchema, statusUpdateSchema } from '../validators/request.validators.js';
import { toPageRequest } from './pagination.js';

export function createAdminRequestController(service: AdminRequestService) {
  return {
    list: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const { cursor, limit, ...filters } = parseOrThrow(adminListQuerySchema, req.query);
      const page = await service.list(ctx, filters, toPageRequest({ cursor, limit }));
      res.json({ data: page.items, page: { nextCursor: page.nextCursor } });
    },

    changeStatus: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const { id } = parseOrThrow(idParamSchema, req.params);
      const { status, note } = parseOrThrow(statusUpdateSchema, req.body);
      res.json({ data: await service.changeStatus(ctx, id, status, note) });
    },
  };
}
