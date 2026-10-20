import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { ApiError } from '../services/api-client';
import { offlineQueue } from '../services/offline-queue';
import { createRequest } from '../services/requests.service';
import { queryKeys } from '../utils/query-client';
import { useOnlineStatus } from './useOnlineStatus';
import { useToast } from './useToast';

/**
 * Replays queued offline submissions when the connection returns (and on app
 * start). Uses the stored idempotency keys, so overlapping replays from two
 * tabs still create each request only once.
 */
export function useOfflineQueueSync(userId: string | null) {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const toast = useToast();
  const running = useRef(false);

  useEffect(() => {
    if (!online || !userId || running.current) return;
    const pending = offlineQueue.list(userId);
    if (pending.length === 0) return;

    running.current = true;
    void (async () => {
      let sent = 0;
      for (const item of pending) {
        try {
          await createRequest(item.payload, item.idempotencyKey);
          offlineQueue.remove(userId, item.idempotencyKey);
          sent += 1;
        } catch (error) {
          // Validation/quota errors will never succeed: drop and tell the user.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            offlineQueue.remove(userId, item.idempotencyKey);
            toast.show({
              tone: 'error',
              title: 'A saved request could not be sent',
              message: error.message,
            });
          } else {
            break; // Still offline / server unavailable: retry on next reconnect.
          }
        }
      }
      running.current = false;
      if (sent > 0) {
        toast.show({
          tone: 'success',
          title: `${sent} saved request${sent === 1 ? '' : 's'} sent`,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.myRequests });
      }
    })();
  }, [online, userId, queryClient, toast]);
}
