-- Group 3 · governance
--
-- Provenance, conflicts, reports, appeals, publication events and the audit
-- trail. The two event tables are append-only: an audit log that can be
-- edited is not an audit log.

-- ---------------------------------------------------------------------------
-- content_sources
--
-- Source provenance. The record already specifies this table, and the Qur'an
-- moat ideas depend on it: a learner who can see which mushaf, which hadith
-- collection and which edition a lesson rests on is being given something a
-- competitor without provenance cannot copy.
-- ---------------------------------------------------------------------------
create table public.content_sources (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete cascade,

  source_type text not null default 'other'
    check (source_type in
      ('quran', 'hadith', 'tafsir', 'fiqh_reference', 'book', 'article',
       'lecture', 'fatwa', 'manuscript', 'other')),

  title text not null check (length(trim(title)) > 0),
  author_or_compiler text,
  edition_or_version text,

  -- Surah:ayah, hadith number, page range, volume.
  reference_locator text,

  url text check (url is null or url ~ '^https://'),

  notes text,

  created_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  created_at timestamptz not null default now()
);

create index content_sources_version_idx on public.content_sources (course_version_id);

-- ---------------------------------------------------------------------------
-- content_source_links — sources attach to specific content, not just a course
-- ---------------------------------------------------------------------------
create table public.content_source_links (
  id uuid primary key default gen_random_uuid(),

  content_source_id uuid not null
    references public.content_sources (id) on delete cascade,

  lesson_id uuid references public.lessons (id) on delete cascade,
  lesson_resource_id uuid references public.lesson_resources (id) on delete cascade,
  assessment_id uuid references public.assessments (id) on delete cascade,

  -- Where in the lesson: a timestamp, a paragraph, a timestamp range.
  anchor text,

  created_at timestamptz not null default now(),

  -- A link must point at exactly one thing.
  constraint csl_single_target check (
    (lesson_id is not null)::int
      + (lesson_resource_id is not null)::int
      + (assessment_id is not null)::int = 1
  )
);

create index csl_source_idx   on public.content_source_links (content_source_id);
create index csl_lesson_idx   on public.content_source_links (lesson_id);

-- A source and its links must belong to the same version.
create or replace function public.enforce_source_link_version()
returns trigger
language plpgsql
as $$
declare
  v_source_version uuid;
  v_target_version uuid;
begin
  select cs.course_version_id into v_source_version
    from public.content_sources cs where cs.id = new.content_source_id;

  if new.lesson_id is not null then
    select csec.course_version_id into v_target_version
      from public.lessons l
      join public.course_sections csec on csec.id = l.section_id
     where l.id = new.lesson_id;
  elsif new.lesson_resource_id is not null then
    select csec.course_version_id into v_target_version
      from public.lesson_resources lr
      join public.lessons l on l.id = lr.lesson_id
      join public.course_sections csec on csec.id = l.section_id
     where lr.id = new.lesson_resource_id;
  else
    select a.course_version_id into v_target_version
      from public.assessments a where a.id = new.assessment_id;
  end if;

  if v_target_version is distinct from v_source_version then
    raise exception
      'a source from version % cannot be linked to content in version %',
      v_source_version, v_target_version
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger csl_version_match
  before insert on public.content_source_links
  for each row execute function public.enforce_source_link_version();

-- ---------------------------------------------------------------------------
-- reviewer_conflict_declarations
-- ---------------------------------------------------------------------------
create table public.reviewer_conflict_declarations (
  id uuid primary key default gen_random_uuid(),

  reviewer_profile_id uuid not null
    references public.reviewer_profiles (id) on delete cascade,

  -- NULL means a standing conflict, not tied to one version.
  course_version_id uuid references public.course_versions (id) on delete cascade,

  conflict_type text not null
    check (conflict_type in
      ('authorship', 'financial', 'family', 'teacher_student',
       'institutional', 'personal', 'other')),

  description text not null check (length(trim(description)) > 0),

  status text not null default 'declared'
    check (status in ('declared', 'under_assessment', 'accepted', 'disqualifying', 'resolved')),

  assessed_by uuid references public.user_profiles (user_id) on delete set null,
  assessed_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rcd_assessment_agrees check (
    (assessed_at is null) = (assessed_by is null)
  ),
  constraint rcd_assessed_status check (
    status not in ('accepted', 'disqualifying')
    or (assessed_by is not null and assessed_at is not null)
  )
);

create index rcd_reviewer_idx on public.reviewer_conflict_declarations (reviewer_profile_id);

create trigger rcd_set_updated_at
  before update on public.reviewer_conflict_declarations
  for each row execute function public.set_updated_at();

-- A reviewer may not clear their own conflict.
create or replace function public.reject_self_assessed_conflict()
returns trigger
language plpgsql
as $$
declare
  v_reviewer_user uuid;
begin
  if new.assessed_by is null then
    return new;
  end if;

  select rp.user_id into v_reviewer_user
    from public.reviewer_profiles rp where rp.id = new.reviewer_profile_id;

  if v_reviewer_user = new.assessed_by then
    raise exception
      'a reviewer may not assess their own conflict declaration'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger rcd_no_self_assessment
  before insert or update of assessed_by on public.reviewer_conflict_declarations
  for each row execute function public.reject_self_assessed_conflict();

-- ---------------------------------------------------------------------------
-- content_reports
-- ---------------------------------------------------------------------------
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete restrict,

  lesson_id uuid references public.lessons (id) on delete set null,

  -- NULL permits an anonymous report; a moderation policy should decide
  -- whether those are acted on.
  reported_by uuid references public.user_profiles (user_id) on delete set null,

  report_category text not null
    check (report_category in
      ('doctrinal_error', 'translation_error', 'inappropriate_content',
       'copyright', 'technical_fault', 'misattribution', 'other')),

  description text not null check (length(trim(description)) > 0),

  status text not null default 'submitted'
    check (status in ('submitted', 'triaged', 'under_review', 'resolved', 'dismissed')),

  assigned_to uuid references public.user_profiles (user_id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cr_resolution_agrees check (
    (resolved_at is null) = (status not in ('resolved', 'dismissed'))
  )
);

create index content_reports_version_idx on public.content_reports (course_version_id);
create index content_reports_status_idx  on public.content_reports (status);

create trigger content_reports_set_updated_at
  before update on public.content_reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- governance_appeals
--
-- Recorded note: "Appeal should not be decided solely by original
-- decision-maker."
-- ---------------------------------------------------------------------------
create table public.governance_appeals (
  id uuid primary key default gen_random_uuid(),

  related_decision_id uuid not null
    references public.content_review_decisions (id) on delete restrict,

  submitted_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  appeal_reason text not null check (length(trim(appeal_reason)) > 0),

  status text not null default 'submitted'
    check (status in
      ('submitted', 'accepted_for_review', 'under_review', 'upheld', 'overturned', 'withdrawn')),

  assigned_to uuid references public.user_profiles (user_id) on delete set null,
  resolution_summary text,
  resolved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ga_resolution_agrees check (
    (resolved_at is null) = (status not in ('upheld', 'overturned', 'withdrawn'))
  )
);

create index governance_appeals_decision_idx on public.governance_appeals (related_decision_id);

create trigger governance_appeals_set_updated_at
  before update on public.governance_appeals
  for each row execute function public.set_updated_at();

-- The original decision-maker may not resolve the appeal against their own
-- decision. "Not solely" — a panel of several including them would be a
-- different rule, and is not what a solo builder needs on day one.
create or replace function public.reject_self_resolved_appeal()
returns trigger
language plpgsql
as $$
declare
  v_original_decider uuid;
begin
  if new.assigned_to is null or new.status not in ('upheld', 'overturned') then
    return new;
  end if;

  select crd.decided_by into v_original_decider
    from public.content_review_decisions crd
   where crd.id = new.related_decision_id;

  if v_original_decider = new.assigned_to then
    raise exception
      'the reviewer who made decision % may not resolve an appeal against it',
      new.related_decision_id
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger ga_no_self_resolution
  before insert or update of assigned_to, status on public.governance_appeals
  for each row execute function public.reject_self_resolved_appeal();

-- ---------------------------------------------------------------------------
-- publication_events — append-only
-- ---------------------------------------------------------------------------
create table public.publication_events (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete restrict,

  event_type text not null
    check (event_type in
      ('submitted', 'approved_for_publication', 'published', 'suspended', 'restored', 'retired')),

  performed_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  reason text,
  occurred_at timestamptz not null default now()
);

create index publication_events_version_idx on public.publication_events (course_version_id);

create or replace function public.reject_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'publication events are append-only history'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger publication_events_append_only
  before update or delete on public.publication_events
  for each row execute function public.reject_event_mutation();

-- ---------------------------------------------------------------------------
-- governance_audit_events — append-only, immutable
--
-- D7 puts audit at the end of the retention order and marks it immutable.
-- ---------------------------------------------------------------------------
create table public.governance_audit_events (
  id uuid primary key default gen_random_uuid(),

  actor uuid references public.user_profiles (user_id) on delete set null,

  action text not null check (length(trim(action)) > 0),

  -- What was acted on. Deliberately untyped: the audit log outlives schema
  -- changes, and a foreign key here would make old entries undeletable.
  target_type text not null,
  target_id   uuid,

  detail jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now()
);

create index gae_actor_idx  on public.governance_audit_events (actor);
create index gae_target_idx on public.governance_audit_events (target_type, target_id);
create index gae_action_idx on public.governance_audit_events (action);

create trigger gae_append_only
  before update or delete on public.governance_audit_events
  for each row execute function public.reject_event_mutation();

comment on table public.content_sources is 'Source provenance per version.';
comment on table public.content_source_links is 'Provenance attached to a specific lesson, resource or assessment.';
comment on table public.reviewer_conflict_declarations is 'Declared conflicts. A reviewer may not assess their own.';
comment on table public.governance_appeals is 'The original decision-maker may not resolve an appeal against their own decision.';
comment on table public.publication_events is 'Append-only publication history.';
comment on table public.governance_audit_events is 'Append-only, immutable (D7). Untyped target so it outlives schema changes.';
