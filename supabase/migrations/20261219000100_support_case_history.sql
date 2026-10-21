-- The history behind a support case.
--
-- THE GAP
-- -------
-- Six tables in this schema exist to answer a support question and nothing has
-- ever read them: `order_status_history`, `subscription_history`,
-- `entitlement_events`, `course_enrolment_version_history`, `publication_events`
-- and `adult_learning_shares`. They are written by triggers and by other writers,
-- they are append-only where it matters, and they are indexed — but no screen, no
-- route and no function consulted them, so the platform recorded an audit trail
-- that only a person with database access could read.
--
-- The cost is concrete. "I paid and I still cannot watch" is the most common
-- support question a subscription platform gets, and answering it means reading
-- four of those tables: what the order did, what the subscription did, what the
-- entitlement grant did, and whether the learner was moved to a different version
-- of the course in the meantime. Until now the answer was to guess from the
-- current state of the rows, which is exactly the state that has already changed.
--
-- WHY ONE FUNCTION AND NOT SIX POLICIES
-- -------------------------------------
-- The obvious route is a panel that queries the tables, which needs read policies
-- widened to staff on two of them (`subscription_history` is readable by billing
-- members and not by staff, and `order_status_history` is readable through the
-- order). Widening a policy to answer one screen's question gives every staff
-- query path the same reach, forever, with no place to say what a support agent
-- may see. A definer function is one authority: it decides the scope, it caps what
-- comes back, and the tables stay closed to everything else.
--
-- THE TRAP THIS FUNCTION IS BUILT AROUND
-- ---------------------------------------
-- The history is scoped to the person who asked, not to the person reading. That
-- sounds like `can_access_learner()`, and it is not: that function answers "may the
-- caller see this learner", and inside a SECURITY DEFINER function called by a
-- member of staff the caller is staff, so it answers yes for every learner on the
-- platform. Scoping with it would hand an agent the enrolments and entitlements of
-- every child in the system. So the same rule is written out here against the
-- case's `requested_by` instead — own profile, active family membership other than
-- billing-only, or a verified guardian holding the progress permission — which is
-- the rule `can_access_learner()` implements, with the requester in place of the
-- caller.
--
-- TWO FINDINGS, RECORDED RATHER THAN PAPERED OVER
-- -----------------------------------------------
-- `access_checks` is not included. Its table comment says "Recorded so a support
-- agent can explain a denial", and nothing in the schema, the web layer or the
-- worker has ever inserted a row into it: the diagnostic was designed and never
-- wired. A section that is always empty would read as "no denials happened", which
-- is the one wrong answer a support agent cannot afford, so the console says in
-- words that denials are not recorded instead of showing an empty list.
--
-- `adult_learning_shares` is included, and its emptiness is meaningful: an adult
-- learner can be given sight of another adult's progress, and "nobody has been
-- given sight of yours" is a true answer to a real question. What is not true yet
-- is that a person can create one — no screen or route writes this table, only
-- SQL, so the console can show a share but nothing in the product can make one.
--
-- Nothing here is a decision about the case. It is a read model: one call, one
-- snapshot, and no row is written except nothing at all.

create or replace function public.support_case_history(p_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_case   public.support_cases%rowtype;
  v_result jsonb;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only platform staff may read the history behind a support case'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_case
    from public.support_cases sc
   where sc.id = p_case_id;

  if not found then
    raise exception 'no support case %', p_case_id
      using errcode = 'no_data_found';
  end if;

  with learners as (
    -- The learners this case is about: the one named on the case, or — when the
    -- requester did not name one — the learners they can see. The rule is
    -- can_access_learner()'s, written against the requester rather than the
    -- caller; see the header for why the function itself cannot be used here.
    select lp.id,
           lp.display_name,
           lp.learner_type,
           lp.age_band,
           lp.status,
           (lp.linked_user_id = v_case.requested_by) as is_requester
      from public.learner_profiles lp
     where lp.deleted_at is null
       and (
            lp.id = v_case.learner_profile_id
         or (v_case.learner_profile_id is null and (
                lp.linked_user_id = v_case.requested_by
             or exists (
                  select 1
                    from public.family_memberships fm
                   where lp.family_id is not null
                     and fm.family_id = lp.family_id
                     and fm.user_id = v_case.requested_by
                     and fm.status = 'active'
                     -- A billing-only member pays for a family and does not see
                     -- its learning data.
                     and fm.membership_type <> 'billing_manager')
             or exists (
                  select 1
                    from public.guardian_relationships gr
                   where gr.learner_profile_id = lp.id
                     and gr.guardian_user_id = v_case.requested_by
                     and gr.status = 'active'
                     and gr.can_view_progress)
            ))
       )
  ),
  accounts as (
    -- The money this case can be about: the billing accounts the requester
    -- belongs to, plus the account behind the order they named on the case.
    select bam.billing_account_id as id
      from public.billing_account_memberships bam
     where bam.user_id = v_case.requested_by
       and bam.status = 'active'
    union
    select o.billing_account_id
      from public.orders o
     where o.id = v_case.order_id
  ),
  case_orders as (
    select o.*, (o.id = v_case.order_id) as is_case_order
      from public.orders o
     where o.deleted_at is null
       and (o.billing_account_id in (select a.id from accounts a)
            or o.id = v_case.order_id)
  ),
  case_subscriptions as (
    select s.*
      from public.subscriptions s
     where s.billing_account_id in (select a.id from accounts a)
  ),
  case_enrolments as (
    select e.*
      from public.course_enrolments e
      join learners l on l.id = e.learner_profile_id
     where e.deleted_at is null
  ),
  enrolment_versions as (
    select distinct e.course_version_id as id
      from case_enrolments e
  )

  select jsonb_build_object(
    'generatedAt', now(),

    'requester', (
      select jsonb_build_object(
               'userId', up.user_id,
               'displayName', up.display_name,
               'accountStatus', up.account_status,
               'createdAt', up.created_at)
        from public.user_profiles up
       where up.user_id = v_case.requested_by),

    -- The learner the case names, if it names one. Null is an answer: the person
    -- asking did not say which of their learners this is about.
    'learner', (
      select jsonb_build_object(
               'id', lp.id,
               'displayName', lp.display_name,
               'learnerType', lp.learner_type,
               'ageBand', lp.age_band,
               'status', lp.status)
        from public.learner_profiles lp
       where lp.id = v_case.learner_profile_id),

    'learners', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id,
               'displayName', l.display_name,
               'learnerType', l.learner_type,
               'ageBand', l.age_band,
               'status', l.status,
               'isRequester', l.is_requester)
               order by l.is_requester desc, l.display_name)
        from learners l), '[]'::jsonb),

    -- Every section reports its own total next to a capped list, so a limit is
    -- never silent: an agent who reads 25 orders knows there were 30. The nested
    -- histories are uncapped because a state machine has a handful of transitions.
    'orders', jsonb_build_object(
      'total', (select count(*)::int from case_orders),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', o.id,
                 'isCaseOrder', o.is_case_order,
                 'status', o.status,
                 'currencyCode', o.currency_code,
                 'subtotalMinor', o.subtotal_minor,
                 'discountMinor', o.discount_minor,
                 'taxMinor', o.tax_minor,
                 'totalMinor', o.total_minor,
                 'placedAt', o.placed_at,
                 'paidAt', o.paid_at,
                 'cancelledAt', o.cancelled_at,
                 'billingAccountId', o.billing_account_id,
                 'history', coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'fromStatus', h.from_status,
                            'toStatus', h.to_status,
                            'reason', h.reason,
                            'changedBy', h.changed_by,
                            'changedByName', cu.display_name,
                            'occurredAt', h.occurred_at)
                            order by h.occurred_at)
                     from public.order_status_history h
                     left join public.user_profiles cu on cu.user_id = h.changed_by
                    where h.order_id = o.id), '[]'::jsonb))
               order by coalesce(o.placed_at, o.created_at) desc)
          from (select co.*
                  from case_orders co
                 order by coalesce(co.placed_at, co.created_at) desc
                 limit 25) o), '[]'::jsonb)),

    'subscriptions', jsonb_build_object(
      'total', (select count(*)::int from case_subscriptions),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', s.id,
                 'status', s.status,
                 'planId', s.plan_id,
                 'planName', p.name,
                 'planVersionId', s.plan_version_id,
                 'billingInterval', pv.billing_interval,
                 'startedAt', s.started_at,
                 'currentPeriodStart', s.current_period_start,
                 'currentPeriodEnd', s.current_period_end,
                 'cancelledAt', s.cancelled_at,
                 'cancelReason', s.cancel_reason,
                 'billingAccountId', s.billing_account_id,
                 'history', coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'fromStatus', h.from_status,
                            'toStatus', h.to_status,
                            'reason', h.reason,
                            'changedBy', h.changed_by,
                            'changedByName', cu.display_name,
                            'occurredAt', h.occurred_at)
                            order by h.occurred_at)
                     from public.subscription_history h
                     left join public.user_profiles cu on cu.user_id = h.changed_by
                    where h.subscription_id = s.id), '[]'::jsonb))
               order by s.created_at desc)
          from (select cs.*
                  from case_subscriptions cs
                 order by cs.created_at desc
                 limit 25) s
          left join public.plans p on p.id = s.plan_id
          left join public.plan_versions pv on pv.id = s.plan_version_id), '[]'::jsonb)),

    'entitlements', jsonb_build_object(
      'total', (select count(*)::int
                  from public.entitlement_grants eg
                  join learners l on l.id = eg.learner_profile_id),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', g.id,
                 'learnerProfileId', g.learner_profile_id,
                 'learnerName', ld.display_name,
                 'scopeType', g.scope_type,
                 'courseId', g.course_id,
                 'courseTitle', c.title,
                 'courseVersionId', g.course_version_id,
                 'subjectAreaId', g.subject_area_id,
                 'featureCode', g.feature_code,
                 'sourceType', g.source_type,
                 'status', g.status,
                 'effectiveFrom', g.effective_from,
                 'effectiveUntil', g.effective_until,
                 'revokedAt', g.revoked_at,
                 'revocationReason', g.revocation_reason,
                 'events', coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'eventType', ev.event_type,
                            'fromStatus', ev.from_status,
                            'toStatus', ev.to_status,
                            'reason', ev.reason,
                            'performedBy', ev.performed_by,
                            'performedByName', pu.display_name,
                            'occurredAt', ev.occurred_at)
                            order by ev.occurred_at)
                     from public.entitlement_events ev
                     left join public.user_profiles pu on pu.user_id = ev.performed_by
                    where ev.entitlement_grant_id = g.id), '[]'::jsonb))
               order by g.created_at desc)
          from (select eg.*
                  from public.entitlement_grants eg
                  join learners l on l.id = eg.learner_profile_id
                 order by eg.created_at desc
                 limit 100) g
          left join public.learner_profiles ld on ld.id = g.learner_profile_id
          left join public.courses c on c.id = g.course_id), '[]'::jsonb)),

    'enrolments', jsonb_build_object(
      'total', (select count(*)::int from case_enrolments),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', e.id,
                 'learnerProfileId', e.learner_profile_id,
                 'learnerName', ld.display_name,
                 'courseId', e.course_id,
                 'courseTitle', c.title,
                 'courseVersionId', e.course_version_id,
                 'versionNumber', cv.version_number,
                 'versionStatus', cv.version_status,
                 'status', e.status,
                 'source', e.source,
                 'enrolledAt', e.enrolled_at,
                 'completedAt', e.completed_at,
                 'versionHistory', coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'fromVersionId', vh.from_version_id,
                            'toVersionId', vh.to_version_id,
                            'reason', vh.reason,
                            'method', vh.method,
                            'initiator', vh.initiator,
                            'initiatorName', iu.display_name,
                            'occurredAt', vh.occurred_at)
                            order by vh.occurred_at)
                     from public.course_enrolment_version_history vh
                     left join public.user_profiles iu on iu.user_id = vh.initiator
                    where vh.course_enrolment_id = e.id), '[]'::jsonb))
               order by e.enrolled_at desc)
          from (select ce.*
                  from case_enrolments ce
                 order by ce.enrolled_at desc
                 limit 100) e
          left join public.learner_profiles ld on ld.id = e.learner_profile_id
          left join public.course_versions cv on cv.id = e.course_version_id
          left join public.courses c on c.id = e.course_id), '[]'::jsonb)),

    -- What happened to the course versions this learner is enrolled in. An agent
    -- answering "the lesson disappeared" needs to know a version was suspended or
    -- retired, and that is not visible from the enrolment row.
    'publicationEvents', jsonb_build_object(
      'total', (select count(*)::int
                  from public.publication_events pe
                 where pe.course_version_id in (select v.id from enrolment_versions v)),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'courseVersionId', pe.course_version_id,
                 'courseTitle', c.title,
                 'versionNumber', cv.version_number,
                 'eventType', pe.event_type,
                 'reason', pe.reason,
                 'performedBy', pe.performed_by,
                 'performedByName', pu.display_name,
                 'occurredAt', pe.occurred_at)
               order by pe.occurred_at desc)
          from (select ev.*
                  from public.publication_events ev
                 where ev.course_version_id in (select v.id from enrolment_versions v)
                 order by ev.occurred_at desc
                 limit 50) pe
          left join public.course_versions cv on cv.id = pe.course_version_id
          left join public.courses c on c.id = cv.course_id
          left join public.user_profiles pu on pu.user_id = pe.performed_by), '[]'::jsonb)),

    -- Who else may see this adult's progress. Empty is a real answer here, unlike
    -- an access-check log: nothing can create one from the product yet.
    'shares', jsonb_build_object(
      'total', (select count(*)::int
                  from public.adult_learning_shares als
                 where als.learner_profile_id in (select l.id from learners l)
                    or als.grantee_user_id = v_case.requested_by),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', als.id,
                 'learnerProfileId', als.learner_profile_id,
                 'learnerName', ld.display_name,
                 'granteeUserId', als.grantee_user_id,
                 'granteeName', gu.display_name,
                 'scope', als.scope,
                 'status', als.status,
                 'grantedAt', als.granted_at,
                 'expiresAt', als.expires_at,
                 'revokedAt', als.revoked_at)
               order by als.granted_at desc)
          from (select s.*
                  from public.adult_learning_shares s
                 where s.learner_profile_id in (select l.id from learners l)
                    or s.grantee_user_id = v_case.requested_by
                 order by s.granted_at desc
                 limit 25) als
          left join public.learner_profiles ld on ld.id = als.learner_profile_id
          left join public.user_profiles gu on gu.user_id = als.grantee_user_id), '[]'::jsonb))
  )
  into v_result;

  return v_result;
end;
$$;

comment on function public.support_case_history(uuid) is
  'Staff-only. One snapshot of the history behind a support case: the requester, the learners the case is about, and the orders, subscriptions, entitlement grants, enrolments, publication events and progress shares that explain the state those rows are in now. Scoped to the learners and billing accounts the requester could see, not to what the member of staff reading it could see, because inside a definer function can_access_learner() answers for the caller. Every section reports its total beside a capped list, so a limit is never silent. Does not include access_checks: nothing has ever written a row to it, and an empty denial log would read as "no denial happened".';

revoke all on function public.support_case_history(uuid) from public;
revoke all on function public.support_case_history(uuid) from anon;
grant execute on function public.support_case_history(uuid) to authenticated;
