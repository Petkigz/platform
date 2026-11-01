-- -----------------------------------------------------------------------------
-- The other half of "download my data"
-- -----------------------------------------------------------------------------
--
-- `export_my_data()` produces a document and there has never been a way to put
-- one back. That is the shape of a right that only works in one direction: a
-- person can leave with a file and cannot return with one, so the file is a
-- souvenir rather than a copy of their record.
--
-- **What a restore is, and what it is not.** The export is a *record of a
-- person's data*, not a database dump, and the difference matters more here
-- than anywhere else in this schema. Half of what the export contains is
-- written by the platform about the person, not by the person: an enrolment is
-- an entitlement, a certificate is issued and signed, an order is a ledger
-- entry, and an audit event is a claim about what happened. Writing any of
-- those from a file is not restoring somebody's record — it is the person
-- fabricating one, and a table that accepts it is a table nobody can trust.
--
-- So the restore brings back exactly the things the person *wrote*:
--
--   * their account preferences — display name, language, time zone, country,
--     because those have no foreign key and are nobody else's fact;
--   * their lesson notes and bookmarks, which are their own words.
--
-- And it says plainly, in the document it returns, everything it left behind
-- and why. A restore that silently ignored the rest would be worse than none.
--
-- **The entitlement rule is not restated here.** A note hangs off an enrolment
-- (`lesson_notes.course_enrolment_id`), so restoring one onto a course the
-- person is not enrolled in would either fail or have to create the enrolment.
-- It does neither: every insert goes through `guard_lesson_study_data`, the
-- same trigger an ordinary insert meets, and the function catches the refusal
-- and reports it. That is why the restore is a `security definer` function that
-- *still* cannot give anybody a course — inside it, the writes have no more
-- power than the person sitting at the browser.
--
-- **Dry run first, and it is the default.** `p_apply` defaults to false and
-- answers the question a person actually has — *what will this do?* — before
-- anything is written. The dry run asks `can_use_lesson_study_data()`, the very
-- predicate the trigger uses, so the preview cannot promise something the apply
-- then refuses.
--
-- **Running it twice is safe.** An entry that is already there is counted as
-- already there, never overwritten: the live note is the person's current
-- thought and a file from last month does not get to replace it. That
-- idempotence is also why there is no rate limit here — unlike the export,
-- which produces a new document every second, this one converges.
--
-- **Format 2.** A restore has to know *which* lesson an entry belonged to, and
-- a lesson title is not an identity: "Introduction" exists in more than one
-- course. The export therefore gained `courseSlug` and `section` on notes and
-- bookmarks and moved `formatVersion` to 2. A version 1 file is still read, and
-- is matched by title alone — which is exactly the case where the two courses
-- with an "Introduction" have to be reported as ambiguous rather than guessed.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 1. The same document, with the keys a restore needs
-- -----------------------------------------------------------------------------

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
    'formatVersion', 2,
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
               -- Added in format 2, and the reason for it: a restore has to know
               -- which lesson a note belongs to, and a title is not an identity.
               'courseSlug', c.slug,
               'section', section_row.title,
               'body', n.body,
               'createdAt', n.created_at,
               'updatedAt', n.updated_at)
             order by n.updated_at)
        from (select * from public.lesson_notes
               where user_id = v_actor order by updated_at limit v_cap) n
        join public.lessons l on l.id = n.lesson_id
        join public.course_sections section_row on section_row.id = l.section_id
        join public.course_versions cv on cv.id = section_row.course_version_id
        join public.courses c on c.id = cv.course_id), '[]'::jsonb),

    'bookmarks', coalesce((
      select jsonb_agg(jsonb_build_object(
               'lesson', l.title,
               'courseSlug', c.slug,
               'section', section_row.title,
               'createdAt', b.created_at)
             order by b.created_at)
        from (select * from public.lesson_bookmarks
               where user_id = v_actor order by created_at limit v_cap) b
        join public.lessons l on l.id = b.lesson_id
        join public.course_sections section_row on section_row.id = l.section_id
        join public.course_versions cv on cv.id = section_row.course_version_id
        join public.courses c on c.id = cv.course_id), '[]'::jsonb),

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
          jsonb_build_object('formatVersion', 2, 'counts', v_counts, 'truncated', v_cut));

  return v_out;
end;
$$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

comment on function public.export_my_data() is
  'Everything the caller may see about themselves, as one JSON document. Definer, so every where clause in it is the boundary; it takes no argument and cannot be pointed at anybody else. Format 2 adds the course slug and section to notes and bookmarks, which is what makes a restore able to find its lesson.';

-- -----------------------------------------------------------------------------
-- 2. Finding the lesson a restored entry belonged to
-- -----------------------------------------------------------------------------
--
-- One function, because notes and bookmarks ask the identical question and two
-- copies of the matching rule would eventually disagree about what "the same
-- lesson" means.
--
-- It resolves to a *single* candidate or to a sentence explaining why there is
-- none. There is deliberately no "best guess": a note put back on the wrong
-- lesson is a note the person will read in the wrong place and believe, which
-- is worse than a note left in the file.
--
-- The caller's own identity comes from the session rather than from an
-- argument, so this function cannot be pointed at anybody even if it were
-- reachable — and it is not: `revoke all` below, and only `restore_my_data()`
-- calls it.

create or replace function public.restore_lesson_target(p_row jsonb)
returns table (
  target_lesson   uuid,
  target_learner  uuid,
  target_enrolment uuid,
  problem         text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lesson  text := nullif(btrim(coalesce(p_row->>'lesson', '')), '');
  v_slug    text := nullif(btrim(coalesce(p_row->>'courseSlug', '')), '');
  v_section text := nullif(btrim(coalesce(p_row->>'section', '')), '');
  v_hits    integer;
  v_lesson_id uuid;
  v_learner uuid;
  v_enrol   uuid;
begin
  if v_lesson is null then
    return query select null::uuid, null::uuid, null::uuid,
      'this entry names no lesson, so there is nothing to attach it to'::text;
    return;
  end if;

  -- Only courses the person is enrolled in *now*, in the version they are
  -- enrolled in. A note from a version that has been retired has no lesson to
  -- return to, and inventing one would be a note against content that is not
  -- the content it was written about.
  select count(*),
         (array_agg(l.id))[1],
         (array_agg(ce.learner_profile_id))[1],
         (array_agg(ce.id))[1]
    into v_hits, v_lesson_id, v_learner, v_enrol
    from public.course_enrolments ce
    join public.course_sections cs on cs.course_version_id = ce.course_version_id
    join public.lessons l on l.section_id = cs.id
    join public.courses c on c.id = ce.course_id
   where ce.deleted_at is null
     and ce.status in ('active', 'completed')
     and public.can_access_learner(ce.learner_profile_id)
     and l.title = v_lesson
     and (v_slug is null or c.slug = v_slug)
     and (v_section is null or cs.title = v_section);

  if v_hits = 0 then
    return query select null::uuid, null::uuid, null::uuid,
      format('you are not enrolled in a course with a lesson called “%s” any more', v_lesson);
    return;
  end if;

  if v_hits > 1 then
    return query select null::uuid, null::uuid, null::uuid,
      format('more than one of your courses has a lesson called “%s”, and this file cannot say which', v_lesson);
    return;
  end if;

  return query select v_lesson_id, v_learner, v_enrol, null::text;
end;
$$;

revoke all on function public.restore_lesson_target(jsonb) from public, anon, authenticated;

comment on function public.restore_lesson_target(jsonb) is
  'The one lesson, learner and enrolment a restored note or bookmark belongs to, or a sentence saying why there is none. Reads the caller from the session; callable only from restore_my_data().';

-- -----------------------------------------------------------------------------
-- 3. The restore
-- -----------------------------------------------------------------------------

create or replace function public.restore_my_data(
  p_document jsonb,
  p_apply    boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap      constant integer := 1000;
  v_ceiling  constant integer := 8 * 1024 * 1024;
  v_body_max constant integer := 4000;

  v_actor   uuid := public.current_user_id();
  v_version integer;
  v_bytes   integer;

  v_cur_name text; v_cur_lang text; v_cur_tz text; v_cur_country text;

  v_set_name text; v_set_lang text; v_set_tz text; v_set_country text;
  v_changed  jsonb := '[]'::jsonb;
  v_acct_skip jsonb := '[]'::jsonb;

  v_notes_on boolean;

  v_rows    jsonb;
  v_row     jsonb;
  v_index   integer;

  v_body    text;
  v_lesson_id uuid; v_learner uuid; v_enrol uuid; v_problem text;

  v_existing      text;
  v_notes_ok      integer := 0;
  v_notes_had     integer := 0;
  v_notes_skipped jsonb := '[]'::jsonb;
  v_marks_ok      integer := 0;
  v_marks_had     integer := 0;
  v_marks_skipped jsonb := '[]'::jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to restore your data'
      using errcode = 'insufficient_privilege';
  end if;

  if p_document is null or jsonb_typeof(p_document) <> 'object' then
    raise exception 'that is not an export: the file should be one JSON object'
      using errcode = 'invalid_parameter_value';
  end if;

  v_bytes := pg_column_size(p_document);
  if v_bytes > v_ceiling then
    raise exception 'that file is % MiB; an export is far smaller than 8', round(v_bytes / 1048576.0, 1)
      using errcode = 'invalid_parameter_value';
  end if;

  begin
    v_version := (p_document->>'formatVersion')::integer;
  exception when others then
    v_version := null;
  end;

  if v_version is null then
    raise exception 'that file has no formatVersion, so it is not an export from this platform'
      using errcode = 'invalid_parameter_value';
  end if;
  if v_version < 1 then
    raise exception 'formatVersion % is not a version of this format', v_version
      using errcode = 'invalid_parameter_value';
  end if;
  if v_version > 2 then
    raise exception 'that export was written by a newer version of the platform (format %) than this one reads; it is not a file this deployment can put back', v_version
      using errcode = 'invalid_parameter_value';
  end if;

  select up.display_name, up.preferred_language, up.timezone, up.country_code
    into v_cur_name, v_cur_lang, v_cur_tz, v_cur_country
    from public.user_profiles up
   where up.user_id = v_actor;

  if v_cur_name is null then
    raise exception 'there is no profile for this account to restore into'
      using errcode = 'insufficient_privilege';
  end if;

  -- ---------------------------------------------------------------------------
  -- What the person chose about themselves
  -- ---------------------------------------------------------------------------
  -- Only what the column will actually hold, and only where the file disagrees
  -- with the live value. A restore that "changed" six fields to the values they
  -- already had would be a lie told to somebody checking their own account.
  v_set_name := nullif(btrim(coalesce(p_document->'account'->>'displayName', '')), '');
  if v_set_name is null and p_document->'account' ? 'displayName' then
    v_acct_skip := v_acct_skip || jsonb_build_object('field', 'displayName',
      'reason', 'the name in the file is blank, and a profile cannot have a blank name');
  end if;
  if v_set_name is not null then
    if length(v_set_name) > 120 then
      v_acct_skip := v_acct_skip || jsonb_build_object('field', 'displayName',
        'reason', 'the name in the file is longer than 120 characters');
      v_set_name := null;
    elsif v_set_name is distinct from v_cur_name then
      v_changed := v_changed || to_jsonb('displayName'::text);
    else
      v_set_name := null;
    end if;
  end if;

  -- `user_profiles.preferred_language` holds a two-letter code with an optional
  -- region, so a locale like `fa-af` is refused by the column rather than by
  -- this function. Saying so is better than silently storing `fa`.
  v_set_lang := nullif(btrim(coalesce(p_document->'account'->>'preferredLanguage', '')), '');
  if v_set_lang is not null then
    if v_set_lang !~ '^[a-z]{2}(-[A-Z]{2})?$' then
      v_acct_skip := v_acct_skip || jsonb_build_object('field', 'preferredLanguage',
        'reason', format('the profile column cannot hold “%s”; set it again from /account', v_set_lang));
      v_set_lang := null;
    elsif v_set_lang is distinct from v_cur_lang then
      v_changed := v_changed || to_jsonb('preferredLanguage'::text);
    else
      v_set_lang := null;
    end if;
  end if;

  v_set_tz := nullif(btrim(coalesce(p_document->'account'->>'timezone', '')), '');
  if v_set_tz is not null then
    begin
      -- The only honest test of a time zone name is asking the server whether
      -- it has one. A file is not a source of authority about the tz database.
      perform now() at time zone v_set_tz;
    exception when others then
      v_acct_skip := v_acct_skip || jsonb_build_object('field', 'timezone',
        'reason', format('“%s” is not a time zone this server knows', v_set_tz));
      v_set_tz := null;
    end;
    if v_set_tz is not null then
      if v_set_tz is distinct from v_cur_tz then
        v_changed := v_changed || to_jsonb('timezone'::text);
      else
        v_set_tz := null;
      end if;
    end if;
  end if;

  v_set_country := nullif(btrim(coalesce(p_document->'account'->>'countryCode', '')), '');
  if v_set_country is not null then
    if v_set_country !~ '^[A-Z]{2}$' then
      v_acct_skip := v_acct_skip || jsonb_build_object('field', 'countryCode',
        'reason', format('“%s” is not a two-letter country code', v_set_country));
      v_set_country := null;
    elsif v_set_country is distinct from v_cur_country then
      v_changed := v_changed || to_jsonb('countryCode'::text);
    else
      v_set_country := null;
    end if;
  end if;

  if p_apply and jsonb_array_length(v_changed) > 0 then
    update public.user_profiles
       set display_name       = coalesce(v_set_name, display_name),
           preferred_language = coalesce(v_set_lang, preferred_language),
           timezone           = coalesce(v_set_tz, timezone),
           country_code       = coalesce(v_set_country, country_code),
           updated_at         = now()
     where user_id = v_actor;
  end if;

  -- ---------------------------------------------------------------------------
  -- Their own words, on the lessons they are still entitled to
  -- ---------------------------------------------------------------------------
  v_notes_on := public.setting_bool('learning.notes_bookmarks', false);

  v_rows := case when jsonb_typeof(p_document->'notes') = 'array' then p_document->'notes' else '[]'::jsonb end;
  if p_document ? 'notes' and jsonb_typeof(p_document->'notes') <> 'array' then
    v_notes_skipped := v_notes_skipped || jsonb_build_object('lesson', '—',
      'reason', 'the notes section of this file is not a list, so it could not be read');
  end if;
  if jsonb_array_length(v_rows) > v_cap then
    v_notes_skipped := v_notes_skipped || jsonb_build_object('lesson', '—',
      'reason', format('this file holds %s notes and only the first %s are read — export again and restore the rest with a second file', jsonb_array_length(v_rows), v_cap));
  end if;

  if jsonb_array_length(v_rows) > 0 and not v_notes_on then
    v_notes_skipped := v_notes_skipped || jsonb_build_object('lesson', '—',
      'reason', 'lesson notes are switched off on this platform, so there is nowhere to put them; the text is still in your file');
  else
    v_index := 0;
    for v_row in select value from jsonb_array_elements(v_rows) loop
      v_index := v_index + 1;
      exit when v_index > v_cap;
      continue when jsonb_typeof(v_row) <> 'object';

      v_body := nullif(btrim(coalesce(v_row->>'body', '')), '');
      if v_body is null then
        v_notes_skipped := v_notes_skipped || jsonb_build_object(
          'lesson', coalesce(v_row->>'lesson', '—'),
          'reason', 'this note has no text');
        continue;
      end if;
      if length(v_body) > v_body_max then
        v_notes_skipped := v_notes_skipped || jsonb_build_object(
          'lesson', coalesce(v_row->>'lesson', '—'),
          'reason', format('this note is longer than the %s characters a note may hold', v_body_max));
        continue;
      end if;

      select t.target_lesson, t.target_learner, t.target_enrolment, t.problem
        into v_lesson_id, v_learner, v_enrol, v_problem
        from public.restore_lesson_target(v_row) t;

      if v_problem is not null then
        v_notes_skipped := v_notes_skipped || jsonb_build_object(
          'lesson', coalesce(v_row->>'lesson', '—'), 'reason', v_problem);
        continue;
      end if;

      select n.body into v_existing
        from public.lesson_notes n
       where n.user_id = v_actor
         and n.course_enrolment_id = v_enrol
         and n.lesson_id = v_lesson_id;

      if found then
        if v_existing = v_body then
          v_notes_had := v_notes_had + 1;
        else
          v_notes_skipped := v_notes_skipped || jsonb_build_object(
            'lesson', coalesce(v_row->>'lesson', '—'),
            'reason', 'you have already written a different note on this lesson, and the one here was not overwritten');
        end if;
        continue;
      end if;

      if p_apply then
        -- The trigger is the rule. It is not restated here, and it is not
        -- bypassed by the definer: what it refuses, this refuses.
        begin
          insert into public.lesson_notes
            (user_id, learner_profile_id, course_enrolment_id, lesson_id, body)
          values (v_actor, v_learner, v_enrol, v_lesson_id, v_body);
          v_notes_ok := v_notes_ok + 1;
        exception when others then
          v_notes_skipped := v_notes_skipped || jsonb_build_object(
            'lesson', coalesce(v_row->>'lesson', '—'), 'reason', sqlerrm);
        end;
      elsif public.can_use_lesson_study_data(v_learner, v_enrol, v_lesson_id) then
        v_notes_ok := v_notes_ok + 1;
      else
        v_notes_skipped := v_notes_skipped || jsonb_build_object(
          'lesson', coalesce(v_row->>'lesson', '—'),
          'reason', 'an active enrolment in this course, and access to this lesson, are required');
      end if;
    end loop;
  end if;

  v_rows := case when jsonb_typeof(p_document->'bookmarks') = 'array' then p_document->'bookmarks' else '[]'::jsonb end;
  if p_document ? 'bookmarks' and jsonb_typeof(p_document->'bookmarks') <> 'array' then
    v_marks_skipped := v_marks_skipped || jsonb_build_object('lesson', '—',
      'reason', 'the bookmarks section of this file is not a list, so it could not be read');
  end if;
  if jsonb_array_length(v_rows) > v_cap then
    v_marks_skipped := v_marks_skipped || jsonb_build_object('lesson', '—',
      'reason', format('this file holds %s bookmarks and only the first %s are read — export again and restore the rest with a second file', jsonb_array_length(v_rows), v_cap));
  end if;

  if jsonb_array_length(v_rows) > 0 and not v_notes_on then
    v_marks_skipped := v_marks_skipped || jsonb_build_object('lesson', '—',
      'reason', 'bookmarks are switched off on this platform, so there is nowhere to put them');
  else
    v_index := 0;
    for v_row in select value from jsonb_array_elements(v_rows) loop
      v_index := v_index + 1;
      exit when v_index > v_cap;
      continue when jsonb_typeof(v_row) <> 'object';

      select t.target_lesson, t.target_learner, t.target_enrolment, t.problem
        into v_lesson_id, v_learner, v_enrol, v_problem
        from public.restore_lesson_target(v_row) t;

      if v_problem is not null then
        v_marks_skipped := v_marks_skipped || jsonb_build_object(
          'lesson', coalesce(v_row->>'lesson', '—'), 'reason', v_problem);
        continue;
      end if;

      if exists (
        select 1 from public.lesson_bookmarks b
         where b.user_id = v_actor
           and b.course_enrolment_id = v_enrol
           and b.lesson_id = v_lesson_id
      ) then
        v_marks_had := v_marks_had + 1;
        continue;
      end if;

      if p_apply then
        begin
          insert into public.lesson_bookmarks
            (user_id, learner_profile_id, course_enrolment_id, lesson_id)
          values (v_actor, v_learner, v_enrol, v_lesson_id);
          v_marks_ok := v_marks_ok + 1;
        exception when others then
          v_marks_skipped := v_marks_skipped || jsonb_build_object(
            'lesson', coalesce(v_row->>'lesson', '—'), 'reason', sqlerrm);
        end;
      elsif public.can_use_lesson_study_data(v_learner, v_enrol, v_lesson_id) then
        v_marks_ok := v_marks_ok + 1;
      else
        v_marks_skipped := v_marks_skipped || jsonb_build_object(
          'lesson', coalesce(v_row->>'lesson', '—'),
          'reason', 'an active enrolment in this course, and access to this lesson, are required');
      end if;
    end loop;
  end if;

  -- ---------------------------------------------------------------------------
  -- The record of somebody else's action: one row per *applied* restore
  -- ---------------------------------------------------------------------------
  -- A dry run writes nothing at all, including this. That is the point of a dry
  -- run, and an audit trail that logged the previews would be a worse trail.
  if p_apply then
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'data.restored', 'user_profile', v_actor,
            jsonb_build_object(
              'formatVersion', v_version,
              'accountFields', v_changed,
              'notesRestored', v_notes_ok,
              'bookmarksRestored', v_marks_ok,
              'notesSkipped', jsonb_array_length(v_notes_skipped),
              'bookmarksSkipped', jsonb_array_length(v_marks_skipped)));
  end if;

  return jsonb_build_object(
    'applied', p_apply,
    'formatVersion', v_version,

    'account', jsonb_build_object(
      'changed', v_changed,
      'skipped', v_acct_skip),

    'notes', jsonb_build_object(
      'restored', v_notes_ok,
      'alreadyThere', v_notes_had,
      'skipped', v_notes_skipped),

    'bookmarks', jsonb_build_object(
      'restored', v_marks_ok,
      'alreadyThere', v_marks_had,
      'skipped', v_marks_skipped),

    -- What the file contains and this will not put back, in the same voice as
    -- the export's `notIncluded`. A person should not have to infer an absence.
    'notRestored', jsonb_build_array(
      jsonb_build_object(
        'what', 'Enrolments',
        'why', 'An enrolment is an entitlement, sometimes a paid one. Writing one from a file would hand somebody a course for free or drop a learner into a class nobody admitted them to. Enrol again, then run this file a second time: your notes will find their lessons.'),
      jsonb_build_object(
        'what', 'Certificates',
        'why', 'A certificate is issued by the platform and signed by a person. One written from a file would be a forgery that verifies. The numbers in your file are still real, and /verify/<number> will still confirm them.'),
      jsonb_build_object(
        'what', 'Orders and refunds',
        'why', 'Money is a ledger the platform keeps, not a document the person holds. A restored order would be a claim to have paid. Your receipts and their numbers remain in the file for your records.'),
      jsonb_build_object(
        'what', 'Reviews, discussion posts and assignment submissions',
        'why', 'Each was published and, where it needed it, moderated. Re-posting them from a file would republish words that nobody has re-read and, for a submission, a mark that nobody has given.'),
      jsonb_build_object(
        'what', 'Learner profiles, including children',
        'why', 'A learner profile carries consent and, for a child, a guardian relationship somebody verified. Creating one from a file would manufacture that consent, so a child is added through the family screens and verified there.'),
      jsonb_build_object(
        'what', 'Roles and staff permissions',
        'why', 'Privilege is granted to a person by another person, in the admin dashboard, and is recorded as such. It is not portable property.'),
      jsonb_build_object(
        'what', 'Progress, quiz attempts and marks',
        'why', 'Progress is a record of what somebody did in this deployment, written by the lessons as they were opened. A restored percentage would be a claim about work nobody watched.'),
      jsonb_build_object(
        'what', 'The audit trail and your activity history',
        'why', 'It is append-only and it is a record of what happened. A history imported from a file is a fabricated history.'),
      jsonb_build_object(
        'what', 'Your sign-in address and password',
        'why', 'Both live with the authentication provider. Sign in with the address you want to use; this file cannot set it.')
    )
  );
end;
$$;

revoke all on function public.restore_my_data(jsonb, boolean) from public, anon;
grant execute on function public.restore_my_data(jsonb, boolean) to authenticated;

comment on function public.restore_my_data(jsonb, boolean) is
  'Puts back the parts of an export the person actually wrote — account preferences, notes and bookmarks — and reports in words everything it left behind. Defaults to a dry run. Every write meets the same trigger an ordinary insert meets, so it cannot grant an entitlement, a certificate or a role.';
