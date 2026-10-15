-- Group 3 · scholarly panels (DORMANT) and the publication gate
--
-- P6: peer review now, panel later. These four tables are built but not used;
-- governance.panel_required in platform_settings decides whether publication
-- demands a panel decision. Flipping that setting is not a migration.
--
-- Remember the cost recorded in DECISIONS.md: when the panel is switched on,
-- everything published under peer review alone needs retroactive panel review
-- or an explicit grandfathering decision.

create table public.scholarly_panels (
  id uuid primary key default gen_random_uuid(),

  name text not null check (length(trim(name)) > 0),
  description text,

  -- NULL means the panel covers every subject.
  subject_area_id uuid references public.subject_areas (id) on delete restrict,

  quorum_size integer not null default 3 check (quorum_size > 0),

  -- 'inactive' is the default: a panel exists on paper until it is convened.
  status text not null default 'inactive'
    check (status in ('active', 'inactive', 'dissolved')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger scholarly_panels_set_updated_at
  before update on public.scholarly_panels
  for each row execute function public.set_updated_at();

create table public.scholarly_panel_memberships (
  id uuid primary key default gen_random_uuid(),

  panel_id uuid not null
    references public.scholarly_panels (id) on delete cascade,

  reviewer_profile_id uuid not null
    references public.reviewer_profiles (id) on delete restrict,

  member_role text not null default 'member'
    check (member_role in ('chair', 'member')),

  status text not null default 'active'
    check (status in ('active', 'stepped_down', 'removed')),

  joined_at timestamptz not null default now(),
  left_at timestamptz,

  constraint spm_left_agrees check (
    (left_at is null) = (status = 'active')
  )
);

create unique index spm_one_per_panel
  on public.scholarly_panel_memberships (panel_id, reviewer_profile_id)
  where status = 'active';

create table public.scholarly_panel_cases (
  id uuid primary key default gen_random_uuid(),

  panel_id uuid not null
    references public.scholarly_panels (id) on delete restrict,

  course_version_id uuid not null
    references public.course_versions (id) on delete restrict,

  status text not null default 'open'
    check (status in ('open', 'deliberating', 'approved', 'rejected', 'withdrawn')),

  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  outcome_summary text,

  constraint spc_closed_agrees check (
    (closed_at is null) = (status in ('open', 'deliberating'))
  ),
  constraint spc_outcome_agrees check (
    status not in ('approved', 'rejected', 'withdrawn') or outcome_summary is not null
  )
);

create unique index spc_one_open_case
  on public.scholarly_panel_cases (course_version_id)
  where status in ('open', 'deliberating');

create table public.scholarly_panel_votes (
  id uuid primary key default gen_random_uuid(),

  case_id uuid not null
    references public.scholarly_panel_cases (id) on delete cascade,

  reviewer_profile_id uuid not null
    references public.reviewer_profiles (id) on delete restrict,

  vote text not null check (vote in ('approve', 'reject', 'abstain')),
  rationale text,

  voted_at timestamptz not null default now()
);

-- One vote per member per case.
create unique index spv_one_per_member
  on public.scholarly_panel_votes (case_id, reviewer_profile_id);

-- A voter must be an active member of the panel hearing the case.
create or replace function public.validate_panel_vote()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
      from public.scholarly_panel_cases spc
      join public.scholarly_panel_memberships spm
        on spm.panel_id = spc.panel_id
     where spc.id = new.case_id
       and spm.reviewer_profile_id = new.reviewer_profile_id
       and spm.status = 'active'
  ) then
    raise exception
      'reviewer % is not an active member of the panel hearing case %',
      new.reviewer_profile_id, new.case_id
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger spv_validate
  before insert on public.scholarly_panel_votes
  for each row execute function public.validate_panel_vote();

-- ---------------------------------------------------------------------------
-- content_change_assessments — "risk-based re-review"
--
-- When a version supersedes another, someone must classify how material the
-- change is. Cosmetic fixes should not retrigger a full scholarly review;
-- doctrinal edits must.
-- ---------------------------------------------------------------------------
create table public.content_change_assessments (
  id uuid primary key default gen_random_uuid(),

  course_version_id uuid not null
    references public.course_versions (id) on delete cascade,

  from_version_id uuid references public.course_versions (id) on delete set null,

  change_class text not null default 'minor'
    check (change_class in
      ('typographical', 'media_replacement', 'structural', 'content_minor',
       'doctrinal', 'source_change')),

  risk_level text not null default 'low'
    check (risk_level in ('low', 'medium', 'high', 'critical')),

  requires_re_review boolean not null default true,
  rationale text not null check (length(trim(rationale)) > 0),

  assessed_by uuid not null
    references public.user_profiles (user_id) on delete restrict,
  assessed_at timestamptz not null default now(),

  -- A doctrinal or source change is never a low-risk cosmetic fix.
  constraint cca_material_changes_are_risky check (
    change_class not in ('doctrinal', 'source_change')
    or (risk_level in ('high', 'critical') and requires_re_review)
  )
);

create index cca_version_idx on public.content_change_assessments (course_version_id);

-- ---------------------------------------------------------------------------
-- The publication gate
--
-- A trigger, not a check inside set_course_version_status(), because a
-- function can be called from anywhere and a trigger cannot be skipped. This
-- deliberately ignores app.bypassing_version_lock: that bypass exists so the
-- lock can be released for an authorised transition, not so governance can be
-- skipped.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_publication_gate()
returns trigger
language plpgsql
as $$
declare
  v_open_requirements integer;
  v_approvals         integer;
  v_min_approvals     integer;
  v_panel_ok          boolean;
begin
  if new.version_status <> 'published' or old.version_status = 'published' then
    return new;
  end if;

  select count(*) into v_open_requirements
    from public.content_review_requirements crr
   where crr.course_version_id = new.id
     and crr.requirement_status = 'open';

  if v_open_requirements > 0 then
    raise exception
      'course version % cannot be published: % review requirement(s) still open',
      new.id, v_open_requirements
      using errcode = 'check_violation';
  end if;

  select coalesce(
    (select value_text::integer from public.platform_settings
      where key = 'governance.min_approvals'), 1)
    into v_min_approvals;

  select count(distinct crd.review_assignment_id) into v_approvals
    from public.content_review_decisions crd
   where crd.course_version_id = new.id
     and crd.review_scope = 'scholarly'
     and crd.decision = 'approved';

  if v_approvals < v_min_approvals then
    raise exception
      'course version % has % scholarly approval(s); % required',
      new.id, v_approvals, v_min_approvals
      using errcode = 'check_violation';
  end if;

  -- P6: only enforced when the setting says so.
  if public.setting_bool('governance.panel_required', false) then
    select exists (
      select 1 from public.scholarly_panel_cases spc
       where spc.course_version_id = new.id and spc.status = 'approved'
    ) into v_panel_ok;

    if not coalesce(v_panel_ok, false) then
      raise exception
        'course version % cannot be published: governance.panel_required is on and no panel has approved it',
        new.id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger course_versions_publication_gate
  before update of version_status on public.course_versions
  for each row execute function public.enforce_publication_gate();

-- Every status change is recorded, so publication history does not depend on
-- anyone remembering to log it.
create or replace function public.record_publication_event()
returns trigger
language plpgsql
as $$
declare
  v_type text;
begin
  v_type := case new.version_status
              when 'submitted' then 'submitted'
              when 'approved'  then 'approved_for_publication'
              when 'published' then 'published'
              when 'retired'   then 'retired'
              else null
            end;

  if v_type is not null then
    insert into public.publication_events (course_version_id, event_type, performed_by, reason)
    values (new.id, v_type,
            coalesce(new.decision_by, new.created_by),
            new.decision_reason);
  end if;

  return new;
end;
$$;

create trigger course_versions_record_event
  after update of version_status on public.course_versions
  for each row
  when (new.version_status is distinct from old.version_status)
  execute function public.record_publication_event();

comment on table public.scholarly_panels is 'DORMANT under P6. Built, inactive by default.';
comment on table public.content_change_assessments is 'Risk-based re-review. Doctrinal and source changes cannot be classed as low risk.';
comment on function public.enforce_publication_gate() is
  'Publication requires satisfied review requirements, the minimum scholarly approvals, and — when panel_required is on — a panel decision.';
