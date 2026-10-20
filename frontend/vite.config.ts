import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Only GET requests to OUR API are runtime-cached (NetworkFirst), so stale
  // data can be shown offline. Auth/Storage traffic to Supabase is never cached.
  const apiOrigin = env.VITE_API_BASE_URL ? new URL(env.VITE_API_BASE_URL).origin : '';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'offline.html', 'robots.txt'],
        manifest: {
          name: "Murang'a County Service Requests",
          short_name: 'Murang’a Services',
          description: 'Report and track public service issues in Murang’a County.',
          lang: 'en-KE',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#14532d',
          background_color: '#f7f8f6',
          categories: ['government', 'utilities'],
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/pwa-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // App shell + hashed assets precached; boxicons font included.
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: apiOrigin
            ? [
                {
                  urlPattern: ({ url, request }) =>
                    url.origin === apiOrigin &&
                    request.method === 'GET' &&
                    url.pathname.startsWith('/api/v1/'),
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'api-get',
                    networkTimeoutSeconds: 5,
                    expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
                    cacheableResponse: { statuses: [200] },
                  },
                },
              ]
            : [],
        },
        devOptions: { enabled: false },
      }),
    ],
    build: {
      sourcemap: false,
      target: 'es2022',
      rollupOptions: {
        output: {
          // Long-lived vendor chunks change rarely, so returning users keep them cached.
          manualChunks: {
            react: ['react', 'react-dom', 'react-dom/client', 'react-router'],
            query: ['@tanstack/react-query'],
            supabase: ['@supabase/supabase-js'],
            charts: ['recharts'],
          },
        },
      },
    },
    server: { port: 5173, strictPort: true },
  };
});
