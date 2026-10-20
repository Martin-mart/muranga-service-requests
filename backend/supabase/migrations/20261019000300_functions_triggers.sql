-- =============================================================================
-- 0300 Authorization helpers, business-rule triggers and RPC functions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_admin()
-- SECURITY DEFINER is required: RLS policies on public.profiles themselves call
-- this function. If it ran as the caller, evaluating the profiles policy would
-- re-enter the profiles policy (infinite recursion). Running as the owner reads
-- profiles without RLS, but only ever answers a yes/no question about the
-- CALLER (auth.uid()), so nothing about other users is disclosed.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.user_role
  );
$$;

comment on function public.is_admin() is
  'SECURITY DEFINER to avoid RLS recursion on profiles; only reports on the caller (auth.uid()).';

-- -----------------------------------------------------------------------------
-- is_email_verified()
-- SECURITY DEFINER is required: the authenticated role has no access to
-- auth.users (and must not). Answers only for the caller.
-- -----------------------------------------------------------------------------
create or replace function public.is_email_verified()
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
      and u.email_confirmed_at is not null
  );
$$;

comment on function public.is_email_verified() is
  'SECURITY DEFINER because auth.users is not readable by clients; only reports on the caller.';

-- -----------------------------------------------------------------------------
-- handle_new_user(): creates the profile row when Supabase Auth creates a user.
-- SECURITY DEFINER is required: it runs inside GoTrue's insert into auth.users
-- (role supabase_auth_admin), which has no privileges on public.profiles.
-- user_metadata is attacker-controlled (anyone can call the Auth signup API
-- directly), so: role is ALWAYS 'citizen', and name/phone are sanitised and
-- downgraded instead of failing the signup.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := btrim(regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '[[:cntrl:]<>]', '', 'g'));
  v_phone text := btrim(coalesce(new.raw_user_meta_data ->> 'phone', ''));
begin
  if char_length(v_name) not between 2 and 100 then
    v_name := 'Citizen';
  end if;

  if v_phone !~ '^\+254(7|1)[0-9]{8}$' then
    v_phone := null;
  end if;

  insert into public.profiles (id, full_name, phone, role)
  values (new.id, v_name, v_phone, 'citizen'::public.user_role);

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'SECURITY DEFINER because it runs as the Auth service role; never trusts metadata for role.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- profiles guard: no self-promotion, immutable id.
-- Column grants already prevent clients from updating `role` at all; this
-- trigger is the second, independent layer (e.g. if grants are ever widened).
-- A NULL auth.uid() means a trusted server-side session (SQL editor / migration),
-- which is how the first admin is created.
-- -----------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profile id is immutable' using errcode = 'MR004';
  end if;

  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'only administrators can change roles' using errcode = 'MR003';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- -----------------------------------------------------------------------------
-- service_requests BEFORE INSERT: server-owned columns + 10-per-24h quota.
-- SECURITY INVOKER: the count only needs the caller's own rows, which RLS
-- already lets them see.
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

create trigger service_requests_before_insert
  before insert on public.service_requests
  for each row execute function public.service_requests_before_insert();

-- -----------------------------------------------------------------------------
-- service_requests BEFORE UPDATE: immutability + status state machine +
-- resolved_at maintenance.
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

create trigger service_requests_before_update
  before update on public.service_requests
  for each row execute function public.service_requests_before_update();

-- -----------------------------------------------------------------------------
-- Status history + notification fan-out.
-- SECURITY DEFINER is required: clients have NO insert privilege on
-- request_status_history or notifications (the audit log must be
-- trigger-written only, and an admin must be able to notify a citizen whose
-- inbox they cannot write to directly). The function writes only rows derived
-- from the triggering row; it takes no user input except the optional note
-- passed through a transaction-local setting by change_request_status().
-- Fan-out happens here (inside the same transaction) rather than in the API
-- request path, so the API stays fast and notifications can never be lost
-- between "status updated" and "citizen notified".
-- -----------------------------------------------------------------------------
create or replace function public.service_requests_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_role  public.user_role;
  v_note  text;
  v_label text;
begin
  if tg_op = 'INSERT' then
    insert into public.request_status_history
      (request_id, from_status, to_status, changed_by, actor_role, note)
    values
      (new.id, null, new.status, new.citizen_id, 'citizen'::public.user_role, null);
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  v_actor := auth.uid();
  select p.role into v_role from public.profiles p where p.id = v_actor;
  v_note  := nullif(btrim(current_setting('app.status_note', true)), '');
  v_label := case new.status
               when 'in_progress' then 'In progress'
               when 'resolved'    then 'Resolved'
               else 'Pending'
             end;

  insert into public.request_status_history
    (request_id, from_status, to_status, changed_by, actor_role, note)
  values
    (new.id, old.status, new.status, v_actor, coalesce(v_role, 'admin'::public.user_role), v_note);

  insert into public.notifications (user_id, request_id, type, title, body)
  values (
    new.citizen_id,
    new.id,
    'status_changed'::public.notification_type,
    left('Request ' || new.reference_number || ' updated', 120),
    left('Status changed to ' || v_label || '.' || coalesce(' Note: ' || v_note, ''), 500)
  );

  return new;
end;
$$;

comment on function public.service_requests_after_write() is
  'SECURITY DEFINER: writes trigger-only audit/notification rows that clients have no insert grant on.';

create trigger service_requests_after_insert
  after insert on public.service_requests
  for each row execute function public.service_requests_after_write();

create trigger service_requests_after_status_update
  after update of status on public.service_requests
  for each row execute function public.service_requests_after_write();

-- -----------------------------------------------------------------------------
-- request_comments BEFORE INSERT: server-owned author columns.
-- SECURITY INVOKER: reads only the caller's own profile (RLS allows it).
-- -----------------------------------------------------------------------------
create or replace function public.request_comments_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.author_id := auth.uid();
  end if;

  select p.role into new.author_role from public.profiles p where p.id = new.author_id;

  -- Citizens cannot create hidden notes.
  if new.author_role = 'citizen' then
    new.is_public := true;
  end if;

  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger request_comments_before_insert
  before insert on public.request_comments
  for each row execute function public.request_comments_before_insert();

-- -----------------------------------------------------------------------------
-- request_comments AFTER INSERT: notify the citizen about public admin notes.
-- SECURITY DEFINER for the same reason as service_requests_after_write().
-- -----------------------------------------------------------------------------
create or replace function public.request_comments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_citizen uuid;
  v_ref     text;
begin
  if not new.is_public or new.author_role <> 'admin' then
    return new;
  end if;

  select r.citizen_id, r.reference_number
    into v_citizen, v_ref
    from public.service_requests r
   where r.id = new.request_id;

  insert into public.notifications (user_id, request_id, type, title, body)
  values (
    v_citizen,
    new.request_id,
    'comment_added'::public.notification_type,
    left('New note on ' || v_ref, 120),
    left(new.body, 500)
  );

  return new;
end;
$$;

comment on function public.request_comments_after_insert() is
  'SECURITY DEFINER: notifies another user (citizen), whose inbox clients cannot write to.';

create trigger request_comments_after_insert
  after insert on public.request_comments
  for each row execute function public.request_comments_after_insert();

-- -----------------------------------------------------------------------------
-- notifications BEFORE UPDATE: only read_at may change, and only forward.
-- -----------------------------------------------------------------------------
create or replace function public.notifications_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.request_id is distinct from old.request_id
     or new.type  is distinct from old.type
     or new.title is distinct from old.title
     or new.body  is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'notification content is immutable' using errcode = 'MR004';
  end if;

  -- Marking read is idempotent and timestamps are server-owned.
  if old.read_at is not null then
    new.read_at := old.read_at;
  elsif new.read_at is not null then
    new.read_at := now();
  end if;

  return new;
end;
$$;

create trigger notifications_before_update
  before update on public.notifications
  for each row execute function public.notifications_before_update();

-- -----------------------------------------------------------------------------
-- RPC: change_request_status(request, status, note)
-- SECURITY INVOKER on purpose: the admin's own privileges + RLS apply, so this
-- function grants nothing the admin did not already have. It exists to make
-- "update status + record note" a single atomic, validated operation.
-- -----------------------------------------------------------------------------
create or replace function public.change_request_status(
  p_request_id uuid,
  p_status     public.request_status,
  p_note       text default null
)
returns table (id uuid, status public.request_status, resolved_at timestamptz, updated_at timestamptz)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_current public.request_status;
  v_note    text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'only administrators can change request status' using errcode = 'MR003';
  end if;

  if v_note is not null and char_length(v_note) > 1000 then
    raise exception 'note must be at most 1000 characters' using errcode = '22001';
  end if;

  select r.status into v_current
    from public.service_requests r
   where r.id = p_request_id
     for update;

  if not found then
    raise exception 'service request not found' using errcode = 'P0002';
  end if;

  if v_current = p_status then
    raise exception 'request is already %', p_status using errcode = 'MR002';
  end if;

  -- Transaction-local: visible to the AFTER trigger, gone at commit.
  perform set_config('app.status_note', coalesce(v_note, ''), true);

  return query
    update public.service_requests r
       set status = p_status
     where r.id = p_request_id
    returning r.id, r.status, r.resolved_at, r.updated_at;
end;
$$;

comment on function public.change_request_status(uuid, public.request_status, text) is
  'Admin-only atomic status change with note. SECURITY INVOKER: RLS and grants still apply.';

-- -----------------------------------------------------------------------------
-- RPC: attach_request_image(request, path)
-- SECURITY DEFINER is required: citizens have no UPDATE privilege on
-- service_requests (they must never edit a submitted request). This function
-- allows exactly one narrow edit: setting image_path on the caller's OWN,
-- still-pending request, to a path inside the caller's folder, and only if no
-- image has actually been uploaded yet (a stale path whose upload never
-- completed may be replaced). No dynamic SQL.
-- -----------------------------------------------------------------------------
create or replace function public.attach_request_image(
  p_request_id uuid,
  p_path       text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_owner    uuid;
  v_status   public.request_status;
  v_existing text;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = 'MR003';
  end if;

  if not public.is_email_verified() then
    raise exception 'email address not verified' using errcode = 'MR003';
  end if;

  select r.citizen_id, r.status, r.image_path
    into v_owner, v_status, v_existing
    from public.service_requests r
   where r.id = p_request_id
     for update;

  -- Report "not found" for other people's requests too (no existence oracle).
  if not found or v_owner <> v_uid then
    raise exception 'service request not found' using errcode = 'P0002';
  end if;

  if v_status <> 'pending' then
    raise exception 'images can only be added while a request is pending' using errcode = 'MR005';
  end if;

  if split_part(p_path, '/', 1) <> v_uid::text
     or split_part(p_path, '/', 2) <> p_request_id::text
     or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    raise exception 'invalid image path' using errcode = 'MR005';
  end if;

  if v_existing is not null and exists (
       select 1 from storage.objects o
        where o.bucket_id = 'request-images' and o.name = v_existing
     ) then
    raise exception 'an image has already been uploaded for this request' using errcode = 'MR005';
  end if;

  update public.service_requests
     set image_path = p_path
   where id = p_request_id;
end;
$$;

comment on function public.attach_request_image(uuid, text) is
  'SECURITY DEFINER: the single sanctioned citizen edit (image_path on own pending request).';

-- -----------------------------------------------------------------------------
-- RPC: get_request_analytics(from, to)
-- SECURITY INVOKER + explicit admin check: RLS still applies, so even if the
-- check were removed a citizen would only ever aggregate their own rows.
-- Aggregation is done in one statement in the database instead of shipping
-- rows to Node (no N+1, minimal network transfer).
-- -----------------------------------------------------------------------------
create or replace function public.get_request_analytics(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'analytics are restricted to administrators' using errcode = 'MR003';
  end if;

  with scoped as (
    select r.status, r.category_id, r.sub_county_id, r.created_at, r.resolved_at
      from public.service_requests r
     where (p_from is null or r.created_at >= p_from)
       and (p_to   is null or r.created_at <  p_to)
  ),
  days as (
    select generate_series(
             (now() at time zone 'Africa/Nairobi')::date - 29,
             (now() at time zone 'Africa/Nairobi')::date,
             interval '1 day'
           )::date as day
  ),
  -- One pass each over the last ~30 days instead of a correlated count per day.
  created_per_day as (
    select (r.created_at at time zone 'Africa/Nairobi')::date as day, count(*) as n
      from public.service_requests r
     where r.created_at >= now() - interval '31 days'
     group by 1
  ),
  resolved_per_day as (
    select (r.resolved_at at time zone 'Africa/Nairobi')::date as day, count(*) as n
      from public.service_requests r
     where r.resolved_at >= now() - interval '31 days'
     group by 1
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'total',       count(*),
        'pending',     count(*) filter (where s.status = 'pending'),
        'in_progress', count(*) filter (where s.status = 'in_progress'),
        'resolved',    count(*) filter (where s.status = 'resolved'),
        'open',        count(*) filter (where s.status <> 'resolved')
      )
      from scoped s
    ),
    'avg_resolution_hours', (
      select round((extract(epoch from avg(s.resolved_at - s.created_at)) / 3600)::numeric, 2)
        from scoped s
       where s.resolved_at is not null
    ),
    'by_category', coalesce((
      select jsonb_agg(x order by x.total desc, x.name)
        from (
          select c.id, c.name,
                 count(s.category_id) as total,
                 count(*) filter (where s.status <> 'resolved') as open,
                 count(*) filter (where s.status = 'resolved') as resolved,
                 round((extract(epoch from avg(s.resolved_at - s.created_at)) / 3600)::numeric, 2)
                   as avg_resolution_hours
            from public.categories c
            left join scoped s on s.category_id = c.id
           group by c.id, c.name
        ) x
    ), '[]'::jsonb),
    'by_sub_county', coalesce((
      select jsonb_agg(x order by x.total desc, x.name)
        from (
          select sc.id, sc.name,
                 count(s.sub_county_id) as total,
                 count(*) filter (where s.status <> 'resolved') as open,
                 count(*) filter (where s.status = 'resolved') as resolved
            from public.sub_counties sc
            left join scoped s on s.sub_county_id = sc.id
           group by sc.id, sc.name
        ) x
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(
               jsonb_build_object('day', days.day, 'created', coalesce(c.n, 0), 'resolved', coalesce(rs.n, 0))
               order by days.day)
        from days
        left join created_per_day c on c.day = days.day
        left join resolved_per_day rs on rs.day = days.day
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

comment on function public.get_request_analytics(timestamptz, timestamptz) is
  'Admin-only aggregate analytics in a single round trip. SECURITY INVOKER; RLS applies.';
