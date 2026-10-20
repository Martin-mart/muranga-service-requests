-- =============================================================================
-- 0100 Foundation: extensions, enums, shared trigger functions.
--
-- Conventions used by every later migration:
--   * Every table has id uuid PK, created_at, updated_at (maintained by
--     public.set_updated_at()).
--   * Every SECURITY DEFINER function pins `search_path = ''` and fully
--     qualifies every identifier so a malicious object placed on the caller's
--     search_path can never be resolved inside a privileged function.
--   * Custom SQLSTATEs (class "MR") are raised by business-rule triggers so the
--     API can map them to precise HTTP errors without parsing messages:
--       MR001 -> daily request quota exceeded           (HTTP 429)
--       MR002 -> illegal status transition              (HTTP 409)
--       MR003 -> caller is not allowed to do this       (HTTP 403)
--       MR004 -> immutable column modified              (HTTP 409)
--       MR005 -> image cannot be attached               (HTTP 409)
-- =============================================================================

-- No extensions are needed: gen_random_uuid() is core since PG13 and admin
-- search uses core full-text search (tsvector), keeping the attack surface and
-- upgrade burden minimal.

create type public.user_role as enum ('citizen', 'admin');

-- Order matters: the transition trigger relies on the documented
-- pending -> in_progress -> resolved progression.
create type public.request_status as enum ('pending', 'in_progress', 'resolved');

create type public.notification_type as enum ('status_changed', 'comment_added');

-- -----------------------------------------------------------------------------
-- updated_at maintenance. SECURITY INVOKER (default): it only touches NEW.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger: keeps updated_at accurate regardless of which client writes the row.';
