import type { RealtimeChannel } from '@supabase/supabase-js';
import { dataEnvelope, notificationPageSchema, notificationSchema } from '../schemas/api.schemas';
import type { AppNotification, Page } from '../types/api';
import { apiRequest } from './api-client';
import { supabase } from './supabase';

export interface NotificationPage extends Page<AppNotification> {
  unreadCount: number;
}

export async function fetchNotifications(
  cursor: string | null,
  signal?: AbortSignal,
): Promise<NotificationPage> {
  const result = await apiRequest('/notifications', {
    query: { cursor, limit: 20 },
    schema: notificationPageSchema,
    signal,
  });
  return {
    items: result.data,
    nextCursor: result.page.nextCursor,
    unreadCount: result.meta.unreadCount,
  };
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const result = await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    schema: dataEnvelope(notificationSchema),
  });
  return result.data;
}

/**
 * Subscribes to INSERTs on the caller's notifications via Supabase Realtime.
 * Realtime applies the table's RLS policy per subscriber, so the filter is an
 * optimisation, not the security boundary. The payload is only used as a
 * signal to refetch through the API (which validates the data).
 */
export function subscribeToNotifications(userId: string, onInsert: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => {
        onInsert();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
