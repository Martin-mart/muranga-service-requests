export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'DAILY_LIMIT_REACHED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INTERNAL';

export interface FieldIssue {
  path: string;
  message: string;
}

/**
 * Errors that are SAFE to show to clients. Anything that is not an AppError is
 * treated as an internal error and replaced with a generic message.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: FieldIssue[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string): AppError => new AppError(400, 'BAD_REQUEST', message);
export const unauthenticated = (message = 'Authentication required'): AppError =>
  new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'You do not have permission to do this'): AppError =>
  new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Resource not found'): AppError =>
  new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string): AppError => new AppError(409, 'CONFLICT', message);
export const validationFailed = (details: FieldIssue[]): AppError =>
  new AppError(422, 'VALIDATION_FAILED', 'Some fields are invalid', details);
export const upstreamUnavailable = (): AppError =>
  new AppError(503, 'UPSTREAM_UNAVAILABLE', 'Service temporarily unavailable, please retry');
