# Murang'a County Public Service Request System

A web app where residents of Murang'a County report public service problems
(broken streetlights, water supply, garbage collection, roads, drainage and
more) and county officers review, update and resolve them.

- **Citizens** register, submit requests with an optional photo and location,
  and follow each request from Pending → In progress → Resolved.
- **Officers (admins)** filter and search all requests, change their status,
  leave notes, and view analytics.

**Live:** [muranga-web.vercel.app](https://muranga-web.vercel.app) · API: [muranga-api.vercel.app](https://muranga-api.vercel.app/health)

## Tech stack

| Part | Built with |
|---|---|
| Frontend | React 19, Vite, TypeScript, React Router, TanStack Query, installable PWA |
| Backend | Node.js 22, Express 5, TypeScript, Zod |
| Database & auth | Supabase (Postgres with row-level security, Auth, Storage, Realtime) |
| Hosting | Vercel (frontend and API) |

## Project structure

```
.
├── backend/                  REST API
│   ├── api/index.js          Vercel entry point
│   ├── src/
│   │   ├── routes/           URL → controller mapping
│   │   ├── controllers/      HTTP request/response handling
│   │   ├── services/         Business logic
│   │   ├── repositories/     Supabase queries
│   │   ├── middleware/       Auth, rate limiting, errors
│   │   ├── validators/       Zod request schemas
│   │   ├── config/           Environment, logger, Supabase client
│   │   └── server.ts         Standalone server (local / Docker)
│   ├── supabase/
│   │   ├── migrations/       Database schema, security rules, storage
│   │   ├── seed.sql          Categories and sub-counties
│   │   └── tests/            Database security tests
│   ├── tests/                Unit, integration and load tests
│   └── openapi.yaml          API contract
├── frontend/                 React app
│   └── src/
│       ├── pages/            Screens (auth, citizen, admin)
│       ├── components/       Reusable UI
│       ├── services/         API and Supabase calls
│       ├── hooks/            Data fetching and shared logic
│       ├── schemas/          Form and API validation
│       └── styles/           CSS
├── nginx/                    Load balancer config for the Docker demo
└── docker-compose.yml        Runs 2 API replicas + nginx + Redis locally
```

The frontend and backend are independent apps. They talk only over HTTP, as
described in `backend/openapi.yaml`.

## Setup

### Prerequisites

- Node.js 22 or newer
- A [Supabase](https://supabase.com) project

### 1. Database

From Supabase → **Project Settings → API Keys**, copy the project URL and the
**publishable** key. Then apply the schema and seed data using the **Session
pooler** connection string (Supabase → **Connect**):

```bash
cd backend
npx supabase db push --include-seed --db-url "<session pooler connection string>"
```

In the Supabase dashboard, under **Authentication**:

- Turn on **Confirm email**.
- Under **URL Configuration**, set the Site URL to your frontend address and add
  `<frontend>/auth/callback` to the Redirect URLs (for local work:
  `http://localhost:5173/auth/callback`).

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev            # http://localhost:4000/health
```

Set these in `backend/.env`:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase publishable key |
| `CORS_ORIGINS` | Frontend address, e.g. `http://localhost:5173` |
| `AUTH_REDIRECT_URL` | `http://localhost:5173/auth/callback` |
| `CAPTCHA_REQUIRED` | `false` unless CAPTCHA is enabled in Supabase |

### 3. Frontend

In a new terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

Set these in `frontend/.env`:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase publishable key |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key, or empty to disable CAPTCHA |

Never put the Supabase `service_role` or secret key in either app; neither
needs it.

### 4. Create an admin

Register an account in the app and confirm the email, then run this in the
Supabase **SQL editor**:

```sql
update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'you@example.com');
```

Sign out and back in to see the admin dashboard.

## Running tests

```bash
cd backend && npm test
cd frontend && npm test
```

## Deployment

Both apps are deployed on Vercel as separate projects connected to this
repository. Every push to `main` deploys them automatically.

| Vercel project | Root directory |
|---|---|
| `muranga-api` | `backend` |
| `muranga-web` | `frontend` |

Set the same environment variables as above in each project's Vercel
settings, using the production addresses (for example `CORS_ORIGINS=https://muranga-web.vercel.app`).
