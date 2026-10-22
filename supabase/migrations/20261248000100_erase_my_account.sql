-- Closing an account: what a person wrote is deleted, what the platform recorded
-- about a transaction is kept without a name.
--
-- Decided 2026-10-22, and it settles the question the export deliberately left
-- open. D7 in `user_profiles.deleted_at` already said the shape: "Financial,
-- governance and certificate history is never deleted — personal fields are
-- anonymised instead." This migration turns that sentence into one function a
-- person can run on their own account.
--
-- The rule, in one line:
--
--   what the person wrote is deleted;
--   what the platform recorded is kept, and de-identified.
--
-- Deleted: lesson notes, bookmarks, saved courses and their notes, reviews,
-- discussion posts (the words, not the thread), the body of an assignment
-- submission, support messages they wrote, sharing grants, invitations carrying
-- their address, and guardian relationships naming them.
--
-- Kept and de-identified: orders, payments, refunds, ledger entries, audit
-- events, enrolments, progress, and certificates. A certificate keeps its
-- number and its course snapshot because it is a claim a third party may still
-- be relying on; the holder's name becomes "Deleted learner".
--
-- Kept untouched: nothing that names the person. There is no email on
-- `user_profiles` — the sign-in address lives with the auth provider, and
-- deleting the identity there would cascade into the ledger through
-- `user_profiles.user_id`. That step is staff work through the provider, and it
-- is named in NEXT.md rather than pretended away here.
--
-- Why not a real delete: an order that loses its payer cannot be refunded, a
-- certificate that vanishes cannot be verified, and a ledger with holes in it is
-- not a ledger. Erasure in this schema means the person becomes unreachable as a
-- person while the money stays auditable.
--
-- Why the confirmation is the display name: it is the one string a person has
-- chosen, it is shown on the page above the field they type into, and it cannot
-- be produced by a mis-click or a replayed request. A closed account cannot be
-- reopened by the person either — `protect_account_status` still refuses that.

-- ---------------------------------------------------------------------------
-- the two guards that must let the erasure through, and nothing else
-- ---------------------------------------------------------------------------

-- `protect_account_status` exists so a suspended person cannot reopen their own
-- account. Closing it is the opposite direction and has to pass, but only from
-- inside `erase_my_account()`, which sets the setting for one transaction.
create or replace function public.protect_account_status()
returns trigger
language plpgsql
as $$
begin
  if new.account_status is distinct from old.account_status
     and coalesce(public.current_user_id(), old.user_id) = old.user_id
     and coalesce(current_setting('app.account_erasure', true), '') <> 'on' then
    raise exception 'account_status may only be changed by an administrator'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- `protect_certificate_snapshot` makes an issued certificate immutable, which is
-- the point of it. The holder's name is the single exception, and only to the
-- tombstone: everything else about the record stays frozen.
create or replace function public.protect_certificate_snapshot()
returns trigger
language plpgsql
as $$
begin
  if new.learner_display_name is distinct from old.learner_display_name
     and not (coalesce(current_setting('app.account_erasure', true), '') = 'on'
              and new.learner_display_name = 'Deleted learner') then
    raise exception
      'certificate % is an issued record and its snapshot is immutable', old.id
      using errcode = 'insufficient_privilege';
  end if;

  if new.course_title            is distinct from old.course_title
     or new.course_version_number is distinct from old.course_version_number
     or new.course_language       is distinct from old.course_language
     or new.criteria_snapshot     is distinct from old.criteria_snapshot
     or new.certificate_number    is distinct from old.certificate_number
     or new.issued_at             is distinct from old.issued_at
     or new.issued_by             is distinct from old.issued_by
     or new.template_version      is distinct from old.template_version then
    raise exception
      'certificate % is an issued record and its snapshot is immutable', old.id
      using errcode = 'insufficient_privilege';
  end if;

  -- Once revoked, a certificate stays revoked.
  if old.status = 'revoked' and new.status <> 'revoked' then
    raise exception 'certificate % is revoked and may not be reinstated', old.id
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- erasure
-- ---------------------------------------------------------------------------

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

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    'account.closed_by_owner',
    'user_profile',
    v_actor,
    jsonb_build_object(
      'learnersErased', coalesce(array_length(v_learner_ids, 1), 0),
      'retained', 'orders, payments, refunds, audit events, enrolments, progress, certificates'
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
      'guardianLinks', v_guardians
    )
  );
end;
$$;

comment on function public.erase_my_account(text) is
  'Closes the caller''s account: deletes what they wrote, de-identifies what the '
  'platform recorded, keeps the ledger. Confirmation is the display name.';

revoke all on function public.erase_my_account(text) from public, anon;
grant execute on function public.erase_my_account(text) to authenticated;
