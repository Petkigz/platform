-- Group 2 · completion
--
-- Recorded rules: "Completion follows version-specific configurable
-- requirements" and, explicitly, "Prefer relational constraints or subtype
-- tables over unrestricted JSON-only configuration."
--
-- So the requirement targets are real foreign keys with a check that the
-- right one is populated for the type. A JSON blob would let a policy
-- reference a lesson that does not exist in the version, and the error would
-- surface as a learner who can never finish.

create table public.course_completion_policies (
  id uuid primary key default gen_random_uuid(),

  -- One policy per version. Unique, not just indexed, because two competing
  -- policies would make completion undefined.
  course_version_id uuid not null unique
    references public.course_versions (id) on delete cascade,

  completion_mode text not null default 'all_lessons'
    check (completion_mode in ('all_lessons', 'requirements', 'manual')),

  -- Used by 'all_lessons' and 'requirements'; NULL means no floor.
  minimum_progress_percent numeric(5,2)
    check (minimum_progress_percent is null
           or (minimum_progress_percent >= 0 and minimum_progress_percent <= 100)),

  -- "Certificate policy is configurable per version."
  certificate_enabled boolean not null default false,
  certificate_template_version text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger course_completion_policies_set_updated_at
  before update on public.course_completion_policies
  for each row execute function public.set_updated_at();

alter table public.course_completion_policies
  add constraint ccp_certificate_needs_template check (
    not certificate_enabled or certificate_template_version is not null
  );

create table public.course_completion_requirements (
  id uuid primary key default gen_random_uuid(),

  completion_policy_id uuid not null
    references public.course_completion_policies (id) on delete cascade,

  type text not null
    check (type in
      ('lesson_completion', 'assessment_submitted', 'assessment_passed', 'minimum_progress')),

  -- Relational targets. Exactly the one matching `type` must be set.
  target_lesson_id uuid
    references public.lessons (id) on delete cascade,
  target_assessment_id uuid
    references public.assessments (id) on delete cascade,

  minimum_score numeric(5,2)
    check (minimum_score is null or (minimum_score >= 0 and minimum_score <= 100)),
  minimum_percent numeric(5,2)
    check (minimum_percent is null or (minimum_percent >= 0 and minimum_percent <= 100)),

  is_required boolean not null default true,

  position integer not null default 1 check (position > 0),

  created_at timestamptz not null default now(),

  constraint ccr_target_matches_type check (
    case type
      when 'lesson_completion'    then target_lesson_id is not null
                                     and target_assessment_id is null
      when 'assessment_submitted' then target_assessment_id is not null
                                     and target_lesson_id is null
      when 'assessment_passed'    then target_assessment_id is not null
                                     and target_lesson_id is null
      when 'minimum_progress'     then target_lesson_id is null
                                     and target_assessment_id is null
                                     and minimum_percent is not null
    end
  ),
  -- A pass requirement without a pass mark is unenforceable.
  constraint ccr_pass_needs_score check (
    type <> 'assessment_passed' or minimum_score is not null
  )
);

create unique index course_completion_requirements_one_per_target
  on public.course_completion_requirements (completion_policy_id, type, position);

create index ccr_lesson_idx     on public.course_completion_requirements (target_lesson_id);
create index ccr_assessment_idx on public.course_completion_requirements (target_assessment_id);

-- A requirement must target something in its own policy's version.
create or replace function public.enforce_requirement_version_match()
returns trigger
language plpgsql
as $$
declare
  v_policy_version uuid;
  v_target_version uuid;
begin
  select ccp.course_version_id into v_policy_version
    from public.course_completion_policies ccp
   where ccp.id = new.completion_policy_id;

  if new.target_lesson_id is not null then
    select cs.course_version_id into v_target_version
      from public.lessons l
      join public.course_sections cs on cs.id = l.section_id
     where l.id = new.target_lesson_id;
  elsif new.target_assessment_id is not null then
    select a.course_version_id into v_target_version
      from public.assessments a where a.id = new.target_assessment_id;
  else
    return new;
  end if;

  if v_target_version is distinct from v_policy_version then
    raise exception
      'completion requirement targets content in version %, but the policy belongs to version %',
      v_target_version, v_policy_version
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger course_completion_requirements_version_match
  before insert or update of target_lesson_id, target_assessment_id, completion_policy_id
  on public.course_completion_requirements
  for each row execute function public.enforce_requirement_version_match();

-- ---------------------------------------------------------------------------
-- evaluation
--
-- Server-side, from recorded facts. A client claiming "I finished" cannot
-- produce a completion, and neither can a client claiming a score.
-- ---------------------------------------------------------------------------
create or replace function public.evaluate_completion(p_enrolment_id uuid)
returns table (
  is_complete       boolean,
  percent_complete  numeric,
  requirements_met  integer,
  requirements_total integer,
  blocking          text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_policy      public.course_completion_policies;
  v_enrolment   public.course_enrolments;
  v_progress    record;   -- a table-returning function does not create a named type
  v_blocking    text[] := '{}';
  v_met         integer := 0;
  v_total       integer := 0;
  v_req         record;
  v_done        boolean;
  v_best        numeric;
begin
  select * into v_enrolment from public.course_enrolments where id = p_enrolment_id;
  if not found then
    raise exception 'enrolment % not found', p_enrolment_id using errcode = 'no_data_found';
  end if;

  select * into v_progress from public.enrolment_progress_summary(p_enrolment_id);

  select * into v_policy from public.course_completion_policies
   where course_version_id = v_enrolment.course_version_id;

  -- No policy configured: fall back to "every lesson completed".
  if not found then
    is_complete := (v_progress.lessons_total > 0
                    and v_progress.lessons_done = v_progress.lessons_total);
    percent_complete := v_progress.percent_complete;
    requirements_met := v_progress.lessons_done::integer;
    requirements_total := v_progress.lessons_total::integer;
    if not is_complete then
      blocking := array[format('%s of %s lessons completed',
                               v_progress.lessons_done, v_progress.lessons_total)];
    end if;
    return next;
    return;
  end if;

  percent_complete := v_progress.percent_complete;

  if v_policy.completion_mode = 'manual' then
    is_complete := false;
    requirements_met := 0;
    requirements_total := 0;
    blocking := array['completion is granted manually by staff'];
    return next;
    return;
  end if;

  if v_policy.minimum_progress_percent is not null
     and v_progress.percent_complete < v_policy.minimum_progress_percent then
    v_blocking := v_blocking || format('progress %s%% is below the required %s%%',
                                       v_progress.percent_complete,
                                       v_policy.minimum_progress_percent);
  end if;

  if v_policy.completion_mode = 'all_lessons' then
    if v_progress.lessons_total = 0
       or v_progress.lessons_done < v_progress.lessons_total then
      v_blocking := v_blocking || format('%s of %s lessons completed',
                                         v_progress.lessons_done, v_progress.lessons_total);
    end if;
    requirements_met := v_progress.lessons_done::integer;
    requirements_total := v_progress.lessons_total::integer;
    is_complete := (v_blocking = '{}');
    blocking := v_blocking;
    return next;
    return;
  end if;

  -- 'requirements' mode
  for v_req in
    select * from public.course_completion_requirements
     where completion_policy_id = v_policy.id
     order by position
  loop
    v_total := v_total + 1;
    v_done := false;

    case v_req.type
      when 'lesson_completion' then
        select exists (
          select 1 from public.lesson_progress lp
           where lp.course_enrolment_id = p_enrolment_id
             and lp.lesson_id = v_req.target_lesson_id
             and lp.status = 'completed'
        ) into v_done;

      when 'assessment_submitted' then
        select exists (
          select 1 from public.assessment_attempts aa
           where aa.course_enrolment_id = p_enrolment_id
             and aa.assessment_id = v_req.target_assessment_id
             and aa.status in ('submitted', 'awaiting_manual_grading', 'graded')
        ) into v_done;

      when 'assessment_passed' then
        select max(case when aa.passed then 100.0 * aa.score_earned / nullif(aa.score_possible, 0) end)
          into v_best
          from public.assessment_attempts aa
         where aa.course_enrolment_id = p_enrolment_id
           and aa.assessment_id = v_req.target_assessment_id
           and aa.status = 'graded';
        v_done := (v_best is not null and v_best >= v_req.minimum_score);

      when 'minimum_progress' then
        v_done := (v_progress.percent_complete >= v_req.minimum_percent);
    end case;

    if v_done then
      v_met := v_met + 1;
    elsif v_req.is_required then
      v_blocking := v_blocking || format('unmet: %s', v_req.type);
    end if;
  end loop;

  requirements_met := v_met;
  requirements_total := v_total;
  is_complete := (v_blocking = '{}');
  blocking := v_blocking;
  return next;
end;
$$;

comment on table public.course_completion_policies is
  'One per version. Configures how completion is decided and whether a certificate is issued.';
comment on table public.course_completion_requirements is
  'Relational targets with a check tying each to its type. Not a JSON blob.';
comment on function public.evaluate_completion(uuid) is
  'Server-side completion evaluation from recorded facts. Returns what is still blocking.';
