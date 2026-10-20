import { pino, type Logger } from 'pino';

/**
 * Structured JSON logs (one line per event) for log aggregation. Credentials
 * are redacted at the logger level so no code path can accidentally leak them.
 */
export function createLogger(level: string, pretty = false): Logger {
  return pino({
    level,
    base: { service: 'muranga-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.captchaToken',
        '*.token',
        '*.accessToken',
        '*.access_token',
        '*.refresh_token',
      ],
      censor: '[REDACTED]',
    },
    ...(pretty ? { transport: { target: 'pino-pretty' } } : {}),
  });
}
