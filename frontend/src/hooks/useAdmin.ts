import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changeRequestStatus, fetchAdminRequests, fetchAnalytics } from '../services/admin.service';
import type { AdminRequestFilters } from '../types/api';
import { queryKeys } from '../utils/query-client';

export function useAdminRequests(filters: AdminRequestFilters, cursor: string | null) {
  return useQuery({
    queryKey: [...queryKeys.adminRequests(filters), cursor],
    queryFn: ({ signal }) => fetchAdminRequests(filters, cursor, signal),
    // Keep the current page visible while the next one loads (no table flash).
    placeholderData: keepPreviousData,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: ({ signal }) => fetchAnalytics(signal),
    // Aggregates are expensive relative to their rate of change.
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useChangeStatus(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ status, note }: { status: 'in_progress' | 'resolved'; note: string }) =>
      changeRequestStatus(requestId, status, note),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.request(requestId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminRequestsAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics }),
      ]);
    },
  });
}
