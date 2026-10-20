-- =============================================================================
-- RLS / business-rule test suite.
--
-- Proves, against the real migrations, that:
--   * a citizen cannot read another citizen's request, history or notifications
--   * a citizen cannot change status (direct UPDATE or RPC)
--   * a citizen cannot self-promote to admin
--   * an unverified user cannot insert a request
--   * citizens cannot set server-owned columns or read internal admin notes
--   * status transitions cannot skip steps; history/resolved_at/notifications
--     are written automatically
--   * the 10-requests-per-24h quota holds
--
-- Run (local Supabase):  psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Everything runs in one transaction and is rolled back: no residue.
-- Any failed expectation raises an exception and aborts with a non-zero exit.
-- =============================================================================

\set ON_ERROR_STOP on
begin;

-- Fixed identities used throughout.
--   A = verified citizen, B = verified citizen, C = UNverified citizen, D = admin
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.local', now(), '{"full_name":"Citizen A","phone":"+254712345678","role":"admin"}'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.local', now(), '{"full_name":"Citizen B"}'),
  ('00000000-0000-4000-8000-00000000000c', 'c@test.local', null,  '{"full_name":"Citizen C"}'),
  ('00000000-0000-4000-8000-00000000000d', 'd@test.local', now(), '{"full_name":"Admin D"}');

-- First admin is created by a trusted server-side session (no JWT).
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000000d';

-- Signup metadata must never grant a role.
do $$
begin
  if (select role from public.profiles where id = '00000000-0000-4000-8000-00000000000a') <> 'citizen' then
    raise exception 'FAIL: role taken from user_metadata';
  end if;
  raise notice 'PASS: signup metadata cannot set role';
end $$;

-- Helper: impersonate a user exactly like PostgREST does.
create or replace function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- -----------------------------------------------------------------------------
-- Citizen B files a request (as B).
-- -----------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-4000-8000-00000000000b');
set local role authenticated;

insert into public.service_requests
  (category_id, sub_county_id, location_text, description, idempotency_key)
select c.id, s.id, 'Kiharu market gate', 'Streetlight has been off for a week.', '11111111-1111-4111-8111-111111111111'
  from public.categories c, public.sub_counties s
 where c.slug = 'streetlight' and s.slug = 'kiharu';

do $$
declare r record;
begin
  select * into r from public.service_requests
   where idempotency_key = '11111111-1111-4111-8111-111111111111';
  if r.citizen_id <> '00000000-0000-4000-8000-00000000000b' then raise exception 'FAIL: citizen_id not defaulted'; end if;
  if r.status <> 'pending' then raise exception 'FAIL: initial status'; end if;
  if r.reference_number !~ '^MRG-[0-9]{4}-[0-9]{6}$' then raise exception 'FAIL: reference number %', r.reference_number; end if;
  if (select count(*) from public.request_status_history h where h.request_id = r.id) <> 1 then
    raise exception 'FAIL: initial history row missing';
  end if;
  raise notice 'PASS: citizen insert sets server-owned columns and writes history';
end $$;

-- Citizen cannot choose server-owned columns (status / citizen_id) at all.
do $$
begin
  begin
    insert into public.service_requests (citizen_id, category_id, sub_county_id, location_text, description)
    select '00000000-0000-4000-8000-00000000000a', c.id, s.id, 'Somewhere', 'Spoofing another citizen id.'
      from public.categories c, public.sub_counties s limit 1;
    raise exception 'FAIL: citizen_id was insertable';
  exception when insufficient_privilege then
    raise notice 'PASS: citizen cannot set citizen_id';
  end;
  begin
    insert into public.service_requests (status, category_id, sub_county_id, location_text, description)
    select 'resolved', c.id, s.id, 'Somewhere', 'Trying to pre-resolve a request.'
      from public.categories c, public.sub_counties s limit 1;
    raise exception 'FAIL: status was insertable';
  exception when insufficient_privilege then
    raise notice 'PASS: citizen cannot set status';
  end;
end $$;

-- DB constraint: description length.
do $$
begin
  begin
    insert into public.service_requests (category_id, sub_county_id, location_text, description)
    select c.id, s.id, 'Somewhere', 'short' from public.categories c, public.sub_counties s limit 1;
    raise exception 'FAIL: short description accepted';
  exception when check_violation then
    raise notice 'PASS: description CHECK enforced';
  end;
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- Citizen A cannot see or touch B's request.
-- -----------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-4000-8000-00000000000a');
set local role authenticated;

do $$
declare n integer;
begin
  select count(*) into n from public.service_requests;
  if n <> 0 then raise exception 'FAIL: citizen A can read % foreign requests', n; end if;
  select count(*) into n from public.request_status_history;
  if n <> 0 then raise exception 'FAIL: citizen A can read foreign history'; end if;
  select count(*) into n from public.profiles where id <> '00000000-0000-4000-8000-00000000000a';
  if n <> 0 then raise exception 'FAIL: citizen A can read other profiles'; end if;
  raise notice 'PASS: citizen cannot read another citizen''s data';
end $$;

-- Self-promotion: role column is not updatable by clients.
do $$
begin
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: role column updatable';
  exception when insufficient_privilege then
    raise notice 'PASS: citizen cannot self-promote';
  end;
end $$;

-- Own profile name/phone remain editable.
update public.profiles set full_name = 'Citizen A Renamed' where id = '00000000-0000-4000-8000-00000000000a';

reset role;

-- Capture B's request id as the trusted session for the remaining tests.
create temp table b_request on commit drop as
  select id from public.service_requests where idempotency_key = '11111111-1111-4111-8111-111111111111';
grant select on b_request to authenticated;

select pg_temp.act_as('00000000-0000-4000-8000-00000000000a');
set local role authenticated;
do $$
begin
  begin
    insert into public.request_comments (request_id, body)
    values ((select id from b_request), 'hijack attempt');
    raise exception 'FAIL: commented on foreign request';
  exception when insufficient_privilege then
    raise notice 'PASS: RLS blocks comments on foreign requests';
  end;
end $$;
reset role;

-- -----------------------------------------------------------------------------
-- Citizen B cannot change status of their own request.
-- -----------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-4000-8000-00000000000b');
set local role authenticated;

do $$
declare n integer;
begin
  update public.service_requests set status = 'resolved' where id = (select id from b_request);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: citizen updated status'; end if;

  begin
    perform public.change_request_status((select id from b_request), 'in_progress', null);
    raise exception 'FAIL: citizen used change_request_status';
  exception when sqlstate 'MR003' then
    raise notice 'PASS: citizen cannot change status (UPDATE and RPC)';
  end;

  begin
    delete from public.service_requests where id = (select id from b_request);
    raise exception 'FAIL: citizen could delete';
  exception when insufficient_privilege then
    raise notice 'PASS: citizen cannot delete requests';
  end;

  begin
    perform public.get_request_analytics(null, null);
    raise exception 'FAIL: citizen ran analytics';
  exception when sqlstate 'MR003' then
    raise notice 'PASS: analytics restricted to admins';
  end;
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- Unverified user C cannot insert.
-- -----------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-4000-8000-00000000000c');
set local role authenticated;

do $$
begin
  begin
    insert into public.service_requests (category_id, sub_county_id, location_text, description)
    select c.id, s.id, 'Kangema town', 'Water pipe burst near the stage.'
      from public.categories c, public.sub_counties s limit 1;
    raise exception 'FAIL: unverified user inserted a request';
  exception when insufficient_privilege then
    raise notice 'PASS: unverified user cannot insert';
  end;
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- Admin D: transitions, history, notifications, internal notes.
-- -----------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-4000-8000-00000000000d');
set local role authenticated;

do $$
declare
  v_id uuid := (select id from b_request);
  v_resolved timestamptz;
begin
  if (select count(*) from public.service_requests) < 1 then
    raise exception 'FAIL: admin cannot see requests';
  end if;

  begin
    perform public.change_request_status(v_id, 'resolved', 'skip');
    raise exception 'FAIL: pending -> resolved allowed';
  exception when sqlstate 'MR002' then
    raise notice 'PASS: cannot skip in_progress';
  end;

  perform public.change_request_status(v_id, 'in_progress', 'Crew dispatched');
  perform public.change_request_status(v_id, 'resolved', 'Bulb replaced');

  select resolved_at into v_resolved from public.service_requests where id = v_id;
  if v_resolved is null then raise exception 'FAIL: resolved_at not set'; end if;

  begin
    perform public.change_request_status(v_id, 'pending', null);
    raise exception 'FAIL: resolved -> pending allowed';
  exception when sqlstate 'MR002' then
    raise notice 'PASS: cannot go backwards';
  end;

  if (select count(*) from public.request_status_history where request_id = v_id) <> 3 then
    raise exception 'FAIL: expected 3 history rows';
  end if;
  if (select note from public.request_status_history where request_id = v_id and to_status = 'resolved') <> 'Bulb replaced' then
    raise exception 'FAIL: note not recorded';
  end if;

  insert into public.request_comments (request_id, body, is_public) values (v_id, 'Internal: contractor invoice #44', false);
  insert into public.request_comments (request_id, body, is_public) values (v_id, 'Thank you for reporting.', true);

  if (public.get_request_analytics(null, null) -> 'totals' ->> 'resolved')::int < 1 then
    raise exception 'FAIL: analytics totals';
  end if;

  raise notice 'PASS: admin transitions, history, resolved_at, analytics';
end $$;

-- Admin cannot edit submitted details.
do $$
begin
  begin
    update public.service_requests set description = 'Rewritten by admin' where id = (select id from b_request);
    raise exception 'FAIL: description editable';
  exception when insufficient_privilege then
    raise notice 'PASS: submitted details immutable';
  end;
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- Citizen B sees notifications + public comments, not internal notes.
-- -----------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-4000-8000-00000000000b');
set local role authenticated;

do $$
declare n integer;
begin
  select count(*) into n from public.notifications;
  if n <> 3 then raise exception 'FAIL: expected 3 notifications (2 status + 1 comment), got %', n; end if;

  select count(*) into n from public.request_comments;
  if n <> 1 then raise exception 'FAIL: citizen sees % comments (internal note leaked?)', n; end if;

  select count(*) into n from public.request_status_history;
  if n <> 3 then raise exception 'FAIL: citizen cannot see own timeline'; end if;

  update public.notifications set read_at = now();
  get diagnostics n = row_count;
  if n <> 3 then raise exception 'FAIL: cannot mark own notifications read'; end if;

  begin
    update public.notifications set title = 'tampered';
    raise exception 'FAIL: notification title editable';
  exception when insufficient_privilege then
    raise notice 'PASS: notification content immutable';
  end;

  raise notice 'PASS: citizen timeline/notifications/public comments only';
end $$;

reset role;

select pg_temp.act_as('00000000-0000-4000-8000-00000000000a');
set local role authenticated;
do $$
begin
  if (select count(*) from public.notifications) <> 0 then
    raise exception 'FAIL: citizen A reads B''s notifications';
  end if;
  raise notice 'PASS: notifications are private';
end $$;
reset role;

-- -----------------------------------------------------------------------------
-- Daily quota: 10 per 24h (B already has 1).
-- -----------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-4000-8000-00000000000b');
set local role authenticated;

do $$
declare i integer;
begin
  for i in 1..9 loop
    insert into public.service_requests (category_id, sub_county_id, location_text, description)
    select c.id, s.id, 'Gatanga road', 'Pothole number ' || i || ' on the main road.'
      from public.categories c, public.sub_counties s
     where c.slug = 'roads' and s.slug = 'gatanga';
  end loop;

  begin
    insert into public.service_requests (category_id, sub_county_id, location_text, description)
    select c.id, s.id, 'Gatanga road', 'The eleventh request in one day.'
      from public.categories c, public.sub_counties s
     where c.slug = 'roads' and s.slug = 'gatanga';
    raise exception 'FAIL: 11th request accepted';
  exception when sqlstate 'MR001' then
    raise notice 'PASS: 10 requests per 24h enforced';
  end;
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- Images: path registration + storage policies.
-- -----------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-4000-8000-00000000000b');
set local role authenticated;

do $$
declare
  v_id   uuid := (select id from public.service_requests where status = 'pending' order by created_at limit 1);
  v_path text;
begin
  v_path := '00000000-0000-4000-8000-00000000000b/' || v_id || '/22222222-2222-4222-8222-222222222222.jpg';

  begin
    perform public.attach_request_image(v_id, '00000000-0000-4000-8000-00000000000a/' || v_id || '/22222222-2222-4222-8222-222222222222.jpg');
    raise exception 'FAIL: attached path in another user''s folder';
  exception when sqlstate 'MR005' then
    raise notice 'PASS: image path must be in own folder';
  end;

  perform public.attach_request_image(v_id, v_path);

  -- Unregistered path in own folder is rejected by the storage policy.
  begin
    insert into storage.objects (bucket_id, name)
    values ('request-images', '00000000-0000-4000-8000-00000000000b/' || v_id || '/33333333-3333-4333-8333-333333333333.jpg');
    raise exception 'FAIL: uploaded unregistered object';
  exception when insufficient_privilege then
    raise notice 'PASS: only registered paths can be uploaded';
  end;

  insert into storage.objects (bucket_id, name) values ('request-images', v_path);

  begin
    perform public.attach_request_image(v_id, '00000000-0000-4000-8000-00000000000b/' || v_id || '/44444444-4444-4444-8444-444444444444.png');
    raise exception 'FAIL: replaced an uploaded image';
  exception when sqlstate 'MR005' then
    raise notice 'PASS: uploaded image cannot be replaced';
  end;
end $$;

reset role;

select pg_temp.act_as('00000000-0000-4000-8000-00000000000a');
set local role authenticated;
do $$
begin
  if (select count(*) from storage.objects) <> 0 then
    raise exception 'FAIL: citizen A can see B''s images';
  end if;
  begin
    perform public.attach_request_image((select id from b_request), '00000000-0000-4000-8000-00000000000a/' || (select id from b_request) || '/55555555-5555-4555-8555-555555555555.jpg');
    raise exception 'FAIL: attached image to foreign request';
  exception when sqlstate 'P0002' then
    raise notice 'PASS: cannot attach image to a foreign request';
  end;
end $$;
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-00000000000d');
set local role authenticated;
do $$
begin
  if (select count(*) from storage.objects) <> 1 then
    raise exception 'FAIL: admin cannot read images';
  end if;
  raise notice 'PASS: admin can read all images';
end $$;
reset role;

-- -----------------------------------------------------------------------------
-- Anonymous submissions (0600): guests and opt-in anonymous citizens.
-- -----------------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('00000000-0000-4000-8000-00000000000e', null, null, true),
  ('00000000-0000-4000-8000-00000000000f', 'f@test.local', now(), false);

select pg_temp.act_as('00000000-0000-4000-8000-00000000000e');
set local role authenticated;
do $$
declare r record;
begin
  -- A guest (no email) may submit, and their request is always anonymous even
  -- if the client asks otherwise.
  insert into public.service_requests (category_id, sub_county_id, location_text, description, is_anonymous)
  select c.id, s.id, 'Kenol bus park', 'Guest report about overflowing garbage.', false
    from public.categories c, public.sub_counties s limit 1
  returning * into r;
  if r.citizen_id <> '00000000-0000-4000-8000-00000000000e' then raise exception 'FAIL: guest citizen_id'; end if;
  if not r.is_anonymous then raise exception 'FAIL: guest request not forced anonymous'; end if;
  if (select count(*) from public.service_requests) <> 1 then
    raise exception 'FAIL: guest sees requests other than their own';
  end if;
  raise notice 'PASS: guest can submit; request forced anonymous; sees only own';
end $$;
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-00000000000f');
set local role authenticated;
do $$
declare r record;
begin
  insert into public.service_requests (category_id, sub_county_id, location_text, description, is_anonymous)
  select c.id, s.id, 'Maragua town', 'Citizen choosing to stay anonymous.', true
    from public.categories c, public.sub_counties s limit 1
  returning * into r;
  if not r.is_anonymous then raise exception 'FAIL: citizen opt-in anonymity not stored'; end if;
  raise notice 'PASS: verified citizen can opt in to anonymity';
end $$;
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-00000000000d');
set local role authenticated;
do $$
begin
  begin
    update public.service_requests set is_anonymous = false
     where citizen_id = '00000000-0000-4000-8000-00000000000f';
    raise exception 'FAIL: admin unmasked an anonymous request';
  exception when insufficient_privilege or sqlstate 'MR004' then
    raise notice 'PASS: admin cannot unmask an anonymous request';
  end;
end $$;
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-00000000000c');
set local role authenticated;
do $$
begin
  begin
    insert into public.service_requests (category_id, sub_county_id, location_text, description, is_anonymous)
    select c.id, s.id, 'Somewhere', 'Unverified, not a guest, trying anonymity.', true
      from public.categories c, public.sub_counties s limit 1;
    raise exception 'FAIL: unverified non-guest inserted an anonymous request';
  exception when insufficient_privilege then
    raise notice 'PASS: unverified non-guest still blocked';
  end;
end $$;
reset role;

-- -----------------------------------------------------------------------------
-- Anonymous visitors: reference data only.
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
begin
  if (select count(*) from public.categories) < 1 then
    raise exception 'FAIL: anon cannot read categories';
  end if;
  begin
    perform 1 from public.service_requests limit 1;
    raise exception 'FAIL: anon can read requests';
  exception when insufficient_privilege then
    raise notice 'PASS: anon blocked from requests';
  end;
end $$;
reset role;

do $$ begin raise notice 'ALL RLS TESTS PASSED'; end $$;

rollback;
