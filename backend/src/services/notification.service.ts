import type { AuthContext } from '../models/context.js';
import type { Notification } from '../models/notification.js';
import type { Page, PageRequest } from '../models/pagination.js';
import type { NotificationRepository } from '../repositories/notification.repository.js';
import { toPage } from '../utils/cursor.js';
import { notFound } from '../utils/errors.js';

export interface NotificationPage extends Page<Notification> {
  unreadCount: number;
}

export interface NotificationService {
  list(ctx: AuthContext, page: PageRequest): Promise<NotificationPage>;
  markRead(ctx: AuthContext, id: string): Promise<Notification>;
}

export function createNotificationService(deps: {
  notifications: NotificationRepository;
}): NotificationService {
  return {
    async list(ctx, page) {
      // Independent queries run concurrently.
      const [rows, unreadCount] = await Promise.all([
        deps.notifications.list(ctx.db, ctx.user.id, page),
        deps.notifications.countUnread(ctx.db, ctx.user.id),
      ]);
      return { ...toPage(rows, page.limit), unreadCount };
    },

    async markRead(ctx, id) {
      const updated = await deps.notifications.markRead(ctx.db, ctx.user.id, id);
      if (!updated) {
        throw notFound('Notification not found');
      }
      return updated;
    },
  };
}
