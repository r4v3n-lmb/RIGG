create extension if not exists "pgcrypto";

create table if not exists public.preorders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  currency text not null,
  quantity int not null,
  full_price numeric,
  deposit_amount numeric,
  paid boolean not null default false,
  payment_reference text,
  locale text,
  region text
);

alter table public.preorders enable row level security;

drop policy if exists "Allow anonymous inserts" on public.preorders;
create policy "Allow anonymous inserts"
  on public.preorders
  for insert
  to anon
  with check (true);

drop policy if exists "Allow anonymous selects" on public.preorders;
create policy "Allow anonymous selects"
  on public.preorders
  for select
  to anon
  using (true);

drop policy if exists "Allow anonymous updates" on public.preorders;
create policy "Allow anonymous updates"
  on public.preorders
  for update
  to anon
  using (true)
  with check (true);
