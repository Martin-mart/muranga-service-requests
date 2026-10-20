export const ROLES = ['citizen', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export interface Profile {
  id: string;
  fullName: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

/** Identity attached to a request after JWT verification + trusted profile lookup. */
export interface AuthUser {
  id: string;
  email: string | null;
  role: Role;
  fullName: string;
  phone: string | null;
  /** Anonymous (guest) session: can submit and track, has no email. */
  isGuest: boolean;
}
