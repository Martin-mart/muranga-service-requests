import type { SupabaseClient } from '@supabase/supabase-js';

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  captchaToken: string | undefined;
  redirectTo: string;
}

export type SignUpOutcome =
  | { ok: true }
  | {
      ok: false;
      reason: 'captcha_failed' | 'weak_password' | 'rate_limited' | 'unknown';
      detail: string;
    };

export interface AuthRepository {
  signUp(db: SupabaseClient, input: SignUpInput): Promise<SignUpOutcome>;
}

const KNOWN_REASONS: Record<string, Exclude<SignUpOutcome, { ok: true }>['reason']> = {
  captcha_failed: 'captcha_failed',
  weak_password: 'weak_password',
  over_email_send_rate_limit: 'rate_limited',
  over_request_rate_limit: 'rate_limited',
};

export const authRepository: AuthRepository = {
  async signUp(db, input) {
    // full_name / phone go into user_metadata only as INPUT for the profile
    // trigger, which sanitises them and never reads a role from metadata.
    const { error } = await db.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName, phone: input.phone },
        emailRedirectTo: input.redirectTo,
        ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
      },
    });
    if (!error) {
      return { ok: true };
    }
    const reason = (error.code && KNOWN_REASONS[error.code]) || 'unknown';
    return { ok: false, reason, detail: error.message };
  },
};
