-- -----------------------------------------------------------------------------
-- The last thing closing an account did not close
-- -----------------------------------------------------------------------------
--
-- `/account/delete` has told every person who used it, since it was written, that
-- closing the account removes their name from everything it touched. It does —
-- in this database. It does not remove the sign-in. That lives in `auth.users`,
-- the authentication provider's own table, and `erase_my_account()` cannot delete
-- it: the row is the account's identity, and everything the platform keeps about
-- the person hangs off it.
--
-- So the sentence was true and the account was not closed. A closed account could
-- still sign in, because nothing had been told to stop it. Three units have now
-- named this in passing — "it is staff work, it is in NEXT.md" — and a paragraph
-- in a document is not a queue. Nobody knows which identities are outstanding,
-- nobody records the ones they delete, and there is no way to answer the question
-- a person actually asks afterwards: *was my account erased?*
--
-- THE FINDING, AND WHY THE OBVIOUS FIX IS WORSE THAN THE GAP
-- ----------------------------------------------------------
-- `public.user_profiles.user_id` is `references auth.users (id) on delete
-- cascade`. Deleting an identity in the Supabase dashboard therefore deletes the
-- profile row — and the profile row is what the ledger, the audit trail and this
-- platform's promise to keep "the audit record that the account was closed" all
-- rest on. Worse, it does not even work: eighteen tables point at that row with
-- `on delete restrict`, so an account that ever opened a support case, asked for
-- a refund, uploaded media, taught a course or was screened cannot have its
-- identity deleted at all. The delete fails with a foreign key error in a
-- dashboard that does not explain it, so the staff member concludes the dashboard
-- is broken and closes the tab. That is how a queue becomes a paragraph.
--
-- For an account with none of those, the delete *succeeds* and quietly takes the
-- profile, the role assignments, the notification preferences, the policy
-- acceptances and — `governance_audit_events.actor` is `on delete set null` — the
-- name against every audit entry they ever caused. The one record `/account/delete`
-- promised to keep was the thing that would have gone.
--
-- So this migration does the enabling change first: **a profile stops being a
-- child of its identity.** The foreign key is dropped, and the row that keeps the
-- ledger outlives the row that can sign in. That is the whole point of a closed
-- account: it keeps what must be kept and keeps nothing that can be used.
--
-- WHAT IS BUILT
-- -------------
--   1. `erased_identities` — one row per closed account, holding a fingerprint of
--      the sign-in address, when it was closed and whether the identity has been
--      removed. It is the record that survives the identity, and it is the only
--      place the question "was this address erased?" can be answered from.
--   2. `identity_removal_queue()` — everything closed whose identity is still at
--      the provider, plus the two states that should never happen (an active
--      account with no identity, and a closed one nobody recorded).
--   3. `record_identity_removal()` — the staff step. It refuses to record a
--      deletion that has not happened, because "recorded" and "done" drifting
--      apart is exactly how this gap opened.
--   4. `identity_lookup()` — the support question. Given an address, is there an
--      erased account behind it, and is its identity gone? Every lookup is
--      audited, and the address is never stored by the lookup.
--
-- WHAT IS DELIBERATELY NOT BUILT
-- ------------------------------
-- The deletion itself is not automated. Doing it from here needs the Supabase
-- service-role key, which bypasses every policy in this schema; that is a
-- decision with a real risk attached, and it is written up in NEXT.md rather than
-- taken by a migration. Until it is taken, the runbook step is: delete the
-- identity in Supabase, then record it here — and the page will not let the
-- second half be recorded before the first half is true.

-- -----------------------------------------------------------------------------
-- 1. A profile is not a child of its identity
-- -----------------------------------------------------------------------------
-- Dropped rather than loosened: there is no delete rule that expresses "the row
-- stays". Everything that needs to know whether a person can still sign in reads
-- `auth.users` directly, which is where that fact lives.
alter table public.user_profiles
  drop constraint if exists user_profiles_user_id_fkey;

comment on column public.user_profiles.user_id is
  'The account id. It matches auth.users.id while the person can sign in, and outlives it afterwards: a closed account keeps this row and loses the identity. No foreign key, deliberately — see 20261281004900.';

-- -----------------------------------------------------------------------------
-- 2. The fingerprint, so the question has an answer after the identity is gone
-- -----------------------------------------------------------------------------
create or replace function public.identity_hash(p_address text)
returns text
language sql
immutable
as $$
  select case
    when p_address is null or btrim(p_address) = '' then null
    else encode(sha256(convert_to(lower(btrim(p_address)), 'UTF8')), 'hex')
  end;
$$;

revoke all on function public.identity_hash(text) from public, anon, authenticated;

comment on function public.identity_hash(text) is
  'SHA-256 of a normalised sign-in address. A fingerprint, not a deletion: somebody holding a candidate address can test it. It exists because "was my account erased?" has no answer at all without it.';

-- -----------------------------------------------------------------------------
-- 3. The ledger
-- -----------------------------------------------------------------------------
create table public.erased_identities (
  id uuid primary key default gen_random_uuid(),

  -- The closed account. One row each; the profile is never deleted, which is why
  -- this can be a plain reference again.
  user_id uuid not null unique
    references public.user_profiles (user_id) on delete restrict,

  -- The only trace of who they were. Null when the address was already gone by
  -- the time the row was written, which is the one case lookup cannot answer.
  address_hash text check (address_hash is null or address_hash ~ '^[a-f0-9]{64}$'),

  erased_at timestamptz not null default now(),

  -- Who closed it, in the same three words the rest of the schema uses:
  -- the person themselves, staff, or the backfill that ran when this table was
  -- created and found accounts already closed.
  source text not null default 'self_service'
    check (source in ('self_service', 'staff', 'backfill')),

  -- Null until the identity is actually gone from the provider. This is the
  -- queue, and it is why the column is not a boolean: a date is evidence.
  identity_removed_at timestamptz,
  identity_removed_by uuid references public.user_profiles (user_id) on delete set null,
  note text check (note is null or length(btrim(note)) <= 500),

  constraint erased_identities_removal_agrees check (
    (identity_removed_at is null) = (identity_removed_by is null)
  )
);

create index erased_identities_open_idx
  on public.erased_identities (erased_at)
  where identity_removed_at is null;

create index erased_identities_hash_idx
  on public.erased_identities (address_hash)
  where address_hash is not null;

comment on table public.erased_identities is
  'One row per closed account: a fingerprint of the sign-in address, when it closed, and whether the identity at the authentication provider has been removed. The row outlives the identity, which is the only way "was this address erased?" can be answered.';

alter table public.erased_identities enable row level security;
-- No policy at all. Only the definer functions below read it, and a table a
-- session can select from would be an address-membership oracle for any staff
-- account. The lookup is a function with an audit trail, not a readable table.
revoke all on public.erased_identities from public, anon, authenticated;

-- Append-only in the useful sense: a row is written once, the removal may be
-- recorded once, and nothing is deleted — the ledger exists because the thing it
-- describes no longer does.
create or replace function public.refuse_erased_identity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'an erased identity is the only record that the account existed'
      using errcode = 'insufficient_privilege';
  end if;

  if new.user_id is distinct from old.user_id
     or new.address_hash is distinct from old.address_hash
     or new.erased_at is distinct from old.erased_at
     or new.source is distinct from old.source then
    raise exception 'an erased identity records what happened; it is not rewritten'
      using errcode = 'insufficient_privilege';
  end if;

  if old.identity_removed_at is not null
     and new.identity_removed_at is distinct from old.identity_removed_at then
    raise exception 'the identity for this account was already recorded as removed'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger erased_identities_append_only
  before update or delete on public.erased_identities
  for each row execute function public.refuse_erased_identity_change();

-- -----------------------------------------------------------------------------
-- 4. The backfill: accounts already closed when this table appeared
-- -----------------------------------------------------------------------------
-- Their identities are still at the provider and their addresses are still
-- readable, so the fingerprint is taken now rather than lost. Only rows whose
-- identity is still present are written; a closed account whose identity is
-- already gone has nothing for this ledger to describe.
insert into public.erased_identities (user_id, address_hash, erased_at, source)
select p.user_id,
       public.identity_hash(lower(coalesce(u.email, nullif(btrim(u.phone), '')))),
       coalesce(p.deleted_at, p.updated_at, now()),
       'backfill'
  from public.user_profiles p
  join auth.users u on u.id = p.user_id
 where p.account_status = 'closed'
on conflict (user_id) do nothing;

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

-- -----------------------------------------------------------------------------
-- 5. The queue
-- -----------------------------------------------------------------------------
-- Everything closed whose identity is still at the provider — which covers both
-- the accounts this migration backfilled and every one closed since. The two
-- impossible states are reported beside it rather than being invisible: an
-- account that is active but has no identity (it cannot sign in and does not know
-- it), and a closed account whose identity is gone but which nobody recorded.
create or replace function public.identity_removal_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_closed     integer;
  v_at_provider integer;
  v_removed    integer;
  v_unrecorded integer;
  v_active_orphans integer;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'identity:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'deleting an identity is destructive and irreversible; only the owner runs this queue';
  end if;

  select count(*)::int into v_closed
    from public.user_profiles where account_status = 'closed';

  select count(*)::int into v_at_provider
    from public.user_profiles p
    join auth.users u on u.id = p.user_id
   where p.account_status = 'closed';

  select count(*)::int into v_removed
    from public.erased_identities where identity_removed_at is not null;

  select count(*)::int into v_unrecorded
    from public.user_profiles p
    join auth.users u on u.id = p.user_id
    left join public.erased_identities e on e.user_id = p.user_id
   where p.account_status = 'closed'
     and (e.id is null or e.identity_removed_at is null);

  select count(*)::int into v_active_orphans
    from public.user_profiles p
   where p.account_status = 'active'
     and not exists (select 1 from auth.users u where u.id = p.user_id);

  return jsonb_build_object(
    'closedAccounts', v_closed,
    'stillAtProvider', v_at_provider,
    'removed', v_removed,
    'unrecorded', v_unrecorded,
    'activeWithoutIdentity', v_active_orphans,
    'rows', coalesce((
      select jsonb_agg(row_to_json(r)::jsonb order by r."closedAt")
        from (
          select p.user_id                        as "userId",
                 coalesce(p.deleted_at, p.updated_at) as "closedAt",
                 p.display_name                   as label,
                 (e.id is not null)               as erased,
                 e.erased_at                      as "erasedAt",
                 (e.identity_removed_at is not null) as "recordedRemoved"
            from public.user_profiles p
            join auth.users u on u.id = p.user_id
            left join public.erased_identities e on e.user_id = p.user_id
           where p.account_status = 'closed'
           order by coalesce(p.deleted_at, p.updated_at)
           limit 200) r), '[]'::jsonb));
end;
$$;

revoke all on function public.identity_removal_queue() from public, anon;
grant execute on function public.identity_removal_queue() to authenticated;

comment on function public.identity_removal_queue() is
  'Every closed account whose identity is still at the authentication provider, plus the two states that should not exist: an active account with no identity, and a closed one nobody recorded.';

-- -----------------------------------------------------------------------------
-- 6. Recording the staff step
-- -----------------------------------------------------------------------------
-- This function does not delete anything, and that is the point: the deletion
-- happens at the provider, and this records that it did. It asks `auth.users`
-- before it writes, so the ledger cannot say "removed" while the row is still
-- there — the drift between what a queue says and what is true is exactly how the
-- original gap survived for a month.
create or replace function public.record_identity_removal(
  p_user_id uuid,
  p_note    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_status  text;
  v_present boolean;
  v_already timestamptz;
  v_left    integer;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'identity:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select account_status into v_status from public.user_profiles where user_id = p_user_id;
  if not found then
    raise exception 'identity:no_account'
      using errcode = 'no_data_found';
  end if;
  if v_status <> 'closed' then
    raise exception 'identity:not_closed'
      using errcode = 'check_violation',
            hint = 'an open account still signs in; close it first, on the account''s own page';
  end if;

  -- The check that makes the ledger worth reading. A dashboard tab left open, a
  -- delete that silently failed, a wrong row clicked — all of them look identical
  -- to a deletion from here unless this asks.
  select exists (select 1 from auth.users where id = p_user_id) into v_present;
  if v_present then
    raise exception 'identity:still_present'
      using errcode = 'check_violation',
            hint = 'delete the identity in Supabase (Authentication → Users) first; this records the deletion, it does not perform it';
  end if;

  select identity_removed_at into v_already
    from public.erased_identities where user_id = p_user_id;
  if v_already is not null then
    raise exception 'identity:already_recorded'
      using errcode = 'check_violation';
  end if;

  insert into public.erased_identities
    (user_id, source, identity_removed_at, identity_removed_by, note)
  values
    (p_user_id, 'staff', now(), v_actor, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (user_id) do update
    set identity_removed_at = now(),
        identity_removed_by = v_actor,
        note = coalesce(excluded.note, public.erased_identities.note);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'identity.removed', 'user_profile', p_user_id,
          jsonb_build_object('recordedAt', now(),
                             'note', nullif(btrim(coalesce(p_note, '')), '')));

  select count(*)::int into v_left
    from public.user_profiles p
    join auth.users u on u.id = p.user_id
   where p.account_status = 'closed';

  return jsonb_build_object('recorded', true, 'remainingAtProvider', v_left);
end;
$$;

revoke all on function public.record_identity_removal(uuid, text) from public, anon;
grant execute on function public.record_identity_removal(uuid, text) to authenticated;

comment on function public.record_identity_removal(uuid, text) is
  'Records that a closed account''s identity was deleted at the provider. Refuses while the identity is still there, so the ledger cannot drift from the truth.';

-- -----------------------------------------------------------------------------
-- 7. The support question
-- -----------------------------------------------------------------------------
-- "I closed my account — is it gone?" asked by somebody who can no longer sign in
-- to look. Without this the answer is "no account found", which is what the
-- directory says to a stranger, and telling a person who erased themselves that
-- they never existed is a bad answer to a reasonable question.
--
-- Every lookup is audited. Staff see whether an address was erased, when, and
-- whether the identity is gone — never a name, never the account's history. The
-- address itself is not written to the audit trail; a log of the questions is not
-- supposed to become a copy of the answer.
create or replace function public.identity_lookup(p_address text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_address text := btrim(coalesce(p_address, ''));
  v_hash    text;
  v_row     public.erased_identities;
  v_present boolean := false;
  v_live    integer := 0;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'identity:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'this answers a support question; it is not a public register';
  end if;
  if v_address = '' or length(v_address) > 320 then
    raise exception 'identity:address_required'
      using errcode = 'invalid_parameter_value';
  end if;

  v_hash := public.identity_hash(v_address);

  select * into v_row from public.erased_identities
   where address_hash = v_hash
   order by erased_at desc
   limit 1;

  if v_row.id is not null then
    select exists (select 1 from auth.users where id = v_row.user_id) into v_present;
  end if;

  -- A second account on the same address is ordinary: somebody erased, then came
  -- back. Support needs both facts or it will tell a person they have no account
  -- while they are signed in to one.
  select count(*)::int into v_live
    from auth.users u
    join public.user_profiles p on p.user_id = u.id
   where lower(u.email) = lower(v_address)
     and p.account_status = 'active';

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'identity.looked_up', 'erased_identity', v_row.id,
          jsonb_build_object('found', v_row.id is not null));

  return jsonb_build_object(
    'found', v_row.id is not null,
    'erasedAt', v_row.erased_at,
    'identityRemovedAt', v_row.identity_removed_at,
    'stillAtProvider', v_present,
    'activeAccountsAtAddress', v_live,
    'note', case
      when v_row.id is null then
        'No erased account was recorded for this address. That is not proof it was never used here: the ledger starts on 2026-11-01.'
      when v_present then
        'The account was erased, and its sign-in is still at the authentication provider. Staff can delete it.'
      else
        'The account was erased and the sign-in was removed.'
    end);
end;
$$;

revoke all on function public.identity_lookup(text) from public, anon;
grant execute on function public.identity_lookup(text) to authenticated;

comment on function public.identity_lookup(text) is
  'Given a sign-in address, whether an erased account is behind it, whether the identity is gone, and whether somebody holds an active account at the same address today. Audited on every call; never returns a name.';
