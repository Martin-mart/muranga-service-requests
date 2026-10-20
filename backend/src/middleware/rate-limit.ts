import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit, type Store } from 'express-rate-limit';
import { RATE_LIMITS, type RateLimitName } from '../config/rate-limits.js';
import { AppError } from '../utils/errors.js';

export type RateLimiters = Record<RateLimitName, RequestHandler>;

/** Creates a store per limiter; undefined means the in-memory default. */
export type StoreFactory = (prefix: string) => Store | undefined;

// Behind the proxy, req.ip is the real client (see TRUST_PROXY_HOPS). IPv6
// addresses are grouped by /56 so one host cannot rotate through its subnet.
const byIp = (req: Request): string => ipKeyGenerator(req.ip ?? 'unknown');

// Authenticated routes are keyed per user so many citizens behind one
// carrier-grade NAT (common on Kenyan mobile networks) don't share a budget.
const byUserOrIp = (req: Request): string => (req.auth ? `user:${req.auth.user.id}` : byIp(req));

const KEYING: Record<RateLimitName, (req: Request) => string> = {
  global: byIp,
  register: byIp,
  createRequest: byUserOrIp,
  upload: byUserOrIp,
  writeComment: byUserOrIp,
};

export function createRateLimiters(
  storeFactory: StoreFactory,
  overrides: { globalMax?: number } = {},
): RateLimiters {
  const build = (name: RateLimitName): RequestHandler => {
    const store = storeFactory(`rl:${name}:`);
    const base = RATE_LIMITS[name];
    return rateLimit({
      windowMs: base.windowMs,
      limit: name === 'global' ? (overrides.globalMax ?? base.limit) : base.limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: KEYING[name],
      ...(store ? { store } : {}),
      handler: (_req, _res, next) => {
        next(
          new AppError(
            429,
            'RATE_LIMITED',
            'Too many requests. Please slow down and try again shortly.',
          ),
        );
      },
    });
  };

  return {
    global: build('global'),
    register: build('register'),
    createRequest: build('createRequest'),
    upload: build('upload'),
    writeComment: build('writeComment'),
  };
}
