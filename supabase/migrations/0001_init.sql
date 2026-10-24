-- DuoTracker schema
-- Run in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.duo_status as enum (
  'unoptimized',  -- Fully unoptimized: letterboxed iPhone-sized window
  'ios27',        -- iOS 27 optimized: resizes toward the edge, but stops before the status bar
  'duo_issues',   -- Duo optimized (with issues): full screen, but controls collide with the camera, status bar, or Dynamic Island
  'duo'           -- Designed for Duo: full screen, laid out for the Duo
);

create type public.submission_kind as enum ('new_app', 'update');
create type public.submission_state as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.apps (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null check (char_length(name) between 1 and 80),
  developer     text check (char_length(developer) <= 80),
  app_store_url text check (app_store_url ~ '^https://apps\.apple\.com/'),
  icon_url      text,
  status        public.duo_status not null,
  notes         text check (char_length(notes) <= 2000),
  app_version   text check (char_length(app_version) <= 40),
  verified_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index apps_status_idx on public.apps (status);
create index apps_name_idx on public.apps (lower(name));

create table public.submissions (
  id             uuid primary key default gen_random_uuid(),
  kind           public.submission_kind not null,
  app_id         uuid references public.apps (id) on delete cascade,
  -- Proposed values
  name           text check (char_length(name) <= 80),
  developer      text check (char_length(developer) <= 80),
  app_store_url  text check (app_store_url ~ '^https://apps\.apple\.com/'),
  status         public.duo_status not null,
  app_version    text check (char_length(app_version) <= 40),
  details        text check (char_length(details) <= 2000),
  submitter_name text check (char_length(submitter_name) <= 60),
  -- Moderation
  state          public.submission_state not null default 'pending',
  reviewer_note  text,
  reviewed_at    timestamptz,
  reviewed_by    uuid references auth.users (id),
  ip_hash        text,
  created_at     timestamptz not null default now(),
  constraint kind_shape check (
    (kind = 'update'  and app_id is not null) or
    (kind = 'new_app' and app_id is null and name is not null)
  )
);

create index submissions_state_idx on public.submissions (state, created_at);
create index submissions_ip_idx on public.submissions (ip_hash, created_at);

-- Every status an app has ever had, for the per-app history timeline.
create table public.app_status_history (
  id            bigint generated always as identity primary key,
  app_id        uuid not null references public.apps (id) on delete cascade,
  status        public.duo_status not null,
  app_version   text,
  note          text,
  submission_id uuid references public.submissions (id) on delete set null,
  changed_at    timestamptz not null default now()
);

create index app_status_history_app_idx on public.app_status_history (app_id, changed_at desc);

-- Admins are identified by the email they sign in with.
create table public.admins (
  email text primary key
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger apps_touch before update on public.apps
  for each row execute function public.touch_updated_at();

-- Record history whenever an app is created or its status changes,
-- whether through approval or a direct admin edit.
create or replace function public.record_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.app_status_history (app_id, status, app_version, note, submission_id)
    values (
      new.id, new.status, new.app_version,
      nullif(current_setting('duotracker.history_note', true), ''),
      nullif(current_setting('duotracker.submission_id', true), '')::uuid
    );
  end if;
  return new;
end;
$$;

create trigger apps_history after insert or update on public.apps
  for each row execute function public.record_status_history();

-- ---------------------------------------------------------------------------
-- Public submission entry point (anonymous, rate limited)
-- ---------------------------------------------------------------------------
create or replace function public.submit_suggestion(
  p_kind           public.submission_kind,
  p_status         public.duo_status,
  p_app_id         uuid default null,
  p_name           text default null,
  p_developer      text default null,
  p_app_store_url  text default null,
  p_app_version    text default null,
  p_details        text default null,
  p_submitter_name text default null,
  p_ip_hash        text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent int;
  new_id uuid;
begin
  if p_ip_hash is not null then
    select count(*) into recent
    from public.submissions
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
    if recent >= 10 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  if p_kind = 'new_app' and exists (
    select 1 from public.apps where lower(name) = lower(trim(p_name))
  ) then
    raise exception 'app_exists' using errcode = 'P0001';
  end if;

  insert into public.submissions (
    kind, app_id, name, developer, app_store_url, status,
    app_version, details, submitter_name, ip_hash
  ) values (
    p_kind,
    case when p_kind = 'update' then p_app_id end,
    nullif(trim(p_name), ''),
    nullif(trim(p_developer), ''),
    nullif(trim(p_app_store_url), ''),
    p_status,
    nullif(trim(p_app_version), ''),
    nullif(trim(p_details), ''),
    nullif(trim(p_submitter_name), ''),
    p_ip_hash
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Moderation (admin only)
-- ---------------------------------------------------------------------------
create or replace function public.approve_submission(
  p_id            uuid,
  p_status        public.duo_status default null,  -- override the proposed status
  p_reviewer_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.submissions;
  target uuid;
  base_slug text;
  final_slug text;
  n int := 1;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select * into s from public.submissions where id = p_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if s.state <> 'pending' then
    raise exception 'already_reviewed';
  end if;

  perform set_config('duotracker.submission_id', s.id::text, true);
  perform set_config('duotracker.history_note', coalesce(s.details, ''), true);

  if s.kind = 'new_app' then
    base_slug := public.slugify(s.name);
    final_slug := base_slug;
    while exists (select 1 from public.apps where slug = final_slug) loop
      n := n + 1;
      final_slug := base_slug || '-' || n;
    end loop;

    insert into public.apps (slug, name, developer, app_store_url, status, app_version, notes)
    values (final_slug, s.name, s.developer, s.app_store_url,
            coalesce(p_status, s.status), s.app_version, s.details)
    returning id into target;
  else
    update public.apps
    set status      = coalesce(p_status, s.status),
        app_version = coalesce(s.app_version, app_version),
        verified_at = now()
    where id = s.app_id
    returning id into target;
  end if;

  update public.submissions
  set state = 'approved',
      app_id = target,
      reviewer_note = p_reviewer_note,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = s.id;

  return target;
end;
$$;

create or replace function public.reject_submission(p_id uuid, p_reviewer_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  update public.submissions
  set state = 'rejected',
      reviewer_note = p_reviewer_note,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_id and state = 'pending';
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.apps enable row level security;
alter table public.submissions enable row level security;
alter table public.app_status_history enable row level security;
alter table public.admins enable row level security;

-- Anyone can read the app list and its history.
create policy "apps are public" on public.apps for select using (true);
create policy "history is public" on public.app_status_history for select using (true);

-- Only admins can write apps directly.
create policy "admins insert apps" on public.apps for insert with check (public.is_admin());
create policy "admins update apps" on public.apps for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete apps" on public.apps for delete using (public.is_admin());

-- Submissions are only readable/editable by admins; the public goes through submit_suggestion().
create policy "admins read submissions" on public.submissions for select using (public.is_admin());
create policy "admins update submissions" on public.submissions for update using (public.is_admin());
create policy "admins delete submissions" on public.submissions for delete using (public.is_admin());

create policy "admins read admins" on public.admins for select using (public.is_admin());

-- Function permissions
revoke all on function public.submit_suggestion from public;
grant execute on function public.submit_suggestion to anon, authenticated;
revoke all on function public.approve_submission from public, anon;
grant execute on function public.approve_submission to authenticated;
revoke all on function public.reject_submission from public, anon;
grant execute on function public.reject_submission to authenticated;
grant execute on function public.is_admin to anon, authenticated;
