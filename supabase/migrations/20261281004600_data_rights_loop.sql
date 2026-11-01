-- -----------------------------------------------------------------------------
-- The two rights, checked against each other
-- -----------------------------------------------------------------------------
--
-- `export_my_data()` and `erase_my_account()` were built a month apart, each
-- with its own suite, and each suite asked the right question about its own
-- half: is the document complete, and does closing an account delete what it
-- says it deletes. Neither asked the question a person asks — **is the thing
-- being deleted the thing I was shown?** — and the answer was no in both
-- directions:
--
--   1. Closing an account reports how many saved courses, invitations and
--      guardian links it removed. The export contained none of the three, and
--      `/account/export` has listed "saved courses" under "What you wrote"
--      since the page was written. A person cannot check a deletion of
--      something they were never shown; a page that promises a section is a
--      specification, and the function did not meet it.
--
--   2. Erasure's own header says "Kept untouched: nothing that names the
--      person." A sweep of every text column after an account closed found the
--      name still in the person's own notifications, in the invitation email
--      they had sent, and in the staff replies on their own support case. Each
--      was individually defensible — an inbox, a delivery record, a retained
--      case — and together they falsified the sentence.
--
-- This migration closes both, and states the rule it closes them under:
--
--   What exists only for the account goes. What must be kept is kept, and the
--   name inside it becomes "the account holder". Other people's words about a
--   person stay as they were written — those words are theirs, and the export
--   already says so.
--
-- Still open, and named rather than papered over: the sign-in address lives
-- with the authentication provider, and deleting the identity there is staff
-- work outside this database (it is in NEXT.md). Erasure scrubs every table
-- this platform owns; it cannot scrub `auth.users` from here without taking the
-- ledger's foreign keys with it.

-- -----------------------------------------------------------------------------
-- 1. Removing a name from a sentence, once, so every caller does it the same
-- -----------------------------------------------------------------------------

create or replace function public.redact_name(p_text text, p_name text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_name    text := btrim(coalesce(p_name, ''));
  v_pattern text;
begin
  if p_text is null or v_name = '' then
    return p_text;
  end if;

  -- A name is a literal, not a pattern: `.`, `(`, `*`, `+` and `$` are ordinary
  -- characters in somebody's name and metacharacters everywhere else. Each is
  -- escaped here, one at a time, rather than with a clever expression — a
  -- redaction that quietly fails to match would leave a name in a record that
  -- the platform has promised does not carry it.
  v_pattern := v_name;
  v_pattern := replace(v_pattern, '\', '\\');
  v_pattern := replace(v_pattern, '.', '\.');
  v_pattern := replace(v_pattern, '+', '\+');
  v_pattern := replace(v_pattern, '*', '\*');
  v_pattern := replace(v_pattern, '?', '\?');
  v_pattern := replace(v_pattern, '(', '\(');
  v_pattern := replace(v_pattern, ')', '\)');
  v_pattern := replace(v_pattern, '[', '\[');
  v_pattern := replace(v_pattern, ']', '\]');
  v_pattern := replace(v_pattern, '{', '\{');
  v_pattern := replace(v_pattern, '}', '\}');
  v_pattern := replace(v_pattern, '|', '\|');
  v_pattern := replace(v_pattern, '^', '\^');
  v_pattern := replace(v_pattern, '$', '\$');

  return regexp_replace(p_text, v_pattern, 'the account holder', 'gi');
end;
$$;

comment on function public.redact_name(text, text) is
  'Replace a person''s name in a retained sentence with "the account holder", case-insensitively, treating the name as a literal. Used by account erasure on records the platform must keep.';

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap      constant integer := 1000;
  v_actor    uuid := public.current_user_id();
  v_out      jsonb;
  v_exported integer;
  v_cut      jsonb := '[]'::jsonb;
  v_counts   jsonb := '{}'::jsonb;
  n_learners bigint; n_orders bigint; n_notes bigint; n_bookmarks bigint;
  n_reviews bigint; n_discussion bigint; n_assignments bigint; n_assessments bigint;
  n_support bigint; n_notifications bigint; n_activity bigint; n_earnings bigint;
  n_payouts bigint; n_devices bigint; n_roles bigint;
  n_saved bigint; n_invites bigint; n_guardians bigint; n_messages bigint;
begin
  if v_actor is null then
    raise exception 'sign in to download your data'
      using errcode = 'insufficient_privilege';
  end if;

  -- Ten an hour. The audit event below is the counter, so there is no second
  -- table to keep in step with it.
  select count(*)::int into v_exported
    from public.governance_audit_events e
   where e.actor = v_actor
     and e.action = 'data.exported'
     and e.occurred_at > now() - interval '1 hour';
  if v_exported >= 10 then
    raise exception 'ten exports in the last hour is the limit; wait a little and try again'
      using errcode = 'insufficient_privilege';
  end if;

  -- How many of each the platform holds, so a cut list can be distinguished
  -- from a complete one. Cheap counts, one round trip.
  select
    (select count(*) from public.learner_profiles lp
      where lp.linked_user_id = v_actor or public.is_learner_family_member(lp.id)),
    (select count(*) from public.orders o
      where exists (select 1 from public.billing_account_memberships bam
                     where bam.billing_account_id = o.billing_account_id
                       and bam.user_id = v_actor and bam.status = 'active')),
    (select count(*) from public.lesson_notes where user_id = v_actor),
    (select count(*) from public.lesson_bookmarks where user_id = v_actor),
    (select count(*) from public.course_reviews where written_by = v_actor),
    (select count(*) from public.discussion_posts where author_user_id = v_actor),
    (select count(*) from public.assignment_submissions
      where learner_profile_id in (select lp.id from public.learner_profiles lp
                                    where lp.linked_user_id = v_actor
                                       or public.is_learner_family_member(lp.id))),
    (select count(*) from public.assessment_attempts
      where learner_profile_id in (select lp.id from public.learner_profiles lp
                                    where lp.linked_user_id = v_actor
                                       or public.is_learner_family_member(lp.id))),
    (select count(*) from public.support_cases where requested_by = v_actor),
    (select count(*) from public.notifications where user_id = v_actor),
    (select count(*) from public.analytics_events where actor_id = v_actor),
    (select count(*) from public.instructor_earnings_entries where instructor_user_id = v_actor),
    (select count(*) from public.instructor_payouts where instructor_user_id = v_actor),
    (select count(*) from public.offline_devices d
      where d.learner_profile_id in (select lp.id from public.learner_profiles lp
                                      where lp.linked_user_id = v_actor
                                         or public.is_learner_family_member(lp.id))),
    (select count(*) from public.user_role_assignments where user_id = v_actor),
    (select count(*) from public.course_wishlist where user_id = v_actor),
    (select count(*) from public.share_invitations where invited_by = v_actor),
    (select count(*) from public.guardian_relationships where guardian_user_id = v_actor),
    (select count(*) from public.outbound_messages m
      where m.created_by = v_actor
         or lower(m.to_address) = lower(coalesce(
              (select u.email from auth.users u where u.id = v_actor), '')))
  into n_learners, n_orders, n_notes, n_bookmarks, n_reviews, n_discussion,
       n_assignments, n_assessments, n_support, n_notifications, n_activity,
       n_earnings, n_payouts, n_devices, n_roles, n_saved, n_invites, n_guardians, n_messages;

  v_counts := jsonb_build_object(
    'roles', n_roles, 'learners', n_learners, 'orders', n_orders,
    'notes', n_notes, 'bookmarks', n_bookmarks, 'reviews', n_reviews,
    'discussion', n_discussion, 'assignments', n_assignments,
    'assessments', n_assessments, 'support', n_support,
    'notifications', n_notifications, 'activity', n_activity,
    'earnings', n_earnings, 'payouts', n_payouts, 'devices', n_devices,
    'savedCourses', n_saved, 'invitations', n_invites, 'guardians', n_guardians,
    'messages', n_messages);

  if n_roles       > v_cap then v_cut := v_cut || to_jsonb('roles'::text); end if;
  if n_learners    > v_cap then v_cut := v_cut || to_jsonb('learners'::text); end if;
  if n_orders      > v_cap then v_cut := v_cut || to_jsonb('orders'::text); end if;
  if n_notes       > v_cap then v_cut := v_cut || to_jsonb('notes'::text); end if;
  if n_bookmarks   > v_cap then v_cut := v_cut || to_jsonb('bookmarks'::text); end if;
  if n_reviews     > v_cap then v_cut := v_cut || to_jsonb('reviews'::text); end if;
  if n_discussion  > v_cap then v_cut := v_cut || to_jsonb('discussion'::text); end if;
  if n_assignments > v_cap then v_cut := v_cut || to_jsonb('assignments'::text); end if;
  if n_assessments > v_cap then v_cut := v_cut || to_jsonb('assessments'::text); end if;
  if n_support     > v_cap then v_cut := v_cut || to_jsonb('support'::text); end if;
  if n_notifications > v_cap then v_cut := v_cut || to_jsonb('notifications'::text); end if;
  if n_activity    > v_cap then v_cut := v_cut || to_jsonb('activity'::text); end if;
  if n_earnings    > v_cap then v_cut := v_cut || to_jsonb('earnings'::text); end if;
  if n_payouts     > v_cap then v_cut := v_cut || to_jsonb('payouts'::text); end if;
  if n_devices     > v_cap then v_cut := v_cut || to_jsonb('devices'::text); end if;
  if n_saved       > v_cap then v_cut := v_cut || to_jsonb('savedCourses'::text); end if;
  if n_invites     > v_cap then v_cut := v_cut || to_jsonb('invitations'::text); end if;
  if n_guardians   > v_cap then v_cut := v_cut || to_jsonb('guardians'::text); end if;
  if n_messages    > v_cap then v_cut := v_cut || to_jsonb('messages'::text); end if;

  select jsonb_build_object(
    'formatVersion', 1,
    'generatedAt', now(),

    -- -----------------------------------------------------------------------
    -- Unchanged from the first version: the account and the study record
    -- -----------------------------------------------------------------------
    'account', (
      select jsonb_build_object(
        'userId', up.user_id,
        'displayName', up.display_name,
        'preferredLanguage', up.preferred_language,
        'timezone', up.timezone,
        'countryCode', up.country_code,
        'accountStatus', up.account_status,
        'createdAt', up.created_at)
        from public.user_profiles up
       where up.user_id = v_actor
    ),

    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
               'code', r.code,
               'name', r.name,
               'assignedAt', ura.assigned_at,
               'revokedAt', ura.revoked_at)
             order by ura.assigned_at)
        from (select * from public.user_role_assignments
               where user_id = v_actor order by assigned_at limit v_cap) ura
        join public.roles r on r.id = ura.role_id), '[]'::jsonb),

    'families', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', f.name,
               'role', fm.membership_type,
               'status', fm.status,
               'joinedAt', fm.joined_at)
             order by fm.joined_at)
        from public.family_memberships fm
        join public.families f on f.id = fm.family_id
       where fm.user_id = v_actor), '[]'::jsonb),

    'learners', coalesce((
      select jsonb_agg(jsonb_build_object(
               'displayName', lp.display_name,
               'learnerType', lp.learner_type,
               'ageBand', lp.age_band,
               'status', lp.status,
               'createdAt', lp.created_at,
               'enrolments', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'course', c.title,
                          'status', ce.status,
                          'enrolledAt', ce.enrolled_at,
                          'lessonsStarted', (
                            select count(*) from public.lesson_progress p
                             where p.course_enrolment_id = ce.id
                               and p.status <> 'not_started'),
                          'lessonsCompleted', (
                            select count(*) from public.lesson_progress p
                             where p.course_enrolment_id = ce.id
                               and p.status = 'completed'),
                          'progressPercent', coalesce((
                            select round(avg(p.progress_percent))::int
                              from public.lesson_progress p
                             where p.course_enrolment_id = ce.id), 0))
                        order by ce.enrolled_at)
                   from public.course_enrolments ce
                   join public.courses c on c.id = ce.course_id
                  where ce.learner_profile_id = lp.id), '[]'::jsonb),
               'certificates', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'number', ct.certificate_number,
                          'course', c.title,
                          'status', ct.status,
                          'issuedAt', ct.issued_at)
                        order by ct.issued_at)
                   from public.certificates ct
                   join public.course_enrolments ce on ce.id = ct.course_enrolment_id
                   join public.courses c on c.id = ce.course_id
                  where ct.learner_profile_id = lp.id), '[]'::jsonb))
             order by lp.created_at)
        from (select * from public.learner_profiles lp
               where lp.linked_user_id = v_actor
                  or public.is_learner_family_member(lp.id)
               order by lp.created_at
               limit v_cap) lp), '[]'::jsonb),

    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
               'number', o.order_number,
               'status', o.status,
               'currency', btrim(o.currency_code),
               'totalMinor', o.total_minor::text,
               'createdAt', o.created_at,
               'paidAt', o.paid_at,
               'refunds', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'amountMinor', rt.amount_minor::text,
                          'status', rt.status,
                          'refundedAt', rt.refunded_at)
                        order by rt.created_at)
                   from public.refund_transactions rt
                  where rt.order_id = o.id), '[]'::jsonb))
             order by o.created_at)
        from (select * from public.orders o
               where exists (
                 select 1 from public.billing_account_memberships bam
                  where bam.billing_account_id = o.billing_account_id
                    and bam.user_id = v_actor
                    and bam.status = 'active')
               order by o.created_at
               limit v_cap) o), '[]'::jsonb),

    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'lesson', l.title,
               'body', n.body,
               'createdAt', n.created_at,
               'updatedAt', n.updated_at)
             order by n.updated_at)
        from (select * from public.lesson_notes
               where user_id = v_actor order by updated_at limit v_cap) n
        join public.lessons l on l.id = n.lesson_id), '[]'::jsonb),

    'bookmarks', coalesce((
      select jsonb_agg(jsonb_build_object(
               'lesson', l.title,
               'createdAt', b.created_at)
             order by b.created_at)
        from (select * from public.lesson_bookmarks
               where user_id = v_actor order by created_at limit v_cap) b
        join public.lessons l on l.id = b.lesson_id), '[]'::jsonb),

    -- -----------------------------------------------------------------------
    -- New: what the person wrote elsewhere
    -- -----------------------------------------------------------------------
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
               'course', c.title,
               'rating', r.rating,
               'body', r.body,
               'visibility', r.visibility_state,
               'moderationNote', r.moderation_note,
               'withdrawnReason', r.withdrawn_reason,
               'createdAt', r.created_at)
             order by r.created_at)
        from (select * from public.course_reviews
               where written_by = v_actor order by created_at limit v_cap) r
        join public.courses c on c.id = r.course_id), '[]'::jsonb),

    'discussion', coalesce((
      select jsonb_agg(jsonb_build_object(
               'lesson', l.title,
               'body', d.body,
               'visibility', d.visibility_state,
               'hiddenReason', d.hidden_reason,
               'createdAt', d.created_at,
               'deletedAt', d.deleted_at)
             order by d.created_at)
        from (select * from public.discussion_posts
               where author_user_id = v_actor order by created_at limit v_cap) d
        join public.lessons l on l.id = d.lesson_id), '[]'::jsonb),

    -- -----------------------------------------------------------------------
    -- New: work submitted, marked, and answered
    -- -----------------------------------------------------------------------
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'assignment', a.title,
               'learner', lp.display_name,
               'body', sub.body_text,
               'status', sub.status,
               'submittedAt', sub.submitted_at,
               'late', sub.is_late,
               'score', sub.score_earned,
               'feedback', sub.feedback,
               'markedAt', sub.marked_at,
               'revision', sub.revision_number)
             order by sub.created_at)
        from (select * from public.assignment_submissions
               where learner_profile_id in (
                 select lp.id from public.learner_profiles lp
                  where lp.linked_user_id = v_actor
                     or public.is_learner_family_member(lp.id))
               order by created_at limit v_cap) sub
        join public.course_assignments a on a.id = sub.assignment_id
        join public.learner_profiles lp on lp.id = sub.learner_profile_id), '[]'::jsonb),

    'assessments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'assessment', a.title,
               'learner', lp.display_name,
               'attempt', at.attempt_number,
               'status', at.status,
               'submittedAt', at.submitted_at,
               'gradedAt', at.graded_at,
               'score', at.score_earned,
               'possible', at.score_possible,
               'passed', at.passed,
               'answers', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'questionId', r.question_id,
                          'response', r.response_content,
                          'score', r.score,
                          'correct', r.is_correct,
                          'feedback', r.grading_feedback)
                        order by r.created_at)
                   from public.assessment_responses r
                  where r.assessment_attempt_id = at.id), '[]'::jsonb))
             order by at.started_at)
        from (select * from public.assessment_attempts
               where learner_profile_id in (
                 select lp.id from public.learner_profiles lp
                  where lp.linked_user_id = v_actor
                     or public.is_learner_family_member(lp.id))
               order by started_at limit v_cap) at
        join public.assessments a on a.id = at.assessment_id
        join public.learner_profiles lp on lp.id = at.learner_profile_id), '[]'::jsonb),

    -- -----------------------------------------------------------------------
    -- New: support, messages, money earned teaching, devices, activity
    -- -----------------------------------------------------------------------
    'support', coalesce((
      select jsonb_agg(jsonb_build_object(
               'caseNumber', sc.case_number,
               'category', sc.category,
               'subject', sc.subject,
               'body', sc.body,
               'status', sc.status,
               'createdAt', sc.created_at,
               'resolvedAt', sc.resolved_at,
               'resolutionNote', sc.resolution_note,
               'messages', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'author', case when m.author_user_id = v_actor then 'you' else 'support' end,
                          'body', m.body,
                          'at', m.created_at)
                        order by m.created_at)
                   from public.support_case_messages m
                  where m.case_id = sc.id
                    and not m.is_internal), '[]'::jsonb))
             order by sc.created_at)
        from (select * from public.support_cases
               where requested_by = v_actor order by created_at limit v_cap) sc), '[]'::jsonb),

    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', n.kind,
               'title', n.title,
               'body', n.body,
               'createdAt', n.created_at,
               'readAt', n.read_at)
             order by n.created_at)
        from (select * from public.notifications
               where user_id = v_actor order by created_at limit v_cap) n), '[]'::jsonb),

    'earnings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'netMinor', e.net_amount_minor::text,
               'currency', btrim(e.currency_code),
               'sharePercent', e.revenue_share_percent,
               'status', e.status,
               'accruedAt', e.accrued_at)
             order by e.accrued_at)
        from (select * from public.instructor_earnings_entries
               where instructor_user_id = v_actor order by accrued_at limit v_cap) e), '[]'::jsonb),

    'payouts', coalesce((
      select jsonb_agg(jsonb_build_object(
               'currency', btrim(p.currency_code),
               'amountMinor', p.amount_minor::text,
               'status', p.status,
               'scheduledAt', p.scheduled_at,
               'completedAt', p.completed_at,
               'cancelledAt', p.cancelled_at,
               'failureReason', p.failure_reason,
               'destination', p.destination_hint,
               'providerReference', p.provider_reference)
             order by p.scheduled_at)
        from (select * from public.instructor_payouts
               where instructor_user_id = v_actor order by scheduled_at limit v_cap) p), '[]'::jsonb),

    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
               'label', d.label,
               'firstSeenAt', d.first_seen_at,
               'lastSeenAt', d.last_seen_at,
               'revokedAt', d.revoked_at)
             order by d.first_seen_at)
        from (select * from public.offline_devices d
               where d.learner_profile_id in (
                 select lp.id from public.learner_profiles lp
                  where lp.linked_user_id = v_actor
                     or public.is_learner_family_member(lp.id))
               order by first_seen_at limit v_cap) d), '[]'::jsonb),

    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
               'event', e.event_code,
               'subjectType', e.subject_type,
               'subjectId', e.subject_id,
               'properties', e.properties,
               'occurredAt', e.occurred_at)
             order by e.occurred_at)
        from (select * from public.analytics_events
               where actor_id = v_actor order by occurred_at desc limit v_cap) e), '[]'::jsonb),

    -- -----------------------------------------------------------------------
    -- Unchanged: the shares this person gave and received
    -- -----------------------------------------------------------------------
    -- -----------------------------------------------------------------------
    -- The three lists the erasure receipt counted and this document did not
    -- -----------------------------------------------------------------------
    -- `/account/export` has told people that "saved courses" are in here since
    -- the page was written, and closing an account reports how many were
    -- deleted. A person cannot check a deletion of something they were never
    -- shown, and a page that promises a section is a specification.
    'savedCourses', coalesce((
      select jsonb_agg(jsonb_build_object(
               'course', c.title,
               'note', w.note,
               'savedAt', w.created_at,
               'updatedAt', w.updated_at)
             order by w.created_at)
        from (select * from public.course_wishlist
               where user_id = v_actor order by created_at limit v_cap) w
        join public.courses c on c.id = w.course_id), '[]'::jsonb),

    -- Who they invited, to see what. The address is one they typed themselves;
    -- the token is not here, for the same reason no other credential is.
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
               'learner', lp.display_name,
               'address', si.email,
               'scope', si.scope,
               'status', si.status,
               'sentAt', si.created_at,
               'expiresAt', si.expires_at,
               'acceptedAt', si.accepted_at)
             order by si.created_at)
        from (select * from public.share_invitations
               where invited_by = v_actor order by created_at limit v_cap) si
        join public.learner_profiles lp on lp.id = si.learner_profile_id), '[]'::jsonb),

    -- Guardianship runs two ways and both are the person's record: who they are
    -- responsible for, and who may see them. Neither was in the document, and
    -- closing the account deletes both.
    'guardians', jsonb_build_object(
      'of', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'learner', lp.display_name,
                 'relationship', gr.relationship_type,
                 'status', gr.status,
                 'canManageProfile', gr.can_manage_profile,
                 'canViewProgress', gr.can_view_progress,
                 'canManageLearning', gr.can_manage_learning,
                 'verifiedAt', gr.verified_at,
                 'since', gr.created_at)
               order by gr.created_at)
          from (select * from public.guardian_relationships
                 where guardian_user_id = v_actor order by created_at limit v_cap) gr
          join public.learner_profiles lp on lp.id = gr.learner_profile_id), '[]'::jsonb),
      'for', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'guardian', up.display_name,
                 'relationship', gr.relationship_type,
                 'status', gr.status,
                 'canManageProfile', gr.can_manage_profile,
                 'canViewProgress', gr.can_view_progress,
                 'canManageLearning', gr.can_manage_learning,
                 'verifiedAt', gr.verified_at,
                 'since', gr.created_at)
               order by gr.created_at)
          from (select * from public.guardian_relationships
                 where learner_profile_id in (
                   select lp.id from public.learner_profiles lp
                    where lp.linked_user_id = v_actor)
                 order by created_at limit v_cap) gr
          join public.user_profiles up on up.user_id = gr.guardian_user_id), '[]'::jsonb)
    ),

    -- Mail they sent or were sent. Closing an account deletes these rows, so
    -- they belong in the document the receipt is checked against — and a
    -- receipt has to mean the same thing both times.
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
               'to', m.to_address,
               'subject', m.subject,
               -- The rendered invitation email carries the link that lets its
               -- holder in. The document says what was sent; it does not
               -- reissue the credential, for the same reason `notIncluded`
               -- says none are here.
               'body', regexp_replace(m.body, '/share/invite/[^[:space:]"''<>]+',
                                      '/share/invite/[redacted]', 'g'),
               'purpose', m.purpose,
               'status', m.status,
               'sentAt', m.created_at,
               'sent', m.sent_at)
             order by m.created_at)
        from (select * from public.outbound_messages m
               where m.created_by = v_actor
                  or lower(m.to_address) = lower(coalesce(
                       (select u.email from auth.users u where u.id = v_actor), ''))
               order by created_at limit v_cap) m), '[]'::jsonb),

    'sharing', jsonb_build_object(
      'given', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'learner', lp.display_name,
                 'withUserId', s.grantee_user_id,
                 'scope', s.scope,
                 'status', s.status,
                 'grantedAt', s.granted_at,
                 'expiresAt', s.expires_at)
               order by s.granted_at)
          from public.adult_learning_shares s
          join public.learner_profiles lp on lp.id = s.learner_profile_id
         where lp.linked_user_id = v_actor), '[]'::jsonb),
      'received', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'learner', lp.display_name,
                 'scope', s.scope,
                 'status', s.status,
                 'grantedAt', s.granted_at,
                 'expiresAt', s.expires_at)
               order by s.granted_at)
          from public.adult_learning_shares s
          join public.learner_profiles lp on lp.id = s.learner_profile_id
         where s.grantee_user_id = v_actor), '[]'::jsonb)
    ),

    -- -----------------------------------------------------------------------
    -- What it left out, in words
    -- -----------------------------------------------------------------------
    'notIncluded', jsonb_build_array(
      jsonb_build_object(
        'what', 'Other people''s words',
        'why', 'A reply under your post, a classmate''s message, a teacher''s note about a different learner: that is their data, not yours, even where it concerns you.'),
      jsonb_build_object(
        'what', 'Your sign-in address and password',
        'why', 'Both live with the authentication provider, outside this database. Changing them happens there.'),
      jsonb_build_object(
        'what', 'Internal staff notes on support cases and reviews',
        'why', 'How the team talks to itself is not a record about you, and publishing it would make those notes useless.'),
      jsonb_build_object(
        'what', 'Uploaded files themselves',
        'why', 'Attachments are listed by reference. Copying every stored video into one document is a different feature with its own size limits.'),
      jsonb_build_object(
        'what', 'Credential tokens',
        'why', 'Certificate verification tokens and sharing links are what let other people in. Printing them in an export is how they stop being secret.'),
      jsonb_build_object(
        'what', 'The invitation link itself',
        'why', 'The email you sent carries a token that lets its holder see what you shared. It is an invitation, not a credential you keep, and printing it in a document is how it stops being one. The address you sent it to, and what became of it, are in this file.'),
      jsonb_build_object(
        'what', 'A list nested inside a learner or an order',
        'why', 'The 1,000-row limit is applied to the lists at the top of this document. A learner''s enrolments and an order''s refunds are bounded in practice by how much one person can buy or study.')
    ),

    'meta', jsonb_build_object(
      'rowLimit', v_cap,
      'counts', v_counts,
      'truncated', v_cut,
      'note', case when jsonb_array_length(v_cut) = 0
                   then 'Every list is complete.'
                   else 'These lists were cut at the limit and say so: ' ||
                        (select string_agg(value, ', ')
                           from jsonb_array_elements_text(v_cut) value) end
    )
  ) into v_out;

  -- The audit event is also the rate limiter's counter, so it is written for
  -- every export, including the ones that found nothing.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'data.exported', 'user_profile', v_actor,
          jsonb_build_object('formatVersion', 1, 'counts', v_counts, 'truncated', v_cut));

  return v_out;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. The erasure that has to match the document
-- -----------------------------------------------------------------------------

create or replace function public.erase_my_account(p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor       uuid := public.current_user_id();
  v_name        text;
  v_status      text;
  v_deleted     timestamptz;
  v_family_ids  uuid[];
  v_learner_ids uuid[];
  v_open        integer;
  v_board       integer;
  v_notes       integer := 0;
  v_bookmarks   integer := 0;
  v_saved       integer := 0;
  v_reviews     integer := 0;
  v_shares      integer := 0;
  v_invites     integer := 0;
  v_guardians   integer := 0;
  v_notifications integer := 0;
  v_messages    integer := 0;
  v_redacted    integer := 0;
  v_email       text;
  v_events      integer := 0;
begin
  if v_actor is null then
    raise exception 'sign in to close an account'
      using errcode = 'insufficient_privilege';
  end if;

  select display_name, account_status, deleted_at
    into v_name, v_status, v_deleted
    from public.user_profiles
   where user_id = v_actor;

  if not found then
    raise exception 'there is no account to close'
      using errcode = 'insufficient_privilege';
  end if;

  -- Idempotent: a second press answers the same way rather than failing, because
  -- "did it work?" is the question somebody asks after a network drop.
  if v_deleted is not null or v_status = 'closed' then
    return jsonb_build_object('closed', true, 'alreadyClosed', true,
                              'learnersErased', 0);
  end if;

  if btrim(coalesce(p_confirm, '')) <> btrim(v_name) then
    raise exception 'type your name exactly as it appears to close this account'
      using errcode = 'invalid_parameter_value';
  end if;

  -- A teacher with work in flight is not a self-service case: closing the
  -- account would strand the course behind a tombstone with nobody able to
  -- publish, retire or fix it. The owner closes the teacher account first.
  select count(*)
    into v_open
    from public.course_versions v
    join public.courses c on c.id = v.course_id
   where v.created_by = v_actor
     and c.deleted_at is null
     and v.version_status in ('submitted', 'approved', 'published');

  if v_open > 0 then
    raise exception 'you still have a course in review or published; ask the platform owner to close the teacher account first'
      using errcode = 'check_violation';
  end if;

  -- The same for a board seat: the owner appoints and removes, so the owner is
  -- who ends it.
  select count(*)
    into v_board
    from public.scholarly_panel_memberships m
    join public.reviewer_profiles rp on rp.id = m.reviewer_profile_id
   where rp.user_id = v_actor
     and m.status = 'active';

  if v_board > 0 then
    raise exception 'you sit on a scholarly board; ask the platform owner to remove you first'
      using errcode = 'check_violation';
  end if;

  select array_agg(distinct family_id)
    into v_family_ids
    from public.family_memberships
   where user_id = v_actor
     and status = 'active';

  -- Children belong to the family, not to the account, so they only go with the
  -- account when it was the last adult standing. If another adult is still an
  -- active member, the family and its children stay and that adult keeps them.
  select array_agg(lp.id)
    into v_learner_ids
    from public.learner_profiles lp
   where lp.deleted_at is null
     and (
       lp.linked_user_id = v_actor
       or (
         lp.family_id = any(coalesce(v_family_ids, '{}'::uuid[]))
         and lp.learner_type = 'child'
         and not exists (
           select 1
             from public.family_memberships m
            where m.family_id = lp.family_id
              and m.user_id <> v_actor
              and m.status = 'active'
         )
       )
     );

  v_learner_ids := coalesce(v_learner_ids, '{}'::uuid[]);

  -- From here the two guards below accept the change. Transaction-local, so it
  -- cannot leak into another request on a pooled connection.
  perform set_config('app.account_erasure', 'on', true);

  -- What the person wrote.
  delete from public.lesson_notes
   where user_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_notes = row_count;

  delete from public.lesson_bookmarks
   where user_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_bookmarks = row_count;

  delete from public.course_wishlist where user_id = v_actor;
  get diagnostics v_saved = row_count;

  delete from public.course_reviews where written_by = v_actor;
  get diagnostics v_reviews = row_count;

  -- A post is kept as a thread; the words are not. Deleting the row would
  -- cascade into other people's replies, which are not this person's to erase.
  update public.discussion_posts
     set body = '[erased]', deleted_at = now()
   where author_user_id = v_actor
     and body <> '[erased]';

  update public.assignment_submissions
     set body_text = ''
   where (created_by = v_actor or learner_profile_id = any(v_learner_ids))
     and body_text <> '';

  -- Sharing exists only while the person does. Grants go entirely rather than
  -- being revoked, because a revoked grant is still a row naming them.
  delete from public.adult_learning_shares
   where grantee_user_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_shares = row_count;

  delete from public.share_invitations
   where invited_by = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_invites = row_count;

  delete from public.guardian_relationships
   where guardian_user_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_guardians = row_count;

  update public.support_cases
     set subject = '[erased]', body = '[erased]'
   where requested_by = v_actor
     and (subject <> '[erased]' or body <> '[erased]');

  delete from public.support_case_messages where author_user_id = v_actor;

  -- Their own words are gone. What staff wrote back stays — a support case is
  -- kept for three years after it closes — but the name inside it does not.
  -- The sentence, not the person, is the record: "check the 12 August order"
  -- is still useful with "the account holder" where a name used to be.
  update public.support_case_messages m
     set body = public.redact_name(m.body, v_name)
   where m.case_id in (select sc.id from public.support_cases sc
                        where sc.requested_by = v_actor)
     and public.redact_name(m.body, v_name) <> m.body;
  get diagnostics v_redacted = row_count;

  update public.support_cases c
     set resolution_note = public.redact_name(c.resolution_note, v_name)
   where c.requested_by = v_actor
     and c.resolution_note is not null
     and public.redact_name(c.resolution_note, v_name) <> c.resolution_note;
  v_redacted := v_redacted + (select count(*) from public.support_cases c
                               where c.requested_by = v_actor
                                 and c.resolution_note is not null
                                 and public.redact_name(c.resolution_note, v_name)
                                     <> c.resolution_note);

  -- The inbox belongs to the account. A closed account has nobody to read it,
  -- and a notification is the platform's words addressed to a person rather
  -- than a record the platform must keep.
  delete from public.notifications where user_id = v_actor;
  get diagnostics v_notifications = row_count;

  -- Mail is the other half of the same question. The copy the recipient holds
  -- is theirs; ours exists to deliver it, and it names the sender. The person's
  -- own address is read from the identity provider, because that is where it
  -- lives — this is the one place the database looks at it.
  select lower(u.email) into v_email from auth.users u where u.id = v_actor;

  delete from public.outbound_messages
   where created_by = v_actor
      or (v_email is not null and lower(to_address) = v_email);
  get diagnostics v_messages = row_count;

  -- What the platform recorded is kept. The name on it is not.
  update public.certificates
     set learner_display_name = 'Deleted learner'
   where learner_profile_id = any(v_learner_ids)
     and learner_display_name <> 'Deleted learner';

  update public.learner_profiles
     set display_name = 'Deleted learner',
         status = 'archived',
         deleted_at = now()
   where id = any(v_learner_ids);

  -- `fm_revoked_has_timestamp` is right to insist on this: a revoked membership
  -- with no moment of revocation cannot say when access ended.
  update public.family_memberships
     set status = 'revoked', revoked_at = now()
   where user_id = v_actor and status = 'active';

  update public.billing_account_memberships
     set status = 'revoked'
   where user_id = v_actor and status = 'active';

  update public.user_profiles
     set display_name = 'Deleted account',
         avatar_path = null,
         timezone = null,
         country_code = null,
         preferred_language = 'en',
         account_status = 'closed',
         deleted_at = now()
   where user_id = v_actor;

  -- Analytics is kept forever (decided 2026-10-22), so it joins the ledger on
  -- the de-identification list rather than the delete list: the rows that count
  -- a completion or a search survive, the person named on them does not. The
  -- guard on `analytics_events` permits exactly this rewrite and no other.
  update public.analytics_events
     set actor_id = null, learner_profile_id = null
   where actor_id = v_actor or learner_profile_id = any(v_learner_ids);
  get diagnostics v_events = row_count;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'account.closed_by_owner',
    'user_profile',
    v_actor,
    jsonb_build_object(
      'learnersErased', coalesce(array_length(v_learner_ids, 1), 0),
      'retained', 'orders, payments, refunds, audit events, enrolments, progress, certificates, analytics'
    )
  );

  return jsonb_build_object(
    'closed', true,
    'alreadyClosed', false,
    'learnersErased', coalesce(array_length(v_learner_ids, 1), 0),
    'removed', jsonb_build_object(
      'notes', v_notes,
      'bookmarks', v_bookmarks,
      'savedCourses', v_saved,
      'reviews', v_reviews,
      'shares', v_shares,
      'invitations', v_invites,
      'guardianLinks', v_guardians,
      'notifications', v_notifications,
      'messages', v_messages
    ),
    'deidentified', jsonb_build_object(
      'analyticsEvents', v_events,
      'caseMessagesAndNotes', v_redacted
    )
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Grants
-- -----------------------------------------------------------------------------

revoke all on function public.redact_name(text, text) from public, anon, authenticated;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

revoke all on function public.erase_my_account(text) from public, anon;
grant execute on function public.erase_my_account(text) to authenticated;

comment on function public.export_my_data() is
  'Everything the caller may see about themselves, as one JSON document: account, learners and their study record, certificates, orders and refunds, notes, bookmarks, saved courses, invitations, guardianship, reviews, discussion, assignments, assessments, support, notifications, activity, earnings, payouts, devices and shares. Definer, so every where clause in it is the boundary; it takes no argument and cannot be pointed at anybody else.';

comment on function public.erase_my_account(text) is
  'Closes the caller''s account: deletes what they wrote and what exists only for them, keeps the ledger, certificates, the audit trail and their support case, de-identifies the person on everything kept, and reports both halves. Idempotent.';
