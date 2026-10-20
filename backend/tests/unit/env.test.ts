import { describe, expect, it } from 'vitest';
import { EnvValidationError, loadEnv } from '../../src/config/env.js';

const valid = {
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key-anon-key-anon-key',
  CORS_ORIGINS: 'https://app.example.org, http://localhost:5173',
  AUTH_REDIRECT_URL: 'https://app.example.org/auth/callback',
};

describe('loadEnv', () => {
  it('parses and applies defaults', () => {
    const env = loadEnv(valid);
    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual(['https://app.example.org', 'http://localhost:5173']);
    expect(env.CAPTCHA_REQUIRED).toBe(true);
  });

  it('refuses to start without required secrets and reports only key names', () => {
    const attempt = () =>
      loadEnv({ ...valid, SUPABASE_ANON_KEY: undefined, SUPABASE_JWT_SECRET: 'short' });
    expect(attempt).toThrow(EnvValidationError);
    try {
      attempt();
    } catch (error) {
      expect((error as EnvValidationError).invalidKeys).toEqual([
        'SUPABASE_ANON_KEY',
        'SUPABASE_JWT_SECRET',
      ]);
      expect((error as Error).message).not.toContain('short');
    }
  });

  it('rejects a non-URL CORS origin', () => {
    expect(() => loadEnv({ ...valid, CORS_ORIGINS: '*' })).toThrow(EnvValidationError);
  });
});
