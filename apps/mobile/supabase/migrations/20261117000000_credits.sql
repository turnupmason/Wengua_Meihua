-- Reading credits (2026-11-17). A credit is bought one at a time or ten in a pack (App Store
-- consumables, confirmed through RevenueCat by the claim-purchases function) and opens the full
-- 断语 of one reading. Nothing here is written from the device directly: grants come from the
-- functions (service role), unlocks from spend_credit. Subscriptions live in RevenueCat.

create table if not exists public.credit_grants (
  transaction_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  units integer not null check (units > 0),
  purchased_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists credit_grants_user on public.credit_grants (user_id);

create table if not exists public.unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  cast_id text not null check (char_length(cast_id) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, cast_id)
);

alter table public.credit_grants enable row level security;
alter table public.unlocks enable row level security;

drop policy if exists "read own grants" on public.credit_grants;
create policy "read own grants" on public.credit_grants for select to authenticated using (auth.uid() = user_id);
drop policy if exists "read own unlocks" on public.unlocks;
create policy "read own unlocks" on public.unlocks for select to authenticated using (auth.uid() = user_id);

-- Credits left for a user: everything bought, less the readings opened.
create or replace function public.credits_of(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (coalesce((select sum(units) from public.credit_grants where user_id = p_user), 0)
        - (select count(*) from public.unlocks where user_id = p_user))::integer
$$;
revoke all on function public.credits_of(uuid) from public, anon, authenticated;

-- Opens one reading with one credit (opening the same reading again costs nothing).
create or replace function public.spend_credit(p_cast_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  left_now integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  if exists (select 1 from public.unlocks where user_id = uid and cast_id = p_cast_id) then
    return jsonb_build_object('ok', true, 'credits', public.credits_of(uid));
  end if;
  left_now := public.credits_of(uid);
  if left_now < 1 then
    return jsonb_build_object('ok', false, 'credits', left_now);
  end if;
  insert into public.unlocks (user_id, cast_id) values (uid, p_cast_id);
  return jsonb_build_object('ok', true, 'credits', left_now - 1);
end
$$;
revoke all on function public.spend_credit(text) from public, anon;
grant execute on function public.spend_credit(text) to authenticated;
