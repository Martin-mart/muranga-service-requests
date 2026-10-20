-- =============================================================================
-- Minimal emulation of the objects a Supabase project provides (roles, auth
-- schema, storage schema, realtime publication) so that the real migrations
-- and rls_test.sql can run on vanilla Postgres in CI, without Docker or the
-- Supabase CLI. Never run this against a real Supabase database.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id                 uuid primary key,
  email              text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- Same resolution order as Supabase's auth.uid().
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$$;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null unique,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text not null,
  owner     uuid
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  _parts text[];
begin
  _parts := string_to_array(name, '/');
  return _parts[1:array_length(_parts, 1) - 1];
end;
$$;

grant usage on schema auth, storage, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant select, insert on storage.objects to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;
