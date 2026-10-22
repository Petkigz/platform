-- Test harness only. NOT a migration — never applied to a real database.
-- Stubs the parts Supabase provides so the migrations can run against a bare
-- PostgreSQL instance in CI.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  -- Supabase stores the provider's claims here. An OAuth sign-up arrives with
  -- full_name/name/avatar_url and handle_new_user() reads them; a password
  -- sign-up arrives with an empty object.
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- One row per way a person can sign in. Only `provider` is read by the
-- application; the real table carries much more.
create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
