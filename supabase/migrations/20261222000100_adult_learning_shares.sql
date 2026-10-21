-- ---------------------------------------------------------------------------
-- An adult can share their learning, and the person they share with can see it
-- ---------------------------------------------------------------------------
-- `adult_learning_shares` was designed in the first week and never reached. Its
-- comment states the rule it exists for: "Adult learning is private by default,
-- including inside a family. A share must be explicit, scoped and revocable."
-- Every part of that was already in the schema — three scopes, an expiry that must
-- be in the future, a revocation timestamp the status is tied to by a CHECK, one
-- active share per person per scope, a trigger that refuses to share a child's
-- learning through this table or an adult's with their own account — and none of it
-- could happen, because nothing inserted a row.
--
-- The support console built in `20261219000100_support_case_history.sql` reads the
-- table and reports it, and says so honestly: empty means nobody has been given
-- sight of this adult's progress. That is a true answer about a feature that did
-- not exist.
--
-- Two things were missing, and the second matters more than the first. Nothing could
-- grant a share, and — because no predicate read the table either — a share would not
-- have granted anything. So this migration writes both ends: the adult's grant and
-- revocation, and the read that makes a grant mean something.
--
-- ---------------------------------------------------------------------------
-- Expiry is corrected when somebody looks
-- ---------------------------------------------------------------------------
-- `expires_at` is the fact; `status = 'expired'` is a bookkeeping copy of it. Nothing
-- in the schema flips one to the other, and there is no scheduler here to do it, so a
-- share that ran out would keep reading 'active' in the table while conferring
-- nothing — the worst kind of disagreement, because the row that a person reads says
-- access and the rule that decides access says otherwise.
--
-- Both readers below therefore correct what they see: any active share whose expiry
-- has passed becomes 'expired', audited, before anything is returned. It is a small
-- write inside a read, and it is deliberate — the alternative is a table that lies
-- until somebody runs a script. The correction never touches a revocation: 'revoked'
-- stays 'revoked' with its timestamp, because who ended it is part of the record.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. The predicate that makes a share mean something
-- ---------------------------------------------------------------------------
create or replace function public.may_read_shared_learning(
  p_learner_profile_id uuid,
  p_kind               text,
  p_viewer             uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer uuid := coalesce(p_viewer, public.current_user_id());
begin
  if v_viewer is null then
    return false;
  end if;

  -- 'progress' and 'achievements' are the two things a scope can cover. Asking about
  -- anything else is refused rather than treated as neither, so a caller cannot typo
  -- its way into a share it does not hold.
  if p_kind is null or p_kind not in ('progress', 'achievements') then
    return false;
  end if;

  return exists (
    select 1
      from public.adult_learning_shares als
     where als.learner_profile_id = p_learner_profile_id
       and als.grantee_user_id = v_viewer
       and als.status = 'active'
       and (als.expires_at is null or als.expires_at > now())
       and (als.scope = 'progress_and_achievements' or als.scope = p_kind)
  );
end;
$$;

revoke all on function public.may_read_shared_learning(uuid, text, uuid) from public;
revoke all on function public.may_read_shared_learning(uuid, text, uuid) from anon;
grant execute on function public.may_read_shared_learning(uuid, text, uuid) to authenticated;

comment on function public.may_read_shared_learning(uuid, text, uuid) is
  'Does this viewer hold a live share covering this kind of this adult''s learning? An expired share answers no whatever its status column says.';

-- ---------------------------------------------------------------------------
-- 2. Granting one
-- ---------------------------------------------------------------------------
create or replace function public.share_adult_learning(
  p_learner_profile_id uuid,
  p_grantee_user_id    uuid,
  p_scope              text,
  p_expires_at         timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_existing record;
  v_id       uuid;
begin
  if v_actor is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('family.adult_shares', false) then
    raise exception 'sharing an adult''s learning is not enabled on this platform'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_own_learner_profile(p_learner_profile_id) then
    raise exception 'only the learner whose progress this is may share it'
      using errcode = 'insufficient_privilege';
  end if;

  if p_scope is null or p_scope not in ('progress', 'achievements', 'progress_and_achievements') then
    raise exception 'a share covers progress, achievements or both; % is none of them',
      coalesce(p_scope, 'nothing')
      using errcode = 'check_violation';
  end if;

  if p_grantee_user_id is null then
    raise exception 'say whose account should see it' using errcode = 'check_violation';
  end if;

  if p_grantee_user_id = v_actor then
    raise exception 'your own account can already see your learning'
      using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.user_profiles up where up.user_id = p_grantee_user_id) then
    raise exception 'no account %', p_grantee_user_id using errcode = 'no_data_found';
  end if;

  -- als_expiry_in_future compares against granted_at, which is about to be now().
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'a share that has already ended is not a share'
      using errcode = 'check_violation';
  end if;

  select als.id, als.expires_at
    into v_existing
    from public.adult_learning_shares als
   where als.learner_profile_id = p_learner_profile_id
     and als.grantee_user_id = p_grantee_user_id
     and als.scope = p_scope
     and als.status = 'active';

  if found then
    return jsonb_build_object(
      'shareId', v_existing.id,
      'granted', false,
      'scope', p_scope,
      'status', 'active',
      'expiresAt', v_existing.expires_at,
      'note', 'this person can already see that; revoke it first to change the terms');
  end if;

  insert into public.adult_learning_shares
    (learner_profile_id, grantee_user_id, scope, expires_at)
  values
    (p_learner_profile_id, p_grantee_user_id, p_scope, p_expires_at)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.share_granted', 'adult_learning_share', v_id,
          jsonb_build_object('learner_profile_id', p_learner_profile_id,
                             'grantee_user_id', p_grantee_user_id,
                             'scope', p_scope,
                             'expires_at', p_expires_at));

  return jsonb_build_object(
    'shareId', v_id,
    'granted', true,
    'scope', p_scope,
    'status', 'active',
    'expiresAt', p_expires_at,
    'note', case when p_expires_at is null
                 then 'this runs until you revoke it'
                 else null end);
end;
$$;

revoke all on function public.share_adult_learning(uuid, uuid, text, timestamptz) from public;
revoke all on function public.share_adult_learning(uuid, uuid, text, timestamptz) from anon;
grant execute on function public.share_adult_learning(uuid, uuid, text, timestamptz) to authenticated;

comment on function public.share_adult_learning(uuid, uuid, text, timestamptz) is
  'The adult learner themself, and only while family.adult_shares is on. One active share per person per scope; changing the terms means revoking first, so the record of what was granted and when is never edited.';

-- ---------------------------------------------------------------------------
-- 2b. Naming the person, because a form cannot ask for a uuid
-- ---------------------------------------------------------------------------
-- `share_adult_learning()` takes an account id, which is right for a function and
-- useless for a person: nobody knows their friend's uuid. So the form asks for an
-- email address and this resolves it.
--
-- It discloses whether an account exists. That is not an oversight and it is not new
-- — `invite_family_member()` has answered "no such user" since the family tables were
-- built, and any flow that shares with a named person either discloses that or
-- silently does nothing, which is worse: a person who believes they shared something
-- and did not. What this does not disclose is anything beyond existence — no email
-- back, no learner, no progress — and it refuses an account that is suspended or
-- closed rather than resolving it, so a share cannot be aimed at an account that is
-- not there to receive one. Removing the disclosure means an invite flow with a token
-- and an expiry, which is a different feature; recorded in NEXT.md rather than
-- half-built here.
create or replace function public.resolve_share_grantee(
  p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user  record;
begin
  if v_actor is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('family.adult_shares', false) then
    raise exception 'sharing an adult''s learning is not enabled on this platform'
      using errcode = 'insufficient_privilege';
  end if;

  if v_email = '' or length(v_email) > 320
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'that is not an email address' using errcode = 'check_violation';
  end if;

  select u.id, up.display_name, up.account_status
    into v_user
    from auth.users u
    join public.user_profiles up on up.user_id = u.id
   where lower(u.email::text) = v_email
     and up.deleted_at is null;

  if not found then
    return jsonb_build_object('found', false,
      'note', 'no account has that email address');
  end if;

  if v_user.account_status <> 'active' then
    return jsonb_build_object('found', false,
      'note', 'that account is not active, so it cannot be shared with');
  end if;

  return jsonb_build_object('found', true,
    'userId', v_user.id,
    'displayName', v_user.display_name);
end;
$$;

revoke all on function public.resolve_share_grantee(text) from public;
revoke all on function public.resolve_share_grantee(text) from anon;
grant execute on function public.resolve_share_grantee(text) to authenticated;

comment on function public.resolve_share_grantee(text) is
  'Turns the email address a person types into the account a share is granted to. Discloses existence and nothing else; refuses a suspended or closed account.';

-- ---------------------------------------------------------------------------
-- 3. Taking it back
-- ---------------------------------------------------------------------------
create or replace function public.revoke_adult_learning_share(
  p_share_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_is_staff boolean;
  v_row      record;
begin
  if v_actor is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  v_is_staff := public.has_role(v_actor, 'governance_admin')
             or public.has_role(v_actor, 'platform_admin');

  select als.id, als.learner_profile_id, als.grantee_user_id, als.scope, als.status,
         als.granted_at, als.expires_at
    into v_row
    from public.adult_learning_shares als
   where als.id = p_share_id;

  if not found then
    raise exception 'no share %', p_share_id using errcode = 'no_data_found';
  end if;

  -- The policy says the adult who granted it, or an administrator. "Administrator"
  -- here is the governance pair rather than is_privileged(): a support agent should
  -- be able to read a case without being able to end somebody's privacy decision,
  -- and the person who granted it is the one whose decision this is.
  if not (v_is_staff or public.is_own_learner_profile(v_row.learner_profile_id)) then
    raise exception 'only the person who granted this share, or governance staff, may revoke it'
      using errcode = 'insufficient_privilege';
  end if;

  if v_row.status = 'revoked' then
    return jsonb_build_object(
      'shareId', v_row.id, 'status', 'revoked', 'changed', false,
      'note', 'this share was already revoked');
  end if;

  update public.adult_learning_shares
     set status = 'revoked', revoked_at = now()
   where id = p_share_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.share_revoked', 'adult_learning_share', p_share_id,
          jsonb_build_object('learner_profile_id', v_row.learner_profile_id,
                             'grantee_user_id', v_row.grantee_user_id,
                             'scope', v_row.scope,
                             'granted_at', v_row.granted_at,
                             'expires_at', v_row.expires_at,
                             'revoked_by_owner', not v_is_staff));

  return jsonb_build_object(
    'shareId', v_row.id, 'status', 'revoked', 'changed', true,
    'revokedAt', now());
end;
$$;

revoke all on function public.revoke_adult_learning_share(uuid) from public;
revoke all on function public.revoke_adult_learning_share(uuid) from anon;
grant execute on function public.revoke_adult_learning_share(uuid) to authenticated;

comment on function public.revoke_adult_learning_share(uuid) is
  'The adult who granted it, or governance staff. Revocation is a state, not a deletion: the row stays, with who granted it and when it ended.';

-- ---------------------------------------------------------------------------
-- 4. What the adult sees about their own sharing
-- ---------------------------------------------------------------------------
create or replace function public.my_learning_shares(
  p_learner_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_lapsed record;
  v_rows   jsonb := '[]'::jsonb;
  v_share  record;
begin
  if v_actor is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_own_learner_profile(p_learner_profile_id) then
    raise exception 'only the learner whose progress this is may list who can see it'
      using errcode = 'insufficient_privilege';
  end if;

  for v_lapsed in
    select als.id, als.grantee_user_id, als.scope, als.expires_at
      from public.adult_learning_shares als
     where als.learner_profile_id = p_learner_profile_id
       and als.status = 'active'
       and als.expires_at is not null
       and als.expires_at <= now()
  loop
    update public.adult_learning_shares set status = 'expired' where id = v_lapsed.id;
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'family.share_expired', 'adult_learning_share', v_lapsed.id,
            jsonb_build_object('learner_profile_id', p_learner_profile_id,
                               'grantee_user_id', v_lapsed.grantee_user_id,
                               'scope', v_lapsed.scope,
                               'expires_at', v_lapsed.expires_at));
  end loop;

  for v_share in
    select als.id, als.grantee_user_id, als.scope, als.status, als.granted_at,
           als.expires_at, als.revoked_at, up.display_name
      from public.adult_learning_shares als
      left join public.user_profiles up on up.user_id = als.grantee_user_id
     where als.learner_profile_id = p_learner_profile_id
     order by als.granted_at desc
  loop
    v_rows := v_rows || jsonb_build_object(
      'shareId', v_share.id,
      'granteeUserId', v_share.grantee_user_id,
      'granteeName', v_share.display_name,
      'scope', v_share.scope,
      'status', v_share.status,
      'grantedAt', v_share.granted_at,
      'expiresAt', v_share.expires_at,
      'revokedAt', v_share.revoked_at);
  end loop;

  return jsonb_build_object(
    'learnerProfileId', p_learner_profile_id,
    'generatedAt', now(),
    'shares', v_rows);
end;
$$;

revoke all on function public.my_learning_shares(uuid) from public;
revoke all on function public.my_learning_shares(uuid) from anon;
grant execute on function public.my_learning_shares(uuid) to authenticated;

comment on function public.my_learning_shares(uuid) is
  'The adult''s own list of who can see their learning, with lapsed shares corrected to expired on the way out.';

-- ---------------------------------------------------------------------------
-- 5. What the person shared with actually sees
-- ---------------------------------------------------------------------------
create or replace function public.shared_learning_overview(
  p_learner_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor        uuid := public.current_user_id();
  v_lapsed       record;
  v_sees_progress boolean;
  v_sees_awards   boolean;
  v_shares       jsonb := '[]'::jsonb;
  v_progress     jsonb := '[]'::jsonb;
  v_achievements jsonb := '[]'::jsonb;
  v_progress_total integer := 0;
  v_achievements_total integer := 0;
  v_learner      record;
  v_row          record;
begin
  if v_actor is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  for v_lapsed in
    select als.id, als.scope, als.expires_at
      from public.adult_learning_shares als
     where als.learner_profile_id = p_learner_profile_id
       and als.grantee_user_id = v_actor
       and als.status = 'active'
       and als.expires_at is not null
       and als.expires_at <= now()
  loop
    update public.adult_learning_shares set status = 'expired' where id = v_lapsed.id;
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'family.share_expired', 'adult_learning_share', v_lapsed.id,
            jsonb_build_object('learner_profile_id', p_learner_profile_id,
                               'grantee_user_id', v_actor,
                               'scope', v_lapsed.scope,
                               'expires_at', v_lapsed.expires_at));
  end loop;

  v_sees_progress := public.may_read_shared_learning(p_learner_profile_id, 'progress', v_actor);
  v_sees_awards   := public.may_read_shared_learning(p_learner_profile_id, 'achievements', v_actor);

  if not (v_sees_progress or v_sees_awards) then
    raise exception 'this person has not shared their learning with you'
      using errcode = 'insufficient_privilege';
  end if;

  select lp.id, lp.display_name, lp.linked_user_id
    into v_learner
    from public.learner_profiles lp
   where lp.id = p_learner_profile_id;

  if not found then
    raise exception 'no learner profile %', p_learner_profile_id
      using errcode = 'no_data_found';
  end if;

  -- Which grant is doing the work, and until when. A person reading somebody else's
  -- progress should be able to see the terms they are reading under.
  for v_row in
    select als.scope, als.granted_at, als.expires_at
      from public.adult_learning_shares als
     where als.learner_profile_id = p_learner_profile_id
       and als.grantee_user_id = v_actor
       and als.status = 'active'
       and (als.expires_at is null or als.expires_at > now())
     order by als.granted_at desc
  loop
    v_shares := v_shares || jsonb_build_object(
      'scope', v_row.scope, 'grantedAt', v_row.granted_at, 'expiresAt', v_row.expires_at);
  end loop;

  if v_sees_progress then
    select count(*) into v_progress_total
      from public.course_enrolments ce
     where ce.learner_profile_id = p_learner_profile_id;

    for v_row in
      select ce.id, c.title, c.slug, ce.status, ce.enrolled_at, ce.completed_at,
             (select count(*)::int from public.lesson_progress lp
               where lp.course_enrolment_id = ce.id and lp.status = 'completed') as lessons_completed,
             (select count(*)::int from public.lessons l
               join public.course_sections cs on cs.id = l.section_id
              where cs.course_version_id = ce.course_version_id) as lessons_total,
             (select max(lp.updated_at) from public.lesson_progress lp
               where lp.course_enrolment_id = ce.id) as last_activity_at
        from public.course_enrolments ce
        join public.courses c on c.id = ce.course_id
       where ce.learner_profile_id = p_learner_profile_id
       order by ce.enrolled_at desc
       limit 25
    loop
      v_progress := v_progress || jsonb_build_object(
        'enrolmentId', v_row.id,
        'courseTitle', v_row.title,
        'courseSlug', v_row.slug,
        'status', v_row.status,
        'enrolledAt', v_row.enrolled_at,
        'completedAt', v_row.completed_at,
        'lessonsCompleted', v_row.lessons_completed,
        'lessonsTotal', v_row.lessons_total,
        'lastActivityAt', v_row.last_activity_at);
    end loop;
  end if;

  if v_sees_awards then
    select count(*) into v_achievements_total
      from public.certificates ct
     where ct.learner_profile_id = p_learner_profile_id;

    for v_row in
      select ct.id, ct.certificate_number, ct.status, ct.issued_at, ct.revoked_at,
             c.title
        from public.certificates ct
        join public.course_enrolments ce on ce.id = ct.course_enrolment_id
        join public.courses c on c.id = ce.course_id
       where ct.learner_profile_id = p_learner_profile_id
       order by ct.issued_at desc
       limit 25
    loop
      v_achievements := v_achievements || jsonb_build_object(
        'certificateId', v_row.id,
        'certificateNumber', v_row.certificate_number,
        'courseTitle', v_row.title,
        'status', v_row.status,
        'issuedAt', v_row.issued_at,
        'revokedAt', v_row.revoked_at);
    end loop;
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'learner', jsonb_build_object('id', v_learner.id, 'displayName', v_learner.display_name),
    'seesProgress', v_sees_progress,
    'seesAchievements', v_sees_awards,
    'shares', v_shares,
    'progress', jsonb_build_object('total', v_progress_total, 'rows', v_progress),
    'achievements', jsonb_build_object('total', v_achievements_total, 'rows', v_achievements));
end;
$$;

revoke all on function public.shared_learning_overview(uuid) from public;
revoke all on function public.shared_learning_overview(uuid) from anon;
grant execute on function public.shared_learning_overview(uuid) to authenticated;

comment on function public.shared_learning_overview(uuid) is
  'What a person shared with may see: the enrolments and lesson counts, or the certificates, that the scope they hold covers. Refuses everybody else, corrects lapsed shares, and reports the terms the reader is reading under.';
