import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api-client';

/** Retrying 4xx responses can never succeed, so only transient failures retry. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: shouldRetry,
        // Still issue requests while offline: the service worker answers GETs
        // from its NetworkFirst cache, so users see the last known data.
        networkMode: 'offlineFirst',
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
        networkMode: 'offlineFirst',
      },
    },
  });
}

/** Central query keys so invalidation can never drift from the queries. */
export const queryKeys = {
  me: (userId: string) => ['me', userId] as const,
  categories: ['categories'] as const,
  subCounties: ['sub-counties'] as const,
  myRequests: ['requests', 'mine'] as const,
  request: (id: string) => ['requests', 'detail', id] as const,
  comments: (id: string) => ['requests', 'comments', id] as const,
  adminRequests: (filters: object) => ['admin', 'requests', filters] as const,
  adminRequestsAll: ['admin', 'requests'] as const,
  analytics: ['admin', 'analytics'] as const,
  notifications: ['notifications'] as const,
};
