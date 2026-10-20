import type { ReferenceItem } from './reference.js';
import type { Role } from './user.js';

export const REQUEST_STATUSES = ['pending', 'in_progress', 'resolved'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface CitizenSummary {
  id: string;
  fullName: string;
  phone: string | null;
}

export interface ServiceRequestSummary {
  id: string;
  referenceNumber: string;
  status: RequestStatus;
  locationText: string;
  description: string;
  category: ReferenceItem;
  subCounty: ReferenceItem;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  /** Submitter hidden from officers (guest, or citizen opted in). */
  isAnonymous: boolean;
  /** Only populated for admin views, and never for anonymous requests. */
  citizen: CitizenSummary | null;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  actorRole: Role;
  /**
   * Admin-only: citizens cannot read officers' profiles (RLS returns null).
   * Null for the submitter's own entries on anonymous requests.
   */
  actorName: string | null;
  note: string | null;
  createdAt: string;
}

export interface ServiceRequestDetail extends ServiceRequestSummary {
  latitude: number | null;
  longitude: number | null;
  imagePath: string | null;
  history: StatusHistoryEntry[];
}

export interface ServiceRequestView extends Omit<ServiceRequestDetail, 'imagePath'> {
  /** Short-lived signed URL; null when no image was uploaded. */
  imageUrl: string | null;
}

export interface NewServiceRequest {
  categoryId: string;
  subCountyId: string;
  locationText: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  idempotencyKey: string | null;
  isAnonymous: boolean;
}

export interface AdminRequestFilters {
  status?: RequestStatus | undefined;
  categoryId?: string | undefined;
  subCountyId?: string | undefined;
  search?: string | undefined;
}

export interface StatusChangeResult {
  id: string;
  status: RequestStatus;
  resolvedAt: string | null;
  updatedAt: string;
}
