import { z } from 'zod';

/**
 * Runtime schemas for API responses. The backend contract (openapi.yaml) is
 * enforced at the boundary: a breaking server change surfaces as a clear
 * error instead of undefined values deep in the UI.
 */
export const requestStatusSchema = z.enum(['pending', 'in_progress', 'resolved']);
export const roleSchema = z.enum(['citizen', 'admin']);

export const referenceItemSchema = z.object({ id: z.string(), slug: z.string(), name: z.string() });
export const categorySchema = referenceItemSchema.extend({ description: z.string().nullable() });

export const meSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  role: roleSchema,
  fullName: z.string(),
  phone: z.string().nullable(),
  /** Anonymous (guest) session: no account, can submit and track on this device. */
  isGuest: z.boolean().default(false),
});

export const citizenSummarySchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string().nullable(),
});

export const requestSummarySchema = z.object({
  id: z.string(),
  referenceNumber: z.string(),
  status: requestStatusSchema,
  locationText: z.string(),
  description: z.string(),
  category: referenceItemSchema,
  subCounty: referenceItemSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
  /** Submitter hidden from officers; `citizen` is then always null. */
  isAnonymous: z.boolean().default(false),
  citizen: citizenSummarySchema.nullable(),
});

export const statusHistorySchema = z.object({
  id: z.string(),
  fromStatus: requestStatusSchema.nullable(),
  toStatus: requestStatusSchema,
  actorRole: roleSchema,
  actorName: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export const requestViewSchema = requestSummarySchema.extend({
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  imageUrl: z.string().nullable(),
  history: z.array(statusHistorySchema),
});

export const commentSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  authorRole: roleSchema,
  authorName: z.string().nullable(),
  body: z.string(),
  isPublic: z.boolean(),
  createdAt: z.string(),
});

export const notificationSchema = z.object({
  id: z.string(),
  requestId: z.string().nullable(),
  type: z.enum(['status_changed', 'comment_added']),
  title: z.string(),
  body: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const imageUploadTicketSchema = z.object({
  uploadUrl: z.string(),
  path: z.string(),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  maxBytes: z.number(),
});

export const statusChangeResultSchema = z.object({
  id: z.string(),
  status: requestStatusSchema,
  resolvedAt: z.string().nullable(),
  updatedAt: z.string(),
});

const breakdownRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  total: z.number(),
  open: z.number(),
  resolved: z.number(),
  avgResolutionHours: z.number().nullable(),
});

export const analyticsSchema = z.object({
  totals: z.object({
    total: z.number(),
    pending: z.number(),
    inProgress: z.number(),
    resolved: z.number(),
    open: z.number(),
  }),
  avgResolutionHours: z.number().nullable(),
  byCategory: z.array(breakdownRowSchema),
  bySubCounty: z.array(breakdownRowSchema),
  daily: z.array(z.object({ day: z.string(), created: z.number(), resolved: z.number() })),
});

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

export const dataEnvelope = <T extends z.ZodType>(schema: T) => z.object({ data: schema });

export const pageEnvelope = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    page: z.object({ nextCursor: z.string().nullable() }),
  });

export const notificationPageSchema = pageEnvelope(notificationSchema).extend({
  meta: z.object({ unreadCount: z.number() }),
});
