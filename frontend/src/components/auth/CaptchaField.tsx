import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import type { Ref } from 'react';
import { env } from '../../utils/env';

interface CaptchaFieldProps {
  onToken: (token: string | undefined) => void;
  ref?: Ref<TurnstileInstance | undefined>;
}

/**
 * Cloudflare Turnstile. Supabase Auth verifies the token server-side, so the
 * widget alone grants nothing. Rendered only when a site key is configured
 * (local development can run without CAPTCHA).
 */
export function CaptchaField({ onToken, ref }: CaptchaFieldProps) {
  if (!env.turnstileSiteKey) {
    return null;
  }
  return (
    <Turnstile
      ref={ref}
      siteKey={env.turnstileSiteKey}
      options={{ theme: 'auto', size: 'flexible', language: 'auto' }}
      onSuccess={(token) => {
        onToken(token);
      }}
      onExpire={() => {
        onToken(undefined);
      }}
      onError={() => {
        onToken(undefined);
      }}
    />
  );
}
