import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { AppError, notFound } from '../utils/errors.js';

interface BodyParserError {
  type: string;
  status: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (isBodyParserError(error)) {
    if (error.type === 'entity.too.large') {
      return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    }
    if (error.status < 500) {
      return new AppError(400, 'BAD_REQUEST', 'Malformed request body');
    }
  }
  return new AppError(500, 'INTERNAL', 'Something went wrong. Please try again later.');
}

export const notFoundHandler: RequestHandler = () => {
  throw notFound('Route not found');
};

/**
 * Single exit point for errors. Clients get a stable shape with a request id
 * they can quote to support; stack traces and internal messages are logged
 * server-side only.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    const appError = toAppError(error);
    const log = logger.child({ requestId: req.requestId });
    if (appError.status >= 500) {
      log.error({ err: error, cause: appError.cause }, 'request failed');
    } else {
      log.warn({ code: appError.code, status: appError.status }, appError.message);
    }

    if (res.headersSent) {
      return;
    }
    res.status(appError.status).json({
      error: {
        code: appError.code,
        message: appError.message,
        requestId: req.requestId,
        ...(appError.details ? { details: appError.details } : {}),
      },
    });
  };
}
