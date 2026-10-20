import { env } from './env';

/** CAPTCHA is required whenever a Turnstile site key is configured. */
export const captchaEnabled = (): boolean => env.turnstileSiteKey !== null;
