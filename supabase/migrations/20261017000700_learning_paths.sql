-- Group 2 · learning paths
--
-- "Organized learning journeys" — an ordered, partly-required set of courses.
-- A path references courses, not versions: the learner is pinned to a version
-- when they enrol, and the path should not need editing every time a course is
-- revised.

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),

  title text not null check (length(trim(title)) > 0),
  description text,

  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  institution_id uuid references public.institutions (id) on delete restrict,

  audience text not null default 'both'
    check (audience in ('child', 'adult', 'both')),

  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index learning_paths_slug_key on public.learning_paths (slug)
  where deleted_at is null;

create index learning_paths_institution_idx on public.learning_paths (institution_id);

create trigger learning_paths_set_updated_at
  before update on public.learning_paths
  for each row execute function public.set_updated_at();

create table public.learning_path_items (
  id uuid primary key default gen_random_uuid(),

  learning_path_id uuid not null
    references public.learning_paths (id) on delete cascade,

  course_id uuid not null
    references public.courses (id) on delete restrict,

  position integer not null default 1 check (position > 0),

  required boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_path_items
  add constraint learning_path_items_position_key
  unique (learning_path_id, position) deferrable initially deferred;

-- A course appears once per path, whatever its position.
create unique index learning_path_items_one_per_course
  on public.learning_path_items (learning_path_id, course_id);

create trigger learning_path_items_set_updated_at
  before update on public.learning_path_items
  for each row execute function public.set_updated_at();

comment on table public.learning_paths is 'Ordered journeys through courses.';
comment on table public.learning_path_items is
  'References courses, not versions, so a course revision does not require editing the path.';
