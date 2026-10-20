import type { Role } from './user.js';

export interface RequestComment {
  id: string;
  requestId: string;
  authorRole: Role;
  /** Null for citizens viewing officer comments (officer profiles are private). */
  authorName: string | null;
  body: string;
  isPublic: boolean;
  createdAt: string;
}
