import { describe, expect, it } from 'vitest';
import { mapDbError } from '../../src/utils/db-errors.js';

describe('mapDbError', () => {
  it.each([
    ['MR001', 429, 'DAILY_LIMIT_REACHED'],
    ['MR002', 409, 'INVALID_TRANSITION'],
    ['MR003', 403, 'FORBIDDEN'],
    ['42501', 403, 'FORBIDDEN'],
    ['PGRST116', 404, 'NOT_FOUND'],
    ['P0002', 404, 'NOT_FOUND'],
    ['23505', 409, 'CONFLICT'],
    ['23514', 422, 'VALIDATION_FAILED'],
    ['57014', 503, 'UPSTREAM_UNAVAILABLE'],
  ])('maps %s to %i %s', (code, status, appCode) => {
    const error = mapDbError({ code, message: 'internal detail' });
    expect(error.status).toBe(status);
    expect(error.code).toBe(appCode);
  });

  it('never leaks raw database messages for unknown errors', () => {
    const error = mapDbError({ code: 'XX000', message: 'relation "secret_table" does not exist' });
    expect(error.status).toBe(500);
    expect(error.message).not.toContain('secret_table');
  });
});
