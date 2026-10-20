import { z } from 'zod';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../models/image-upload.js';
import { REQUEST_STATUSES } from '../models/service-request.js';
import { multilineText, pageQuerySchema, singleLineText } from './common.validators.js';

// Generous Kenya bounding box: GPS error near the county border must not
// block a submission, but obviously wrong coordinates are rejected.
const KENYA_BOUNDS = { minLat: -4.9, maxLat: 5.1, minLng: 33.8, maxLng: 42.0 };

export const createRequestSchema = z
  .object({
    categoryId: z.uuid('Choose a category'),
    subCountyId: z.uuid('Choose a sub-county'),
    locationText: singleLineText(3, 200),
    description: multilineText(10, 2000),
    latitude: z.number().min(KENYA_BOUNDS.minLat).max(KENYA_BOUNDS.maxLat).nullish(),
    longitude: z.number().min(KENYA_BOUNDS.minLng).max(KENYA_BOUNDS.maxLng).nullish(),
    // Guests are always anonymous (enforced in the database).
    isAnonymous: z.boolean().default(false),
  })
  .refine(
    (value) =>
      (value.latitude ?? null) === null
        ? (value.longitude ?? null) === null
        : (value.longitude ?? null) !== null,
    {
      message: 'Latitude and longitude must be provided together',
      path: ['latitude'],
    },
  );

export type CreateRequestInput = z.output<typeof createRequestSchema>;

export const idempotencyKeySchema = z.uuid().optional();

export const imageUploadSchema = z.object({
  contentType: z.enum(Object.keys(ALLOWED_IMAGE_TYPES) as [keyof typeof ALLOWED_IMAGE_TYPES], {
    message: 'Only JPEG, PNG or WebP images are allowed',
  }),
  sizeBytes: z.number().int().min(1).max(MAX_IMAGE_BYTES, 'Images must be 5 MB or smaller'),
});

export const adminListQuerySchema = pageQuerySchema.extend({
  status: z.enum(REQUEST_STATUSES).optional(),
  categoryId: z.uuid().optional(),
  subCountyId: z.uuid().optional(),
  search: singleLineText(1, 100).optional(),
});

export const statusUpdateSchema = z.object({
  // "pending" is never a valid target: requests only move forward.
  status: z.enum(['in_progress', 'resolved']),
  note: multilineText(1, 1000).optional(),
});

export const analyticsQuerySchema = z
  .object({
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((value) => !value.from || !value.to || Date.parse(value.from) < Date.parse(value.to), {
    message: '"from" must be before "to"',
    path: ['from'],
  });
