-- =============================================================================
-- AyāhSpring — the two governance channels, and the doors into them
--
-- Both tables have been in the schema since Group 3 with policies, constraints
-- and status machines, and nothing in the application ever wrote to either:
--
--   content_reports     a learner says "this lesson is wrong"
--   governance_appeals  a teacher says "that rejection was wrong"
--
-- The consequences are different and both matter.
--
-- Without content_reports there is no community safeguard. This platform teaches
-- faith to children and, as of the discussion feature, carries user-generated
-- content that peers can read. Moderation catches what a reviewer thinks to look
-- for; it cannot catch everything. The people reading a lesson are the ones who
-- notice a doctrinal error or a translation mistake, and until now they had
-- nowhere to say so. The categories in the table — doctrinal_error,
-- translation_error, inappropriate_content, misattribution — describe exactly
-- the problems this platform is most exposed to.
--
-- Without governance_appeals a reviewer's word is final and unreviewable. The
-- review layer is live, so a teacher whose course is rejected has no route to
-- contest it. A gate with no appeal is not a scholarly gate, it is just a
-- refusal — and it concentrates a lot of consequence in one person's judgement.
--
-- A CORRECTION TO AN EARLIER CLAIM: governance_appeals.related_decision_id is a
-- foreign key to content_review_decisions. It is for appealing a *reviewer's*
-- decision on a course version, not a removed discussion post. Those are
-- different problems and this migration does not pretend otherwise; there is
-- still no appeal path for a moderated post, and content_reports is the channel
-- a reader would use instead.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Reports can now name a discussion post
--
-- content_reports could point at a version and a lesson, but not at a post.
-- Discussion added user-generated content that appears inside a lesson, so a
-- report needs to say which post it means — otherwise "this is wrong" is
-- ambiguous between the lesson and the answer someone gave to a question about
-- it, and the person triaging cannot act.
-- -----------------------------------------------------------------------------

alter table public.content_reports
  add column if not exists discussion_post_id uuid
    references public.discussion_posts(id) on delete set null;

comment on column public.content_reports.discussion_post_id is
  'Set when the report is about a specific discussion post rather than the lesson itself.';

-- One open report per person per thing per category. Without this, a single
-- disgruntled user can bury the queue, and the queue is read by people.
-- discussion_post_id and lesson_id are nullable, and Postgres treats NULLs as
-- distinct in a unique index — so a plain multi-column index would have allowed
-- unlimited duplicate reports of a lesson, which is the exact case the index
-- exists to stop. Coalescing to a sentinel makes NULLs compare equal.
create unique index if not exists cr_one_open_per_reporter
  on public.content_reports (
    course_version_id,
    coalesce(lesson_id,           '00000000-0000-0000-0000-000000000000'),
    coalesce(discussion_post_id,  '00000000-0000-0000-0000-000000000000'),
    report_category,
    coalesce(reported_by,         '00000000-0000-0000-0000-000000000000')
  )
  where status in ('submitted', 'triaged', 'under_review');

create index if not exists content_reports_open
  on public.content_reports (created_at)
  where status in ('submitted', 'triaged', 'under_review');

-- -----------------------------------------------------------------------------
-- 2. Reporting a problem
-- -----------------------------------------------------------------------------

create or replace function public.report_content(
  p_lesson_id          uuid,
  p_category           text,
  p_description        text,
  p_discussion_post_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_lesson  public.lessons;
  v_version uuid;
  v_post    public.discussion_posts;
  v_id      uuid;
begin
  select * into v_lesson from public.lessons where id = p_lesson_id;
  if v_lesson.id is null then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  select course_version_id into v_version
    from public.course_sections
   where id = v_lesson.section_id;

  -- The reporter has to be able to see what they are reporting. Without this a
  -- caller could probe unpublished course versions by reporting them and
  -- reading back which ones existed.
  if not public.can_read_version(v_version) then
    raise exception
      'you cannot report content you cannot see'
      using errcode = 'insufficient_privilege';
  end if;

  if p_discussion_post_id is not null then
    select * into v_post from public.discussion_posts where id = p_discussion_post_id;
    if v_post.id is null then
      raise exception 'discussion post not found' using errcode = 'P0002';
    end if;
    -- The post must belong to the lesson named, or a report could be attached
    -- to content in a course the reporter has no relationship with.
    if v_post.lesson_id <> p_lesson_id then
      raise exception
        'that post is not on this lesson'
        using errcode = 'check_violation';
    end if;
    if not public.can_read_discussion(p_lesson_id) then
      raise exception
        'you cannot report a discussion you cannot see'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if coalesce(trim(p_description), '') = '' then
    raise exception
      'say what the problem is'
      using errcode = 'check_violation';
  end if;

  -- reported_by is nullable on purpose: the insert policy admits anon, so
  -- someone who will not sign in can still flag a doctrinal error. An
  -- unattributed report is visible to staff only.
  insert into public.content_reports
    (course_version_id, lesson_id, discussion_post_id, reported_by,
     report_category, description)
  values
    (v_version, p_lesson_id, p_discussion_post_id, v_actor, p_category, p_description)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'content.reported',
    'content_report',
    v_id,
    jsonb_build_object(
      'category',        p_category,
      'lesson_id',       p_lesson_id,
      'discussion_post', p_discussion_post_id
    )
  );

  return v_id;
end;
$$;

revoke execute on function public.report_content(uuid, text, text, uuid) from public;
grant execute on function public.report_content(uuid, text, text, uuid) to anon, authenticated;

comment on function public.report_content(uuid, text, text, uuid) is
  'Flag a problem with a lesson or a discussion post. Requires that the reporter can see the content.';

-- -----------------------------------------------------------------------------
-- 3. Triaging a report
-- -----------------------------------------------------------------------------

create or replace function public.resolve_content_report(
  p_report_id uuid,
  p_status    text,
  p_notes     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_report public.content_reports;
begin
  if v_actor is null or not (
    public.is_privileged(v_actor)
    or exists (select 1 from public.content_reports
                where id = p_report_id and assigned_to = v_actor)
  ) then
    raise exception 'only staff may resolve a report' using errcode = 'insufficient_privilege';
  end if;

  select * into v_report from public.content_reports where id = p_report_id;
  if v_report.id is null then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  if p_status not in ('triaged', 'under_review', 'resolved', 'dismissed') then
    raise exception
      '% is not a status a report can be moved to', p_status
      using errcode = 'check_violation';
  end if;

  if v_report.status in ('resolved', 'dismissed') then
    raise exception
      'that report is already %', v_report.status
      using errcode = 'check_violation';
  end if;

  -- Closing a report needs a written reason. cr_resolution_agrees already ties
  -- resolved_at to a terminal status; this is the part the constraint cannot
  -- express, which is that a person has to say what they concluded. A queue of
  -- silently dismissed reports teaches readers that reporting does nothing.
  if p_status in ('resolved', 'dismissed') and coalesce(trim(p_notes), '') = '' then
    raise exception
      'closing a report needs a written note'
      using errcode = 'check_violation';
  end if;

  update public.content_reports
     set status           = p_status,
         resolved_at      = case when p_status in ('resolved', 'dismissed') then now() end,
         resolution_notes = coalesce(nullif(trim(p_notes), ''), resolution_notes)
   where id = p_report_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'content_report.' || p_status,
    'content_report',
    p_report_id,
    jsonb_build_object('category', v_report.report_category)
  );
end;
$$;

revoke execute on function public.resolve_content_report(uuid, text, text) from public;
grant execute on function public.resolve_content_report(uuid, text, text) to authenticated;

comment on function public.resolve_content_report(uuid, text, text) is
  'Move a report through triage to resolved or dismissed. Closing one requires a written note.';

-- -----------------------------------------------------------------------------
-- 4. Appealing a review decision
-- -----------------------------------------------------------------------------

create or replace function public.appeal_review_decision(
  p_decision_id uuid,
  p_reason      text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_decision public.content_review_decisions;
  v_id       uuid;
begin
  if v_actor is null then
    raise exception 'sign in to appeal a decision' using errcode = 'insufficient_privilege';
  end if;

  select * into v_decision from public.content_review_decisions where id = p_decision_id;
  if v_decision.id is null then
    raise exception 'review decision not found' using errcode = 'P0002';
  end if;

  -- Only the author of the course version can appeal a decision about it.
  -- Anyone else has no standing, and an open appeal is work somebody does.
  if not public.can_author_version(v_decision.course_version_id) then
    raise exception
      'only the author of that course may appeal this decision'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception
      'say what you are appealing'
      using errcode = 'check_violation';
  end if;

  -- Only a rejection is appealable. Appealing an approval would be a request to
  -- take something down, which is a report, not an appeal.
  if v_decision.decision <> 'rejected' then
    raise exception
      'that decision was %, so there is nothing to appeal', v_decision.decision
      using errcode = 'check_violation';
  end if;

  insert into public.governance_appeals (related_decision_id, submitted_by, appeal_reason)
  values (p_decision_id, v_actor, p_reason)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'appeal.submitted',
    'governance_appeal',
    v_id,
    jsonb_build_object(
      'decision_id',      p_decision_id,
      'course_version_id', v_decision.course_version_id
    )
  );

  return v_id;
end;
$$;

revoke execute on function public.appeal_review_decision(uuid, text) from public;
grant execute on function public.appeal_review_decision(uuid, text) to authenticated;

comment on function public.appeal_review_decision(uuid, text) is
  'Contest a reviewer''s rejection of a course version. One open appeal per decision per author.';

-- One open appeal per author per decision, so re-submitting is not a way to
-- jump the queue.
create unique index if not exists ga_one_open_per_appellant
  on public.governance_appeals (related_decision_id, submitted_by)
  where status in ('submitted', 'accepted_for_review', 'under_review');

-- -----------------------------------------------------------------------------
-- 5. Deciding an appeal
-- -----------------------------------------------------------------------------

create or replace function public.decide_appeal(
  p_appeal_id uuid,
  p_outcome   text,
  p_summary   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_appeal  public.governance_appeals;
  v_decision public.content_review_decisions;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only staff may decide an appeal' using errcode = 'insufficient_privilege';
  end if;

  select * into v_appeal from public.governance_appeals where id = p_appeal_id;
  if v_appeal.id is null then
    raise exception 'appeal not found' using errcode = 'P0002';
  end if;

  if v_appeal.status in ('upheld', 'overturned', 'withdrawn') then
    raise exception
      'that appeal is already %', v_appeal.status
      using errcode = 'check_violation';
  end if;

  if p_outcome not in ('upheld', 'overturned', 'withdrawn') then
    raise exception
      '% is not an appeal outcome', p_outcome
      using errcode = 'check_violation';
  end if;

  -- The reviewer whose decision is being appealed cannot decide the appeal.
  -- This is the same rule that stops an author approving their own course and a
  -- requester approving their own refund: an appeal is only worth having if a
  -- second person looks at it. Upholding your own rejection is not a review.
  select * into v_decision from public.content_review_decisions
   where id = v_appeal.related_decision_id;
  if v_decision.decided_by = v_actor then
    raise exception
      'you cannot decide an appeal against your own decision'
      using errcode = 'insufficient_privilege';
  end if;

  -- Overturning means the rejection does not stand, so the reason has to be
  -- written down: it is the record of why a scholarly judgement was reversed.
  if p_outcome = 'overturned' and coalesce(trim(p_summary), '') = '' then
    raise exception
      'overturning a decision needs a written summary'
      using errcode = 'check_violation';
  end if;

  update public.governance_appeals
     set status             = p_outcome,
         resolution_summary = coalesce(nullif(trim(p_summary), ''), resolution_summary),
         resolved_at        = now()
   where id = p_appeal_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'appeal.' || p_outcome,
    'governance_appeal',
    p_appeal_id,
    jsonb_build_object(
      'decision_id',       v_appeal.related_decision_id,
      'course_version_id', v_decision.course_version_id
    )
  );
end;
$$;

revoke execute on function public.decide_appeal(uuid, text, text) from public;
grant execute on function public.decide_appeal(uuid, text, text) to authenticated;

comment on function public.decide_appeal(uuid, text, text) is
  'Uphold, overturn or withdraw an appeal. The reviewer whose decision is appealed cannot decide it.';
