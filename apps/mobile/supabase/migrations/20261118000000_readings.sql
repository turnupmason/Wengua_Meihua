-- Readings handed out one at a time (2026-11-18). The 断语 are no longer shipped with the web page
-- or the app: the server (the Cloudflare Worker at app.wengualabs.com) gives each cast its one
-- 断语, in full or as the one-line 简断, after asking reading_access() here what this account may
-- read. Same rules as the app: free, one written reading a day and its 简断; members (App Store
-- subscription, copied in by claim-purchases) three a day in full; a credit opens one reading in
-- full; a signed-in (not guest) account gets its first written reading in full once.

-- Who is a member until when (RevenueCat's `member` entitlement, written by claim-purchases).
create table if not exists public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Each cast that was given a written 断语: what was asked is fixed at the first lookup, so one
-- cast cannot be used to read other charts.
create table if not exists public.casts (
  user_id uuid not null references auth.users (id) on delete cascade,
  cast_id text not null check (char_length(cast_id) between 1 and 80),
  request jsonb not null check (octet_length(request::text) < 4000),
  local_day date not null,
  gift boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, cast_id)
);
create index if not exists casts_user_day on public.casts (user_id, local_day);
create unique index if not exists casts_one_gift on public.casts (user_id) where gift;

-- Lookups in the last day, to slow down anything that asks too often.
create table if not exists public.reading_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists reading_requests_user_at on public.reading_requests (user_id, at);

alter table public.memberships enable row level security;
alter table public.casts enable row level security;
alter table public.reading_requests enable row level security;
drop policy if exists "read own membership" on public.memberships;
create policy "read own membership" on public.memberships for select to authenticated using (auth.uid() = user_id);
drop policy if exists "read own casts" on public.casts;
create policy "read own casts" on public.casts for select to authenticated using (auth.uid() = user_id);

-- What the caller may read of this cast. p_ready: the server found a written 断语 for it (a cast
-- whose 断语 is still being written is not recorded or charged). Returns
--   { access: 'full', reason: 'member' | 'unlock' | 'gift' }, { access: 'brief' },
--   { access: 'none' } (nothing written), { access: 'limit', limit }, { access: 'busy' },
--   { access: 'mismatch' } (this cast id was first used for another chart).
create or replace function public.reading_access(p_cast_id text, p_request jsonb, p_local_day date, p_ready boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  guest boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  member boolean;
  day date;
  limit_today integer;
  existing public.casts%rowtype;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  if p_cast_id is null or char_length(p_cast_id) not between 1 and 80 or p_request is null then
    return jsonb_build_object('access', 'mismatch');
  end if;
  perform pg_advisory_xact_lock(hashtext('reading:' || uid::text));

  -- At most 60 lookups an hour and 200 a day per account.
  delete from public.reading_requests where user_id = uid and at < now() - interval '1 day';
  if (select count(*) from public.reading_requests where user_id = uid and at > now() - interval '1 hour') >= 60
     or (select count(*) from public.reading_requests where user_id = uid) >= 200 then
    return jsonb_build_object('access', 'busy');
  end if;
  insert into public.reading_requests (user_id) values (uid);

  member := exists (select 1 from public.memberships where user_id = uid and expires_at > now());

  select * into existing from public.casts where user_id = uid and cast_id = p_cast_id;
  if found then
    if existing.request <> p_request then
      return jsonb_build_object('access', 'mismatch');
    end if;
  else
    if not p_ready then
      return jsonb_build_object('access', 'none');
    end if;
    -- The device's own day of the cast; a day long past (a cast whose 断语 was written later)
    -- counts as yesterday, a day ahead is refused.
    if p_local_day is null or p_local_day > current_date + 1 then
      return jsonb_build_object('access', 'mismatch');
    end if;
    day := greatest(p_local_day, current_date - 1);
    limit_today := case when member then 3 else 1 end;
    if (select count(*) from public.casts where user_id = uid and local_day = day) >= limit_today then
      return jsonb_build_object('access', 'limit', 'limit', limit_today);
    end if;
    insert into public.casts (user_id, cast_id, request, local_day) values (uid, p_cast_id, p_request, day)
      returning * into existing;
  end if;

  if member then
    return jsonb_build_object('access', 'full', 'reason', 'member');
  end if;
  if exists (select 1 from public.unlocks where user_id = uid and cast_id = p_cast_id) then
    return jsonb_build_object('access', 'full', 'reason', 'unlock');
  end if;
  if existing.gift then
    return jsonb_build_object('access', 'full', 'reason', 'gift');
  end if;
  -- A newcomer who signed in (not a guest) reads one written reading in full, once.
  if not guest and not exists (select 1 from public.casts where user_id = uid and gift) then
    update public.casts set gift = true where user_id = uid and cast_id = p_cast_id;
    return jsonb_build_object('access', 'full', 'reason', 'gift');
  end if;
  return jsonb_build_object('access', 'brief');
end
$$;
revoke all on function public.reading_access(text, jsonb, date, boolean) from public, anon;
grant execute on function public.reading_access(text, jsonb, date, boolean) to authenticated;
