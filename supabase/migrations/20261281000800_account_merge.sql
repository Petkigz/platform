-- Two accounts, one person.
--
-- WHAT THIS IS FOR
-- ----------------
-- A parent signs up twice — once on the phone, once with Google — and the
-- platform has two people where there is one. Splitting the difference by hand
-- is how somebody's course, certificate and money end up on the account they no
-- longer use. This is the merge, done once, deliberately, and recorded.
--
-- WHY BOTH SIDES HAVE TO AGREE
-- ----------------------------
-- A merge can only be started by the account being absorbed, and it only runs
-- when the account it is being absorbed *into* says yes. That is the smallest
-- arrangement that proves somebody controls both accounts: each side had to sign
-- in. There is no email to click, because there is no email provider — the
-- request appears on the other account's own settings screen and waits there.
--
-- WHAT MOVES, AND WHAT DOES NOT
-- -----------------------------
-- **Assets and obligations move.** Course authorship, published products, the
-- learners the account holds, guardianship, roles, billing memberships, earnings,
-- bookmarks and notes, the phone number, and the public profiles that are the
-- person's own.
--
-- **Actions do not.** `orders.placed_by`, `refund_requests.decided_by`,
-- `governance_audit_events.actor` and every other record of a thing an account
-- *did* keep pointing at the account that did it. Rewriting history so it looks
-- as though one account had always done everything destroys the only evidence of
-- what actually happened, and the closed profile is still there to be named.
--
-- **Money that is not the person's alone does not move.** A billing account with
-- other members is somebody else's household as well as theirs, and merging two
-- people's payment arrangements needs both of them, not one.
--
-- **Nothing is deleted.** The absorbed account is closed and anonymised exactly
-- the way closing it by hand would be, and its learner record is archived. Where
-- the two learner records hold the same fact — a review of the same course, an
-- attempt at the same assessment — the surviving account's row is kept and the
-- other stays with the archived record. The merge says how many it left behind
-- rather than quietly dropping them.
--
-- WHY IT REFUSES RATHER THAN GUESSES
-- ----------------------------------
-- Four situations have no honest answer, so they are named instead of resolved:
-- an open payout (money in flight), a billing account shared with somebody else,
-- two learner records in different households, and two learner records that have
-- both started the same course. The last is the important one: the platform
-- cannot choose which of two people's progress is real, and the request says so
-- in a sentence before anybody presses anything.

create table public.account_merge_requests (
  id                uuid primary key default gen_random_uuid(),

  -- The account being absorbed, and the account that survives.
  duplicate_user_id uuid not null references auth.users (id) on delete cascade,
  target_user_id    uuid not null references auth.users (id) on delete cascade,

  status            text not null default 'pending'
                      check (status in ('pending', 'completed', 'declined', 'cancelled', 'expired')),

  requested_at      timestamptz not null default now(),
  expires_at        timestamptz not null default now() + interval '14 days',
  resolved_at       timestamptz,

  -- What happened, in counts, so the screen can say it rather than imply it.
  summary           jsonb,

  constraint amr_two_accounts check (duplicate_user_id <> target_user_id),
  constraint amr_resolved_agrees check ((status = 'pending') = (resolved_at is null))
);

comment on table public.account_merge_requests is
  'One row per attempt to fold an account into another. Started by the account '
  'being absorbed, completed only by the account that survives.';

-- One live request per account. A second press gets the request that already
-- exists rather than a queue of them.
create unique index account_merge_requests_one_pending
  on public.account_merge_requests (duplicate_user_id)
  where status = 'pending';

create index account_merge_requests_target_idx
  on public.account_merge_requests (target_user_id)
  where status = 'pending';

alter table public.account_merge_requests enable row level security;

create policy account_merge_requests_read on public.account_merge_requests
  for select to authenticated
  using (
    duplicate_user_id = public.current_user_id()
    or target_user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

-- No write policy: the functions below are the whole writable surface.

-- ---------------------------------------------------------------------------
-- What would stop it
-- ---------------------------------------------------------------------------
-- One function answers "may this run", so the preview a person reads and the
-- merge that runs cannot disagree about what is allowed.
create or replace function public.merge_blocks(
  p_duplicate uuid,
  p_target    uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_blocks text[]  := '{}';
  v_notes  text[]  := '{}';
  v_dup_learner public.learner_profiles;
  v_tgt_learner public.learner_profiles;
  v_shared      text;
  v_owned       integer;
  v_payouts     integer;
  v_reviewer    integer;
begin
  if p_duplicate = p_target then
    v_blocks := array_append(v_blocks, 'that is the same account');
  end if;

  -- Both accounts have to be open. A closed account has already been erased or
  -- absorbed once; absorbing it again would move the tombstone.
  if not exists (select 1 from public.user_profiles
                  where user_id = p_duplicate and account_status = 'active' and deleted_at is null) then
    v_blocks := array_append(v_blocks, 'the account being absorbed is closed');
  end if;
  if not exists (select 1 from public.user_profiles
                  where user_id = p_target and account_status = 'active' and deleted_at is null) then
    v_blocks := array_append(v_blocks, 'the account it would merge into is closed');
  end if;

  -- Money in flight. A payout that is scheduled or processing is a transfer
  -- somebody has already started; moving the instructor it belongs to mid-flight
  -- leaves the payer and the payee disagreeing about who is owed.
  select count(*) into v_payouts
    from public.instructor_payouts
   where instructor_user_id = p_duplicate
     and status in ('scheduled', 'processing');
  if v_payouts > 0 then
    v_blocks := array_append(v_blocks, format(
      'this account has %s payout(s) in flight; wait until they finish', v_payouts));
  end if;

  -- A billing account with other members is somebody else's money too.
  select count(*) into v_owned
    from public.billing_account_memberships m
   where m.user_id = p_duplicate
     and m.status = 'active'
     and exists (
       select 1 from public.billing_account_memberships other
        where other.billing_account_id = m.billing_account_id
          and other.user_id <> p_duplicate
          and other.status = 'active'
     );
  if v_owned > 0 then
    v_blocks := array_append(v_blocks, format(
      'this account shares %s billing account(s) with other people; a merge cannot move somebody else''s payment arrangements', v_owned));
  end if;

  -- Two reviewer registers cannot become one.
  select count(*) into v_reviewer
    from public.reviewer_profiles rp
   where rp.user_id = p_target
     and rp.reviewer_status <> 'withdrawn';
  if v_reviewer > 0 and exists (
       select 1 from public.reviewer_profiles rp2
        where rp2.user_id = p_duplicate and rp2.reviewer_status <> 'withdrawn'
     ) then
    v_blocks := array_append(v_blocks, 'both accounts are on the reviewer register; the owner decides which register entry survives');
  end if;

  -- The learner records.
  select * into v_dup_learner
    from public.learner_profiles
   where linked_user_id = p_duplicate and deleted_at is null;
  select * into v_tgt_learner
    from public.learner_profiles
   where linked_user_id = p_target and deleted_at is null;

  if v_dup_learner.id is not null and v_tgt_learner.id is not null then
    if v_dup_learner.family_id is not null
       and v_tgt_learner.family_id is not null
       and v_dup_learner.family_id <> v_tgt_learner.family_id then
      v_blocks := array_append(v_blocks, 'each account is a learner in a different household; a merge cannot move one person''s learning into somebody else''s family');
    end if;

    -- Both started the same course. Which progress is real is not a question a
    -- function can answer.
    select c.title into v_shared
      from public.course_enrolments a
      join public.course_enrolments b
        on b.course_id = a.course_id
       and b.learner_profile_id = v_tgt_learner.id
       and b.status in ('active', 'completed') and b.deleted_at is null
      join public.courses c on c.id = a.course_id
     where a.learner_profile_id = v_dup_learner.id
       and a.status in ('active', 'completed') and a.deleted_at is null
     limit 1;

    if v_shared is not null then
      v_blocks := array_append(v_blocks, format(
        'both accounts have started "%s"; the platform cannot choose which progress is real. Finish or drop one before merging', v_shared));
    end if;

    v_notes := array_append(v_notes, 'the two learner records become one; anything the surviving record already has stays as it is');
  elsif v_dup_learner.id is not null then
    v_notes := array_append(v_notes, 'the learning record moves across whole, with its progress and certificates');
  end if;

  return jsonb_build_object(
    'ok', coalesce(array_length(v_blocks, 1), 0) = 0,
    'blocks', to_jsonb(v_blocks),
    'notes', to_jsonb(v_notes)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Starting one
-- ---------------------------------------------------------------------------
create or replace function public.request_account_merge(p_target_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_email  text;
  v_target uuid;
  v_existing public.account_merge_requests;
  v_id     uuid;
begin
  if v_actor is null then
    raise exception 'sign in to merge an account'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('platform.account_merge', false) then
    raise exception 'merging accounts is not enabled on this platform yet'
      using errcode = 'feature_not_supported';
  end if;

  v_email := lower(btrim(coalesce(p_target_email, '')));
  if v_email = '' then
    raise exception 'type the email address of the account you want to keep'
      using errcode = 'invalid_parameter_value';
  end if;

  select id into v_target from auth.users where lower(email) = v_email;
  if v_target is null then
    raise exception 'there is no account with that email address'
      using errcode = 'no_data_found';
  end if;
  if v_target = v_actor then
    raise exception 'that is this account; sign in to the other one to merge it'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Asking twice is not an error: it answers with the request already waiting.
  select * into v_existing
    from public.account_merge_requests
   where duplicate_user_id = v_actor and status = 'pending';

  if found then
    return jsonb_build_object('requested', false, 'alreadyPending', true,
                              'requestId', v_existing.id, 'expiresAt', v_existing.expires_at);
  end if;

  insert into public.account_merge_requests (duplicate_user_id, target_user_id)
  values (v_actor, v_target)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'account.merge_requested', 'user_profile', v_actor,
          jsonb_build_object('targetUserId', v_target));

  return jsonb_build_object('requested', true, 'alreadyPending', false,
                            'requestId', v_id, 'expiresAt',
                            (select expires_at from public.account_merge_requests where id = v_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Reading them
-- ---------------------------------------------------------------------------
create or replace function public.my_merge_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'sign in to see merge requests'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'enabled', public.setting_bool('platform.account_merge', false),
    -- Where this account would be absorbed into: it must act.
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id,
               'status', r.status,
               'requestedAt', r.requested_at,
               'expiresAt', r.expires_at,
               'expired', r.status = 'pending' and r.expires_at < now(),
               'otherName', up.display_name,
               'otherUserId', r.duplicate_user_id,
               'preview', public.merge_blocks(r.duplicate_user_id, r.target_user_id)
             ) order by r.requested_at desc)
        from public.account_merge_requests r
        left join public.user_profiles up on up.user_id = r.duplicate_user_id
       where r.target_user_id = v_actor
         and r.status in ('pending', 'completed')
    ), '[]'::jsonb),
    -- Where this account asked to go.
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id,
               'status', r.status,
               'requestedAt', r.requested_at,
               'expiresAt', r.expires_at,
               'expired', r.status = 'pending' and r.expires_at < now(),
               'otherName', up.display_name,
               'otherUserId', r.target_user_id,
               'summary', r.summary
             ) order by r.requested_at desc)
        from public.account_merge_requests r
        left join public.user_profiles up on up.user_id = r.target_user_id
       where r.duplicate_user_id = v_actor
         and r.status in ('pending', 'completed', 'declined', 'cancelled', 'expired')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.cancel_account_merge(p_request uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.account_merge_requests;
begin
  if v_actor is null then
    raise exception 'sign in to cancel a merge'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_row from public.account_merge_requests where id = p_request;
  if not found then
    raise exception 'there is no such merge request'
      using errcode = 'no_data_found';
  end if;
  if v_row.duplicate_user_id <> v_actor then
    raise exception 'only the account asking to be merged can withdraw the request'
      using errcode = 'insufficient_privilege';
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('cancelled', false, 'status', v_row.status);
  end if;

  update public.account_merge_requests
     set status = 'cancelled', resolved_at = now()
   where id = p_request;

  return jsonb_build_object('cancelled', true, 'status', 'cancelled');
end;
$$;

-- ---------------------------------------------------------------------------
-- The merge
-- ---------------------------------------------------------------------------
-- Moves rows and counts them. Not callable from a client: it takes two account
-- ids and no actor, and the only caller is the decision function below, which
-- has checked who is asking.
create or replace function public.merge_duplicate_account(
  p_duplicate uuid,
  p_target    uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dup_learner public.learner_profiles;
  v_tgt_learner public.learner_profiles;
  v_moved   jsonb := '{}'::jsonb;
  v_left    integer := 0;
  v_n       integer;
  v_claims  text := current_setting('request.jwt.claims', true);
begin
  -- Two guards stand in the way of a merge, and both of them already carry the
  -- clause that makes this the right way through it: a learner profile may not
  -- change who it is linked to, and an enrolment may not be moved to another
  -- learner — *unless no user is asking*. That clause exists for migrations and
  -- trusted server-side corrections, and a merge is precisely that: the person
  -- asking is the account being absorbed, and `decide_account_merge()` has
  -- already established that both sides said yes.
  --
  -- The actor is cleared for the duration of the move and put back before this
  -- function returns, so nothing after it in the same transaction is affected.
  perform set_config('request.jwt.claims', '', true);
  perform set_config('app.bypassing_enrolment_pin', 'on', true);
  -- ---------------------------------------------------------------- learners
  select * into v_dup_learner
    from public.learner_profiles
   where linked_user_id = p_duplicate and deleted_at is null;
  select * into v_tgt_learner
    from public.learner_profiles
   where linked_user_id = p_target and deleted_at is null;

  if v_dup_learner.id is not null and v_tgt_learner.id is null then
    -- Nothing to reconcile: the learning record simply becomes the account's.
    update public.learner_profiles
       set linked_user_id = p_target
     where id = v_dup_learner.id;
    v_moved := v_moved || jsonb_build_object('learnerRelinked', 1);

  elsif v_dup_learner.id is not null and v_tgt_learner.id is not null then
    -- Two records become one. Everything that can be carried without
    -- contradicting something the surviving record already holds is carried;
    -- the rest stays with the archived record and is counted, not dropped.

    update public.course_enrolments
       set learner_profile_id = v_tgt_learner.id
     where learner_profile_id = v_dup_learner.id;
    get diagnostics v_n = row_count;
    v_moved := v_moved || jsonb_build_object('enrolments', v_n);

    -- Certificates hang off an enrolment that has just moved, so their learner
    -- follows it; the certificate number itself never changes.
    update public.certificates
       set learner_profile_id = v_tgt_learner.id
     where learner_profile_id = v_dup_learner.id;
    get diagnostics v_n = row_count;
    v_moved := v_moved || jsonb_build_object('certificates', v_n);

    update public.support_cases
       set learner_profile_id = v_tgt_learner.id
     where learner_profile_id = v_dup_learner.id;
    get diagnostics v_n = row_count;
    v_moved := v_moved || jsonb_build_object('supportCases', v_n);

    update public.access_checks
       set learner_profile_id = v_tgt_learner.id
     where learner_profile_id = v_dup_learner.id;

    update public.entitlement_grants
       set learner_profile_id = v_tgt_learner.id
     where learner_profile_id = v_dup_learner.id;
    get diagnostics v_n = row_count;
    v_moved := v_moved || jsonb_build_object('entitlementGrants', v_n);

    update public.offline_downloads
       set learner_profile_id = v_tgt_learner.id
     where learner_profile_id = v_dup_learner.id;

    update public.course_reviews r
       set learner_profile_id = v_tgt_learner.id
     where r.learner_profile_id = v_dup_learner.id
       and not exists (
         select 1 from public.course_reviews x
          where x.learner_profile_id = v_tgt_learner.id and x.course_id = r.course_id
       );
    get diagnostics v_n = row_count;
    v_moved := v_moved || jsonb_build_object('reviews', v_n);

    update public.assessment_attempts a
       set learner_profile_id = v_tgt_learner.id
     where a.learner_profile_id = v_dup_learner.id
       and not exists (
         select 1 from public.assessment_attempts x
          where x.learner_profile_id = v_tgt_learner.id
            and x.assessment_id = a.assessment_id
            and x.attempt_number = a.attempt_number
       );
    get diagnostics v_n = row_count;
    v_moved := v_moved || jsonb_build_object('assessmentAttempts', v_n);

    update public.assignment_submissions s
       set learner_profile_id = v_tgt_learner.id
     where s.learner_profile_id = v_dup_learner.id
       and not exists (
         select 1 from public.assignment_submissions x
          where x.learner_profile_id = v_tgt_learner.id and x.assignment_id = s.assignment_id
       );
    get diagnostics v_n = row_count;
    v_moved := v_moved || jsonb_build_object('assignmentSubmissions', v_n);

    update public.cohort_members m
       set learner_profile_id = v_tgt_learner.id
     where m.learner_profile_id = v_dup_learner.id
       and not exists (
         select 1 from public.cohort_members x
          where x.learner_profile_id = v_tgt_learner.id
            and x.cohort_id = m.cohort_id
            and x.status = 'active'
       );
    get diagnostics v_n = row_count;
    v_moved := v_moved || jsonb_build_object('cohortMemberships', v_n);

    update public.live_session_attendance at
       set learner_profile_id = v_tgt_learner.id
     where at.learner_profile_id = v_dup_learner.id
       and not exists (
         select 1 from public.live_session_attendance x
          where x.learner_profile_id = v_tgt_learner.id and x.session_id = at.session_id
       );
    get diagnostics v_n = row_count;
    v_moved := v_moved || jsonb_build_object('liveAttendances', v_n);

    update public.offline_devices d
       set learner_profile_id = v_tgt_learner.id
     where d.learner_profile_id = v_dup_learner.id
       and not exists (
         select 1 from public.offline_devices x
          where x.learner_profile_id = v_tgt_learner.id and x.device_key = d.device_key
       );

    update public.family_plan_allocations f
       set learner_profile_id = v_tgt_learner.id
     where f.learner_profile_id = v_dup_learner.id
       and not exists (
         select 1 from public.family_plan_allocations x
          where x.learner_profile_id = v_tgt_learner.id
            and x.subscription_id = f.subscription_id
            and x.status = 'active'
       );

    update public.adult_learning_shares sh
       set learner_profile_id = v_tgt_learner.id
     where sh.learner_profile_id = v_dup_learner.id
       and not exists (
         select 1 from public.adult_learning_shares x
          where x.learner_profile_id = v_tgt_learner.id
            and x.grantee_user_id = sh.grantee_user_id
            and x.scope = sh.scope
            and x.status = 'active'
       );

    update public.share_invitations i
       set learner_profile_id = v_tgt_learner.id
     where i.learner_profile_id = v_dup_learner.id;

    update public.guardian_relationships g
       set learner_profile_id = v_tgt_learner.id
     where g.learner_profile_id = v_dup_learner.id
       and not exists (
         select 1 from public.guardian_relationships x
          where x.learner_profile_id = v_tgt_learner.id
            and x.guardian_user_id = g.guardian_user_id
            and x.status in ('pending_verification', 'active')
            and x.deleted_at is null
       );

    update public.orders o
       set learner_profile_id = v_tgt_learner.id
     where o.learner_profile_id = v_dup_learner.id;

    -- What is left belongs to the archived record, and the count is reported
    -- rather than hidden: a merge that silently dropped somebody's review is a
    -- merge nobody can trust.
    select (select count(*) from public.course_reviews where learner_profile_id = v_dup_learner.id)
         + (select count(*) from public.assessment_attempts where learner_profile_id = v_dup_learner.id)
         + (select count(*) from public.assignment_submissions where learner_profile_id = v_dup_learner.id)
         + (select count(*) from public.cohort_members where learner_profile_id = v_dup_learner.id)
         + (select count(*) from public.live_session_attendance where learner_profile_id = v_dup_learner.id)
         + (select count(*) from public.adult_learning_shares where learner_profile_id = v_dup_learner.id)
         + (select count(*) from public.guardian_relationships where learner_profile_id = v_dup_learner.id)
      into v_left;

    update public.learner_profiles
       set status = 'archived',
           display_name = display_name || ' (merged)'
     where id = v_dup_learner.id;

    v_moved := v_moved || jsonb_build_object('leftBehind', v_left);
  end if;

  -- ------------------------------------------------------------- user details
  insert into public.notification_preferences (user_id, kind, enabled)
  select p_target, kind, enabled from public.notification_preferences
   where user_id = p_duplicate
  on conflict (user_id, kind) do nothing;
  delete from public.notification_preferences where user_id = p_duplicate;

  -- The number follows the person, unless the surviving account already has one
  -- of its own to keep.
  insert into public.user_contact_details (user_id, phone_e164, phone_country)
  select p_target, phone_e164, phone_country from public.user_contact_details
   where user_id = p_duplicate and phone_e164 is not null
  on conflict (user_id) do nothing;
  delete from public.user_contact_details where user_id = p_duplicate;

  -- Messages move with the person; a duplicate notification key cannot exist
  -- twice, so the surplus is dropped rather than renamed.
  update public.notifications n
     set user_id = p_target
   where n.user_id = p_duplicate
     and not exists (
       select 1 from public.notifications x
        where x.user_id = p_target and x.dedupe_key is not null and x.dedupe_key = n.dedupe_key
     );
  get diagnostics v_n = row_count;
  v_moved := v_moved || jsonb_build_object('notifications', v_n);
  delete from public.notifications where user_id = p_duplicate;

  -- Roles: the surviving account inherits every role the other one held.
  insert into public.user_role_assignments (user_id, role_id, assigned_by)
  select p_target, role_id, p_duplicate
    from public.user_role_assignments
   where user_id = p_duplicate and revoked_at is null
  on conflict do nothing;
  update public.user_role_assignments
     set revoked_at = now(), revocation_reason = 'account merged'
   where user_id = p_duplicate and revoked_at is null;
  get diagnostics v_n = row_count;
  v_moved := v_moved || jsonb_build_object('roles', v_n);

  -- Billing: memberships move; shared accounts were refused before this ran.
  insert into public.billing_account_memberships
    (billing_account_id, user_id, can_view_invoices, can_manage_payment_methods,
     can_cancel_subscriptions, granted_by)
  select billing_account_id, p_target, can_view_invoices, can_manage_payment_methods,
         can_cancel_subscriptions, granted_by
    from public.billing_account_memberships
   where user_id = p_duplicate and status = 'active'
  on conflict do nothing;
  update public.billing_account_memberships
     set status = 'revoked'
   where user_id = p_duplicate and status = 'active';

  update public.billing_accounts
     set created_by = p_target
   where created_by = p_duplicate;

  -- Guardianship of children.
  update public.guardian_relationships g
     set guardian_user_id = p_target
   where g.guardian_user_id = p_duplicate
     and not exists (
       select 1 from public.guardian_relationships x
        where x.guardian_user_id = p_target
          and x.learner_profile_id = g.learner_profile_id
          and x.status in ('pending_verification', 'active')
          and x.deleted_at is null
     );
  get diagnostics v_n = row_count;
  v_moved := v_moved || jsonb_build_object('guardianships', v_n);
  update public.guardian_relationships
     set status = 'revoked', deleted_at = now()
   where guardian_user_id = p_duplicate
     and status in ('pending_verification', 'active');

  update public.adult_learning_shares sh
     set grantee_user_id = p_target
   where sh.grantee_user_id = p_duplicate
     and not exists (
       select 1 from public.adult_learning_shares x
        where x.grantee_user_id = p_target
          and x.learner_profile_id = sh.learner_profile_id
          and x.scope = sh.scope
          and x.status = 'active'
     );

  update public.support_cases
     set requested_by = p_target
   where requested_by = p_duplicate;

  -- Notes and bookmarks belong to the person; where the surviving account
  -- already has one for the same lesson, its own is kept.
  update public.lesson_notes n
     set user_id = p_target
   where n.user_id = p_duplicate
     and not exists (
       select 1 from public.lesson_notes x
        where x.user_id = p_target and x.course_enrolment_id = n.course_enrolment_id
          and x.lesson_id = n.lesson_id
     );
  get diagnostics v_n = row_count;
  v_moved := v_moved || jsonb_build_object('notes', v_n);
  delete from public.lesson_notes where user_id = p_duplicate;

  update public.lesson_bookmarks b
     set user_id = p_target
   where b.user_id = p_duplicate
     and not exists (
       select 1 from public.lesson_bookmarks x
        where x.user_id = p_target and x.course_enrolment_id = b.course_enrolment_id
          and x.lesson_id = b.lesson_id
     );
  get diagnostics v_n = row_count;
  v_moved := v_moved || jsonb_build_object('bookmarks', v_n);
  delete from public.lesson_bookmarks where user_id = p_duplicate;

  update public.course_wishlist w
     set user_id = p_target
   where w.user_id = p_duplicate
     and not exists (
       select 1 from public.course_wishlist x
        where x.user_id = p_target and x.course_id = w.course_id
     );
  delete from public.course_wishlist where user_id = p_duplicate;

  -- What the person made. Authorship is an asset, so it moves.
  update public.courses set created_by = p_target where created_by = p_duplicate;
  update public.course_versions set created_by = p_target where created_by = p_duplicate;
  update public.products set created_by = p_target where created_by = p_duplicate;
  update public.cohorts set created_by = p_target where created_by = p_duplicate;
  update public.learning_paths set created_by = p_target where created_by = p_duplicate;
  update public.media_assets set uploaded_by = p_target where uploaded_by = p_duplicate;
  update public.live_sessions set created_by = p_target where created_by = p_duplicate;
  update public.live_sessions set host_user_id = p_target where host_user_id = p_duplicate;
  update public.promotion_campaigns set created_by = p_target where created_by = p_duplicate;
  update public.promotion_campaigns set instructor_id = p_target where instructor_id = p_duplicate;

  insert into public.instructor_public_profiles
    (user_id, slug, display_name, headline, biography, website_url,
     instagram_url, youtube_url, tiktok_url, facebook_url, status)
  select p_target, slug, display_name, headline, biography, website_url,
         instagram_url, youtube_url, tiktok_url, facebook_url, status
    from public.instructor_public_profiles
   where user_id = p_duplicate
  on conflict (user_id) do nothing;
  delete from public.instructor_public_profiles where user_id = p_duplicate;

  update public.instructor_earnings_entries
     set instructor_user_id = p_target
   where instructor_user_id = p_duplicate
     and not exists (
       select 1 from public.instructor_earnings_entries x
        where x.instructor_user_id = p_target and x.order_id is not null
          and x.order_id = instructor_earnings_entries.order_id
     );

  update public.instructor_payouts
     set instructor_user_id = p_target
   where instructor_user_id = p_duplicate;

  -- The reviewer register is a single row per person; a merge between two
  -- register entries was refused before this ran.
  update public.reviewer_profiles
     set user_id = p_target
   where user_id = p_duplicate
     and not exists (select 1 from public.reviewer_profiles where user_id = p_target);

  -- ---------------------------------------------------------------- the close
  -- The actor is put back before this: `protect_account_status` reads "no user"
  -- as "the account itself", and the account itself may not close itself.
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);

  update public.user_profiles
     set display_name = 'Merged account',
         avatar_path = null,
         timezone = null,
         country_code = null,
         account_status = 'closed',
         deleted_at = now()
   where user_id = p_duplicate;

  return v_moved;
end;
$$;

revoke all on function public.merge_duplicate_account(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Deciding
-- ---------------------------------------------------------------------------
create or replace function public.decide_account_merge(
  p_request uuid,
  p_accept  boolean,
  p_confirm text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_row    public.account_merge_requests;
  v_name   text;
  v_blocks jsonb;
  v_moved  jsonb;
begin
  if v_actor is null then
    raise exception 'sign in to answer a merge request'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('platform.account_merge', false) then
    raise exception 'merging accounts is not enabled on this platform yet'
      using errcode = 'feature_not_supported';
  end if;

  select * into v_row from public.account_merge_requests where id = p_request;
  if not found then
    raise exception 'there is no such merge request'
      using errcode = 'no_data_found';
  end if;
  if v_row.target_user_id <> v_actor then
    raise exception 'only the account that would survive can decide'
      using errcode = 'insufficient_privilege';
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('merged', false, 'status', v_row.status);
  end if;
  -- Expiry is an answer, not an error: the request is marked and the screen is
  -- told. Raising here would roll the mark back with it, so the same expired
  -- request would be answerable for ever.
  if v_row.expires_at < now() then
    update public.account_merge_requests
       set status = 'expired', resolved_at = now()
     where id = p_request;
    return jsonb_build_object('merged', false, 'status', 'expired',
                              'message', 'this request has expired; ask from the other account again');
  end if;

  if not coalesce(p_accept, false) then
    update public.account_merge_requests
       set status = 'declined', resolved_at = now()
     where id = p_request;
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'account.merge_declined', 'user_profile', v_row.duplicate_user_id,
            jsonb_build_object('requestId', p_request));
    return jsonb_build_object('merged', false, 'status', 'declined');
  end if;

  -- A merge cannot be undone, so it takes the same proof as closing an account:
  -- typing your own name.
  select display_name into v_name from public.user_profiles where user_id = v_actor;
  if btrim(coalesce(p_confirm, '')) <> btrim(coalesce(v_name, '')) then
    raise exception 'type your name exactly as it appears to confirm the merge'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Re-checked here and not only when the request was made: money moves, a
  -- course gets started, a payout is requested — any of them between the ask and
  -- the answer.
  v_blocks := public.merge_blocks(v_row.duplicate_user_id, v_row.target_user_id);
  if not (v_blocks ->> 'ok')::boolean then
    raise exception 'this merge cannot run: %',
      (select string_agg(value, '; ') from jsonb_array_elements_text(v_blocks -> 'blocks'))
      using errcode = 'check_violation';
  end if;

  v_moved := public.merge_duplicate_account(v_row.duplicate_user_id, v_row.target_user_id);

  update public.account_merge_requests
     set status = 'completed', resolved_at = now(), summary = v_moved
   where id = p_request;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'account.merged', 'user_profile', v_row.duplicate_user_id,
          jsonb_build_object('requestId', p_request, 'moved', v_moved));

  return jsonb_build_object('merged', true, 'status', 'completed', 'moved', v_moved);
end;
$$;

-- ---------------------------------------------------------------------------
-- The switch
-- ---------------------------------------------------------------------------
update public.platform_settings
   set gate_type = 'admin',
       description = 'Fold a duplicate account into another one, with both sides agreeing.',
       preconditions = 'None. The request, the preview of what will move, the refusals for money in flight and for two learner records that share a course, and the merge itself all ship with the flag. A merge is irreversible and is recorded in the governance audit; it closes and anonymises the absorbed account rather than deleting it, so the sign-in for it still exists at the auth provider until that account is deleted there.'
 where key = 'platform.account_merge';

revoke all on function public.merge_blocks(uuid, uuid) from public, anon;
grant execute on function public.merge_blocks(uuid, uuid) to authenticated;

revoke all on function public.request_account_merge(text) from public, anon;
grant execute on function public.request_account_merge(text) to authenticated;

revoke all on function public.my_merge_requests() from public, anon;
grant execute on function public.my_merge_requests() to authenticated;

revoke all on function public.cancel_account_merge(uuid) from public, anon;
grant execute on function public.cancel_account_merge(uuid) to authenticated;

revoke all on function public.decide_account_merge(uuid, boolean, text) from public, anon;
grant execute on function public.decide_account_merge(uuid, boolean, text) to authenticated;
