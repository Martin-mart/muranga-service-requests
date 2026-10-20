import { randomUUID } from 'node:crypto';
import type { AuthContext } from '../models/context.js';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  type AllowedImageType,
  type ImageUploadTicket,
} from '../models/image-upload.js';
import type { Page, PageRequest } from '../models/pagination.js';
import type { ServiceRequestSummary, ServiceRequestView } from '../models/service-request.js';
import type { ServiceRequestRepository } from '../repositories/service-request.repository.js';
import type { StorageRepository } from '../repositories/storage.repository.js';
import { toPage } from '../utils/cursor.js';
import { AppError, notFound } from '../utils/errors.js';
import type { CreateRequestInput } from '../validators/request.validators.js';

export interface CreateResult {
  request: ServiceRequestSummary;
  /** false when an idempotent retry returned the previously created request. */
  created: boolean;
}

export interface ServiceRequestService {
  create(
    ctx: AuthContext,
    input: CreateRequestInput,
    idempotencyKey?: string,
  ): Promise<CreateResult>;
  listOwn(ctx: AuthContext, page: PageRequest): Promise<Page<ServiceRequestSummary>>;
  getView(ctx: AuthContext, id: string): Promise<ServiceRequestView>;
  createImageUpload(
    ctx: AuthContext,
    requestId: string,
    file: { contentType: AllowedImageType; sizeBytes: number },
  ): Promise<ImageUploadTicket>;
}

interface Deps {
  requests: ServiceRequestRepository;
  storage: StorageRepository;
  signedUrlTtlSeconds: number;
  newId?: () => string;
}

export function createServiceRequestService(deps: Deps): ServiceRequestService {
  const newId = deps.newId ?? randomUUID;

  async function findByKey(ctx: AuthContext, key: string | undefined) {
    return key ? deps.requests.findByIdempotencyKey(ctx.db, ctx.user.id, key) : null;
  }

  return {
    async create(ctx, input, idempotencyKey) {
      // Offline queue retries reuse the same key: return the original instead
      // of creating a duplicate (and consuming the daily quota twice).
      const existing = await findByKey(ctx, idempotencyKey);
      if (existing) {
        return { request: existing, created: false };
      }

      try {
        const request = await deps.requests.insert(ctx.db, {
          categoryId: input.categoryId,
          subCountyId: input.subCountyId,
          locationText: input.locationText,
          description: input.description,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          idempotencyKey: idempotencyKey ?? null,
          isAnonymous: input.isAnonymous,
        });
        return { request, created: true };
      } catch (error) {
        // Two concurrent retries with the same key: the loser hits the unique
        // constraint and returns the winner's row.
        const raced =
          error instanceof AppError && error.code === 'CONFLICT'
            ? await findByKey(ctx, idempotencyKey)
            : null;
        if (raced) {
          return { request: raced, created: false };
        }
        throw error;
      }
    },

    async listOwn(ctx, page) {
      const rows = await deps.requests.listForCitizen(ctx.db, ctx.user.id, page);
      return toPage(rows, page.limit);
    },

    async getView(ctx, id) {
      const isAdmin = ctx.user.role === 'admin';
      const detail = await deps.requests.findDetail(ctx.db, id, isAdmin);
      if (!detail) {
        // Same response for "does not exist" and "belongs to someone else".
        throw notFound('Service request not found');
      }
      const { imagePath, ...rest } = detail;
      const imageUrl = imagePath
        ? await deps.storage.createSignedViewUrl(ctx.db, imagePath, deps.signedUrlTtlSeconds)
        : null;
      return { ...rest, imageUrl };
    },

    async createImageUpload(ctx, requestId, file) {
      if (file.sizeBytes > MAX_IMAGE_BYTES) {
        throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Images must be 5 MB or smaller');
      }
      // Server-chosen random name: the client controls neither folder nor
      // filename, so path traversal and overwriting are impossible.
      const extension = ALLOWED_IMAGE_TYPES[file.contentType];
      const path = `${ctx.user.id}/${requestId}/${newId()}.${extension}`;

      await deps.requests.attachImage(ctx.db, requestId, path);
      const uploadUrl = await deps.storage.createSignedUploadUrl(ctx.db, path);

      return { uploadUrl, path, contentType: file.contentType, maxBytes: MAX_IMAGE_BYTES };
    },
  };
}
