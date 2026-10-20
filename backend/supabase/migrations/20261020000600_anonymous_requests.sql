-- =============================================================================
-- 0600 Anonymous submissions.
--
-- Two ways to submit without officers seeing who you are:
--   * Guests: Supabase anonymous sign-in (no email, no password). They get a
--     real auth.users row with is_anonymous = true, so every existing RLS rule
--     still applies to them; only the "email verified" gate is relaxed.
--   * Signed-in citizens who tick "Submit anonymously".
-- Either way service_requests.is_anonymous = true and the API hides the
-- submitter's name and phone from officers. citizen_id is still recorded so the
-- submitter can track the request and receive notifications; this is
-- confidentiality towards officers, not untraceability.
-- =============================================================================

alter table public.service_requests
  add column is_anonymous boolean not null default false;

comment on column public.service_requests.is_anonymous is
  'Hide the submitter from officers. Forced true for guests; immutable after insert.';

grant insert (is_anonymous) on public.service_requests to authenticated;

-- -----------------------------------------------------------------------------
-- is_guest(): true when the caller signed in anonymously.
-- SECURITY DEFINER for the same reason as is_email_verified(): clients cannot
-- read auth.users. Only reports on the caller (auth.uid()).
-- -----------------------------------------------------------------------------
create or replace function public.is_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and u.is_anonymous
  );
$$;

comment on function public.is_guest() is
  'SECURITY DEFINER to read auth.users; only reports on the caller (auth.uid()).';

grant execute on function public.is_guest() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Guests have no email to verify, so they may submit and reply too. The other
-- conditions (own rows only, quota, server-owned columns) are unchanged.
-- -----------------------------------------------------------------------------
drop policy service_requests_insert_own_verified on public.service_requests;
create policy service_requests_insert_own_verified on public.service_requests
  for insert to authenticated
  with check (
    citizen_id = (select auth.uid())
    and ((select public.is_email_verified()) or (select public.is_guest()))
  );

drop policy comments_insert_admin_or_owner on public.request_comments;
create policy comments_insert_admin_or_owner on public.request_comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and ((select public.is_email_verified()) or (select public.is_guest()))
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
-- BEFORE INSERT: as in 0300, plus guests' requests are always anonymous.
-- -----------------------------------------------------------------------------
create or replace function public.service_requests_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recent integer;
begin
  -- Never trust client-supplied lifecycle columns.
  new.status      := 'pending'::public.request_status;
  new.resolved_at := null;
  new.created_at  := now();
  new.updated_at  := now();

  -- A guest has no name to show, so their requests are always anonymous.
  if public.is_guest() then
    new.is_anonymous := true;
  end if;

  -- Serialise concurrent inserts by the same citizen so two parallel requests
  -- cannot both observe 9 and both succeed. Transaction-scoped: released at
  -- commit/rollback, so nothing can leak.
  perform pg_advisory_xact_lock(hashtextextended(new.citizen_id::text, 0));

  select count(*)
    into v_recent
    from public.service_requests r
   where r.citizen_id = new.citizen_id
     and r.created_at > now() - interval '24 hours';

  if v_recent >= 10 then
    raise exception 'daily limit of 10 service requests reached'
      using errcode = 'MR001',
            hint = 'Please try again later.';
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- BEFORE UPDATE: as in 0300, plus is_anonymous is immutable, so an officer can
-- never "unmask" a request.
-- -----------------------------------------------------------------------------
create or replace function public.service_requests_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.citizen_id      is distinct from old.citizen_id
     or new.reference_number is distinct from old.reference_number
     or new.category_id   is distinct from old.category_id
     or new.sub_county_id is distinct from old.sub_county_id
     or new.location_text is distinct from old.location_text
     or new.latitude      is distinct from old.latitude
     or new.longitude     is distinct from old.longitude
     or new.description   is distinct from old.description
     or new.idempotency_key is distinct from old.idempotency_key
     or new.is_anonymous  is distinct from old.is_anonymous
     or new.created_at    is distinct from old.created_at then
    raise exception 'submitted request details are immutable' using errcode = 'MR004';
  end if;

  if new.status is distinct from old.status then
    -- Every status change must be attributable to an authenticated admin.
    if auth.uid() is null or not public.is_admin() then
      raise exception 'only administrators can change request status' using errcode = 'MR003';
    end if;

    if not (
         (old.status = 'pending'     and new.status = 'in_progress')
      or (old.status = 'in_progress' and new.status = 'resolved')
    ) then
      raise exception 'invalid status transition from % to %', old.status, new.status
        using errcode = 'MR002';
    end if;

    new.resolved_at := case when new.status = 'resolved' then now() else null end;
  else
    -- resolved_at is trigger-owned; ignore any attempt to edit it directly.
    new.resolved_at := old.resolved_at;
  end if;

  return new;
end;
$$;
