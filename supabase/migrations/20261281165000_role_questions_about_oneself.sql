-- Whether an account is staff is a question a caller may ask about itself.
--
-- WHY THIS EXISTS
-- ---------------
-- Named as left alone at the foot of migration 20261281164000, and measured
-- on 2026-11-28 on a database built from the 371 migrations before this one
-- (so the hosted test project behaves the same until this is applied there).
-- Every stable function the API roles may call that takes a uuid was called
-- as `authenticated` and as `anon`, once naming an account that holds the four
-- staff roles and once naming an ordinary one. Nine answered differently:
--
--   anon and authenticated   has_role(uuid, text), is_privileged(uuid)
--   authenticated            can_appoint_teacher(uuid),
--                            can_decide_guardian_consent(uuid),
--                            can_decide_sponsorship(uuid),
--                            can_moderate_boards(uuid),
--                            can_work_incidents(uuid),
--                            may_change_control(uuid, text),
--                            may_write_setting(uuid, text, text)
--
-- So a visitor who was not signed in could ask, for any account id, whether
-- it belongs to staff and which staff role it holds (and whether it is a
-- teacher, a reviewer or a panel member). Account ids are not secret: they
-- are on course versions, review assignments, posts and decisions. Nothing
-- could be written this way. What it gave was the list of accounts worth
-- attacking.
--
-- The two functions have to be callable: 131 policies ask them about the
-- caller, and the application asks them about the signed-in person from about
-- 145 places. Neither ever asks about anybody else. Inside the database,
-- functions that run with the owner's rights do ask about other people (who
-- may be sent an alert, whose approval counts), and must go on being able to.
--
-- WHAT THIS DOES
-- --------------
--   * The lookups move, unchanged, into `account_has_role(uuid, text)` and
--     `account_is_privileged(uuid)`, which the API roles may not execute. The
--     grant on those two is the one statement of who may ask about another
--     account: the owner of the schema (so every function that runs with the
--     owner's rights) and the server's own key.
--   * `own_account_has_role(uuid, text)` and `own_account_is_privileged(uuid)`
--     answer when the id they are handed is the caller's own and say nothing
--     (null) when it is anybody else's, staff or not.
--   * `has_role(uuid, text)` and `is_privileged(uuid)` keep their names,
--     arguments and grants, and now run with the CALLER's rights. Asked about
--     nobody (a visitor has no id) they say false, as before. Asked about the
--     caller they answer through the two functions above. Asked about anybody
--     else they answer only for a role that may execute the lookup, and
--     refuse everybody else with 42501. It is a refusal, not `false`: `false`
--     would be an answer, and a wrong one about a member of staff.
--   * The seven functions built on them run with the caller's rights as well,
--     with their bodies untouched, so the same rule reaches them.
--   * One policy asked about somebody else: a published teacher's page is
--     public only while its owner still holds the teaching role. It now asks
--     `teaches_in_public(uuid)`, which says yes only for an account whose
--     published page is already public, and so tells nobody anything the
--     page does not.
--
-- WHAT IT DOES NOT DO
-- -------------------
-- It adds no table and no column and changes no row. It does not hide a staff
-- member where the product shows one on purpose (the name on a decision, a
-- reply in a support case). It does not look at the other functions the API
-- roles may call about an account id they are handed, which disclose other
-- facts and were not measured here: `has_declared_adult(uuid)`,
-- `is_family_owner`, `is_family_member_of`, `is_active_family_member`,
-- `is_institution_admin`, `is_authorised_reviewer`, `can_access_lesson`,
-- `can_access_course_version`, `can_enrol_in_version`,
-- `can_use_lesson_study_data`, `may_read_shared_learning`.

-- ---------------------------------------------------------------------------
-- 1. The lookups, for the owner and the server's key only
-- ---------------------------------------------------------------------------
-- The rule is that of migration 20261281057000, word for word: a privileged
-- role counts only while its account is active and not deleted.
--
-- PL/pgSQL, here and in the two below, because of what was measured while
-- this was written (in the engine the suites run on, which is slower than a
-- server; the proportions are what matter). A policy asks these questions
-- once for every row it reads. Written in SQL and reached through
-- `has_role()` below, each was planned again on every call: 20 000 questions
-- about the caller took about 6 seconds where the function before this
-- migration took 0.45. PL/pgSQL keeps its plan for the session, and as
-- written here the same 20 000 take about 0.86. That is still about twice
-- the old cost of the question itself (43 millionths of a second against
-- 22): finding out who is asking costs 17 of them, and the old function
-- never asked.
create function public.account_has_role(p_user_id uuid, p_role_code text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return exists (
    select 1 from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    join public.user_profiles p on p.user_id = ura.user_id
    where ura.user_id = p_user_id and r.code = p_role_code and ura.revoked_at is null
      and (not r.is_privileged or (p.account_status = 'active' and p.deleted_at is null))
  );
end;
$$;

create function public.account_is_privileged(p_user_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return exists (
    select 1 from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    join public.user_profiles p on p.user_id = ura.user_id
    where ura.user_id = p_user_id and r.is_privileged and ura.revoked_at is null
      and p.account_status = 'active' and p.deleted_at is null
  );
end;
$$;

revoke all on function public.account_has_role(uuid, text) from public, anon, authenticated;
revoke all on function public.account_is_privileged(uuid) from public, anon, authenticated;
grant execute on function public.account_has_role(uuid, text) to service_role;
grant execute on function public.account_is_privileged(uuid) to service_role;

comment on function public.account_has_role(uuid, text) is
  'Whether ANY account holds a role: unrevoked membership, and for a privileged role an active, undeleted profile. Not executable by anon or authenticated; that grant is the one statement of who may ask about another account. Everybody else asks has_role().';
comment on function public.account_is_privileged(uuid) is
  'Whether ANY account is an active, undeleted profile with an unrevoked privileged role. Not executable by anon or authenticated. Everybody else asks is_privileged().';

-- ---------------------------------------------------------------------------
-- 2. The same questions, answered only about the caller
-- ---------------------------------------------------------------------------
-- Null, not false, for an id that is not the caller's: it has to be told
-- apart from "no", and it is the same null whoever the id belongs to.
-- `current_user_id()` is asked here and nowhere else on the way, because it
-- is the dear part.
create function public.own_account_has_role(p_user_id uuid, p_role_code text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if p_user_id is null or p_user_id is distinct from public.current_user_id() then
    return null;
  end if;
  return public.account_has_role(p_user_id, p_role_code);
end;
$$;

create function public.own_account_is_privileged(p_user_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if p_user_id is null or p_user_id is distinct from public.current_user_id() then
    return null;
  end if;
  return public.account_is_privileged(p_user_id);
end;
$$;

revoke all on function public.own_account_has_role(uuid, text) from public;
revoke all on function public.own_account_is_privileged(uuid) from public;
grant execute on function public.own_account_has_role(uuid, text) to anon, authenticated, service_role;
grant execute on function public.own_account_is_privileged(uuid) to anon, authenticated, service_role;

comment on function public.own_account_has_role(uuid, text) is
  'Whether the CALLER holds a role. Null when the id is not the caller''s own, whoever it belongs to. has_role() is the name to call.';
comment on function public.own_account_is_privileged(uuid) is
  'Whether the CALLER is staff. Null when the id is not the caller''s own, whoever it belongs to. is_privileged() is the name to call.';

-- ---------------------------------------------------------------------------
-- 3. The two names everything calls
-- ---------------------------------------------------------------------------
-- PL/pgSQL for a second reason here: PostgreSQL checks the right to execute
-- every function named in an SQL expression when the expression is set up,
-- including the branch of a CASE that is never taken, so an SQL body would
-- refuse the caller's question about itself too.
--
-- And the right to ask about somebody else is looked up by name on every
-- call, not left to that check. Found while the hosted step for this
-- migration was being tested: PL/pgSQL sets an expression up once in a
-- transaction and keeps it, and the right to execute is checked at set-up
-- only. With the refusal left to PostgreSQL, once anything allowed to ask had
-- asked (a function running with the owner's rights, say), every later
-- question in the same transaction was answered, whoever asked it. One
-- request through the API is one transaction and one role, and no way to do
-- this through it was found; the rule should not rest on that.
create or replace function public.has_role(p_user_id uuid, p_role_code text)
returns boolean language plpgsql stable security invoker set search_path = public as $$
declare
  v_own boolean;
begin
  if p_user_id is null then
    return false;
  end if;
  v_own := public.own_account_has_role(p_user_id, p_role_code);
  if v_own is not null then
    return v_own;
  end if;
  if not pg_catalog.has_function_privilege(current_user, 'public.account_has_role(uuid,text)', 'execute') then
    raise exception 'whether an account holds a role is answered to that account only'
      using errcode = 'insufficient_privilege';
  end if;
  return public.account_has_role(p_user_id, p_role_code);
end;
$$;

create or replace function public.is_privileged(p_user_id uuid)
returns boolean language plpgsql stable security invoker set search_path = public as $$
declare
  v_own boolean;
begin
  if p_user_id is null then
    return false;
  end if;
  v_own := public.own_account_is_privileged(p_user_id);
  if v_own is not null then
    return v_own;
  end if;
  if not pg_catalog.has_function_privilege(current_user, 'public.account_is_privileged(uuid)', 'execute') then
    raise exception 'whether an account is staff is answered to that account only'
      using errcode = 'insufficient_privilege';
  end if;
  return public.account_is_privileged(p_user_id);
end;
$$;

comment on function public.has_role(uuid, text) is
  'Role membership, asked with the caller''s rights. About nobody: false. About the caller: answered. About anybody else: answered only for a role that may execute account_has_role() (the owner, so every security definer function, and the server''s key); anon and authenticated are refused with 42501. In a policy, ask about current_user_id(), never about a row''s user.';
comment on function public.is_privileged(uuid) is
  'Staff or not, asked with the caller''s rights. About nobody: false. About the caller: answered. About anybody else: answered only for a role that may execute account_is_privileged(); anon and authenticated are refused with 42501.';

-- ---------------------------------------------------------------------------
-- 4. The seven built on them
-- ---------------------------------------------------------------------------
-- Each is one expression over has_role() and is_privileged() and reads no
-- table of its own, so it needs nobody's rights but the caller's. Called by a
-- function that runs with the owner's rights it still answers about anybody.
alter function public.can_appoint_teacher(uuid) security invoker;
alter function public.can_decide_guardian_consent(uuid) security invoker;
alter function public.can_decide_sponsorship(uuid) security invoker;
alter function public.can_moderate_boards(uuid) security invoker;
alter function public.can_work_incidents(uuid) security invoker;
alter function public.may_change_control(uuid, text) security invoker;
alter function public.may_write_setting(uuid, text, text) security invoker;

-- ---------------------------------------------------------------------------
-- 5. The one policy that asked about a row's owner
-- ---------------------------------------------------------------------------
-- The rule is the one the policy held: published, the switch on, and the
-- owner still a teacher. All three are inside the function, so that asked
-- directly about any id it says yes exactly where the page can be read.
create function public.teaches_in_public(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.setting_bool('teaching.public_profile', false)
     and public.account_has_role(p_user_id, 'instructor')
     and exists (
       select 1 from public.instructor_public_profiles ipp
        where ipp.user_id = p_user_id and ipp.status = 'published');
$$;

revoke all on function public.teaches_in_public(uuid) from public;
grant execute on function public.teaches_in_public(uuid) to anon, authenticated, service_role;

comment on function public.teaches_in_public(uuid) is
  'Whether an account''s teacher page is public: published, teaching.public_profile on, and the owner still holds the instructor role. True only where the page itself can already be read.';

alter policy instructor_public_profiles_read on public.instructor_public_profiles
  using (
    user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
    or (
      status = 'published'
      and public.setting_bool('teaching.public_profile', false)
      and public.teaches_in_public(user_id)
    )
  );
