-- Run this ONCE in Supabase -> SQL Editor.
-- Afterward use only the public anon/publishable key in the web app.

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text unique not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon text not null default '📌',
  type text not null check (type in ('expense','income')),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  type text not null check (type in ('expense','income')),
  amount numeric(14,2) not null,
  currency text not null,
  category_id uuid,
  note text not null default '',
  date date not null,
  updated_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create or replace function public.is_household_member(h uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.household_members m where m.household_id=h and m.user_id=auth.uid()); $$;

drop policy if exists "read households for join or members" on public.households;
create policy "read households for join or members" on public.households
for select to authenticated using (true);

drop policy if exists "create household" on public.households;
create policy "create household" on public.households
for insert to authenticated with check (created_by=auth.uid());

drop policy if exists "members read membership" on public.household_members;
create policy "members read membership" on public.household_members
for select to authenticated using (user_id=auth.uid() or public.is_household_member(household_id));

drop policy if exists "join household" on public.household_members;
create policy "join household" on public.household_members
for insert to authenticated with check (user_id=auth.uid());

drop policy if exists "members manage categories" on public.categories;
create policy "members manage categories" on public.categories
for all to authenticated using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

drop policy if exists "members manage transactions" on public.transactions;
create policy "members manage transactions" on public.transactions
for all to authenticated using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));
