import type { SupabaseFactory } from '../config/supabase.js';
import type { AuthUser } from '../models/user.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import { AppError, badRequest, upstreamUnavailable } from '../utils/errors.js';
import type { RegisterInput } from '../validators/auth.validators.js';

export interface AuthService {
  register(input: RegisterInput): Promise<void>;
  me(user: AuthUser): AuthUser;
}

interface Deps {
  authRepo: AuthRepository;
  supabase: Pick<SupabaseFactory, 'isolatedAuth'>;
  redirectTo: string;
  captchaRequired: boolean;
}

export function createAuthService(deps: Deps): AuthService {
  return {
    async register(input) {
      if (deps.captchaRequired && !input.captchaToken) {
        throw badRequest('Please complete the CAPTCHA check');
      }

      const outcome = await deps.authRepo.signUp(deps.supabase.isolatedAuth(), {
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        phone: input.phone,
        captchaToken: input.captchaToken,
        redirectTo: deps.redirectTo,
      });

      // Success is reported identically for new and already-registered emails
      // (Supabase does the same with confirmations on): no account enumeration.
      if (outcome.ok) {
        return;
      }
      switch (outcome.reason) {
        case 'captcha_failed':
          throw badRequest('CAPTCHA verification failed. Please try again.');
        case 'weak_password':
          throw new AppError(422, 'VALIDATION_FAILED', 'Please choose a stronger password');
        case 'rate_limited':
          throw new AppError(
            429,
            'RATE_LIMITED',
            'Too many sign-up attempts. Please wait and retry.',
          );
        case 'unknown':
          throw Object.assign(upstreamUnavailable(), { cause: new Error(outcome.detail) });
      }
    },

    me(user) {
      return user;
    },
  };
}
