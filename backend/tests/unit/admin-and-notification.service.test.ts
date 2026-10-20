import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '../../src/models/context.js';
import { createAdminRequestService } from '../../src/services/admin-request.service.js';
import { createAnalyticsService } from '../../src/services/analytics.service.js';
import { createCommentService } from '../../src/services/comment.service.js';
import { createNotificationService } from '../../src/services/notification.service.js';
import type { ServiceRequestRepository } from '../../src/repositories/service-request.repository.js';

const asRole = (role: 'citizen' | 'admin'): AuthContext => ({
  db: {} as SupabaseClient,
  user: { id: `${role}-1`, email: null, role, fullName: role, phone: null },
});

describe('AdminRequestService', () => {
  const requests = {
    changeStatus: vi.fn(),
    listForAdmin: vi.fn(),
  } as unknown as ServiceRequestRepository;

  it('refuses citizens even if a route guard is missing', async () => {
    const service = createAdminRequestService({ requests });
    await expect(
      service.changeStatus(asRole('citizen'), 'r', 'resolved', undefined),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it('passes the note through to the atomic database function', async () => {
    const service = createAdminRequestService({ requests });
    await service.changeStatus(asRole('admin'), 'r', 'in_progress', 'Crew dispatched');
    expect(requests.changeStatus).toHaveBeenCalledWith(
      expect.anything(),
      'r',
      'in_progress',
      'Crew dispatched',
    );
  });
});

describe('AnalyticsService', () => {
  it('is admin-only', async () => {
    const service = createAnalyticsService({ analytics: { get: vi.fn() } });
    await expect(service.get(asRole('citizen'), {})).rejects.toMatchObject({ status: 403 });
  });
});

describe('CommentService', () => {
  it('forces citizen comments to be public', async () => {
    const insert = vi.fn();
    const service = createCommentService({ comments: { insert, list: vi.fn() } });
    await service.create(asRole('citizen'), 'r', { body: 'Any update?', isPublic: false });
    expect(insert).toHaveBeenCalledWith(expect.anything(), {
      requestId: 'r',
      body: 'Any update?',
      isPublic: true,
    });
  });

  it('lets officers write internal notes', async () => {
    const insert = vi.fn();
    const service = createCommentService({ comments: { insert, list: vi.fn() } });
    await service.create(asRole('admin'), 'r', { body: 'Contractor booked', isPublic: false });
    expect(insert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isPublic: false }),
    );
  });
});

describe('NotificationService', () => {
  it('returns the page together with the unread count', async () => {
    const service = createNotificationService({
      notifications: {
        list: vi.fn().mockResolvedValue([]),
        countUnread: vi.fn().mockResolvedValue(4),
        markRead: vi.fn(),
      },
    });
    await expect(service.list(asRole('citizen'), { cursor: null, limit: 20 })).resolves.toEqual({
      items: [],
      nextCursor: null,
      unreadCount: 4,
    });
  });

  it('404s when marking a notification that is not yours', async () => {
    const service = createNotificationService({
      notifications: {
        list: vi.fn(),
        countUnread: vi.fn(),
        markRead: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(service.markRead(asRole('citizen'), 'n')).rejects.toMatchObject({ status: 404 });
  });
});
