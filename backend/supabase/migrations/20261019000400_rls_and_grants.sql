-- =============================================================================
-- 0400 Row Level Security + least-privilege grants.
--
-- Two independent layers:
--   1. GRANTs decide which COLUMNS a role may touch at all (e.g. citizens can
--      never write status, citizen_id, reference_number or profiles.role).
--   2. RLS policies decide which ROWS a role may touch.
-- Supabase's default privileges grant ALL to anon/authenticated on new tables,
-- so everything is revoked first and re-granted explicitly.
--
-- Policies wrap auth.uid()/helpers in (select ...) so Postgres evaluates them
-- once per statement (InitPlan) instead of once per row.
-- =============================================================================

alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.sub_counties           enable row level security;
alter table public.service_requests       enable row level security;
alter table public.request_status_history enable row level security;
alter table public.request_comments       enable row level security;
alter table public.notifications          enable row level security;

revoke all on table
  public.profiles, public.categories, public.sub_counties, public.service_requests,
  public.request_status_history, public.request_comments, public.notifications
from anon, authenticated;

revoke all on sequence public.service_request_ref_seq from anon, authenticated;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
grant select on public.profiles to authenticated;
-- No `role`, no `id`: self-promotion is impossible at the privilege layer.
grant update (full_name, phone) on public.profiles to authenticated;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- No INSERT policy: profiles are created only by handle_new_user().
-- No DELETE policy: profiles follow auth.users deletion.

-- -----------------------------------------------------------------------------
-- categories / sub_counties (public reference data, admin-managed)
-- -----------------------------------------------------------------------------
grant select on public.categories, public.sub_counties to anon, authenticated;
grant insert, update on public.categories, public.sub_counties to authenticated;

create policy categories_select_active on public.categories
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy categories_admin_insert on public.categories
  for insert to authenticated
  with check ((select public.is_admin()));

create policy categories_admin_update on public.categories
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy sub_counties_select_active on public.sub_counties
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy sub_counties_admin_insert on public.sub_counties
  for insert to authenticated
  with check ((select public.is_admin()));

create policy sub_counties_admin_update on public.sub_counties
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- service_requests
-- -----------------------------------------------------------------------------
grant select on public.service_requests to authenticated;
-- Only user-authored columns are insertable. citizen_id defaults to auth.uid();
-- status / reference_number / resolved_at / image_path are server-owned.
grant insert (category_id, sub_county_id, location_text, latitude, longitude, description, idempotency_key)
  on public.service_requests to authenticated;
-- Only status is updatable, and the policy below restricts it to admins; the
-- transition trigger restricts it further to legal transitions.
grant update (status) on public.service_requests to authenticated;
grant usage on sequence public.service_request_ref_seq to authenticated;

create policy service_requests_select_own_or_admin on public.service_requests
  for select to authenticated
  using (citizen_id = (select auth.uid()) or (select public.is_admin()));

-- Unverified email users cannot create requests.
create policy service_requests_insert_own_verified on public.service_requests
  for insert to authenticated
  with check (
    citizen_id = (select auth.uid())
    and (select public.is_email_verified())
  );

create policy service_requests_update_admin on public.service_requests
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
-- No DELETE policy (and no DELETE grant): requests are public records.

-- -----------------------------------------------------------------------------
-- request_status_history (read-only to clients; written by triggers)
-- -----------------------------------------------------------------------------
grant select on public.request_status_history to authenticated;

create policy status_history_select_own_or_admin on public.request_status_history
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.service_requests r
       where r.id = request_status_history.request_id
         and r.citizen_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- request_comments
-- -----------------------------------------------------------------------------
grant select on public.request_comments to authenticated;
grant insert (request_id, body, is_public) on public.request_comments to authenticated;

-- Citizens: only PUBLIC comments on their OWN requests. Admins: everything.
create policy comments_select_public_own_or_admin on public.request_comments
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      is_public
      and exists (
        select 1 from public.service_requests r
         where r.id = request_comments.request_id
           and r.citizen_id = (select auth.uid())
      )
    )
  );

-- Admins may comment anywhere (public or internal). Citizens may reply on their
-- own requests (the BEFORE INSERT trigger forces is_public = true for them).
create policy comments_insert_admin_or_owner on public.request_comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select public.is_email_verified())
    and (
      (select public.is_admin())
      or exists (
        select 1 from public.service_requests r
         where r.id = request_comments.request_id
           and r.citizen_id = (select auth.uid())
      )
    )
  );

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Function privileges. Postgres grants EXECUTE to PUBLIC by default.
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Policy helpers must be executable by every role whose policies call them.
grant execute on function public.is_admin()          to anon, authenticated;
grant execute on function public.is_email_verified() to anon, authenticated;

grant execute on function public.change_request_status(uuid, public.request_status, text) to authenticated;
grant execute on function public.attach_request_image(uuid, text)                       to authenticated;
grant execute on function public.get_request_analytics(timestamptz, timestamptz)        to authenticated;

-- Future functions created by migrations should not be callable by default.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: stream notification inserts to their owner. Realtime enforces the
-- notifications_select_own policy per subscriber, so users only receive their
-- own rows.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
