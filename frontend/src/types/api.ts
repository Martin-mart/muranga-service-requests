import type { z } from 'zod';
import type {
  analyticsSchema,
  categorySchema,
  commentSchema,
  imageUploadTicketSchema,
  meSchema,
  notificationSchema,
  referenceItemSchema,
  requestStatusSchema,
  requestSummarySchema,
  requestViewSchema,
  roleSchema,
  statusChangeResultSchema,
  statusHistorySchema,
} from '../schemas/api.schemas';

export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type Role = z.infer<typeof roleSchema>;
export type ReferenceItem = z.infer<typeof referenceItemSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Me = z.infer<typeof meSchema>;
export type RequestSummary = z.infer<typeof requestSummarySchema>;
export type StatusHistoryEntry = z.infer<typeof statusHistorySchema>;
export type RequestView = z.infer<typeof requestViewSchema>;
export type RequestComment = z.infer<typeof commentSchema>;
export type AppNotification = z.infer<typeof notificationSchema>;
export type ImageUploadTicket = z.infer<typeof imageUploadTicketSchema>;
export type StatusChangeResult = z.infer<typeof statusChangeResultSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AdminRequestFilters {
  status?: RequestStatus | undefined;
  categoryId?: string | undefined;
  subCountyId?: string | undefined;
  search?: string | undefined;
}
