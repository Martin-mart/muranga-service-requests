import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from './user.js';

/**
 * Per-request security context. `db` is a Supabase client bound to the caller's
 * JWT, so every query a repository runs with it is subject to Postgres RLS.
 */
export interface AuthContext {
  user: AuthUser;
  db: SupabaseClient;
}
