-- A case paused by the safeguarding owner keeps its existing content during
-- account closure. Deferred identity data is private and is removed on release.
-- The case and message rows remain governed by their existing support policies;
-- this does not make a case owner-only, undo earlier erasure, preserve external
-- copies or cover privileged/other deletion paths.
create table public.support_case_deferred_erasures (
  case_id uuid not null references public.support_cases(id) on delete restrict,
  actor_id uuid not null references public.user_profiles(user_id) on delete restrict,
  requester_name text,
  primary key(case_id,actor_id)
);
alter table public.support_case_deferred_erasures enable row level security;
revoke all on public.support_case_deferred_erasures from public,anon,authenticated;

create or replace function public.erase_my_account_before_revision_hold_guard(p_confirm text)
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
  v_identity    text;
  v_present     boolean := false;
begin
  if v_actor is null then
    raise exception 'sign in to close an account'
      using errcode = 'insufficient_privilege';
  end if;

  select display_name, account_status, deleted_at
    into v_name, v_status, v_deleted
    from public.user_profiles
   where user_id = v_actor
   for update;

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

  -- Lock the affected family and learner rows before deciding which child
  -- records would follow this account. Family-row locks also serialize inserts
  -- that reference those families; membership locks protect the last-adult test.
  perform f.id from public.families f
   where f.id = any(coalesce(v_family_ids, '{}'::uuid[])) for update;
  perform m.id from public.family_memberships m
   where m.family_id = any(coalesce(v_family_ids, '{}'::uuid[])) for update;
  perform lp.id from public.learner_profiles lp
   where lp.family_id = any(coalesce(v_family_ids, '{}'::uuid[])) for update;
  -- A hold writer takes this same asset lock. Check holds only after locking so
  -- an in-flight hold cannot be missed when closing a guardian account.
  perform ma.id from public.media_assets ma
    join public.assignment_submission_assets asa on asa.media_asset_id = ma.id
    join public.assignment_submissions sub on sub.id = asa.submission_id
    join public.learner_profiles lp on lp.id = sub.learner_profile_id
   where lp.family_id = any(coalesce(v_family_ids, '{}'::uuid[]))
   order by ma.id for update of ma;

  -- A separate child login must not be silently closed with a guardian account.
  -- An open hold also needs individual review before closure blanks child work.
  -- Otherwise the owner's 30-day erasure exception applies to the child's work.
  if exists (
    select 1 from public.learner_profiles lp
     where lp.deleted_at is null and lp.learner_type = 'child'
       and lp.family_id = any(coalesce(v_family_ids, '{}'::uuid[]))
       and not exists (
         select 1 from public.family_memberships m
          where m.family_id = lp.family_id and m.user_id <> v_actor and m.status = 'active'
       )
       and (
         (lp.linked_user_id is not null and lp.linked_user_id <> v_actor)
         or exists (
           select 1 from public.assignment_submissions s
           join public.assignment_submission_assets asa on asa.submission_id = s.id
           join public.coursework_retention_holds h on h.asset_id = asa.media_asset_id and h.closed_at is null
           where s.learner_profile_id = lp.id
         )
       )
  ) then
    raise exception 'this account is linked to a separate child login or held coursework that needs individual review; contact privacy@ayahspring.com to close your account'
      using errcode = 'check_violation';
  end if;

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

  -- A guardian's closure must not erase the child's words early. Only work on
  -- the closing account's own linked learner profile is blanked here; the
  -- child's submission and snapshots go with their record on the 30-day clock.
  update public.assignment_submissions
     set body_text = ''
   where learner_profile_id in (
     select id from public.learner_profiles where linked_user_id = v_actor
   )
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

  -- Lock every affected case before inspecting pauses. Reply/open writers lock
  -- the actor profile first; hold/release writers lock the case. Once the case
  -- locks are ours, later message inserts cannot race this decision.
  perform c.id from public.support_cases c
   where c.requested_by=v_actor or exists (
     select 1 from public.support_case_messages m where m.case_id=c.id and m.author_user_id=v_actor)
   order by c.id for update of c;

  insert into public.support_case_deferred_erasures(case_id,actor_id,requester_name)
    select c.id,v_actor,case when c.requested_by=v_actor then v_name else null end
      from public.support_cases c join public.support_case_cleanup_holds h on h.case_id=c.id
     where c.requested_by=v_actor or exists (
       select 1 from public.support_case_messages m where m.case_id=c.id and m.author_user_id=v_actor)
    on conflict(case_id,actor_id) do nothing;

  update public.support_cases c
     set subject = '[erased]', body = '[erased]'
   where c.requested_by = v_actor and not exists (
     select 1 from public.support_case_cleanup_holds h where h.case_id=c.id)
     and (subject <> '[erased]' or body <> '[erased]');

  delete from public.support_case_messages m where author_user_id = v_actor
    and not exists(select 1 from public.support_case_cleanup_holds h where h.case_id=m.case_id);

  update public.support_case_messages m
     set body = public.redact_name(m.body, v_name)
   where m.case_id in (select sc.id from public.support_cases sc where sc.requested_by = v_actor)
     and not exists(select 1 from public.support_case_cleanup_holds h where h.case_id=m.case_id)
     and public.redact_name(m.body, v_name) <> m.body;
  get diagnostics v_redacted = row_count;

  update public.support_cases c
     set resolution_note = public.redact_name(c.resolution_note, v_name)
   where c.requested_by = v_actor and c.resolution_note is not null
     and not exists(select 1 from public.support_case_cleanup_holds h where h.case_id=c.id)
     and public.redact_name(c.resolution_note, v_name) <> c.resolution_note;
  -- Preserve the existing result shape; count rows changed by the last update.
  get diagnostics v_open = row_count;
  v_redacted := v_redacted + v_open;

  -- The inbox belongs to the account. A closed account has nobody to read it,
  -- and a notification is the platform's words addressed to a person rather
  -- than a record the platform must keep.
  delete from public.notifications where user_id = v_actor;
  get diagnostics v_notifications = row_count;

  -- Mail is the other half of the same question. The copy the recipient holds
  -- is theirs; ours exists to deliver it, and it names the sender. The person's
  -- own address is read from the identity provider, because that is where it
  -- lives — this is the one place the database looks at it.
  select lower(coalesce(u.email, nullif(btrim(u.phone), ''))),
         true
    into v_email, v_present
    from auth.users u where u.id = v_actor;

  -- The fingerprint of the sign-in address, taken here because this is the last
  -- moment the platform can compute it: the row it comes from is the one staff
  -- delete next. A hash is not proof of deletion — somebody holding a candidate
  -- address can test it — but without one, "was my account erased?" has no
  -- honest answer at all, and support has to say "no account found", which is
  -- the same thing they say to somebody who never signed up.
  v_identity := public.identity_hash(v_email);

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

  -- The identity at the authentication provider is the one part of this the
  -- database cannot delete, and pretending otherwise was how a closed account
  -- kept a live sign-in. It is recorded here — with the date and a fingerprint of
  -- the address — so that staff have a queue rather than a paragraph, and so that
  -- the answer to "was I erased?" exists after the identity itself is gone.
  insert into public.erased_identities (user_id, address_hash, source)
  values (v_actor, v_identity, 'self_service')
  on conflict (user_id) do nothing;

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
    ),
    -- Named rather than left out. The one thing closing this account did not do
    -- is delete the sign-in itself, which lives with the provider; it is now on a
    -- list that staff work, and this is what the person is told.
    'identity', jsonb_build_object(
      'recorded', true,
      'stillAtProvider', v_present,
      'removedBy', 'staff'
    )
  );
end;
$$;

create or replace function public.change_support_case_cleanup_hold(p_case_id uuid,p_action text,p_reason text)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id(); v_deferred record;
begin
  perform public.lock_coursework_erasure_review_owner();
  if p_action not in ('hold','release') or p_action is null or length(trim(coalesce(p_reason,''))) not between 3 and 1000 then
    raise exception 'choose an action and give a reason' using errcode='check_violation'; end if;
  perform 1 from public.support_cases where id=p_case_id for update;
  if not found then raise exception 'support case not found' using errcode='no_data_found'; end if;
  if p_action='hold' then
    insert into public.support_case_cleanup_holds(case_id,opened_by,reason) values(p_case_id,v_actor,trim(p_reason)) on conflict do nothing;
  else
    -- If there is no hold, a duplicate release is a no-op and must not
    -- accidentally process anything. The case row is already locked.
    if not exists(select 1 from public.support_case_cleanup_holds where case_id=p_case_id) then return false; end if;
    for v_deferred in select * from public.support_case_deferred_erasures where case_id=p_case_id order by actor_id loop
      delete from public.support_case_messages where case_id=p_case_id and author_user_id=v_deferred.actor_id;
      if v_deferred.requester_name is not null then
        update public.support_cases set subject='[erased]',body='[erased]',
          resolution_note=public.redact_name(resolution_note,v_deferred.requester_name)
          where id=p_case_id;
        update public.support_case_messages set body=public.redact_name(body,v_deferred.requester_name)
          where case_id=p_case_id and public.redact_name(body,v_deferred.requester_name) <> body;
      end if;
    end loop;
    delete from public.support_case_deferred_erasures where case_id=p_case_id;
    delete from public.support_case_cleanup_holds where case_id=p_case_id;
  end if;
  if not found then return false; end if;
  insert into public.support_case_cleanup_hold_events(case_id,actor,action,reason)
    values(p_case_id,v_actor,case when p_action='hold' then 'held' else 'released' end,trim(p_reason));
  return true;
end;
$$;

-- Keep the post-closure export/tombstone feature. The original definer export
-- bypasses support RLS, so return its other sections but withhold support case
-- content from a closed session. Say explicitly that this section was omitted.
create or replace function public.export_my_data()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=public.current_user_id(); v_status text; v_deleted timestamptz; v_result jsonb;
begin
  if v_actor is null then return public.export_my_data_before_closed_boundary(); end if;
  select account_status,deleted_at into v_status,v_deleted from public.user_profiles where user_id=v_actor for update;
  if not found then raise exception 'support:account_closed_or_missing' using errcode='insufficient_privilege'; end if;
  v_result:=public.export_my_data_before_closed_boundary();
  if v_status='closed' or v_deleted is not null then
    v_result:=jsonb_set(v_result,'{support}','[]'::jsonb);
    v_result:=jsonb_set(v_result,'{notIncluded}',coalesce(v_result->'notIncluded','[]'::jsonb) ||
      jsonb_build_array(jsonb_build_object('what','Support cases after account closure',
        'why','Support case content is not available to a closed session; contact privacy@ayahspring.com about a data request.')));
    v_result:=jsonb_set(v_result,'{meta,note}',to_jsonb(
      'Support case content is omitted after account closure. ' ||
      case when v_result#>>'{meta,note}'='Every list is complete.' then 'Other returned lists are complete.'
           else coalesce(v_result#>>'{meta,note}','') end));
  end if;
  return v_result;
end;
$$;
