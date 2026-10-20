import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { unauthenticated } from '../utils/errors.js';

export interface VerifiedToken {
  userId: string;
  email: string | null;
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedToken>;
}

const claimsSchema = z.object({
  sub: z.uuid(),
  role: z.literal('authenticated'),
  email: z.string().optional(),
});

function toVerified(payload: JWTPayload): VerifiedToken {
  const claims = claimsSchema.parse(payload);
  return { userId: claims.sub, email: claims.email ?? null };
}

/**
 * Verifies Supabase access tokens locally (no network call per request):
 *  - asymmetric signing keys (default for new projects) via the public JWKS,
 *    fetched once and cached; key rotation is picked up automatically;
 *  - legacy HS256 shared secret when SUPABASE_JWT_SECRET is configured.
 * Issuer, audience, expiry and algorithm are all pinned, so tokens from other
 * projects, `anon` tokens and `alg: none` tokens are rejected.
 */
export function createTokenVerifier(
  env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_JWT_SECRET'>,
): TokenVerifier {
  const issuer = `${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;
  const options = { issuer, audience: 'authenticated', clockTolerance: 5 };

  const verifyPayload: (token: string) => Promise<JWTPayload> = env.SUPABASE_JWT_SECRET
    ? (() => {
        const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
        return async (token) =>
          (await jwtVerify(token, secret, { ...options, algorithms: ['HS256'] })).payload;
      })()
    : (() => {
        const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
          cacheMaxAge: 10 * 60 * 1000,
          timeoutDuration: 5000,
        });
        return async (token) =>
          (await jwtVerify(token, jwks, { ...options, algorithms: ['ES256', 'RS256'] })).payload;
      })();

  return {
    async verify(token) {
      try {
        return toVerified(await verifyPayload(token));
      } catch {
        // Do not reveal WHY a token failed (expired vs. forged).
        throw unauthenticated('Your session is invalid or has expired. Please sign in again.');
      }
    },
  };
}
