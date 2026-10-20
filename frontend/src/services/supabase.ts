import { createClient } from '@supabase/supabase-js';
import { env } from '../utils/env';

/**
 * Browser Supabase client, used ONLY for Auth (session issuance/refresh) and
 * Realtime (notification stream). All data reads/writes go through the
 * backend API. It holds the public anon key; RLS protects the data.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // PKCE: the email-confirmation redirect carries a one-time code instead of
    // tokens in the URL fragment.
    flowType: 'pkce',
  },
});

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
