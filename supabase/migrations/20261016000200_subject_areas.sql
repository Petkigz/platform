-- Group 2 · subject taxonomy
--
-- Hierarchical catalogue taxonomy from the project record. This is catalogue
-- infrastructure, not governance: it organises what can be found, and is
-- deliberately independent of scholarly review. A subject area says nothing
-- about whether a course's content has been approved.

create table public.subject_areas (
  id uuid primary key default gen_random_uuid(),

  code text not null check (code ~ '^[a-z0-9][a-z0-9_.-]*$'),
  name text not null check (length(trim(name)) > 0),

  parent_subject_id uuid references public.subject_areas (id) on delete restrict,

  -- A subject must not become its own ancestor. Recursive, so a cycle at any
  -- depth is rejected rather than only the direct one.
  constraint subject_areas_no_cycle check (
    parent_subject_id is null or parent_subject_id <> id
  ),

  status text not null default 'active'
    check (status in ('active', 'retired')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index subject_areas_code_key on public.subject_areas (code)
  where deleted_at is null;

create index subject_areas_parent_idx on public.subject_areas (parent_subject_id);

create trigger subject_areas_set_updated_at
  before update on public.subject_areas
  for each row execute function public.set_updated_at();

-- Recursive cycle guard. The simple check above only catches self-parenting;
-- this catches a->b->c->a.
create or replace function public.reject_subject_area_cycle()
returns trigger
language plpgsql
as $$
declare
  v_cursor uuid := new.parent_subject_id;
  v_depth  integer := 0;
begin
  while v_cursor is not null loop
    if v_cursor = new.id then
      raise exception
        'subject area % would become its own ancestor', new.id
        using errcode = 'check_violation';
    end if;

    select sa.parent_subject_id into v_cursor
      from public.subject_areas sa
     where sa.id = v_cursor;

    v_depth := v_depth + 1;
    if v_depth > 32 then
      raise exception 'subject area taxonomy is deeper than 32 levels'
        using errcode = 'program_limit_exceeded';
    end if;
  end loop;

  return new;
end;
$$;

create trigger subject_areas_reject_cycle
  before insert or update of parent_subject_id on public.subject_areas
  for each row execute function public.reject_subject_area_cycle();

comment on table public.subject_areas is
  'Hierarchical catalogue taxonomy. Organises discovery only; not a review status.';
