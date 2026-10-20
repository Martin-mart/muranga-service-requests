# Murang'a Service Requests — Web app (PWA)

React 19 + Vite + TypeScript (strict). Talks to the backend **only** through
its REST API (`src/services/api-client.ts`), plus Supabase Auth (sessions) and
Realtime (notifications). See the [root README](../README.md) for architecture
and deployment.

## Quick start

```bash
cp .env.example .env     # VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TURNSTILE_SITE_KEY
npm ci
npm run dev              # http://localhost:5173
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Generate icon CSS, typecheck, production build (+ service worker) |
| `npm run preview` | Serve the production build on :4173 (test PWA install/offline here) |
| `npm test` | Vitest + React Testing Library |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | Quality gates (CI) |
| `npm run icons` | Regenerate `src/styles/icons.css` after adding a Boxicons class |

## Structure

```
src/
  pages/        route components (lazy-loaded): auth/, citizen/, admin/
  components/   ui/ (design system), layout/, auth/, requests/, admin/
  hooks/        TanStack Query hooks + small browser hooks
  services/     api-client (typed fetch), auth, requests, admin, notifications (Realtime), offline-queue
  schemas/      Zod: API response contracts + form validation
  styles/       tokens.css, base.css, icons.css (generated), layout/, components/, pages/ (BEM, one file per feature)
  utils/        env validation, formatting, status metadata, query client & keys
```

## Conventions

- **Styling**: BEM classes in dedicated `.css` files imported by the component that owns them. **No inline styles** and no `dangerouslySetInnerHTML`; both are blocked by ESLint (`no-restricted-syntax`). Colours, spacing and radii come from `styles/tokens.css`; dark mode is a token swap.
- **Icons**: Boxicons only (`<Icon name="bx-..." />`), always decorative (`aria-hidden`) next to visible text or an `aria-label`. No emoji in the UI.
- **Status** is shown as text + icon + colour (never colour alone).
- **Route guards are UX only.** The API and Postgres RLS make the real authorisation decisions.
- **Data**: every response is validated with Zod (`schemas/api.schemas.ts`); query keys live in `utils/query-client.ts`.
- **Charts** use colours from tokens (validated for colour-vision deficiency in both themes), a legend for 2+ series, hover tooltips, and a "Show data as a table" alternative.

## PWA

Configured in `vite.config.ts` (vite-plugin-pwa, `generateSW`):
manifest (name, icons incl. maskable, theme colour, standalone), precached app
shell, **NetworkFirst** runtime cache for API `GET`s (5 s network timeout),
`navigateFallback` to the app shell plus `public/offline.html`, an
**update-available prompt** (`registerType: 'prompt'`), and an offline
submission queue (`services/offline-queue.ts` + `hooks/useOfflineQueueSync.ts`)
replayed with idempotency keys. Signing out clears the API cache.

Test it with `npm run build && npm run preview`, then DevTools → Application → Service workers / Manifest, and Network → Offline.

## Deployment

`vercel.json` contains SPA rewrites, CSP and security headers, and caching
rules. **Before going live, replace the wildcard hosts in `connect-src` and
`img-src` with your exact Supabase project and API hosts.**
