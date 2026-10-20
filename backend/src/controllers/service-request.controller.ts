import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import type { ServiceRequestService } from '../services/service-request.service.js';
import { parseOrThrow } from '../utils/validate.js';
import { idParamSchema, pageQuerySchema } from '../validators/common.validators.js';
import {
  createRequestSchema,
  idempotencyKeySchema,
  imageUploadSchema,
} from '../validators/request.validators.js';
import { toPageRequest } from './pagination.js';

export function createServiceRequestController(service: ServiceRequestService) {
  return {
    create: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const input = parseOrThrow(createRequestSchema, req.body);
      const key = parseOrThrow(idempotencyKeySchema, req.get('idempotency-key'));
      const { request, created } = await service.create(ctx, input, key);
      res
        .status(created ? 201 : 200)
        .location(`/api/v1/requests/${request.id}`)
        .json({ data: request });
    },

    listOwn: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const query = parseOrThrow(pageQuerySchema, req.query);
      const page = await service.listOwn(ctx, toPageRequest(query));
      res.json({ data: page.items, page: { nextCursor: page.nextCursor } });
    },

    getOne: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const { id } = parseOrThrow(idParamSchema, req.params);
      res.json({ data: await service.getView(ctx, id) });
    },

    createImageUploadUrl: async (req: Request, res: Response): Promise<void> => {
      const ctx = requireAuth(req);
      const { id } = parseOrThrow(idParamSchema, req.params);
      const file = parseOrThrow(imageUploadSchema, req.body);
      res.status(201).json({ data: await service.createImageUpload(ctx, id, file) });
    },
  };
}
