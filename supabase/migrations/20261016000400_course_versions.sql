-- Group 2 · course versions
--
-- D5 (FROZEN): published versions are immutable. An enrolment pins a version,
-- so silently editing a published one rewrites what an enrolled learner is
-- mid-way through and invalidates every certificate that snapshot referenced.
-- "Immutable" here is enforced by the database, not by a convention in app
-- code, because a convention cannot survive the second developer or the
-- second AI-generated query.
--
-- D9 (FROZEN): one course, many versions, one `language` column each. A
-- translation is a version of the same course, not a separate course, and at
-- most one version per course per language may be published at a time.

create table public.course_versions (
  id uuid primary key default gen_random_uuid(),

  course_id uuid not null references public.courses (id) on delete cascade,

  version_number integer not null check (version_number > 0),

  -- D9. BCP-47 shape: 'en', 'ar', 'sw', 'id', 'tr'.
  language text not null default 'en'
    check (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),

  -- draft     freely editable
  -- submitted locked; under review
  -- approved  locked; awaiting publication
  -- published immutable
  -- retired   immutable; still readable, no new enrolments (D6)
  -- rejected  locked; may be reopened to draft by the author
  version_status text not null default 'draft'
    check (version_status in
      ('draft', 'submitted', 'approved', 'published', 'retired', 'rejected')),

  change_summary text,

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  submitted_at timestamptz,
  published_at timestamptz,
  retired_at   timestamptz,

  decision_by uuid references public.user_profiles (user_id) on delete restrict,
  decision_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- D5: published versions must survive forever, so there is no deleted_at.
  -- Retiring a version is a status change, never a removal.
);

create unique index course_versions_number_key
  on public.course_versions (course_id, version_number);

-- D9: at most one published version per course per language.
create unique index course_versions_one_published_per_language
  on public.course_versions (course_id, language)
  where version_status = 'published';

create index course_versions_status_idx     on public.course_versions (version_status);
create index course_versions_created_by_idx on public.course_versions (created_by);

create trigger course_versions_set_updated_at
  before update on public.course_versions
  for each row execute function public.set_updated_at();

-- Publication history must agree with the status, or a report or certificate
-- that reads published_at will silently misstate when something went live.
--
-- Deliberately NOT covering submitted_at, decision_by or decision_reason: a
-- rejected version returns to draft so its author can revise it, and clearing
-- those three would destroy the only record of why it was rejected. They are
-- overwritten on the next review cycle; the durable, append-only trail belongs
-- in the audit tables in a later group.
alter table public.course_versions add constraint cv_publication_history_agrees check (
  (published_at is null or version_status in ('published', 'retired'))
  and (retired_at is null or version_status = 'retired')
);

-- ---------------------------------------------------------------------------
-- Immutability
--
-- Any version that is not a draft is locked against ordinary editing, and so
-- is its whole subtree (sections, lessons, resources). Status changes are the
-- single exception and they can only happen through
-- set_course_version_status(), which sets a transaction-local bypass.
-- ---------------------------------------------------------------------------
create or replace function public.version_lock_active()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('app.bypassing_version_lock', true), '') = 'on';
$$;

create or replace function public.lock_course_version()
returns trigger
language plpgsql
as $$
begin
  if public.version_lock_active() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if old.version_status not in ('draft', 'rejected') then
      raise exception
        'course version % is % and cannot be deleted (D5: published history is never removed; retire it instead)',
        old.id, old.version_status
        using errcode = 'insufficient_privilege';
    end if;
    return old;
  end if;

  if old.version_status = 'draft' then
    return new;
  end if;

  raise exception
    'course version % is % and is locked against editing; use set_course_version_status() to change its state',
    old.id, old.version_status
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger course_versions_lock
  before update or delete on public.course_versions
  for each row execute function public.lock_course_version();

-- Subtree locks live with their tables in the next migration; the shared
-- bypass is public.version_lock_active() above.

-- ---------------------------------------------------------------------------
-- Status transitions
--
-- Allowed:
--   draft     -> submitted        (author)
--   submitted -> approved         (reviewer/privileged, never the author)
--   submitted -> rejected         (reviewer/privileged, never the author)
--   approved  -> published        (privileged)
--   approved  -> rejected         (privileged)
--   rejected  -> draft            (author)
--   published -> retired          (privileged)
--
-- "Author cannot approve their own course" is a recorded design principle and
-- is enforced here, not in the UI.
-- ---------------------------------------------------------------------------
create or replace function public.set_course_version_status(
  p_version_id  uuid,
  p_new_status  text,
  p_actor_id    uuid,
  p_reason      text default null
)
returns public.course_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.course_versions;
  v_allowed boolean := false;
  v_is_author boolean;
  v_is_reviewer boolean;
  v_is_priv boolean;
begin
  select * into v_old from public.course_versions where id = p_version_id for update;
  if not found then
    raise exception 'course version % not found', p_version_id using errcode = 'no_data_found';
  end if;

  v_is_author   := (p_actor_id = v_old.created_by);
  v_is_priv     := public.is_privileged(p_actor_id);
  v_is_reviewer := public.has_role(p_actor_id, 'reviewer') or v_is_priv;

  v_allowed :=
    (v_old.version_status = 'draft'     and p_new_status = 'submitted' and v_is_author) or
    (v_old.version_status = 'submitted' and p_new_status = 'approved'  and v_is_reviewer) or
    (v_old.version_status = 'submitted' and p_new_status = 'rejected'  and v_is_reviewer) or
    (v_old.version_status = 'approved'  and p_new_status = 'published' and v_is_priv) or
    (v_old.version_status = 'approved'  and p_new_status = 'rejected'  and v_is_priv) or
    (v_old.version_status = 'rejected'  and p_new_status = 'draft'     and v_is_author) or
    (v_old.version_status = 'published' and p_new_status = 'retired'   and v_is_priv);

  if not v_allowed then
    raise exception
      'transition % -> % on course version % is not permitted for actor %',
      v_old.version_status, p_new_status, p_version_id, p_actor_id
      using errcode = 'insufficient_privilege';
  end if;

  -- An author may not approve their own submission, even when they hold a
  -- reviewing role.
  if p_new_status = 'approved' and v_is_author then
    raise exception
      'the author of course version % may not approve it themselves', p_version_id
      using errcode = 'insufficient_privilege';
  end if;

  -- Armed before any write below: retiring the displaced version touches a
  -- published, therefore locked, row.
  perform set_config('app.bypassing_version_lock', 'on', true);

  -- Publishing requires something to publish.
  if p_new_status = 'published' then
    if not exists (select 1 from public.course_sections cs
                    join public.lessons l on l.section_id = cs.id
                    where cs.course_version_id = p_version_id) then
      raise exception
        'course version % has no lessons and cannot be published', p_version_id
        using errcode = 'check_violation';
    end if;

    -- D9: publishing a language displaces the version currently published
    -- for it. Retire rather than fail, so a translation update is one call.
    update public.course_versions
       set version_status = 'retired',
           retired_at     = now(),
           decision_by    = p_actor_id,
           decision_reason = 'superseded by version ' || v_old.version_number
     where course_id = v_old.course_id
       and language  = v_old.language
       and version_status = 'published';
  end if;

  update public.course_versions
     set version_status  = p_new_status,
         submitted_at    = case when p_new_status = 'submitted' then now() else submitted_at end,
         published_at    = case when p_new_status = 'published' then now() else published_at end,
         retired_at      = case when p_new_status = 'retired'   then now() else retired_at end,
         decision_by     = case when p_new_status in ('approved','rejected') then p_actor_id else decision_by end,
         decision_reason = case when p_new_status in ('approved','rejected','retired') then p_reason else decision_reason end
   where id = p_version_id
  returning * into v_old;

  perform set_config('app.bypassing_version_lock', 'off', true);

  return v_old;
end;
$$;

revoke execute on function public.set_course_version_status(uuid, text, uuid, text) from public;
revoke execute on function public.set_course_version_status(uuid, text, uuid, text) from anon;
grant  execute on function public.set_course_version_status(uuid, text, uuid, text) to authenticated;

comment on table public.course_versions is
  'D5/D9: immutable published snapshots. One published version per course per language.';
comment on function public.set_course_version_status(uuid, text, uuid, text) is
  'The only permitted way to change a version status. Enforces who may transition, and that authors cannot approve their own course.';
