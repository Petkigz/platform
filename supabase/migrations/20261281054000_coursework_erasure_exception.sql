-- Owner decision 2026-11-05: the 30-day child erasure rule is an exception to
-- ordinary coursework retention, unless a safeguarding hold prevents erasure.
-- A separate child login and held work still need individual review. A queued
-- storage object is not proof its bytes have been deleted.
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


create or replace function public.retire_coursework_file_on_detach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Detached is not the same as orphaned. A learner who takes a file back before
  -- handing it in — or a teacher removing one from a draft — still owns the
  -- upload, and it may be attached again; `may_watch_master()` gives the uploader
  -- their own file precisely so that a mistake is recoverable. Only when the
  -- submission itself has gone does the file lose the person it belongs to.
  if exists (select 1 from public.assignment_submissions s where s.id = old.submission_id) then
    return old;
  end if;

  -- The platform's own transition. The status guard exists to stop an uploader
  -- promoting their own file, and a SECURITY DEFINER function bypasses RLS but
  -- not triggers.
  perform set_config('app.media_status_transition', 'on', true);

  update public.media_assets
     set status = 'deleted',
         deleted_at = coalesce(deleted_at, now()),
         purge_due_at = case
           when exists (select 1 from public.coursework_retention_holds h
                         where h.asset_id = old.media_asset_id and h.closed_at is null)
             then null
           when current_setting('app.child_coursework_erasure', true) = 'on'
             then now()
           else coalesce(purge_due_at, now() + interval '30 days')
         end
   where id = old.media_asset_id
     and purpose = 'coursework'
     and deleted_at is null;

  return old;
end;
$$;


create or replace function public.purge_learner_record(p_learner_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_prior text := current_setting('app.child_coursework_erasure', true); v_result jsonb;
begin
  -- Hold writers lock the asset before creating the hold. Lock every attached
  -- asset in deterministic order and inspect holds afterwards, so a hold that
  -- commits while this operation waits is included in the recheck.
  perform ma.id from public.media_assets ma
    join public.assignment_submission_assets asa on asa.media_asset_id = ma.id
    join public.assignment_submissions s on s.id = asa.submission_id
   where s.learner_profile_id = p_learner_id order by ma.id for update of ma;
  if public.learner_has_held_coursework(p_learner_id) then
    return jsonb_build_object('erased', false, 'blockedByCourseworkHold', true);
  end if;
  -- The child record is now due for erasure. The detach trigger queues its
  -- coursework bytes immediately rather than adding another thirty days.
  perform set_config('app.child_coursework_erasure', 'on', true);
  v_result := public.purge_learner_record_internal(p_learner_id);
  perform set_config('app.child_coursework_erasure', coalesce(v_prior, ''), true);
  return v_result;
end;
$$;
revoke all on function public.purge_learner_record(uuid) from public, anon, authenticated;


-- A published policy must not promise that a storage object has been removed
-- merely because the database tombstoned it. Preserve the old version and issue
-- a dated correction following the owner's 30-day exception decision.
do $$
declare
  v_doc uuid; v_live public.policy_versions; v_body text; v_next integer;
  v_reason constant text := 'Owner instruction, 2026-11-05: the 30-day child erasure rule takes priority over the ordinary coursework year unless a safeguarding hold prevents erasure; describe manual storage deletion and linked child accounts accurately.';
  v_section constant text := $policy$## How long a child's learning record is kept

If a guardian closes the last active account in a family, an unlinked child
profile is normally marked for erasure. Its learning record, including coursework,
is scheduled for removal thirty days after closure. Some account data is removed
at closure. If the child has a separate login, or coursework is under a
safeguarding hold, self-service closure is paused for individual review; contact
privacy@ayahspring.com. Another active family member can leave the profile in the
family, but family membership alone does not establish verified guardianship.

Coursework is ordinarily kept for a year after the later of the class ending and
the hand-in. The thirty-day erasure rule is an exception: the child's coursework
is removed with their learning record when it becomes due, unless a safeguarding
hold prevents that removal. The platform's scheduled cleanup must run; it does not
promise a precise deletion time. The database makes detached coursework-purpose files unwatchable and queues their
storage objects for deletion. Older mixed-purpose files need separate review. A
separate storage step is needed, and the database cannot independently verify
that an object was removed.

An issued certificate keeps its number and snapshot so that it can still be
verified without the child's learning record. A safeguarding hold can defer the
record's removal and requires individual review; closing a case or a hold is not
proof that an object has been deleted.

$policy$;
begin
  select id into v_doc from public.policy_documents where slug = 'children';
  select * into v_live from public.policy_versions
   where document_id = v_doc and status = 'in_force' order by version_number desc limit 1;
  if v_live.id is null then raise exception 'children policy: no current version'; end if;
  if position('The thirty-day erasure rule is an exception' in v_live.body) > 0 then return; end if;
  v_body := regexp_replace(v_live.body, '## How long a child''s learning record is kept[^#]*', v_section);
  if v_body = v_live.body then raise exception 'children policy: retention section not found'; end if;
  v_body := replace(v_body,
    'whether to keep it. If they say no it is deleted within 30 days.',
    'whether to keep it. If they say no, removal is scheduled for thirty days after the request, subject to a safeguarding hold.');
  v_body := replace(v_body,
    'Not keeping it deletes it within 30 days — the thirty-day clock described above — and nothing is archived or quietly kept.',
    'Not keeping it starts the thirty-day removal clock; a safeguarding hold can defer removal and stored files need a separate deletion step.');
  if position('deletes it within 30 days' in v_body) > 0 or position('If they say no it is deleted within 30 days' in v_body) > 0 then
    raise exception 'children policy: outdated handover guarantee remains';
  end if;
  if public.policy_open_decisions(v_body) > 0 then raise exception 'children policy: unresolved decisions'; end if;
  v_next := v_live.version_number + 1;
  update public.policy_versions set status = 'retired' where id = v_live.id;
  insert into public.policy_versions
    (document_id, version_number, body, change_note, status, effective_at, approved_at, approved_by, approval_reason)
  values (v_doc, v_next, v_body, 'Clarifies the 30-day erasure exception, safeguarding holds and the separate storage deletion step.',
          'in_force', date '2026-11-05', now(), null, v_reason);
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'policy.published', 'policy_version', v_live.id,
          jsonb_build_object('slug', 'children', 'versionNumber', v_next, 'effectiveAt', '2026-11-05',
                             'reason', v_reason, 'replacesVersion', v_live.version_number,
                             'source', 'owner instruction of 2026-11-05'));
end $$;
