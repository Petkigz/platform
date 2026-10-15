-- Group 2 · courses
--
-- The durable wrapper. A course is what learners enrol in and what a
-- certificate names; the course_version is what they actually receive.
-- Publishing, review and retirement all happen at version level (D5), so the
-- course row itself carries only identity and catalogue metadata.

create table public.courses (
  id uuid primary key default gen_random_uuid(),

  -- D1: nullable. NULL means the platform default; a value scopes the course
  -- to one madrasah, school or mosque tenant.
  institution_id uuid references public.institutions (id) on delete restrict,

  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  title text not null check (length(trim(title)) > 0),
  description text,

  -- Who this is for. This is a safeguarding signal, not just a filter:
  -- 'child' content will require the guardian machinery from Group 1 and the
  -- child_login flag to be off (D2).
  audience text not null default 'both'
    check (audience in ('child', 'adult', 'both')),

  difficulty text not null default 'beginner'
    check (difficulty in ('beginner', 'intermediate', 'advanced')),

  -- Lifecycle of the wrapper, distinct from any version's publication status.
  -- 'active' means discoverable and enrolable through a published version.
  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- D7: soft delete by default.
  deleted_at timestamptz
);

-- Soft delete frees the slug, matching the institutions pattern, so a course
-- can be retired and its address reused without burning the identifier.
create unique index courses_slug_key on public.courses (slug)
  where deleted_at is null;

create index courses_institution_idx on public.courses (institution_id);
create index courses_created_by_idx  on public.courses (created_by);
create index courses_audience_idx    on public.courses (audience) where deleted_at is null;

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

comment on table public.courses is
  'Durable course wrapper. Identity and catalogue metadata only; publication lives on course_versions.';
