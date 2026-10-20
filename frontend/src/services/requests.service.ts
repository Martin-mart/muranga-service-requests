import {
  commentSchema,
  dataEnvelope,
  imageUploadTicketSchema,
  pageEnvelope,
  requestSummarySchema,
  requestViewSchema,
} from '../schemas/api.schemas';
import type {
  ImageUploadTicket,
  Page,
  RequestComment,
  RequestSummary,
  RequestView,
} from '../types/api';
import { apiRequest, ApiError } from './api-client';

export interface NewRequestPayload {
  categoryId: string;
  subCountyId: string;
  locationText: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  isAnonymous: boolean;
}

/**
 * The idempotency key makes retries (offline queue, flaky networks) safe:
 * the server returns the original request instead of creating a duplicate.
 */
export async function createRequest(
  payload: NewRequestPayload,
  idempotencyKey: string,
): Promise<RequestSummary> {
  const result = await apiRequest('/requests', {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': idempotencyKey },
    schema: dataEnvelope(requestSummarySchema),
  });
  return result.data;
}

export async function fetchMyRequests(
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<RequestSummary>> {
  const result = await apiRequest('/requests', {
    query: { cursor, limit: 10 },
    schema: pageEnvelope(requestSummarySchema),
    signal,
  });
  return { items: result.data, nextCursor: result.page.nextCursor };
}

export async function fetchRequest(id: string, signal?: AbortSignal): Promise<RequestView> {
  const result = await apiRequest(`/requests/${encodeURIComponent(id)}`, {
    schema: dataEnvelope(requestViewSchema),
    signal,
  });
  return result.data;
}

async function requestUploadTicket(requestId: string, file: File): Promise<ImageUploadTicket> {
  const result = await apiRequest(`/requests/${encodeURIComponent(requestId)}/image-upload-url`, {
    method: 'POST',
    body: { contentType: file.type, sizeBytes: file.size },
    schema: dataEnvelope(imageUploadTicketSchema),
  });
  return result.data;
}

/**
 * Two-step upload: the API authorises and registers a random path, then the
 * browser sends the bytes straight to Supabase Storage (the API never proxies
 * file bodies, keeping it small and fast).
 */
export async function uploadRequestImage(requestId: string, file: File): Promise<void> {
  const ticket = await requestUploadTicket(requestId, file);
  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': ticket.contentType, 'x-upsert': 'false' },
      body: file,
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'The image could not be uploaded. Check your connection.',
    );
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      'UPLOAD_FAILED',
      'The image could not be uploaded. Please try again.',
    );
  }
}

export async function fetchComments(
  requestId: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<RequestComment>> {
  const result = await apiRequest(`/requests/${encodeURIComponent(requestId)}/comments`, {
    query: { cursor, limit: 50 },
    schema: pageEnvelope(commentSchema),
    signal,
  });
  return { items: result.data, nextCursor: result.page.nextCursor };
}

export async function addComment(
  requestId: string,
  body: string,
  isPublic: boolean,
): Promise<RequestComment> {
  const result = await apiRequest(`/requests/${encodeURIComponent(requestId)}/comments`, {
    method: 'POST',
    body: { body, isPublic },
    schema: dataEnvelope(commentSchema),
  });
  return result.data;
}
