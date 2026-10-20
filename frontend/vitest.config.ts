import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    env: {
      VITE_API_BASE_URL: 'https://api.test.local',
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-test-anon-key',
    },
  },
});
