-- "Download my data."
--
-- The platform holds a person's name, their language and time zone, the learners they
-- are responsible for, what those learners have studied, what they finished, what they
-- paid for, and the notes they wrote while learning. Under the GDPR that is a portable
-- set — the right to receive it in a structured, commonly used format — and under COPPA
-- a parent has the same claim on their child's record.
--
-- Nothing here is a new source of authority. Every scope in this function is the same
-- scope the application already uses:
--
--   * a learner is exported when the account is linked to it or the caller is an active
--     family member who is not a billing-only member — `is_learner_family_member()`,
--     the predicate the family screens use, so paying for a family still does not hand
--     over its learning data;
--   * an order is exported when the caller is an active member of the billing account
--     that placed it;
--   * a note or a bookmark is exported only when the caller wrote it.
--
-- The function is `security definer`, which means it must not rely on row level security
-- to do any of that work: inside it, every query is unrestricted, so each `where` clause
-- below *is* the boundary. That is why they are written against `v_actor` rather than
-- against anything a caller could pass — there is no parameter at all.

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_out   jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to download your data'
      using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'formatVersion', 1,
    'generatedAt', now(),

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
        from public.learner_profiles lp
       where lp.linked_user_id = v_actor
          or public.is_learner_family_member(lp.id)), '[]'::jsonb),

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
        from public.orders o
       where exists (
         select 1 from public.billing_account_memberships bam
          where bam.billing_account_id = o.billing_account_id
            and bam.user_id = v_actor
            and bam.status = 'active')), '[]'::jsonb),

    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'lesson', l.title,
               'body', n.body,
               'createdAt', n.created_at,
               'updatedAt', n.updated_at)
             order by n.updated_at)
        from public.lesson_notes n
        join public.lessons l on l.id = n.lesson_id
       where n.user_id = v_actor), '[]'::jsonb),

    'bookmarks', coalesce((
      select jsonb_agg(jsonb_build_object(
               'lesson', l.title,
               'createdAt', b.created_at)
             order by b.created_at)
        from public.lesson_bookmarks b
        join public.lessons l on l.id = b.lesson_id
       where b.user_id = v_actor), '[]'::jsonb),

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
    )
  ) into v_out;

  return v_out;
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

comment on function public.export_my_data() is
  'Everything the caller may see about themselves, as one JSON document: account, learners and their study record, certificates, orders and refunds, notes, bookmarks and shares. Definer, so every where clause in it is the boundary; it takes no argument and cannot be pointed at anybody else.';
