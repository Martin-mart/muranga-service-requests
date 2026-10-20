import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createResilientFetch } from '../utils/resilient-fetch.js';
import type { Env } from './env.js';

/**
 * Factories for Supabase clients. The backend deliberately has NO
 * service_role client: every privileged operation is a narrowly scoped
 * SECURITY DEFINER function invoked with the caller's own JWT, so a backend
 * compromise cannot read or write data beyond what that caller could.
 */
export interface SupabaseFactory {
  /** Client acting AS the caller: RLS applies to every query. */
  forUser(accessToken: string): SupabaseClient;
  /** Shared unauthenticated client for public reference data and readiness. */
  anon(): SupabaseClient;
  /**
   * Fresh unauthenticated client for Auth calls (signup). Never the shared
   * client: a successful auth call stores a session on the client instance,
   * which would make later "anonymous" queries run as that user.
   */
  isolatedAuth(): SupabaseClient;
}

const serverAuthOptions = {
  // Stateless server: never store or refresh sessions in memory.
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

export function createSupabaseFactory(env: Env): SupabaseFactory {
  const fetchWithPolicy = createResilientFetch({
    timeoutMs: env.SUPABASE_TIMEOUT_MS,
    retries: 2,
    baseDelayMs: 100,
  });

  const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: serverAuthOptions,
    global: { fetch: fetchWithPolicy },
  });

  return {
    forUser(accessToken) {
      // A client per request is cheap (no sockets of its own; Node's global
      // fetch pool is shared) and makes cross-request token mixups impossible.
      return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: serverAuthOptions,
        global: {
          fetch: fetchWithPolicy,
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      });
    },
    anon() {
      return anonClient;
    },
    isolatedAuth() {
      return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: serverAuthOptions,
        global: { fetch: fetchWithPolicy },
      });
    },
  };
}
