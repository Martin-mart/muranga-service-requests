import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Notification } from '../models/notification.js';
import type { PageRequest } from '../models/pagination.js';
import { olderThanFilter } from '../utils/cursor.js';
import { throwIfDbError } from '../utils/db-errors.js';

const COLUMNS = 'id, request_id, type, title, body, read_at, created_at';

const notificationRow = z
  .object({
    id: z.uuid(),
    request_id: z.uuid().nullable(),
    type: z.enum(['status_changed', 'comment_added']),
    title: z.string(),
    body: z.string(),
    read_at: z.string().nullable(),
    created_at: z.string(),
  })
  .transform((row): Notification => ({
    id: row.id,
    requestId: row.request_id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));

export interface NotificationRepository {
  list(db: SupabaseClient, userId: string, page: PageRequest): Promise<Notification[]>;
  countUnread(db: SupabaseClient, userId: string): Promise<number>;
  markRead(db: SupabaseClient, userId: string, id: string): Promise<Notification | null>;
}

export const notificationRepository: NotificationRepository = {
  async list(db, userId, page) {
    let query = db
      .from('notifications')
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(page.limit + 1);
    if (page.cursor) {
      query = query.or(olderThanFilter(page.cursor));
    }
    const { data, error } = await query;
    throwIfDbError(error);
    return z.array(notificationRow).parse(data ?? []);
  },

  async countUnread(db, userId) {
    // HEAD + exact count: no rows transferred; served by (user_id, read_at).
    const { count, error } = await db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    throwIfDbError(error);
    return count ?? 0;
  },

  async markRead(db, userId, id) {
    // read_at value is replaced by now() in the BEFORE UPDATE trigger.
    const { data, error } = await db
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select(COLUMNS)
      .maybeSingle();
    throwIfDbError(error);
    return data ? notificationRow.parse(data) : null;
  },
};
