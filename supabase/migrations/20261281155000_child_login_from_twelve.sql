-- A child's own login, from twelve.
--
-- The owner, 2026-11-24: children under twelve are managed by their
-- guardian; children of twelve and over have their own private login, still
-- under the family account.
--
-- The platform keeps no date of birth, deliberately. It keeps an age band:
-- 5-7, 8-10, 11-13, 14-17. Three of the four bands answer the question by
-- themselves. 11-13 does not, so there the guardian is asked, yes or no,
-- whether the child is twelve or older, and the yes is recorded: who said
-- it, when, for which child. No date is asked for and none is stored.
--
--   5-7, 8-10   no login of their own. They learn through the guardian's
--               sign-in, as before.
--   11-13       a login only when the guardian says the child is twelve or
--               older.
--   14-17       a login, as before.
--
-- The guardian still creates the login, and chooses the first password,
-- because the guardian has to hand it to the child. The login is then the
-- child's: the child chooses their own password after signing in, and the
-- guardian does not see it. The guardian can still set a new one (when
-- `family.child_password_recovery` is on), and the child is then asked to
-- choose their own again.
--
-- What a guardian says is a declaration and not a check. A guardian who
-- changes the band, or says yes untruthfully, gets a login made. The record
-- says who declared it.
--
-- A login that already exists is not taken away by this migration, whatever
-- the band. None exists on the hosted project: `family.child_login` has
-- never been on.
--
-- Both switches (`family.child_login`, `family.child_password_recovery`)
-- stay off.

-- ---------------------------------------------------------------------------
-- What is recorded
-- ---------------------------------------------------------------------------
alter table public.child_login_attempts
  add column if not exists twelve_declared_at timestamptz;

comment on column public.child_login_attempts.twelve_declared_at is
  'When the guardian who reserved this login said the child is twelve or older. Null for a child in the 14-17 band, where nobody is asked. A declaration, not a date of birth.';

alter table public.child_logins
  add column if not exists own_password_at timestamptz;

comment on column public.child_logins.own_password_at is
  'When the child last chose their own password. Null while the password in force is one a guardian set.';

-- ---------------------------------------------------------------------------
-- What an age band means for a login
-- ---------------------------------------------------------------------------
create or replace function public.child_login_age_gate(p_age_band text)
returns text
language sql
immutable
as $$
  select case
    when p_age_band = '14-17' then 'open'
    when p_age_band = '11-13' then 'confirm'
    else 'under_twelve'
  end;
$$;

comment on function public.child_login_age_gate(text) is
  'open: a login may be made. confirm: only when the guardian says the child is twelve or older. under_twelve: no login of their own.';

-- ---------------------------------------------------------------------------
-- Reserving a login
-- ---------------------------------------------------------------------------
-- The reservation written in 20261281061000 is kept whole, with its locks,
-- under another name that nobody but this migration's function may call.
alter function public.prepare_child_login(uuid, text) rename to child_login_reserve;
revoke all on function public.child_login_reserve(uuid, text) from public, anon, authenticated;

create function public.prepare_child_login(
  p_learner uuid,
  p_username text,
  p_twelve_or_older boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_band    text;
  v_gate    text;
  v_attempt uuid;
begin
  -- The same two refusals, in the same order, as the reservation itself: an
  -- account that is not this child's guardian learns nothing about the band.
  if not public.setting_bool('family.child_login', false) then
    raise exception 'child_login:disabled' using errcode = 'insufficient_privilege';
  end if;
  if v_actor is null or not public.child_login_verified_guardian(v_actor, p_learner) then
    raise exception 'child_login:verified_guardian_required' using errcode = 'insufficient_privilege';
  end if;

  select lp.age_band into v_band from public.learner_profiles lp where lp.id = p_learner;
  v_gate := public.child_login_age_gate(v_band);
  if v_gate = 'under_twelve' then
    raise exception 'child_login:under_twelve' using errcode = 'insufficient_privilege';
  end if;
  if v_gate = 'confirm' and p_twelve_or_older is not true then
    raise exception 'child_login:confirm_twelve' using errcode = 'insufficient_privilege';
  end if;

  v_attempt := public.child_login_reserve(p_learner, p_username);

  -- Written once. A retry of the same reservation does not move the time.
  if v_gate = 'confirm' then
    update public.child_login_attempts a
       set twelve_declared_at = now()
     where a.id = v_attempt and a.twelve_declared_at is null;
    if found then
      insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
      values (v_actor, 'child_login.twelve_declared', 'learner_profile', p_learner,
              jsonb_build_object('age_band', v_band));
    end if;
  end if;

  return v_attempt;
end;
$$;

comment on function public.prepare_child_login(uuid, text, boolean) is
  'A verified guardian reserves a login for a child. Refused for the 5-7 and 8-10 bands; for 11-13 only with the guardian''s yes that the child is twelve or older, which is recorded; 14-17 as before. No date of birth is asked for.';

revoke all on function public.prepare_child_login(uuid, text, boolean) from public, anon;
grant execute on function public.prepare_child_login(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Whose password is in force
-- ---------------------------------------------------------------------------
-- Runs at the end of the transaction that changed a password, after
-- `guard_child_password_recovery` (triggers on one row fire in name order).
-- If a guardian's reset was completed in this transaction the password is
-- the guardian's; otherwise the child changed it themselves.
--
-- One case is read the cautious way: a child's own change that began while a
-- guardian's reset was still being written counts as the guardian's, and the
-- child is asked once more.
create or replace function public.note_child_password_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.encrypted_password is not distinct from old.encrypted_password then
    return new;
  end if;
  update public.child_logins l
     set own_password_at = case
           when exists (select 1 from public.child_password_recovery_attempts a
                         where a.identity_id = new.id
                           and a.completed_at is not null
                           and a.completed_at >= now())
           then null
           else clock_timestamp()
         end
   where l.user_id = new.id and l.disabled_at is null;
  return new;
end;
$$;

revoke all on function public.note_child_password_owner() from public, anon, authenticated;

create constraint trigger note_child_password_owner
  after update of encrypted_password on auth.users
  deferrable initially deferred
  for each row execute function public.note_child_password_owner();

-- ---------------------------------------------------------------------------
-- What the guardian's page and the child's sign-in need to know
-- ---------------------------------------------------------------------------
-- For the guardian: may a login be made for this child, and has the child
-- chosen their own password. Silence for anybody else.
create or replace function public.child_login_age(p_learner uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'gate', public.child_login_age_gate(lp.age_band),
    'ownPassword', (select l.own_password_at is not null
                      from public.child_logins l
                     where l.learner_profile_id = lp.id
                       and l.user_id is not null and l.disabled_at is null))
    from public.learner_profiles lp
   where lp.id = p_learner
     and lp.learner_type = 'child'
     and public.can_manage_child_login_safely(p_learner);
$$;

comment on function public.child_login_age(uuid) is
  'For an account that manages this child: whether a login may be made (open, confirm, under_twelve) and whether the child has chosen their own password. Null for anybody else.';

-- For the signed-in account itself: am I a child''s login, and is the
-- password still the one my guardian set.
create or replace function public.my_child_login()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'isChild', l.id is not null,
    'username', l.username,
    'ownPassword', l.own_password_at is not null)
    from (select 1) one
    left join public.child_logins l
      on l.user_id = public.current_user_id() and l.disabled_at is null
   where public.current_user_id() is not null;
$$;

comment on function public.my_child_login() is
  'For the signed-in account: whether it is a child''s login, and whether the child has chosen their own password yet.';

revoke all on function public.child_login_age_gate(text) from public, anon;
revoke all on function public.child_login_age(uuid) from public, anon;
revoke all on function public.my_child_login() from public, anon;
grant execute on function public.child_login_age_gate(text) to authenticated;
grant execute on function public.child_login_age(uuid) to authenticated;
grant execute on function public.my_child_login() to authenticated;

-- ---------------------------------------------------------------------------
-- What the switch says before it is turned on
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = preconditions || ' From 2026-11-24 a login is made only for a child of twelve or over: the 5-7 and 8-10 bands are refused, 11-13 needs the guardian''s yes (recorded, no date of birth), 14-17 is as before. The child is asked to choose their own password at first sign-in.'
 where key = 'family.child_login'
   and preconditions not like '%twelve or over%';
