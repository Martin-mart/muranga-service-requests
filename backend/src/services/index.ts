import type { AdminRequestService } from './admin-request.service.js';
import type { AnalyticsService } from './analytics.service.js';
import type { AuthService } from './auth.service.js';
import type { CommentService } from './comment.service.js';
import type { HealthService } from './health.service.js';
import type { NotificationService } from './notification.service.js';
import type { ReferenceService } from './reference.service.js';
import type { ServiceRequestService } from './service-request.service.js';

export interface Services {
  auth: AuthService;
  reference: ReferenceService;
  requests: ServiceRequestService;
  adminRequests: AdminRequestService;
  comments: CommentService;
  notifications: NotificationService;
  analytics: AnalyticsService;
  health: HealthService;
}
