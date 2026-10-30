-- An ijazah, recorded — not verified, not published, not claimed.
--
-- WHAT AN IJAZAH IS, AND WHY THIS IS SMALL
-- ----------------------------------------
-- An ijazah is a teacher's authorisation for a student to teach or transmit a
-- text, a recitation or a science, usually naming the chain of transmission that
-- carries it back. It is not a certificate this platform can issue, and it is not
-- a claim this platform can check: the standing knowledge to judge a chain lives
-- with scholars, and the platform has none on staff.
--
-- The owner's decision of 2026-10-30 settles exactly how much is built now:
-- **the owner alone records who authorised whom, and on what evidence. A
-- scholarly panel can come later.** So this unit is a register, kept in one
-- place, with three deliberate omissions:
--
--   * **Nothing is published.** There is no public chain view, no badge on a
--     course, no mark on a teacher's public profile. A learner cannot see an
--     ijazah yet, because a public view is the moment the platform starts
--     implying it has checked something it has not.
--   * **Nothing is called verified.** The row says who recorded it and when. It
--     does not say "verified", because the only honest word for what happened is
--     "recorded": an owner read a document or a chain and wrote it down.
--   * **No schema for a science.** The scope and the chain are free text. A
--     dropdown of ijazah types would be this platform inventing a taxonomy for
--     somebody else's tradition, and the first place such a list is wrong is the
--     place a learner would believe it.
--
-- WHAT A ROW IS
-- -------------
-- The scholar who granted it (free text — most of them will never have an account
-- here, and making one for them would be inventing a person), the person who
-- holds it (an account, because a record about somebody with no account is a
-- record nobody can act on), what it covers, the chain if it was written down, the
-- day it was granted (nullable: "before I was twenty" is a real answer), and what
-- the owner was shown.
--
-- The evidence is **write-only**: the owner types what they saw, and no screen
-- reads it back to the holder. It is a note about a document held elsewhere, so it
-- carries a third party's name and sometimes a family's; the person it is about
-- does not need it, and the platform should not become a copy of it.
--
-- NOTHING IS EDITED AND NOTHING IS DELETED
-- ----------------------------------------
-- A correction is a withdrawal and a new entry, and the register says so. A
-- scholar's authorisation is not a record the platform may quietly amend: the row
-- is what was seen on the day it was seen. Deletion is refused outright, and the
-- only permitted change is the withdrawal itself — status, when, by whom, and why.
--
-- Removing the person from the platform removes their rows with them
-- (`on delete cascade`), because an authorisation attached to no account is
-- attached to no person; the audit event keeps the fact that it was recorded.

-- ---------------------------------------------------------------------------
-- The register
-- ---------------------------------------------------------------------------
create table public.ijazah_authorisations (
  id               uuid primary key default gen_random_uuid(),

  -- Who holds it. An account rather than a name, so the record can be shown to
  -- the person it is about and to nobody else.
  grantee_user_id  uuid not null
                     references public.user_profiles (user_id) on delete cascade,

  -- Who granted it: a name in somebody's own words. Free text on purpose.
  granted_by       text not null,
  -- Nullable, because an old authorisation often has a year and no date, or no
  -- date at all, and a required field would make people invent one.
  granted_on       date,

  scope            text not null,
  chain            text,

  -- What the owner was shown: a document, a signed page, a named person's word.
  -- Write-only from the holder's side; see the column grant below.
  evidence         text not null,

  recorded_by      uuid references public.user_profiles (user_id) on delete set null,
  recorded_at      timestamptz not null default now(),

  status           text not null default 'recorded'
                     check (status in ('recorded', 'withdrawn')),
  withdrawn_at     timestamptz,
  withdrawn_by     uuid references public.user_profiles (user_id) on delete set null,
  withdrawn_reason text,

  constraint ijazah_granted_by_not_blank check (length(btrim(granted_by)) > 0),
  constraint ijazah_scope_not_blank      check (length(btrim(scope)) > 0),
  constraint ijazah_evidence_not_blank   check (length(btrim(evidence)) > 0),
  constraint ijazah_withdrawal_complete  check (
    (status = 'recorded'
      and withdrawn_at is null and withdrawn_reason is null)
    or (status = 'withdrawn'
      and withdrawn_at is not null
      and length(btrim(coalesce(withdrawn_reason, ''))) > 0)
  )
);

-- The same authorisation must not be entered twice. Two rows for one ijazah is
-- how a holder ends up apparently holding two.
create unique index ijazah_once_recorded
  on public.ijazah_authorisations
     (grantee_user_id, lower(btrim(granted_by)), lower(btrim(scope)))
  where status = 'recorded';

create index ijazah_by_grantee on public.ijazah_authorisations (grantee_user_id, status);

comment on table public.ijazah_authorisations is
  'Authorisations recorded by the platform owner: who granted, to whom, for what, on what evidence. Never published, never described as verified, never edited; a correction is a withdrawal and a new entry.';

-- ---------------------------------------------------------------------------
-- Append-only, with one permitted change
-- ---------------------------------------------------------------------------
create or replace function public.refuse_ijazah_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'an ijazah record cannot be deleted: withdraw it instead'
      using errcode = 'insufficient_privilege';
  end if;

  -- The only permitted update is the withdrawal, and it may touch only the four
  -- columns that describe it. Everything else is what was seen on the day.
  if new.id                is distinct from old.id
     or new.grantee_user_id is distinct from old.grantee_user_id
     or new.granted_by      is distinct from old.granted_by
     or new.granted_on      is distinct from old.granted_on
     or new.scope           is distinct from old.scope
     or new.chain           is distinct from old.chain
     or new.evidence        is distinct from old.evidence
     or new.recorded_by     is distinct from old.recorded_by
     or new.recorded_at     is distinct from old.recorded_at then
    raise exception 'an ijazah record cannot be edited: withdraw it and record it again'
      using errcode = 'insufficient_privilege';
  end if;

  if old.status = 'withdrawn' then
    raise exception 'that ijazah was already withdrawn on %', old.withdrawn_at
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger ijazah_append_only
  before update or delete on public.ijazah_authorisations
  for each row execute function public.refuse_ijazah_change();

-- ---------------------------------------------------------------------------
-- Who may read what
-- ---------------------------------------------------------------------------
alter table public.ijazah_authorisations enable row level security;

-- The holder and staff. Nobody else: an ijazah is not public.
create policy ijazah_read on public.ijazah_authorisations
  for select using (
    grantee_user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

-- Column privileges, not a view: `evidence` is simply not granted to anybody but
-- staff, so even the holder selecting their own row cannot read what the owner
-- was shown. A policy that hid it in the page would still ship it to the browser
-- of anyone who opened the network tab.
-- A default privilege grants every table to `authenticated`, so the table-level
-- grant has to be taken away first or the column list below would mean nothing.
revoke select on public.ijazah_authorisations from authenticated, anon;
grant select (id, grantee_user_id, granted_by, granted_on, scope, chain,
              recorded_at, status, withdrawn_at, withdrawn_reason)
  on public.ijazah_authorisations to authenticated;

revoke insert, update, delete on public.ijazah_authorisations from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Recording
-- ---------------------------------------------------------------------------
create or replace function public.record_ijazah(
  p_grantee_user_id uuid,
  p_granted_by      text,
  p_scope           text,
  p_evidence        text,
  p_granted_on      date default null,
  p_chain           text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_id    uuid;
  v_name  text;
begin
  if not public.setting_bool('learning.ijazah', false) then
    raise exception 'ijazah:disabled'
      using errcode = 'insufficient_privilege';
  end if;

  -- The owner alone, as decided on 2026-10-30. Not governance staff, not a
  -- reviewer, not a panel: a record of somebody's authorisation is a statement
  -- about a person's standing in a tradition, and one account makes it.
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'ijazah:owner_only'
      using errcode = 'insufficient_privilege';
  end if;

  if p_grantee_user_id is null or not exists (
    select 1 from public.user_profiles where user_id = p_grantee_user_id
  ) then
    raise exception 'ijazah:no_such_person'
      using errcode = 'no_data_found';
  end if;

  if length(btrim(coalesce(p_granted_by, ''))) = 0 then
    raise exception 'ijazah:needs_grantor'
      using errcode = 'check_violation';
  end if;

  if length(btrim(coalesce(p_scope, ''))) = 0 then
    raise exception 'ijazah:needs_scope'
      using errcode = 'check_violation';
  end if;

  if length(btrim(coalesce(p_evidence, ''))) = 0 then
    raise exception 'ijazah:needs_evidence'
      using errcode = 'check_violation';
  end if;

  if p_granted_on is not null and p_granted_on > current_date then
    raise exception 'ijazah:future_date'
      using errcode = 'check_violation';
  end if;

  begin
    insert into public.ijazah_authorisations
      (grantee_user_id, granted_by, granted_on, scope, chain, evidence, recorded_by)
    values
      (p_grantee_user_id, btrim(p_granted_by), p_granted_on, btrim(p_scope),
       nullif(btrim(coalesce(p_chain, '')), ''), btrim(p_evidence), v_actor)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'ijazah:already_recorded'
      using errcode = 'unique_violation';
  end;

  select display_name into v_name from public.user_profiles
   where user_id = p_grantee_user_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'ijazah.recorded', 'user_profile', p_grantee_user_id,
          jsonb_build_object('ijazahId', v_id, 'grantedBy', btrim(p_granted_by),
                             'scope', btrim(p_scope)));

  return jsonb_build_object(
    'id', v_id,
    'granteeUserId', p_grantee_user_id,
    'displayName', v_name,
    'grantedBy', btrim(p_granted_by),
    'scope', btrim(p_scope),
    'status', 'recorded');
end;
$$;

revoke all on function public.record_ijazah(uuid, text, text, text, date, text)
  from public, anon;
grant execute on function public.record_ijazah(uuid, text, text, text, date, text)
  to authenticated;

comment on function public.record_ijazah(uuid, text, text, text, date, text) is
  'The owner records an ijazah: who granted it, for what, on what evidence. It is a record, not a verification, and nothing becomes visible to learners.';

-- ---------------------------------------------------------------------------
-- Withdrawing
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_ijazah(
  p_id     uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_row   public.ijazah_authorisations;
begin
  if not public.setting_bool('learning.ijazah', false) then
    raise exception 'ijazah:disabled'
      using errcode = 'insufficient_privilege';
  end if;

  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'ijazah:owner_only'
      using errcode = 'insufficient_privilege';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'ijazah:needs_reason'
      using errcode = 'check_violation';
  end if;

  select * into v_row from public.ijazah_authorisations where id = p_id;
  if v_row.id is null then
    raise exception 'ijazah:not_found'
      using errcode = 'no_data_found';
  end if;

  update public.ijazah_authorisations
     set status           = 'withdrawn',
         withdrawn_at     = now(),
         withdrawn_by     = v_actor,
         withdrawn_reason = btrim(p_reason)
   where id = p_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'ijazah.withdrawn', 'user_profile', v_row.grantee_user_id,
          jsonb_build_object('ijazahId', p_id, 'reason', btrim(p_reason)));

  return jsonb_build_object('id', p_id, 'status', 'withdrawn');
end;
$$;

revoke all on function public.withdraw_ijazah(uuid, text) from public, anon;
grant execute on function public.withdraw_ijazah(uuid, text) to authenticated;

comment on function public.withdraw_ijazah(uuid, text) is
  'Ends an ijazah record without deleting it, and keeps the reason. A correction is a withdrawal and a new entry, never an edit.';

-- ---------------------------------------------------------------------------
-- What the two screens read
-- ---------------------------------------------------------------------------
create or replace function public.my_ijazah_authorisations()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id',          a.id,
             'grantedBy',   a.granted_by,
             'grantedOn',   a.granted_on,
             'scope',       a.scope,
             'chain',       a.chain,
             'status',      a.status,
             'recordedAt',  a.recorded_at,
             'withdrawnAt', a.withdrawn_at,
             'withdrawnReason', a.withdrawn_reason)
           order by a.recorded_at desc), '[]'::jsonb)
    from public.ijazah_authorisations a
   where a.grantee_user_id = public.current_user_id();
$$;

revoke all on function public.my_ijazah_authorisations() from public, anon;
grant execute on function public.my_ijazah_authorisations() to authenticated;

comment on function public.my_ijazah_authorisations() is
  'The authorisations recorded about the signed-in person. No evidence text: what the owner was shown is not the holder''s to read back.';

create or replace function public.ijazah_register()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_rows  jsonb;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'ijazah:staff_only'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',          a.id,
           'granteeUserId', a.grantee_user_id,
           'displayName', up.display_name,
           'grantedBy',   a.granted_by,
           'grantedOn',   a.granted_on,
           'scope',       a.scope,
           'chain',       a.chain,
           'hasEvidence', length(btrim(a.evidence)) > 0,
           'recordedAt',  a.recorded_at,
           'status',      a.status,
           'withdrawnAt', a.withdrawn_at,
           'withdrawnReason', a.withdrawn_reason)
         order by up.display_name, a.recorded_at desc), '[]'::jsonb)
    into v_rows
    from public.ijazah_authorisations a
    join public.user_profiles up on up.user_id = a.grantee_user_id;

  return jsonb_build_object(
    'authorisations', v_rows,
    -- The evidence text itself is withheld even here: the register screen needs
    -- to know that something was seen, not to re-display a scholarly document's
    -- contents on a page an admin might leave open.
    'candidates', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'userId', up.user_id,
               'displayName', up.display_name)
             order by up.display_name), '[]'::jsonb)
        from public.user_profiles up
        join public.user_role_assignments ura on ura.user_id = up.user_id
        join public.roles r on r.id = ura.role_id
       where r.code = 'instructor' and ura.revoked_at is null));
end;
$$;

revoke all on function public.ijazah_register() from public, anon;
grant execute on function public.ijazah_register() to authenticated;

comment on function public.ijazah_register() is
  'Every recorded ijazah, for staff, plus the teachers an owner may record one against. Withholds the evidence text itself and carries only whether evidence was seen.';

-- ---------------------------------------------------------------------------
-- The flag becomes the owner's switch
-- ---------------------------------------------------------------------------
update public.platform_settings
   set value_text  = 'false',
       gate_type   = 'admin',
       description = 'An authorisation to teach, recorded by the owner',
       preconditions = 'Built 2026-10-30 on the owner''s decision that the owner '
                    || 'alone records who authorised whom and on what evidence, with '
                    || 'a scholarly panel possible later. The register is '
                    || '/admin/ijazah: the grantor''s name in their own words (most '
                    || 'have no account here and making one would invent a person), '
                    || 'the holder''s account, the scope, the chain if it was '
                    || 'written down, the day it was granted where that is known, and '
                    || 'what the owner was shown — write-only, because it names a '
                    || 'third party and the platform should not become a copy of it. '
                    || 'Rows cannot be edited or deleted: a correction is a '
                    || 'withdrawal and a new entry. NOT built, deliberately: no '
                    || 'public chain view, no badge on a course and no mark on a '
                    || 'teacher''s public profile, because publication is the moment '
                    || 'the platform starts implying it checked something it has no '
                    || 'standing to check. A panel, when there is one, adds review '
                    || 'beside the record rather than rewriting it'
 where key = 'learning.ijazah';
