-- Group 1 · institutions  (decision D1 — multi-tenancy)
--
-- Single-tenant schema with a nullable institution_id rather than separate
-- schemas or databases. Every row that could ever be institution-scoped
-- carries the column from day one; retrofitting it later would mean touching
-- most tables, every query and every authorization path.
--
-- A seeded 'default' row means "no institution" is a real value rather than a
-- NULL special case scattered through application code.

create table public.institutions (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  name             text not null,
  institution_type text not null default 'default'
                     check (institution_type in
                       ('default','madrasah','school','mosque','organisation')),
  status           text not null default 'active'
                     check (status in ('active','suspended','archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

-- Partial rather than plain unique: soft-deleting an institution frees its
-- code for reuse, which a plain unique constraint would not allow.
create unique index institutions_code_active_key
  on public.institutions (code)
  where deleted_at is null;

create index institutions_status_key
  on public.institutions (status)
  where deleted_at is null;

create trigger institutions_set_updated_at
  before update on public.institutions
  for each row execute function public.set_updated_at();

comment on table public.institutions is
  'D1 tenancy root. Scoped tables carry a nullable institution_id; the seeded '
  '''default'' row represents "no institution".';
