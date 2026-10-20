-- =============================================================================
-- 0200 Tables, constraints and indexes.
--
-- Growth assumptions (Murang'a County, ~1.06M residents, 2019 census):
--   profiles                 ~ up to 200k rows after several years (adult
--                            smartphone users who report at least once).
--   categories/sub_counties  tiny, effectively static (< 50 rows).
--   service_requests         ~ 50-500 / day at maturity => ~20k-180k / year.
--   request_status_history   ~ 3 rows per request (created, in_progress, resolved).
--   request_comments         ~ 1-3 rows per request.
--   notifications            ~ 2-5 rows per request, mostly read once.
-- At these volumes a single Postgres instance with the composite indexes below
-- comfortably serves all list/filter queries from index scans. Partitioning by
-- created_at becomes worth considering only past ~10M service_requests.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: one row per auth.users row. Role lives HERE (trusted, RLS-guarded),
-- never in user_metadata, which users can edit themselves.
-- Growth: 1 row per registered citizen; PK lookups only (auth middleware loads
-- the caller's profile on every API call), so no secondary index is needed.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key
              -- Deleting the auth user deletes the profile. Requests reference
              -- profiles with ON DELETE RESTRICT, so a citizen with filed
              -- requests cannot be hard-deleted by accident (public record);
              -- an operator must anonymise first.
              references auth.users (id) on delete cascade,
  full_name   text not null
              check (char_length(btrim(full_name)) between 2 and 100),
  -- Kenyan mobile numbers in E.164: +2547XXXXXXXX or +2541XXXXXXXX.
  phone       text
              check (phone is null or phone ~ '^\+254(7|1)[0-9]{8}$'),
  role        public.user_role not null default 'citizen',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Trusted user profile. role is the ONLY source of authorization truth (never JWT user_metadata).';

-- -----------------------------------------------------------------------------
-- categories: reference data. Growth: static (< 50 rows). Seq scans are
-- cheaper than index scans at this size; the UNIQUE index on slug exists for
-- integrity, not speed.
-- -----------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 50),
  name        text not null unique check (char_length(btrim(name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 300),
  is_active   boolean not null default true,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- sub_counties: reference data. Growth: static (9 rows). Same reasoning as
-- categories.
-- -----------------------------------------------------------------------------
create table public.sub_counties (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 50),
  name        text not null unique check (char_length(btrim(name)) between 2 and 80),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Global, gap-tolerant sequence for human-readable reference numbers.
-- Sequences are non-transactional, so a rolled-back insert "burns" a number;
-- that is acceptable for a reference number (uniqueness is what matters).
create sequence public.service_request_ref_seq as bigint start 1 minvalue 1;

-- -----------------------------------------------------------------------------
-- service_requests: the core table.
-- Growth: ~20k-180k rows/year. Access patterns and their indexes:
--   1. Citizen "My requests" (cursor pagination)  -> (citizen_id, created_at desc, id desc)
--   1b. Admin list unfiltered / analytics window  -> (created_at desc, id desc)
--   2. Admin queue filtered by status             -> (status, created_at desc, id desc)
--   3. Admin open-work queue (most common view)   -> partial index on open statuses
--   4. Admin filter by category / sub-county      -> (category_id), (sub_county_id)
--   5. Admin free-text search                     -> GIN on search_vector
--   6. Daily quota trigger                        -> served by index 1
-- -----------------------------------------------------------------------------
create table public.service_requests (
  id                uuid primary key default gen_random_uuid(),
  reference_number  text not null unique
                    default (
                      'MRG-' || to_char(now() at time zone 'Africa/Nairobi', 'YYYY') || '-' ||
                      lpad(nextval('public.service_request_ref_seq')::text, 6, '0')
                    )
                    check (reference_number ~ '^MRG-[0-9]{4}-[0-9]{6,}$'),
  -- Default to the caller so clients never need to (and cannot meaningfully)
  -- supply it; RLS additionally requires citizen_id = auth.uid().
  citizen_id        uuid not null default auth.uid()
                    references public.profiles (id) on delete restrict,
  -- RESTRICT: retiring a category must be done with is_active = false so
  -- historical requests keep their classification.
  category_id       uuid not null references public.categories (id) on delete restrict,
  sub_county_id     uuid not null references public.sub_counties (id) on delete restrict,
  location_text     text not null check (char_length(btrim(location_text)) between 3 and 200),
  latitude          double precision check (latitude is null or latitude between -90 and 90),
  longitude         double precision check (longitude is null or longitude between -180 and 180),
  description       text not null check (char_length(btrim(description)) between 10 and 2000),
  -- Object key inside the private "request-images" bucket:
  --   {citizen_id}/{request_id}/{random uuid}.{jpg|png|webp}
  image_path        text,
  status            public.request_status not null default 'pending',
  resolved_at       timestamptz,
  -- Client-generated key making offline/retried submissions idempotent.
  idempotency_key   uuid,
  search_vector     tsvector generated always as (
                      setweight(to_tsvector('simple', coalesce(reference_number, '')), 'A') ||
                      setweight(to_tsvector('english', coalesce(location_text, '')), 'B') ||
                      setweight(to_tsvector('english', coalesce(description, '')), 'C')
                    ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Coordinates are meaningful only as a pair.
  constraint service_requests_coords_pair
    check ((latitude is null) = (longitude is null)),
  -- resolved_at must agree with status (set by trigger, enforced here too).
  constraint service_requests_resolved_consistency
    check ((status = 'resolved') = (resolved_at is not null)),
  constraint service_requests_resolved_after_created
    check (resolved_at is null or resolved_at >= created_at),
  -- Images can only live under the owner's folder, with a randomized name.
  constraint service_requests_image_path_format
    check (
      image_path is null or (
        split_part(image_path, '/', 1) = citizen_id::text
        and image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
      )
    ),
  constraint service_requests_idempotency_unique unique (citizen_id, idempotency_key)
);

-- (1) Citizen history list + the 24h quota count. Leading citizen_id gives an
-- equality seek; created_at desc, id desc matches the cursor ORDER BY so the
-- page is read straight off the index without a sort.
create index service_requests_citizen_created_idx
  on public.service_requests (citizen_id, created_at desc, id desc);

-- (1b) Admin list with no status filter (default view) and the analytics
-- 30-day window: newest-first keyset scan without a sort.
create index service_requests_created_idx
  on public.service_requests (created_at desc, id desc);

-- (2) Admin list filtered by status, newest first, cursor-paginated.
create index service_requests_status_created_idx
  on public.service_requests (status, created_at desc, id desc);

-- (3) Partial index: the admin "open work" view only touches unresolved rows.
-- Resolved rows (the majority over time) are excluded, keeping this index small
-- and hot in cache as the table grows.
create index service_requests_open_created_idx
  on public.service_requests (created_at desc, id desc)
  where status <> 'resolved';

-- (4) FK filter columns. Also prevents slow FK checks if a category or
-- sub-county row is ever updated/deleted (Postgres does not index FKs itself).
create index service_requests_category_idx on public.service_requests (category_id);
create index service_requests_sub_county_idx on public.service_requests (sub_county_id);

-- (5) Admin search. websearch_to_tsquery() against a stored tsvector keeps
-- search parameterised (no LIKE pattern injection) and index-backed.
create index service_requests_search_idx
  on public.service_requests using gin (search_vector);

comment on table public.service_requests is
  'Citizen-submitted service requests. Status changes only via public.change_request_status().';

-- -----------------------------------------------------------------------------
-- request_status_history: append-only audit log written exclusively by
-- triggers. Growth: ~3x service_requests. Always read per request ordered by
-- time -> (request_id, created_at).
-- -----------------------------------------------------------------------------
create table public.request_status_history (
  id           uuid primary key default gen_random_uuid(),
  -- CASCADE: history has no meaning without its request (requests themselves
  -- are protected from deletion by RLS/grants).
  request_id   uuid not null references public.service_requests (id) on delete cascade,
  from_status  public.request_status,
  to_status    public.request_status not null,
  -- RESTRICT: never lose the identity of whoever changed a status.
  changed_by   uuid not null references public.profiles (id) on delete restrict,
  -- Snapshot of the actor's role so citizens can see "County officer" without
  -- being able to read admin profiles.
  actor_role   public.user_role not null,
  note         text check (note is null or char_length(note) between 1 and 1000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint request_status_history_changes_status
    check (from_status is distinct from to_status)
);

create index request_status_history_request_idx
  on public.request_status_history (request_id, created_at);

-- -----------------------------------------------------------------------------
-- request_comments: conversation on a request. is_public = false marks
-- internal admin notes that citizens can never read.
-- Growth: ~1-3x service_requests. Read per request, oldest first, cursor
-- paginated -> (request_id, created_at, id).
-- -----------------------------------------------------------------------------
create table public.request_comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.service_requests (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete restrict,
  author_role public.user_role not null,
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index request_comments_request_created_idx
  on public.request_comments (request_id, created_at, id);

-- -----------------------------------------------------------------------------
-- notifications: per-user inbox, streamed to the browser via Supabase Realtime.
-- Growth: ~2-5x service_requests; old read rows can be pruned after 90 days.
-- -----------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  request_id  uuid references public.service_requests (id) on delete cascade,
  type        public.notification_type not null,
  title       text not null check (char_length(title) between 1 and 120),
  body        text not null check (char_length(body) between 1 and 500),
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Required (user_id, read_at) index: serves "unread for user" lookups
-- (read_at IS NULL is an equality-style predicate on the second column) and the
-- RLS predicate user_id = auth.uid().
create index notifications_user_read_idx
  on public.notifications (user_id, read_at);

-- Inbox listing is newest-first with cursor pagination; this index returns a
-- page without sorting.
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc, id desc);

-- Supporting FK index so cascading deletes of a request don't seq-scan.
create index notifications_request_idx
  on public.notifications (request_id) where request_id is not null;

-- -----------------------------------------------------------------------------
-- updated_at triggers on every table.
-- -----------------------------------------------------------------------------
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger sub_counties_set_updated_at before update on public.sub_counties
  for each row execute function public.set_updated_at();
create trigger service_requests_set_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();
create trigger request_status_history_set_updated_at before update on public.request_status_history
  for each row execute function public.set_updated_at();
create trigger request_comments_set_updated_at before update on public.request_comments
  for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();
