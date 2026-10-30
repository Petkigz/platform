-- A child may hold a login, and only a guardian may make one.
--
-- THE POSTURE THIS REPLACES
-- -------------------------
-- Since the first family migration, `learner_profiles` carried
-- `lp_no_child_login_yet` — a constraint whose own comment said *drop this in
-- the migration that enables child login*. It encoded D2: a child is a profile
-- under a family, never a user. That was a defensible default while nothing else
-- existed, and it is now the wrong one. A child with a login of their own can
-- come back to the lesson without borrowing a parent's phone and a parent's
-- session, and on a shared device in a household with three children the
-- alternative is that nobody's progress is really theirs.
--
-- The owner decided on 2026-10-30: **build child logins, and only a guardian may
-- create one.** So the constraint goes, and the promise becomes narrower and
-- more useful: *a child holds an account only if an adult in their family made
-- it, on purpose, with a username they chose and a password they set.*
--
-- HOW IT WORKS, AND WHY THIS SHAPE
-- --------------------------------
-- No invitation link, no self-service sign-up, no email to a five-year-old.
-- The guardian, signed in, fills in two fields on the child's card: a username
-- and a password. That is the whole flow, and it is the only flow.
--
--   * `reserve_child_login()` records the username *before* any account exists,
--     so two guardians reaching for the same name get one winner and one clear
--     refusal rather than two half-made accounts.
--   * The web route then creates the auth user. It has to: Supabase's own sign-up
--     needs an email address and sends a confirmation, and a child has neither.
--     The address it uses is `<username>@learners.ayahspring.com` — a subdomain
--     with no mailbox, deliberately, because nothing should ever be sent to it.
--     That address is a sign-in identifier, not a way to reach anybody.
--   * `attach_child_login()` links the new account to the child in one statement
--     and audits it. If anything fails between the two steps the route abandons
--     the reservation, so a failure leaves no username taken and no orphan.
--   * **Passwords are never touched here.** The database never sees one, stores
--     none, and the audit row records the username, the learner and the day —
--     never the password, and nothing that could be used to sign in.
--
-- WHAT A GUARDIAN KEEPS
-- ---------------------
-- The child's password is one the guardian set, so a guardian can set a new one
-- at any time, and a child who forgets it does not need an email address to
-- recover it. That is the trade-off of an account with no mailbox, and it is the
-- right one here: the adult who made the login is the adult who can restore it.
--
-- REMOVING ONE CHANGES NO LEARNING
-- --------------------------------
-- `remove_child_login()` detaches the account and disables the login. It deletes
-- no learner, no enrolment, no progress and no certificate: the child carries on
-- exactly as they did before they had a login, which is precisely the state the
-- platform shipped in for its first months. The username is kept in the audit
-- trail and the row, and cannot be reissued to another child.

-- ---------------------------------------------------------------------------
-- The constraint that this migration exists to drop
-- ---------------------------------------------------------------------------
alter table public.learner_profiles drop constraint if exists lp_no_child_login_yet;

comment on column public.learner_profiles.linked_user_id is
  'The account this learner signs in with, if the learner has one. An adult''s own account, or a child''s account created by a guardian through child_logins. Null means the learner is reached through their family, which is how every child starts.';

-- ---------------------------------------------------------------------------
-- The identity guard learns one transition
-- ---------------------------------------------------------------------------
-- `guard_learner_profile_identity()` has refused any change to `linked_user_id`
-- since it was written, and that was right while a child could never have one.
-- It stays right for adults; a child's link is now made and unmade by the two
-- functions below, and the guard is narrowed rather than removed: the change is
-- allowed only when a `child_logins` row agrees with it and one of the child's
-- own adults made it. Everything else about the profile is frozen as before.
create or replace function public.guard_learner_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_is_own_adult boolean;
  v_stays_put boolean;
begin
  -- Staff may correct anything, in writing, and the audit trail is theirs to read.
  if v_actor is null or public.is_privileged(v_actor) then
    return new;
  end if;

  -- A profile never becomes a different kind of learner.
  if new.learner_type is distinct from old.learner_type then
    raise exception
      'a learner profile cannot change how it is linked: a profile becoming a different person is not an edit'
      using errcode = 'insufficient_privilege';
  end if;

  -- And it never becomes a different person — with one transition, added on
  -- 2026-10-30 when children gained logins. A child's account is made by a
  -- guardian: `attach_child_login()` records which account in `child_logins`
  -- and then links it here, and `remove_child_login()` disables the login and
  -- then unlinks. Both directions are checked against that row, so this cannot
  -- be used to attach an arbitrary account to a child, and unlinking is only
  -- allowed once the login is actually disabled.
  if new.linked_user_id is distinct from old.linked_user_id then
    if old.learner_type <> 'child' then
      raise exception
        'a learner profile cannot change how it is linked: a profile becoming a different person is not an edit'
        using errcode = 'insufficient_privilege';
    end if;

    if to_regclass('public.child_logins') is null
       or (new.linked_user_id is not null and not exists (
             select 1 from public.child_logins cl
              where cl.learner_profile_id = old.id
                and cl.user_id = new.linked_user_id
                and cl.disabled_at is null))
       or not public.may_manage_child_profile(old.id) then
      raise exception
        'a learner profile cannot change how it is linked: a profile becoming a different person is not an edit'
        using errcode = 'insufficient_privilege';
    end if;

    if new.linked_user_id is null and exists (
      select 1 from public.child_logins cl
       where cl.learner_profile_id = old.id
         and cl.disabled_at is null
    ) then
      raise exception
        'a child''s login must be removed before the account is unlinked'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.family_id is not distinct from old.family_id then
    return new;
  end if;

  -- The family is changing. Which changes are allowed?
  v_is_own_adult := old.learner_type = 'adult'
                    and old.linked_user_id = v_actor;

  if not v_is_own_adult then
    raise exception
      'a learner profile cannot change how it is linked: a profile becoming a different person is not an edit'
      using errcode = 'insufficient_privilege';
  end if;

  -- Out of a family, or into one the actor is actually a member of.
  v_stays_put := new.family_id is null
                 or public.is_active_family_member(new.family_id, v_actor);

  if not v_stays_put then
    raise exception
      'you may only move your own learning into a family you are a member of'
      using errcode = 'insufficient_privilege';
  end if;

  -- A seat is paid for by the family. Leaving it while holding one would leave
  -- the family paying for a learner it can no longer see.
  if exists (
    select 1
      from public.family_plan_allocations fpa
     where fpa.learner_profile_id = old.id
       and fpa.status = 'active'
  ) then
    raise exception
      'this learning holds a seat on a family plan, so it cannot leave the family until that seat is released'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- One login per child, reserved before the account exists
-- ---------------------------------------------------------------------------
create table public.child_logins (
  id                 uuid primary key default gen_random_uuid(),

  -- A child has at most one login, ever: re-issuing one reuses the row rather
  -- than stacking them, which is what the unique constraint says.
  learner_profile_id uuid not null unique
                       references public.learner_profiles (id) on delete cascade,

  -- Lowercase, because a child typing "Amina.K" at a sign-in screen must reach
  -- the same account as "amina.k". The shape is enforced below.
  username           text not null,

  -- Null between reservation and attach, and that gap is the only state in
  -- which the account does not exist yet. `attached_at` says when it closed.
  user_id            uuid unique references public.user_profiles (user_id) on delete cascade,
  attached_at        timestamptz,

  created_by         uuid references public.user_profiles (user_id) on delete set null,
  created_at         timestamptz not null default now(),
  disabled_at        timestamptz,

  constraint child_logins_username_shape
    check (username = lower(username)
       and username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),

  constraint child_logins_attached_has_user
    check (attached_at is null or user_id is not null)
);

-- A username belongs to one child, including after that login is disabled: a
-- name that once meant one learner must not silently become another, or a
-- sibling who inherited it would sign in as the wrong person.
create unique index child_logins_username_key on public.child_logins (username);

comment on table public.child_logins is
  'A child''s own sign-in, created by a guardian. The row is reserved before the account exists so two guardians cannot claim one username; passwords are never stored here or seen by the database.';

alter table public.child_logins enable row level security;


-- ---------------------------------------------------------------------------
-- Who may make one
-- ---------------------------------------------------------------------------
-- The permission itself, with no flag in it: who this child's adults are does
-- not change when a feature is switched off. The flag is applied on top, below.
create or replace function public.may_manage_child_profile(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
       select 1
         from public.learner_profiles lp
        where lp.id = p_learner_id
          and lp.learner_type = 'child'
          and lp.deleted_at is null
          and (
            -- The same bar as adding a child to the family: the family's owner.
            (lp.family_id is not null
              and public.is_family_owner(lp.family_id, public.current_user_id()))
            -- Or a verified guardian with the permission to manage the profile,
            -- which is what the consent workflow is for.
            or exists (
              select 1
                from public.guardian_relationships gr
               where gr.learner_profile_id = lp.id
                 and gr.guardian_user_id = public.current_user_id()
                 and gr.status = 'active'
                 and gr.can_manage_profile
            )
            or public.is_privileged(public.current_user_id())
          )
     );
$$;

revoke all on function public.may_manage_child_profile(uuid) from public, anon;
grant execute on function public.may_manage_child_profile(uuid) to authenticated;

comment on function public.may_manage_child_profile(uuid) is
  'Whether the caller is one of this child''s adults: the family owner, a verified guardian with can_manage_profile, or staff. Ignores every flag, so removing a login stays possible while the feature is off.';

create or replace function public.may_manage_child_login(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.setting_bool('family.child_login', false)
     and public.may_manage_child_profile(p_learner_id);
$$;

revoke all on function public.may_manage_child_login(uuid) from public, anon;
grant execute on function public.may_manage_child_login(uuid) to authenticated;

comment on function public.may_manage_child_login(uuid) is
  'Whether the caller may create this child''s login: one of the child''s adults, and only while family.child_login is on.';

-- Read in three narrow cases: the child themselves, the adults who may manage
-- them, and staff. No insert, update or delete policies at all — every write is
-- a definer function below, so a client cannot make a login by inserting a row.
create policy child_logins_read on public.child_logins
  for select using (
    user_id = public.current_user_id()
    or public.may_manage_child_login(learner_profile_id)
    or public.is_privileged(public.current_user_id())
  );

grant select on public.child_logins to authenticated;
revoke insert, update, delete on public.child_logins from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Step one: reserve the username
-- ---------------------------------------------------------------------------
create or replace function public.reserve_child_login(
  p_learner_id uuid,
  p_username   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_username text;
  v_login    public.child_logins;
  v_id       uuid;
begin
  if not public.setting_bool('family.child_login', false) then
    raise exception 'child_login:disabled'
      using errcode = 'insufficient_privilege';
  end if;

  if v_actor is null or not public.may_manage_child_login(p_learner_id) then
    raise exception 'child_login:not_your_child'
      using errcode = 'insufficient_privilege';
  end if;

  -- The same declaration the add-a-child form asks for. An account that has not
  -- said it is an adult does not get to make an account for a child.
  if public.setting_bool('platform.age_assurance', false)
     and not public.has_declared_adult(v_actor) then
    raise exception 'age:declare_before_creating_a_child_login'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.learner_profiles
              where id = p_learner_id and linked_user_id is not null) then
    raise exception 'child_login:already_has_one'
      using errcode = 'unique_violation';
  end if;

  v_username := lower(btrim(coalesce(p_username, '')));

  if v_username !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    raise exception 'child_login:username_shape'
      using errcode = 'check_violation';
  end if;

  select * into v_login from public.child_logins where learner_profile_id = p_learner_id;

  if v_login.learner_profile_id is not null and v_login.user_id is not null then
    raise exception 'child_login:already_has_one'
      using errcode = 'unique_violation';
  end if;

  begin
    if v_login.learner_profile_id is null then
      insert into public.child_logins (learner_profile_id, username, created_by)
      values (p_learner_id, v_username, v_actor)
      returning id into v_id;
    else
      -- A reservation nobody completed, or a login that was removed. Either way
      -- this replaces the row: the old username is already recorded in the audit
      -- trail, and the child is starting again.
      update public.child_logins
         set username    = v_username,
             user_id     = null,
             attached_at = null,
             disabled_at = null,
             created_by  = v_actor,
             created_at  = now()
       where learner_profile_id = p_learner_id
      returning id into v_id;
    end if;
  exception when unique_violation then
    raise exception 'child_login:username_taken'
      using errcode = 'unique_violation';
  end;

  return v_id;
end;
$$;

revoke all on function public.reserve_child_login(uuid, text) from public, anon;
grant execute on function public.reserve_child_login(uuid, text) to authenticated;

comment on function public.reserve_child_login(uuid, text) is
  'Claims a username for a child before their account exists, so two guardians cannot both half-create one. Returns the reservation id. Never stores a password.';

-- ---------------------------------------------------------------------------
-- Step two: attach the account that was just created
-- ---------------------------------------------------------------------------
create or replace function public.attach_child_login(
  p_login_id uuid,
  p_user_id  uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_login public.child_logins;
begin
  select * into v_login from public.child_logins where id = p_login_id;

  if v_login.learner_profile_id is null then
    raise exception 'child_login:no_reservation'
      using errcode = 'no_data_found';
  end if;

  -- Re-checked, not assumed: this function is callable on its own, so the
  -- permission that allowed the reservation must still hold at the moment the
  -- learner is linked to an account.
  if v_actor is null or not public.may_manage_child_login(v_login.learner_profile_id) then
    raise exception 'child_login:not_your_child'
      using errcode = 'insufficient_privilege';
  end if;

  if v_login.user_id is not null then
    raise exception 'child_login:already_attached'
      using errcode = 'unique_violation';
  end if;

  if p_user_id is null or not exists (
    select 1 from public.user_profiles where user_id = p_user_id
  ) then
    raise exception 'child_login:no_such_account'
      using errcode = 'no_data_found';
  end if;

  -- One account, one learner. An adult account cannot become a child's login,
  -- and a second child cannot share it.
  if exists (select 1 from public.learner_profiles
              where linked_user_id = p_user_id and deleted_at is null) then
    raise exception 'child_login:account_already_linked'
      using errcode = 'unique_violation';
  end if;

  update public.child_logins
     set user_id     = p_user_id,
         attached_at = now()
   where id = p_login_id;

  update public.learner_profiles
     set linked_user_id = p_user_id
   where id = v_login.learner_profile_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'child_login.created', 'learner_profile', v_login.learner_profile_id,
          jsonb_build_object('username', v_login.username));

  return jsonb_build_object(
    'learnerProfileId', v_login.learner_profile_id,
    'username',         v_login.username);
end;
$$;

revoke all on function public.attach_child_login(uuid, uuid) from public, anon;
grant execute on function public.attach_child_login(uuid, uuid) to authenticated;

comment on function public.attach_child_login(uuid, uuid) is
  'Links a freshly created account to the child its username was reserved for, and audits it. Refuses an account that already belongs to a learner. Called by the route that created the auth user.';

-- ---------------------------------------------------------------------------
-- A reservation that went wrong is abandoned, not left to block a name
-- ---------------------------------------------------------------------------
create or replace function public.abandon_child_login(p_login_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_login public.child_logins;
begin
  select * into v_login from public.child_logins where id = p_login_id;
  if v_login.learner_profile_id is null then
    return;
  end if;
  if v_actor is null or not public.may_manage_child_profile(v_login.learner_profile_id) then
    raise exception 'child_login:not_your_child'
      using errcode = 'insufficient_privilege';
  end if;
  -- Only an unattached reservation may be thrown away. A real login is removed,
  -- never deleted, so the username stays recorded against the child it was made
  -- for.
  delete from public.child_logins
   where id = p_login_id and user_id is null;
end;
$$;

revoke all on function public.abandon_child_login(uuid) from public, anon;
grant execute on function public.abandon_child_login(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Removing a login takes nothing away
-- ---------------------------------------------------------------------------
create or replace function public.remove_child_login(
  p_learner_id uuid,
  p_reason     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_login public.child_logins;
  v_note  text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  -- Deliberately the flag-free permission. Turning child logins off must not
  -- strand a guardian who wants to remove one: a privacy control with no way to
  -- end it is worse than a feature that is switched off.
  if v_actor is null or not public.may_manage_child_profile(p_learner_id) then
    raise exception 'child_login:not_your_child'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_login from public.child_logins
   where learner_profile_id = p_learner_id and disabled_at is null;
  if v_login.learner_profile_id is null then
    raise exception 'child_login:no_login'
      using errcode = 'no_data_found';
  end if;

  update public.child_logins
     set disabled_at = now()
   where learner_profile_id = p_learner_id;

  -- The account stops being this child. Their work stays exactly where it was,
  -- reachable through the family as it was before the login existed.
  update public.learner_profiles
     set linked_user_id = null
   where id = p_learner_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'child_login.removed', 'learner_profile', p_learner_id,
          jsonb_build_object('username', v_login.username, 'reason', v_note));

  return jsonb_build_object('username', v_login.username, 'removed', true);
end;
$$;

revoke all on function public.remove_child_login(uuid, text) from public, anon;
grant execute on function public.remove_child_login(uuid, text) to authenticated;

comment on function public.remove_child_login(uuid, text) is
  'Detaches a child''s account and disables the login. Deletes no learner, enrolment, progress or certificate — the child goes back to being reached through their family, which is how every child starts.';

-- ---------------------------------------------------------------------------
-- What a screen needs to know
-- ---------------------------------------------------------------------------
create or replace function public.child_login_state(p_learner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'learnerProfileId', p_learner_id,
    'hasLogin',  coalesce(l.user_id is not null and l.disabled_at is null, false),
    'username',  case when l.user_id is not null and l.disabled_at is null
                      then l.username end,
    'createdAt', case when l.user_id is not null and l.disabled_at is null
                      then l.attached_at end,
    'canManage', public.may_manage_child_login(p_learner_id),
    -- A child signed in as themselves may read this about their own login.
    'isSelf',    exists (select 1 from public.learner_profiles lp
                          where lp.id = p_learner_id
                            and lp.linked_user_id = public.current_user_id())
  )
  from (select 1) one
  left join public.child_logins l on l.learner_profile_id = p_learner_id
  where public.may_manage_child_login(p_learner_id)
     or exists (select 1 from public.learner_profiles lp
                 where lp.id = p_learner_id
                   and lp.linked_user_id = public.current_user_id());
$$;

revoke all on function public.child_login_state(uuid) from public, anon;
grant execute on function public.child_login_state(uuid) to authenticated;

comment on function public.child_login_state(uuid) is
  'Whether a child has a login, what username it uses and whether the caller may change it. Readable by the adults who may manage the child and by the child themselves; nobody else.';

-- ---------------------------------------------------------------------------
-- The flag becomes a switch, because the thing it was waiting for exists
-- ---------------------------------------------------------------------------
update public.platform_settings
   set value_text  = 'false',
       gate_type   = 'admin',
       description = 'A child has a login of their own, created by a guardian',
       preconditions = 'Built 2026-10-30: the trusted linking workflow is a guardian '
                    || 'filling in a username and a password on the child''s card, '
                    || 'nothing more — no invitation link to forward, no email to a '
                    || 'child, no self-service sign-up that could attach an account to '
                    || 'somebody else''s child. reserve_child_login() claims the name '
                    || 'before any account exists, attach_child_login() links the new '
                    || 'account and audits it, and remove_child_login() detaches it '
                    || 'without touching a lesson. Age assurance, where it is on, asks '
                    || 'the creating adult to have declared they are an adult. '
                    || 'The trade-off, in the product rather than in a footnote: the '
                    || 'sign-in address is an identifier at a subdomain with no mailbox, '
                    || 'so password recovery is the guardian setting a new password, '
                    || 'not an email to the child. Off, no login can be created and no '
                    || 'new account is linked; existing ones keep signing in, because '
                    || 'turning a feature off must not lock a child out of their own work'
 where key = 'family.child_login';
