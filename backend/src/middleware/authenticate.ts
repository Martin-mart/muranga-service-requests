import type { Request, RequestHandler } from 'express';
import type { SupabaseFactory } from '../config/supabase.js';
import type { AuthContext } from '../models/context.js';
import type { ProfileRepository } from '../repositories/profile.repository.js';
import type { TokenVerifier } from '../services/token-verifier.js';
import { unauthenticated } from '../utils/errors.js';

const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

export interface AuthenticateDeps {
  verifier: TokenVerifier;
  supabase: Pick<SupabaseFactory, 'forUser'>;
  profiles: ProfileRepository;
}

/**
 * 1. Verifies the Supabase JWT (signature, issuer, audience, expiry).
 * 2. Loads the role from public.profiles, the trusted source; JWT
 *    user_metadata is user-editable and is never consulted.
 * 3. Attaches a Supabase client bound to the caller's JWT, so all downstream
 *    queries run under RLS as that user.
 */
export function createAuthenticate(deps: AuthenticateDeps): RequestHandler {
  return async (req, _res, next) => {
    const token = BEARER.exec(req.get('authorization') ?? '')?.[1];
    if (!token) {
      throw unauthenticated();
    }

    const claims = await deps.verifier.verify(token);
    const db = deps.supabase.forUser(token);
    const profile = await deps.profiles.findById(db, claims.userId);
    if (!profile) {
      throw unauthenticated('Account not found');
    }

    req.auth = {
      db,
      user: {
        id: profile.id,
        email: claims.email,
        role: profile.role,
        fullName: profile.fullName,
        phone: profile.phone,
      },
    };
    next();
  };
}

/** Narrowing accessor for controllers on authenticated routes. */
export function requireAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw unauthenticated();
  }
  return req.auth;
}
