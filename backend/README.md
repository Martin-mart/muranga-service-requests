# Murang'a Service Requests — API

Express 5 + TypeScript (strict) REST API. Contract: [`openapi.yaml`](openapi.yaml).
See the [root README](../README.md) for architecture, security model and deployment.

## Quick start

```bash
cp .env.example .env        # fill in SUPABASE_URL, SUPABASE_ANON_KEY, CORS_ORIGINS, AUTH_REDIRECT_URL
npm ci
npm run dev                 # http://localhost:4000/health
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Watch mode (tsx) with `.env` |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm test` | Unit + Supertest integration tests (Vitest) |
| `npm run test:coverage` | With coverage |
| `npm run test:load` | autocannon load test (see `tests/load/`) |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | Quality gates (CI) |
| `npm run audit` | `npm audit` for production dependencies |

## Layout

```
src/
  config/        env validation (Zod, refuses to boot), logger, Supabase client factories, rate-limit budgets
  middleware/    request-id, http logger, authenticate (JWT + profile role), requireRole, rate limiters, cache headers, error handler
  routes/        Express routers, versioned under /api/v1 (health probes at /health, /ready)
  controllers/   thin: parse + validate input, call a service, shape the response
  services/      all business logic (pure functions of injected repositories)
  repositories/  the ONLY code that talks to Supabase; parses every row with Zod
  validators/    Zod schemas for bodies, params and queries (+ text sanitisation)
  models/        domain types
  utils/         errors, DB error mapping, cursors, sanitising, TTL cache, resilient fetch
  container.ts   composition root (wires real implementations)
  app.ts         Express app factory (used by tests with fakes)
  server.ts      process entry: listen, keep-alive tuning, graceful shutdown
supabase/
  migrations/    all schema changes
  seed.sql       idempotent reference data
  tests/         rls_test.sql + supabase_stub.sql (vanilla Postgres for CI)
tests/
  unit/          services, cursors, sanitising, env, JWT verifier, retry policy
  integration/   Supertest: auth, role guard, validation, rate limit, caching, hardening
  load/          autocannon + k6 scripts
```

## Design notes

- **Per-request Supabase client with the caller's JWT** (`SupabaseFactory.forUser`): every query runs under RLS. There is **no service-role client**.
- **Error mapping**: database triggers raise custom SQLSTATEs (`MR001` quota → 429, `MR002` bad transition → 409, `MR003` forbidden → 403...). `utils/db-errors.ts` maps them; raw DB messages never reach clients.
- **Resilience**: every Supabase call has a timeout; idempotent GETs retry with jittered exponential backoff; writes never auto-retry (they use idempotency keys instead).
- **Statelessness**: no sessions. The reference-data TTL cache holds public data only, so instances can disagree for at most 5 minutes, which is harmless.
- **Graceful shutdown**: on `SIGTERM`, `/ready` returns 503, the server stops accepting connections, drains in-flight requests, closes Redis and exits (hard deadline `SHUTDOWN_TIMEOUT_MS`).

## Database tests

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
```
