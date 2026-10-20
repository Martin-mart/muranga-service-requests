import { z } from 'zod';

const commaList = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
);

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  SUPABASE_URL: z.url(),
  // The anon key is public by design; RLS (not key secrecy) protects data.
  SUPABASE_ANON_KEY: z.string().min(20),
  // Only for legacy projects that still sign JWTs with the shared HS256 secret.
  // Projects on asymmetric signing keys are verified via the public JWKS.
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  SUPABASE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),

  CORS_ORIGINS: commaList.pipe(z.array(z.url()).min(1)),
  // Number of proxies in front of the app (nginx / platform LB) so req.ip is the
  // real client IP for rate limiting, and spoofed X-Forwarded-For is ignored.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  BODY_LIMIT: z
    .string()
    .regex(/^\d+(kb|mb)$/)
    .default('100kb'),

  // Shared rate-limit counters across instances. Without it each instance
  // counts separately (limits are then per-instance).
  REDIS_URL: z.url().optional(),

  AUTH_REDIRECT_URL: z.url(),
  CAPTCHA_REQUIRED: booleanString.default(true),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  // Per-IP budget for all /api routes per 15 minutes. Raise temporarily for
  // load tests run from a single machine.
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(10).max(1_000_000).default(300),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
});

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly invalidKeys: string[]) {
    // Only key names are reported: values may be secrets.
    super(`Invalid or missing environment variables: ${invalidKeys.join(', ')}`);
    this.name = 'EnvValidationError';
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const keys = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new EnvValidationError(keys);
  }
  return result.data;
}
