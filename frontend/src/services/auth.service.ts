import { z } from 'zod';
import { dataEnvelope, meSchema } from '../schemas/api.schemas';
import type { Me } from '../types/api';
import { apiRequest, ApiError } from './api-client';
import { supabase } from './supabase';

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  captchaToken: string | undefined;
}

/** Signup goes through the backend so it is validated and rate-limited server-side. */
export async function register(payload: RegisterPayload): Promise<string> {
  const result = await apiRequest('/auth/register', {
    method: 'POST',
    authenticated: false,
    schema: dataEnvelope(z.object({ message: z.string() })),
    body: {
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone || undefined,
      password: payload.password,
      captchaToken: payload.captchaToken,
    },
  });
  return result.data.message;
}

export async function signIn(
  email: string,
  password: string,
  captchaToken?: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: captchaToken ? { captchaToken } : {},
  });
  if (error) {
    // Same message for wrong email and wrong password (no account enumeration).
    const message =
      error.code === 'email_not_confirmed'
        ? 'Please confirm your email address first. Check your inbox for the link.'
        : error.code === 'captcha_failed'
          ? 'CAPTCHA verification failed. Please try again.'
          : 'Incorrect email or password.';
    throw new ApiError(error.status ?? 400, error.code ?? 'AUTH_FAILED', message);
  }
}

/**
 * Starts a guest session (Supabase anonymous sign-in): a real but nameless
 * account that lives on this device. RLS applies exactly as for citizens, and
 * the database marks every request it submits as anonymous.
 */
export async function continueAsGuest(captchaToken?: string): Promise<void> {
  const { error } = await supabase.auth.signInAnonymously({
    options: captchaToken ? { captchaToken } : {},
  });
  if (error) {
    const message =
      error.code === 'anonymous_provider_disabled'
        ? 'Anonymous reporting is not available right now. Please create an account.'
        : error.code === 'captcha_failed'
          ? 'CAPTCHA verification failed. Please try again.'
          : 'Could not start guest mode. Please try again.';
    throw new ApiError(error.status ?? 400, error.code ?? 'AUTH_FAILED', message);
  }
}

/**
 * Signs out and removes every trace of the session's data from this device:
 * API responses cached by the service worker for offline use are deleted so
 * the next person using a shared phone cannot see them.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  if ('caches' in window) {
    await caches.delete('api-get');
  }
}

export async function fetchMe(signal?: AbortSignal): Promise<Me> {
  const result = await apiRequest('/me', { schema: dataEnvelope(meSchema), signal });
  return result.data;
}
