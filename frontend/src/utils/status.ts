import type { RequestStatus } from '../types/api';

export const STATUS_META: Record<
  RequestStatus,
  { label: string; icon: string; modifier: string; description: string }
> = {
  pending: {
    label: 'Pending',
    icon: 'bx-time-five',
    modifier: 'pending',
    description: 'Received and waiting for review by a county officer.',
  },
  in_progress: {
    label: 'In progress',
    icon: 'bx-loader-circle',
    modifier: 'in-progress',
    description: 'A county officer is working on it.',
  },
  resolved: {
    label: 'Resolved',
    icon: 'bx-check-circle',
    modifier: 'resolved',
    description: 'The issue has been fixed.',
  },
};

export const STATUS_ORDER: RequestStatus[] = ['pending', 'in_progress', 'resolved'];

/** The only legal next status (mirrors the database transition trigger). */
export function nextStatus(status: RequestStatus): Exclude<RequestStatus, 'pending'> | null {
  if (status === 'pending') return 'in_progress';
  if (status === 'in_progress') return 'resolved';
  return null;
}

/** Boxicons glyph per category slug (seeded in backend/supabase/seed.sql). */
export const CATEGORY_ICONS: Record<string, string> = {
  streetlight: 'bx-bulb',
  'water-supply': 'bx-water',
  garbage: 'bx-trash',
  roads: 'bx-traffic-cone',
  drainage: 'bx-cloud-rain',
  'public-health': 'bx-plus-medical',
  markets: 'bx-store',
  other: 'bx-dots-horizontal-rounded',
};

export const categoryIcon = (slug: string): string => CATEGORY_ICONS[slug] ?? 'bx-category';
