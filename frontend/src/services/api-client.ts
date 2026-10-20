import type { z } from 'zod';
import { errorEnvelopeSchema } from '../schemas/api.schemas';
import { env } from '../utils/env';
import { getAccessToken } from './supabase';

export interface FieldIssue {
  path: string;
  message: string;
}

/** Normalised error for every failed API call; `status` 0 means network failure. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: FieldIssue[] = [],
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequestOptions<S extends z.ZodType> {
  schema: S;
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal | undefined;
  /** Public endpoints skip the Authorization header. */
  authenticated?: boolean;
}

function buildUrl(path: string, query: Record<string, QueryValue> | undefined): string {
  const url = new URL(`/api/v1${path}`, env.apiBaseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = errorEnvelopeSchema.safeParse(await response.json().catch(() => null));
  if (parsed.success) {
    const { code, message, details, requestId } = parsed.data.error;
    return new ApiError(response.status, code, message, details, requestId);
  }
  return new ApiError(response.status, 'UNEXPECTED', 'The server returned an unexpected response.');
}

/**
 * The ONLY way the UI talks to the backend. Attaches the Supabase access token
 * (refreshed automatically by supabase-js), validates the response shape and
 * converts every failure into an ApiError.
 */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  options: ApiRequestOptions<S>,
): Promise<z.output<S>> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.authenticated !== false) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? null : JSON.stringify(options.body),
      signal: options.signal ?? null,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'You appear to be offline. Check your connection and try again.',
    );
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  const parsed = options.schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      'CONTRACT_MISMATCH',
      'The server response was not understood.',
    );
  }
  return parsed.data;
}

/** User-facing message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
