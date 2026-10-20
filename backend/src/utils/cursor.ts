import { z } from 'zod';
import type { CursorPosition } from '../models/pagination.js';
import { badRequest } from './errors.js';

// Postgres timestamptz as returned by PostgREST, e.g. 2026-10-19T08:15:30.123456+00:00
// Kept as the original string: converting through JS Date would drop
// microseconds and make keyset comparisons skip or repeat rows.
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

const cursorSchema = z.object({
  c: z.string().regex(TIMESTAMP_RE),
  i: z.uuid(),
});

export function encodeCursor(position: CursorPosition): string {
  return Buffer.from(JSON.stringify({ c: position.createdAt, i: position.id })).toString(
    'base64url',
  );
}

export function decodeCursor(raw: string | undefined): CursorPosition | null {
  if (raw === undefined || raw === '') {
    return null;
  }
  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
    return { createdAt: parsed.c, id: parsed.i };
  } catch {
    throw badRequest('Invalid pagination cursor');
  }
}

/**
 * Repositories fetch limit + 1 rows; the extra row only signals that another
 * page exists and is not returned.
 */
export function toPage<T extends { id: string; createdAt: string }>(
  rows: T[],
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
  };
}

/**
 * PostgREST keyset filter for newest-first lists ordered by (created_at desc, id desc).
 * Values are double-quoted, and both were validated by decodeCursor, so the
 * filter string cannot be broken out of.
 */
export function olderThanFilter(position: CursorPosition): string {
  const ts = `"${position.createdAt}"`;
  return `created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${position.id})`;
}

/** Keyset filter for oldest-first lists ordered by (created_at asc, id asc). */
export function newerThanFilter(position: CursorPosition): string {
  const ts = `"${position.createdAt}"`;
  return `created_at.gt.${ts},and(created_at.eq.${ts},id.gt.${position.id})`;
}
