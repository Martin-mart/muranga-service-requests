import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  subscribeToNotifications,
} from '../services/notifications.service';
import { queryKeys } from '../utils/query-client';
import { useToast } from './useToast';

export function useNotifications(enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ pageParam, signal }) => fetchNotifications(pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

/**
 * Live status updates: a Realtime INSERT on the citizen's notifications
 * invalidates the affected queries (fresh data is then fetched through the
 * API) and shows a toast.
 */
export function useRealtimeNotifications(userId: string | null) {
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeToNotifications(userId, () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.show({
        tone: 'info',
        title: 'Your request was updated',
        message: 'Open Updates to see what changed.',
      });
    });
  }, [userId, queryClient, toast]);
}
