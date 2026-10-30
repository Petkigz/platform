-- An adult says how old they are, and the platform says it takes their word.
--
-- WHY THIS EXISTS
-- ---------------
-- `platform.age_assurance` sat in the register with one sentence against it:
-- *"the method is undecided, and a guessed method is worse than an honest gap."*
-- The owner has now decided the method (2026-10-30): **a declaration**.
--
-- So this is not an age *check*. Nothing here reads a document, asks a card
-- issuer, or estimates a face. An adult account states that they are eighteen or
-- older and that they are the parent or guardian of the children they add; the
-- statement, the moment it was made, and the exact words that were agreed to are
-- recorded, and the interface says in as many words that we do not verify it.
--
-- Why that is the honest build rather than a lazy one: every real alternative
-- costs either money the platform does not have (a card or document provider) or
-- somebody's identity document. A declaration records the claim and who made it,
-- which is what the children policy actually promises, and leaves the door open
-- to a stronger method later **without changing this table**: a future check
-- would add evidence beside the declaration, not replace the promise.
--
-- WHAT IS STORED, AND WHAT IS NOT
-- -------------------------------
-- One row per account: when they declared, the version of the sentence they
-- agreed to, the sentence itself (so an old declaration cannot be silently
-- restated with new words), and when they withdrew it if they did. No name, no
-- date of birth, no document. A child still carries an age band and never a date
-- of birth, which this does not change.
--
-- WHERE IT BITES
-- --------------
-- `add_child_to_family()` refuses to create a child for an adult who has not
-- declared, **while `platform.age_assurance` is on**. With the flag off the
-- function behaves exactly as it did, so turning the flag off cannot strand a
-- family that has already added children — the rows stay, the gate lifts.

-- ---------------------------------------------------------------------------
-- The register tells the truth
-- ---------------------------------------------------------------------------
update public.platform_settings
   set description   = 'An adult declares they are 18 or older before adding a child',
       gate_type     = 'admin',
       preconditions = 'The method is a declaration, chosen by the owner on 2026-10-30. '
                    || 'Nothing is verified: no document, no card, no estimate. The account '
                    || 'states its age, the statement and the moment are recorded, and the '
                    || 'screen says plainly that we take the word rather than check it. While '
                    || 'this is on, add_child_to_family() refuses an adult who has not '
                    || 'declared. Turning it off lifts the gate and deletes nothing. A '
                    || 'stronger method later adds evidence beside the declaration; it does '
                    || 'not restate the promise.'
 where key = 'platform.age_assurance';

-- ---------------------------------------------------------------------------
-- The statement
-- ---------------------------------------------------------------------------
-- Stored as a constant rather than in the row for every account, so the words can
-- be read once and compared. A change to the sentence is a new version, not an
-- edit: `adult_declaration_statement(version)` is how an old declaration is read
-- back in the words its owner actually agreed to.
create or replace function public.adult_declaration_statement(p_version integer default 1)
returns text
language sql
immutable
as $$
  select case p_version
    when 1 then
      'I am 18 or older. I am the parent or guardian of the children I add to '
      'this account, and I am responsible for what they study.'
    else null
  end;
$$;

comment on function public.adult_declaration_statement(integer) is
  'The sentence an adult agreed to, by version. Never edited in place: a new '
  'wording is a new version, so a declaration made last year is still readable '
  'in the words it was made in.';

-- ---------------------------------------------------------------------------
-- One declaration per account
-- ---------------------------------------------------------------------------
create table public.adult_declarations (
  user_id uuid primary key
    references public.user_profiles (user_id) on delete cascade,

  -- Which wording. Bumped only when the sentence changes.
  statement_version integer not null default 1 check (statement_version between 1 and 99),

  declared_at timestamptz not null default now(),

  -- Withdrawal is a date, not a delete: the declaration happened, and a family
  -- asking why a child was added last March needs the answer to still exist.
  withdrawn_at timestamptz,

  constraint adult_declaration_withdrawn_after_declared
    check (withdrawn_at is null or withdrawn_at >= declared_at)
);

comment on table public.adult_declarations is
  'An unverified declaration of adulthood and guardianship, one per account. '
  'Nothing reads a document; the platform takes the word and records it.';

alter table public.adult_declarations enable row level security;

-- An account may read its own declaration. There is no insert, update or delete
-- policy: every write goes through the two functions below, so a statement
-- version cannot be back-dated by writing the table directly.
create policy adult_declarations_read_own on public.adult_declarations
  for select to authenticated
  using (user_id = public.current_user_id());

revoke all on public.adult_declarations from anon, authenticated;
grant select on public.adult_declarations to authenticated;

-- ---------------------------------------------------------------------------
-- Asking, on behalf of another function
-- ---------------------------------------------------------------------------
-- Used by the gate in `add_child_to_family()` and, later, by any other writer
-- that needs to know whether an adult has declared. A withdrawn declaration is
-- not a declaration: the answer is false, and the reader is told the difference
-- by `my_adult_declaration()` rather than by a silent false.
create or replace function public.has_declared_adult(p_user uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.adult_declarations d
     where d.user_id = coalesce(p_user, public.current_user_id())
       and d.withdrawn_at is null
  );
$$;

revoke all on function public.has_declared_adult(uuid) from public;
grant execute on function public.has_declared_adult(uuid) to authenticated, anon;

comment on function public.has_declared_adult(uuid) is
  'Whether an account currently holds an unwithdrawn adulthood declaration. '
  'True means somebody said it, not that anybody checked it.';

-- ---------------------------------------------------------------------------
-- Declaring
-- ---------------------------------------------------------------------------
create or replace function public.declare_adult(p_version integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_version integer := coalesce(p_version, 1);
  v_text    text;
begin
  if v_actor is null then
    raise exception 'age:sign_in_to_declare'
      using errcode = 'insufficient_privilege';
  end if;

  v_text := public.adult_declaration_statement(v_version);
  if v_text is null then
    raise exception 'age:unknown_statement_version'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.adult_declarations (user_id, statement_version, declared_at, withdrawn_at)
  values (v_actor, v_version, now(), null)
  on conflict (user_id) do update
    set statement_version = excluded.statement_version,
        declared_at       = excluded.declared_at,
        withdrawn_at      = null;

  -- The audit records that a declaration was made and which wording it was. It
  -- never records a claim about the person: the row above is the claim.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'age.declared', 'user', v_actor,
          jsonb_build_object('statementVersion', v_version));

  return public.my_adult_declaration();
end;
$$;

revoke all on function public.declare_adult(integer) from public;
grant execute on function public.declare_adult(integer) to authenticated;

comment on function public.declare_adult(integer) is
  'Records that this account states it is 18+ and is the guardian of the '
  'children it adds. Nothing is verified; re-declaring refreshes the date.';

-- ---------------------------------------------------------------------------
-- Withdrawing
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_adult_declaration()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'age:sign_in_to_withdraw'
      using errcode = 'insufficient_privilege';
  end if;

  update public.adult_declarations
     set withdrawn_at = now()
   where user_id = v_actor
     and withdrawn_at is null;

  if not found then
    raise exception 'age:nothing_to_withdraw'
      using errcode = 'no_data_found';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'age.declaration_withdrawn', 'user', v_actor, '{}'::jsonb);

  return public.my_adult_declaration();
end;
$$;

revoke all on function public.withdraw_adult_declaration() from public;
grant execute on function public.withdraw_adult_declaration() to authenticated;

comment on function public.withdraw_adult_declaration() is
  'Withdraws the declaration without deleting it. Withdrawing does not remove a '
  'child who was already added: that is a separate, deliberate act.';

-- ---------------------------------------------------------------------------
-- Reading
-- ---------------------------------------------------------------------------
create or replace function public.my_adult_declaration()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select d.*
      from public.adult_declarations d
     where d.user_id = public.current_user_id()
  )
  select jsonb_build_object(
    -- Off means the platform does not currently ask; the page says that rather
    -- than pretending you answered something.
    'required', public.setting_bool('platform.age_assurance', false),
    'declared', coalesce((select withdrawn_at is null from mine), false),
    'withdrawn', coalesce((select withdrawn_at is not null from mine), false),
    'statementVersion', coalesce((select statement_version from mine), 1),
    'statement', public.adult_declaration_statement(
      coalesce((select statement_version from mine), 1)),
    'declaredAt', (select declared_at from mine),
    'withdrawnAt', (select withdrawn_at from mine)
  );
$$;

revoke all on function public.my_adult_declaration() from public;
grant execute on function public.my_adult_declaration() to authenticated;

comment on function public.my_adult_declaration() is
  'The declaration in force for the signed-in account, plus whether the '
  'platform is asking for one at all. Never says whether it was verified, '
  'because it was not.';

-- ---------------------------------------------------------------------------
-- The gate on adding a child
-- ---------------------------------------------------------------------------
-- The function is replaced rather than wrapped: a second writer with a similar
-- name is how two paths end up disagreeing about who may add a child. Everything
-- before the new block is byte-for-byte the previous behaviour.
create or replace function public.add_child_to_family(
  p_family_id    uuid,
  p_display_name text,
  p_age_band     text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id    uuid;
begin
  v_actor := public.current_user_id();

  if v_actor is null then
    raise exception 'sign in to add a child'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.families
                  where id = p_family_id and deleted_at is null) then
    raise exception 'family % not found', p_family_id
      using errcode = 'no_data_found';
  end if;

  if not public.is_family_owner(p_family_id, v_actor)
     and not public.is_privileged(v_actor) then
    raise exception 'only the owner may add a child to this family'
      using errcode = 'insufficient_privilege';
  end if;

  -- The owner's decision of 2026-10-30: the platform asks the adult to say they
  -- are an adult, and takes the answer. This refuses a *missing* declaration, not
  -- an untrue one — the sentence is a claim and the platform does not hold the
  -- means to test it. Staff are not exempt: an account adding a child is the
  -- account the declaration belongs to.
  if public.setting_bool('platform.age_assurance', false)
     and not public.has_declared_adult(v_actor) then
    raise exception 'age:declare_before_adding_a_child'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(btrim(p_display_name), '') = '' then
    raise exception 'a child needs a name'
      using errcode = 'invalid_parameter_value';
  end if;

  if p_age_band not in ('5-7','8-10','11-13','14-17') then
    raise exception
      'unsupported age band for a child: %. An adult should sign up instead',
      coalesce(p_age_band, '<null>')
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.learner_profiles
    (family_id, linked_user_id, display_name, learner_type, age_band, status)
  values
    (p_family_id, null, btrim(p_display_name), 'child', p_age_band, 'active')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'family.child_added', 'family', p_family_id,
          jsonb_build_object('learner_profile_id', v_id,
                             'age_band', p_age_band));

  return v_id;
end;
$$;

revoke all on function public.add_child_to_family(uuid, text, text) from public;
grant execute on function public.add_child_to_family(uuid, text, text) to authenticated;

comment on function public.add_child_to_family(uuid, text, text) is
  'Creates a child learner_profile under the family, with no login, per D2. '
  'Owner or privileged. While platform.age_assurance is on, the caller must '
  'also hold an unwithdrawn adulthood declaration.';
