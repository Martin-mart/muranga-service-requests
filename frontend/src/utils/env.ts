import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.url(),
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_TURNSTILE_SITE_KEY: z.string().optional(),
});

export interface AppEnv {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  turnstileSiteKey: string | null;
}

export class ConfigError extends Error {
  constructor(keys: string[]) {
    super(`Missing or invalid configuration: ${keys.join(', ')}`);
    this.name = 'ConfigError';
  }
}

function load(): AppEnv {
  const result = envSchema.safeParse(import.meta.env);
  if (!result.success) {
    throw new ConfigError(result.error.issues.map((issue) => issue.path.join('.')));
  }
  const values = result.data;
  return {
    apiBaseUrl: values.VITE_API_BASE_URL.replace(/\/$/, ''),
    supabaseUrl: values.VITE_SUPABASE_URL,
    supabaseAnonKey: values.VITE_SUPABASE_ANON_KEY,
    turnstileSiteKey: values.VITE_TURNSTILE_SITE_KEY?.trim()
      ? values.VITE_TURNSTILE_SITE_KEY
      : null,
  };
}

export const env: AppEnv = load();
