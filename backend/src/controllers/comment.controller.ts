import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import type { CommentService } from '../services/comment.service.js';
import { parseOrThrow } from '../utils/validate.js';
import { createCommentSchema } from '../validators/comment.validators.js';
import { idParamSchema, pageQuerySchema } from '../validators/common.validators.js';
import { toPageRequest } from './pagination.js';

export function createCommentController(service: CommentService) {
  return {
    list: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const { id } = parseOrThrow(idParamSchema, req.params);
      const query = parseOrThrow(pageQuerySchema, req.query);
      const page = await service.list(ctx, id, toPageRequest(query));
      res.json({ data: page.items, page: { nextCursor: page.nextCursor } });
    },

    create: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const { id } = parseOrThrow(idParamSchema, req.params);
      const input = parseOrThrow(createCommentSchema, req.body);
      res.status(201).json({ data: await service.create(ctx, id, input) });
    },
  };
}
