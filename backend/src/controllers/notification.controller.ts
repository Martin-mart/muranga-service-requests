import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import type { NotificationService } from '../services/notification.service.js';
import { parseOrThrow } from '../utils/validate.js';
import { idParamSchema, pageQuerySchema } from '../validators/common.validators.js';
import { toPageRequest } from './pagination.js';

export function createNotificationController(service: NotificationService) {
  return {
    list: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const query = parseOrThrow(pageQuerySchema, req.query);
      const page = await service.list(ctx, toPageRequest(query));
      res.json({
        data: page.items,
        page: { nextCursor: page.nextCursor },
        meta: { unreadCount: page.unreadCount },
      });
    },

    markRead: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const { id } = parseOrThrow(idParamSchema, req.params);
      res.json({ data: await service.markRead(ctx, id) });
    },
  };
}
