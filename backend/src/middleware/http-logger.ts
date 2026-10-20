import type { RequestHandler } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

/**
 * One structured log line per request with the request id. Only safe request
 * fields are serialised: no headers (Authorization), no bodies (PII).
 */
export function createHttpLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: (req) => (req as unknown as { requestId: string }).requestId,
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: { ignore: (req) => req.url === '/health' },
    serializers: {
      req: (req: { id: string; method: string; url: string; remoteAddress?: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
