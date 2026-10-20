import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor, olderThanFilter, toPage } from '../../src/utils/cursor.js';
import { AppError } from '../../src/utils/errors.js';

const position = {
  createdAt: '2026-10-19T08:15:30.123456+00:00',
  id: '3c0c2f0f-2b3c-4d4e-9f50-333333333333',
};

describe('cursor', () => {
  it('round-trips without losing microsecond precision', () => {
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it('treats a missing cursor as the first page', () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });

  it.each([
    ['garbage', 'not-base64-json'],
    [
      'filter injection',
      Buffer.from(
        JSON.stringify({ c: '2026-01-01T00:00:00Z),or(id.neq.x', i: position.id }),
      ).toString('base64url'),
    ],
    [
      'bad id',
      Buffer.from(JSON.stringify({ c: position.createdAt, i: '1 or 1=1' })).toString('base64url'),
    ],
  ])('rejects %s with a 400', (_label, raw) => {
    expect(() => decodeCursor(raw)).toThrow(AppError);
  });

  it('builds a quoted keyset filter', () => {
    expect(olderThanFilter(position)).toBe(
      `created_at.lt."${position.createdAt}",and(created_at.eq."${position.createdAt}",id.lt.${position.id})`,
    );
  });

  it('toPage trims the look-ahead row and emits a cursor only when more exist', () => {
    const rows = [1, 2, 3].map((n) => ({ id: `id-${n}`, createdAt: `2026-01-0${n}T00:00:00Z` }));
    const page = toPage(rows, 2);
    expect(page.items).toHaveLength(2);
    expect(decodeCursorUnsafe(page.nextCursor)).toEqual({ c: '2026-01-02T00:00:00Z', i: 'id-2' });
    expect(toPage(rows, 3).nextCursor).toBeNull();
  });
});

function decodeCursorUnsafe(raw: string | null): unknown {
  return raw ? JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) : null;
}
