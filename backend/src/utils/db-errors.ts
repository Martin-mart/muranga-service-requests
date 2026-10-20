import { AppError, conflict, forbidden, notFound, upstreamUnavailable } from './errors.js';

export interface DbErrorLike {
  code?: string | undefined;
  message: string;
}

/**
 * Translates Postgres / PostgREST errors into client-safe AppErrors. Custom
 * SQLSTATEs (MR0xx) are raised by our own triggers; see the foundation migration.
 * Raw database messages are never forwarded (they can reveal schema details),
 * except for our own MR0xx messages which are written to be user-facing.
 */
export function mapDbError(error: DbErrorLike): AppError {
  switch (error.code) {
    case 'MR001':
      return new AppError(
        429,
        'DAILY_LIMIT_REACHED',
        'You can submit at most 10 requests in 24 hours. Please try again later.',
      );
    case 'MR002':
      return new AppError(409, 'INVALID_TRANSITION', error.message);
    case 'MR003':
    case '42501': // insufficient_privilege, incl. "new row violates row-level security policy"
      return forbidden();
    case 'MR004':
      return conflict('This field cannot be changed');
    case 'MR005':
      return conflict(error.message);
    case 'P0002':
    case 'PGRST116': // .single() matched no rows (RLS-hidden rows look identical: no oracle)
      return notFound();
    case '23505':
      return conflict('A record with these details already exists');
    case '23503':
      return new AppError(422, 'VALIDATION_FAILED', 'A referenced item does not exist');
    case '23514':
    case '22001':
    case '22P02':
      return new AppError(422, 'VALIDATION_FAILED', 'Some fields are invalid');
    case '57014': // statement_timeout
    case 'PGRST000':
    case 'PGRST001':
    case 'PGRST002':
      return upstreamUnavailable();
    default:
      return new AppError(500, 'INTERNAL', 'Something went wrong');
  }
}

/** Throws a mapped AppError when a Supabase response carries an error. */
export function throwIfDbError(error: DbErrorLike | null): void {
  if (error) {
    throw Object.assign(mapDbError(error), { cause: error });
  }
}
