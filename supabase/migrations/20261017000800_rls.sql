-- Group 2 part 2 · row level security
--
-- Same default as everywhere else: deny. The recurring shape is "the learner,
-- their guardian, or a privileged role", which Group 1 already provides as
-- is_own_learner_profile() and is_learner_family_member().
--
-- There are deliberately few UPDATE policies. Every state change that matters
-- — submitting, grading, re-pinning, issuing, revoking — goes through a
-- security definer function, which runs as the table owner and therefore
-- bypasses RLS. Leaving no update policy means a direct write by an
-- authenticated client is simply not possible.

alter table public.course_enrolments                enable row level security;
alter table public.course_enrolment_version_history enable row level security;
alter table public.lesson_progress                  enable row level security;
alter table public.assessments                      enable row level security;
alter table public.assessment_questions             enable row level security;
alter table public.assessment_attempts              enable row level security;
alter table public.assessment_responses             enable row level security;
alter table public.course_completion_policies       enable row level security;
alter table public.course_completion_requirements   enable row level security;
alter table public.certificates                     enable row level security;
alter table public.learning_paths                   enable row level security;
alter table public.learning_path_items              enable row level security;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function public.can_access_learner(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_own_learner_profile(p_learner_id)
      or public.is_learner_family_member(p_learner_id)
      or public.is_privileged(public.current_user_id());
$$;

create or replace function public.is_enrolled_in_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_enrolments ce
     where ce.course_version_id = p_version_id
       and ce.status in ('active', 'completed')
       and ce.deleted_at is null
       and (public.is_own_learner_profile(ce.learner_profile_id)
            or public.is_learner_family_member(ce.learner_profile_id))
  );
$$;

-- Draft content: its author, or staff.
create or replace function public.can_author_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_versions cv
     where cv.id = p_version_id
       and (cv.created_by = public.current_user_id()
            or public.is_privileged(public.current_user_id()))
  );
$$;

-- ---------------------------------------------------------------------------
-- course_enrolments
-- ---------------------------------------------------------------------------
create policy course_enrolments_read on public.course_enrolments
  for select to authenticated
  using (public.can_access_learner(learner_profile_id) and deleted_at is null);

create policy course_enrolments_insert on public.course_enrolments
  for insert to authenticated
  with check (
    public.can_access_learner(learner_profile_id)
    and status = 'active'
    and deleted_at is null
  );
-- No update policy: only re_pin_enrolment() and issue_certificate() may write.
-- No delete policy: D7.

-- ---------------------------------------------------------------------------
-- course_enrolment_version_history — privileged only, and append-only
-- ---------------------------------------------------------------------------
create policy cev_history_read on public.course_enrolment_version_history
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));
-- No insert policy: re_pin_enrolment() is the only writer.

-- ---------------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------------
create policy lesson_progress_read on public.lesson_progress
  for select to authenticated
  using (exists (
    select 1 from public.course_enrolments ce
     where ce.id = lesson_progress.course_enrolment_id
       and public.can_access_learner(ce.learner_profile_id)
  ));

create policy lesson_progress_insert on public.lesson_progress
  for insert to authenticated
  with check (exists (
    select 1 from public.course_enrolments ce
     where ce.id = lesson_progress.course_enrolment_id
       and public.can_access_learner(ce.learner_profile_id)
  ));

create policy lesson_progress_update on public.lesson_progress
  for update to authenticated
  using (exists (
    select 1 from public.course_enrolments ce
     where ce.id = lesson_progress.course_enrolment_id
       and public.can_access_learner(ce.learner_profile_id)
  ));

-- ---------------------------------------------------------------------------
-- assessments and questions
--
-- Visible to a learner enrolled in that exact version, or to the author and
-- staff while it is unpublished. Not to anonymous visitors: assessment
-- content is worth protecting even when the course page is public.
-- ---------------------------------------------------------------------------
create policy assessments_read on public.assessments
  for select to authenticated
  using (public.is_enrolled_in_version(course_version_id)
         or public.can_author_version(course_version_id));

create policy assessments_write on public.assessments
  for insert to authenticated
  with check (public.can_author_version(course_version_id));

create policy assessment_questions_read on public.assessment_questions
  for select to authenticated
  using (exists (
    select 1 from public.assessments a
     where a.id = assessment_questions.assessment_id
       and (public.is_enrolled_in_version(a.course_version_id)
            or public.can_author_version(a.course_version_id))
  ));

create policy assessment_questions_write on public.assessment_questions
  for insert to authenticated
  with check (exists (
    select 1 from public.assessments a
     where a.id = assessment_questions.assessment_id
       and public.can_author_version(a.course_version_id)
  ));

-- ---------------------------------------------------------------------------
-- attempts and responses
-- ---------------------------------------------------------------------------
create policy assessment_attempts_read on public.assessment_attempts
  for select to authenticated
  using (public.can_access_learner(learner_profile_id)
         or public.is_privileged(public.current_user_id()));

create policy assessment_attempts_insert on public.assessment_attempts
  for insert to authenticated
  with check (
    public.can_access_learner(learner_profile_id)
    and status = 'in_progress'
  );

create policy assessment_responses_read on public.assessment_responses
  for select to authenticated
  using (exists (
    select 1 from public.assessment_attempts aa
     where aa.id = assessment_responses.assessment_attempt_id
       and (public.can_access_learner(aa.learner_profile_id)
            or public.is_privileged(public.current_user_id()))
  ));

create policy assessment_responses_insert on public.assessment_responses
  for insert to authenticated
  with check (exists (
    select 1 from public.assessment_attempts aa
     where aa.id = assessment_responses.assessment_attempt_id
       and public.can_access_learner(aa.learner_profile_id)
       and aa.status = 'in_progress'
  ));

-- ---------------------------------------------------------------------------
-- completion configuration — readable by anyone who can see the version
-- ---------------------------------------------------------------------------
create policy course_completion_policies_read on public.course_completion_policies
  for select to authenticated
  using (public.can_read_version(course_version_id)
         or public.is_enrolled_in_version(course_version_id));

create policy course_completion_policies_write on public.course_completion_policies
  for insert to authenticated
  with check (public.can_author_version(course_version_id));

create policy course_completion_requirements_read on public.course_completion_requirements
  for select to authenticated
  using (exists (
    select 1 from public.course_completion_policies ccp
     where ccp.id = course_completion_requirements.completion_policy_id
       and (public.can_read_version(ccp.course_version_id)
            or public.is_enrolled_in_version(ccp.course_version_id))
  ));

create policy course_completion_requirements_write on public.course_completion_requirements
  for insert to authenticated
  with check (exists (
    select 1 from public.course_completion_policies ccp
     where ccp.id = course_completion_requirements.completion_policy_id
       and public.can_author_version(ccp.course_version_id)
  ));

-- ---------------------------------------------------------------------------
-- certificates
--
-- Public verification is a function, not a table read. The table itself is
-- visible only to the learner, their guardian, and staff.
-- ---------------------------------------------------------------------------
create policy certificates_read on public.certificates
  for select to authenticated
  using (public.can_access_learner(learner_profile_id));
-- No insert policy: issue_certificate() only.
-- No update policy: revoke_certificate() only.
-- No delete policy: D7, certificates are never removed.

-- ---------------------------------------------------------------------------
-- learning paths — the catalogue is public, drafts are not
-- ---------------------------------------------------------------------------
create policy learning_paths_read on public.learning_paths
  for select to anon, authenticated
  using (
    deleted_at is null
    and (status = 'active'
         or created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id()))
  );

create policy learning_paths_insert on public.learning_paths
  for insert to authenticated
  with check (created_by = public.current_user_id());

create policy learning_paths_update on public.learning_paths
  for update to authenticated
  using (created_by = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

create policy learning_path_items_read on public.learning_path_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.learning_paths lp
     where lp.id = learning_path_items.learning_path_id
       and lp.deleted_at is null
       and (lp.status = 'active'
            or lp.created_by = public.current_user_id()
            or public.is_privileged(public.current_user_id()))
  ));

create policy learning_path_items_write on public.learning_path_items
  for insert to authenticated
  with check (exists (
    select 1 from public.learning_paths lp
     where lp.id = learning_path_items.learning_path_id
       and (lp.created_by = public.current_user_id()
            or public.is_privileged(public.current_user_id()))
  ));

-- ---------------------------------------------------------------------------
-- grants
--
-- answer_key is deliberately absent from the question grants; see the column
-- grants at the end of 20261017000400_assessment_rules.sql.
-- ---------------------------------------------------------------------------
grant select on public.learning_paths, public.learning_path_items to anon;

grant select, insert, update, delete on
  public.course_enrolments,
  public.course_enrolment_version_history,
  public.lesson_progress,
  public.assessments,
  public.assessment_attempts,
  public.assessment_responses,
  public.course_completion_policies,
  public.course_completion_requirements,
  public.certificates,
  public.learning_paths,
  public.learning_path_items
  to authenticated;

-- assessment_questions is deliberately NOT granted here. A table-level GRANT
-- covers every column and would silently re-expose answer_key, undoing the
-- column grants in 20261017000400_assessment_rules.sql.

comment on function public.can_access_learner(uuid) is
  'The learner themselves, a member of their family, or a privileged role.';
comment on function public.is_enrolled_in_version(uuid) is
  'Learner or guardian holds a live enrolment pinned to this exact version.';
comment on function public.can_author_version(uuid) is
  'The version author or a privileged role. Used for unpublished content.';
