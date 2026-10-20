import {
  analyticsSchema,
  dataEnvelope,
  pageEnvelope,
  requestSummarySchema,
  statusChangeResultSchema,
} from '../schemas/api.schemas';
import type {
  AdminRequestFilters,
  Analytics,
  Page,
  RequestSummary,
  StatusChangeResult,
} from '../types/api';
import { apiRequest } from './api-client';

export const ADMIN_PAGE_SIZE = 20;

export async function fetchAdminRequests(
  filters: AdminRequestFilters,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<RequestSummary>> {
  const result = await apiRequest('/admin/requests', {
    query: { ...filters, cursor, limit: ADMIN_PAGE_SIZE },
    schema: pageEnvelope(requestSummarySchema),
    signal,
  });
  return { items: result.data, nextCursor: result.page.nextCursor };
}

export async function changeRequestStatus(
  id: string,
  status: 'in_progress' | 'resolved',
  note: string,
): Promise<StatusChangeResult> {
  const result = await apiRequest(`/admin/requests/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: { status, ...(note.trim() ? { note } : {}) },
    schema: dataEnvelope(statusChangeResultSchema),
  });
  return result.data;
}

export async function fetchAnalytics(signal?: AbortSignal): Promise<Analytics> {
  const result = await apiRequest('/admin/analytics', {
    schema: dataEnvelope(analyticsSchema),
    signal,
  });
  return result.data;
}
