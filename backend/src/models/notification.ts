export type NotificationType = 'status_changed' | 'comment_added';

export interface Notification {
  id: string;
  requestId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}
