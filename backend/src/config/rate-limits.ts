/**
 * Rate-limit budgets. Stricter on routes that are expensive or abusable
 * (signup sends email; upload URLs reserve storage). The database enforces
 * the 10-requests-per-24h business rule independently.
 */
export const RATE_LIMITS = {
  /** Default only; overridden by RATE_LIMIT_GLOBAL_MAX. */
  global: { windowMs: 15 * 60 * 1000, limit: 300 },
  register: { windowMs: 60 * 60 * 1000, limit: 5 },
  createRequest: { windowMs: 60 * 60 * 1000, limit: 20 },
  upload: { windowMs: 15 * 60 * 1000, limit: 10 },
  writeComment: { windowMs: 15 * 60 * 1000, limit: 30 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;
