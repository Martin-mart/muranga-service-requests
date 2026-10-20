import type { NewRequestPayload } from './requests.service';

/**
 * Queue for request submissions made while offline. Stored per user in
 * localStorage (text only; images need a connection) and replayed with the
 * original idempotency key, so a replay can never create a duplicate.
 */
export interface QueuedRequest {
  idempotencyKey: string;
  payload: NewRequestPayload;
  queuedAt: string;
}

const keyFor = (userId: string) => `mrg:offline-requests:${userId}`;

function read(userId: string): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, items: QueuedRequest[]): void {
  try {
    if (items.length === 0) {
      localStorage.removeItem(keyFor(userId));
    } else {
      localStorage.setItem(keyFor(userId), JSON.stringify(items));
    }
  } catch {
    // Storage full or blocked (private mode): the submission stays in memory
    // for this session only; the UI already told the user it is pending.
  }
}

export const offlineQueue = {
  list: read,

  add(userId: string, item: QueuedRequest): void {
    write(userId, [...read(userId).filter((q) => q.idempotencyKey !== item.idempotencyKey), item]);
  },

  remove(userId: string, idempotencyKey: string): void {
    write(
      userId,
      read(userId).filter((q) => q.idempotencyKey !== idempotencyKey),
    );
  },
};
