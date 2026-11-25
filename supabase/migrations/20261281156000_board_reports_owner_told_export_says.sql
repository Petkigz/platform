-- Two answers about the discussion boards, given by the owner on 2026-11-25.
--
-- Both were left open when the boards were built (20261281153000) and were
-- asked as questions. The answers, in the owner's words:
--
--   "A person's blog posts are private and them being in the data export
--    feels like the privacy is somehow gone."
--   "The staff are not told only the admin is."
--
-- 1. BOARD POSTS ARE NOT IN THE DATA EXPORT, AND THE EXPORT SAYS SO.
--    They never were. What changes is that `export_my_data()` now names them
--    under `notIncluded`, with the reason and where to read them. A file
--    that was silent about them told a person "this is everything" when it
--    was not. The function is its earlier
--    definition (20261281139000) plus that one entry; it reads nothing from
--    any board table, so a copy cannot be used to learn whether an account
--    has a username.
--
-- 2. WHEN A POST IS REPORTED, THE OWNER IS TOLD AND NOBODY ELSE IS.
--    Until now nobody was: a report sat in /admin/boards until somebody
--    happened to open it, while the post it was about stayed up. From here
--    `staff_attention()`, which is what the staff home page is drawn from,
--    carries two more rows for an account holding `platform_admin` and for
--    no other: reported posts on the students' board, and on the teachers'.
--    "Told" means that: a count on the owner's home page, which is how every
--    other queue here tells its people. No message, no email, nothing sent.
--
-- What does not change:
--   * Who may moderate. The owner and governance still open /admin/boards,
--     take a post down and, with a reason, see the account behind one
--     (`can_moderate_boards`). Governance is simply not given the count.
--   * Every other row of `staff_attention()`, for every role. A test compares
--     the function with the one it replaces.
--   * What the export contains, its limit, its audit rows and what it raises.
--   * No table, column, function, grant or role is added. No switch is
--     turned: both boards stay off.

-- ---------------------------------------------------------------------------
-- 1. The export names what it leaves out
-- ---------------------------------------------------------------------------
-- Reproduced in full: PostgreSQL cannot wrap the function it replaces.
create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := public.current_user_id();
  v_status text;
  v_deleted timestamptz;
  v_result jsonb;
  v_positions jsonb;
  v_count bigint;
  v_cap constant integer := 1000;
begin
  if v_actor is null then return public.export_my_data_before_closed_boundary(); end if;
  select account_status, deleted_at into v_status, v_deleted
    from public.user_profiles where user_id=v_actor for update;
  if not found then raise exception 'support:account_closed_or_missing' using errcode='insufficient_privilege'; end if;
  v_result := public.export_my_data_before_closed_boundary();
  if v_status='closed' or v_deleted is not null then
    v_result := jsonb_set(v_result,'{support}','[]'::jsonb);
    v_result := jsonb_set(v_result,'{notIncluded}',coalesce(v_result->'notIncluded','[]'::jsonb) ||
      jsonb_build_array(jsonb_build_object('what','Support cases after account closure',
        'why','Support case content is not available to a closed session; contact privacy@ayahspring.com about a data request.')));
    v_result := jsonb_set(v_result,'{meta,note}',to_jsonb(
      'Support case content is omitted after account closure. ' ||
      case when v_result#>>'{meta,note}'='Every list is complete.' then 'Other returned lists are complete.'
           else coalesce(v_result#>>'{meta,note}','') end));
  end if;

  -- Count and list share one statement snapshot. Tie-break on immutable IDs,
  -- so the limit is deterministic even when timestamps coincide. Neither
  -- learning entitlement nor current pin is required to export retained data.
  with eligible as materialized (
    select rp.lesson_progress_id, rp.lesson_resource_id, rp.seconds, rp.updated_at,
      lp.display_name as learner, c.title as course, l.title as lesson, r.display_name as recording,
      ce.id as enrolment_id, l.id as lesson_id
    from public.lesson_resource_positions rp
    join public.lesson_progress p on p.id=rp.lesson_progress_id
    join public.course_enrolments ce on ce.id=p.course_enrolment_id
    join public.learner_profiles lp on lp.id=ce.learner_profile_id
    join public.courses c on c.id=ce.course_id
    join public.lessons l on l.id=p.lesson_id
    join public.lesson_resources r on r.id=rp.lesson_resource_id and r.lesson_id=l.id
    where public.can_export_learner(lp.id)
  ), numbered as (
    select *, row_number() over (order by updated_at, lesson_progress_id, lesson_resource_id) as rn
    from eligible
  )
  select count(*), coalesce(jsonb_agg(jsonb_build_object(
    'learner', learner, 'course', course, 'lesson', lesson, 'recording', recording,
    'enrolmentId', enrolment_id, 'lessonId', lesson_id, 'resourceId', lesson_resource_id,
    'seconds', seconds, 'updatedAt', updated_at) order by rn) filter (where rn <= v_cap), '[]'::jsonb)
    into v_count, v_positions from numbered;

  v_result := jsonb_set(v_result, '{resourcePositions}', v_positions, true);
  v_result := jsonb_set(v_result, '{meta,counts,resourcePositions}', to_jsonb(v_count), true);
  if v_count > v_cap then
    v_result := jsonb_set(v_result, '{meta,truncated}',
      coalesce(v_result#>'{meta,truncated}', '[]'::jsonb) || jsonb_build_array('resourcePositions'));
    v_result := jsonb_set(v_result, '{meta,note}', to_jsonb(
      coalesce(v_result#>>'{meta,note}', '') || ' Recording positions were cut at the 1,000-row limit.'));
  end if;
  -- Board posts are left out, and the file says so (owner decision,
  -- 2026-11-25). Nothing about the boards is read here: not a post, not a
  -- username, not whether this account has either.
  v_result := jsonb_set(v_result, '{notIncluded}', coalesce(v_result->'notIncluded', '[]'::jsonb) ||
    jsonb_build_array(jsonb_build_object(
      'what', 'What you wrote on the discussion boards',
      'why', 'A post on a board is written under a username so that it does not carry your name. A file that sets those posts beside your name and address, and is then saved, kept and passed on, would undo that. They stay on the board, where you can read them and take one back.')), true);

  -- The underlying export has already logged its ordinary sections. Record the
  -- added count separately, without recording any positions, and in the same
  -- transaction so a failed audit cannot produce an apparently successful file.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'data.resource_positions_exported', 'user_profile', v_actor,
      jsonb_build_object('count', v_count, 'truncated', v_count > v_cap));
  return v_result;
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The owner's home page counts reported posts
-- ---------------------------------------------------------------------------
-- Reproduced in full, for the same reason.
create or replace function public.staff_attention()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_platform   boolean;
  v_finance    boolean;
  v_governance boolean;
  v_support    boolean;
  v_queues     jsonb := '[]'::jsonb;
  v_count      integer;
  v_total      integer := 0;
begin
  if v_actor is null then
    raise exception 'sign in to see what is waiting'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.is_privileged(v_actor) then
    raise exception 'only platform staff have queues to work'
      using errcode = 'insufficient_privilege';
  end if;

  v_platform   := public.has_role(v_actor, 'platform_admin');
  v_finance    := v_platform or public.has_role(v_actor, 'finance_admin');
  v_governance := v_platform or public.has_role(v_actor, 'governance_admin');
  v_support    := v_platform or public.has_role(v_actor, 'support_agent');

  -- -------------------------------------------------------------------------
  -- Money
  -- -------------------------------------------------------------------------
  if v_finance then
    select count(*)::int into v_count
      from public.refund_requests where status = 'requested';
    v_queues := v_queues || public.attention_row(
      'refunds', 'Refund requests', v_count, '/admin/refunds',
      'Money waiting to go back to a customer.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.payment_disputes
     where status in ('open', 'under_review', 'evidence_submitted');
    v_queues := v_queues || public.attention_row(
      'disputes', 'Payment disputes', v_count, '/admin/disputes',
      'A chargeback has a deadline; the provider decides what happens if it passes.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.payment_reconciliations
     where status in ('open', 'in_progress', 'discrepancies_found');
    v_queues := v_queues || public.attention_row(
      'reconciliation', 'Reconciliation runs', v_count, '/admin/reconciliation',
      'An open run has rows that do not yet agree with the provider statement.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.instructor_payouts
     where status in ('scheduled', 'processing');
    v_queues := v_queues || public.attention_row(
      'payouts', 'Teacher payouts', v_count, '/admin/payouts',
      'A teacher has asked to be paid. Recording one is not sending one.',
      'teaching.payouts', not public.setting_bool('teaching.payouts', false));
    v_total := v_total + v_count;
  end if;

  -- -------------------------------------------------------------------------
  -- People
  -- -------------------------------------------------------------------------
  if v_support then
    select count(*)::int into v_count
      from public.support_cases where status in ('open', 'assigned');
    v_queues := v_queues || public.attention_row(
      'support', 'Support cases', v_count, '/admin/support',
      'Open or assigned, and not yet resolved.', 'platform.support',
      not public.setting_bool('platform.support', false));
    v_total := v_total + v_count;
  end if;

  if v_governance then
    select count(*)::int into v_count
      from public.governance_appeals where resolved_at is null;
    v_queues := v_queues || public.attention_row(
      'appeals', 'Governance appeals', v_count, '/admin/appeals',
      'Somebody is contesting a decision, and silence is itself a decision.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.reviewer_qualifications where verification_status = 'pending';
    v_queues := v_queues || public.attention_row(
      'credentials', 'Qualifications to check', v_count, '/admin/reviewers',
      'A reviewer cannot be authorised in a subject until their credential is checked.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.guardian_verification_cases
     where status in ('pending', 'in_review', 'needs_information');
    v_queues := v_queues || public.attention_row(
      'guardians', 'Guardian verifications', v_count, '/admin/guardians',
      'An adult asking to be recognised as a child''s parent.',
      'family.guardian_verification',
      not public.setting_bool('family.guardian_verification', false));
    v_total := v_total + v_count;
  end if;

  -- -------------------------------------------------------------------------
  -- The boards: the owner alone is told (owner decision, 2026-11-25)
  -- -------------------------------------------------------------------------
  -- A post is counted once however many people reported it, which is how the
  -- queue at /admin/boards lists it. Governance can still open that queue and
  -- moderate; it is not given the count. One row for each board, because each
  -- has a switch of its own and a queue is dormant by its own switch.
  if v_platform then
    select count(*)::int into v_count
      from (select distinct br.thread_id, br.reply_id
              from public.board_reports br
              join public.board_threads t on t.id = br.thread_id
             where br.resolved_at is null and t.board = 'students') x;
    v_queues := v_queues || public.attention_row(
      'board_reports_students', 'Reported posts, students'' board', v_count, '/admin/boards',
      'A post is shown at once and stays up until somebody takes it down. Only the owner is told.',
      'community.student_board', not public.setting_bool('community.student_board', false));
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from (select distinct br.thread_id, br.reply_id
              from public.board_reports br
              join public.board_threads t on t.id = br.thread_id
             where br.resolved_at is null and t.board = 'teachers') x;
    v_queues := v_queues || public.attention_row(
      'board_reports_teachers', 'Reported posts, teachers'' board', v_count, '/admin/boards',
      'A post is shown at once and stays up until somebody takes it down. Only the owner is told.',
      'community.teacher_board', not public.setting_bool('community.teacher_board', false));
    v_total := v_total + v_count;
  end if;

  -- -------------------------------------------------------------------------
  -- Content — any privileged role may work these
  -- -------------------------------------------------------------------------
  select count(*)::int into v_count
    from public.content_reports
   where status in ('submitted', 'triaged', 'under_review');
  v_queues := v_queues || public.attention_row(
    'reports', 'Reported content', v_count, '/admin/reports',
    'A reader flagged something. Closing one needs a written note.', null, false);
  v_total := v_total + v_count;

  select count(*)::int into v_count
    from public.course_reviews where visibility_state = 'pending';
  v_queues := v_queues || public.attention_row(
    'reviews', 'Reviews awaiting moderation', v_count, '/admin/course-reviews',
    'Words are held until somebody reads them; a rating alone is already counted.',
    'learning.reviews', not public.setting_bool('learning.reviews', false));
  v_total := v_total + v_count;

  select count(*)::int into v_count
    from public.media_assets where status in ('pending', 'quarantined');
  v_queues := v_queues || public.attention_row(
    'media', 'Media needing a look', v_count, '/admin/media',
    'An upload that has not been confirmed, or one held back for review.', null, false);
  v_total := v_total + v_count;

  return jsonb_build_object(
    'generatedAt', now(),
    'waitingCount', v_total,
    -- Only the queues this person may work. A hidden card is not a permission
    -- check; an absent one is.
    'queues', v_queues,
    'canSeeFinance',     v_finance,
    'canSeeGovernance',  v_governance,
    'canSeeSupport',     v_support
  );
end;
$$;

revoke all on function public.staff_attention() from public, anon;
grant execute on function public.staff_attention() to authenticated;

comment on function public.staff_attention() is
  'Every queue the signed-in staff member may work, with the count in it and the page that drains it. Filters by role rather than labelling: a count of refunds is information a support agent does not get, and the count of reported board posts is given to the owner alone.';

-- ---------------------------------------------------------------------------
-- What the two switches say before they are turned on
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = preconditions || ' From 2026-11-25 (owner decisions): a reported post is counted on the owner''s home page and on nobody else''s, and no message is sent, so the owner has to open that page; board posts are not in the data export, and the export says so.'
 where key in ('community.student_board', 'community.teacher_board')
   and preconditions not like '%counted on the owner''s home page%';
