-- Declarative schema for `users` table
-- Columns: id (uuid), firstname, surname, number (integer), email (unique), created_at, updated_at

create table if not exists public."users" (
  id uuid not null primary key default gen_random_uuid(),
  firstname text not null,
  surname text not null,
  number integer,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique constraint / index for email
create unique index if not exists idx_users_email on public."users"(email);

-- Enable Row Level Security
alter table public."users" enable row level security;

-- RLS policies
-- Allow authenticated users to SELECT only their own row
create policy "Users can select their own row" on public."users"
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Allow authenticated users to INSERT only rows where id = auth.uid()
create policy "Users can insert their own row" on public."users"
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Allow authenticated users to UPDATE their own row
create policy "Users can update their own row" on public."users"
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Allow authenticated users to DELETE their own row
create policy "Users can delete their own row" on public."users"
  for delete
  to authenticated
  using ((select auth.uid()) = id);

-- Optional: keep updated_at consistent on updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public."users"
  for each row
  execute function public.set_updated_at();
