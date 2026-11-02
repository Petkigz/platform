-- -----------------------------------------------------------------------------
-- Eighteen: the record becomes theirs, or it is not kept
-- -----------------------------------------------------------------------------
-- The owner answered this on 2026-10-27 and it has been a promise in a binding
-- document ever since, with nothing behind it: *"When a learner turns 18 the record
-- becomes their own account, and they are asked whether to keep it. If they say no
-- it is deleted within 30 days."* Yesterday's correction to the children's policy
-- made the gap explicit rather than pretending it was built; this is the build.
--
-- **There is no birthday, and there is not going to be one.** The platform records
-- an age band and never a date of birth, which is the whole reason a child needs no
-- advertising profile — so nothing can notice an eighteenth birthday. What can
-- happen is that somebody *says so*: the young person, signing in on their own
-- login, or the adult holding the record. The declaration is recorded in the words
-- the platform uses, the same posture as the adult age assurance (`platform.age_
-- assurance` is declaration-only by decision), and a screen says plainly that a
-- statement is being recorded rather than checked.
--
-- **Two outcomes, and both are real deletions or real moves.**
--
--   * `keep` — the learner profile becomes an adult learner: it leaves the family,
--     keeps its linked account, and the account that used to be a guardian's
--     responsibility becomes the young person's own. Their progress, submissions,
--     certificates and enrolments do not move, because they were never copies: they
--     hang off the learner profile that is now theirs. The guardian loses reach
--     through `can_access_learner()`, which is the point and is therefore tested.
--   * `delete` — the profile is marked deleted, and the **existing** thirty-day
--     clock does the rest (`purge_learner_record`, `run_retention_jobs`). This is
--     the same clock the children's policy already describes, not a second one: a
--     record that is not kept is deleted thirty days after the decision, by the job
--     that already deletes it, with the certificate exception that already applies.
--
-- **What this deliberately does not do.** No staff queue, because a young person
-- taking their own record is not a request to be granted — the two people entitled
-- to ask are the learner and the adult who holds the record, and neither needs
-- permission from a third. No birthday, no date of birth, no "verified adult": the
-- platform cannot check an age it does not store, and inventing a verification it
-- cannot perform would be the same lie in a newer place.
--
-- The one thing a handover cannot do is walk out from under a paid seat: a learner
-- holding an active family plan allocation cannot leave the family until the seat is
-- released, and the guard that already says so still says so here.

-- -----------------------------------------------------------------------------
-- 1. The record of who asked, what they said, and what happened
-- -----------------------------------------------------------------------------
create table if not exists public.learner_handovers (
  id                 uuid primary key default gen_random_uuid(),

  -- The profile that moves. Cascades, because a handover is about a learner who
  -- stops existing when they are erased — but the audit row does not, and that is
  -- where the account of it survives.
  learner_profile_id uuid not null
                       references public.learner_profiles (id) on delete cascade,

  requested_by       uuid not null references public.user_profiles (user_id)
                       on delete cascade,

  -- Which of the two entitled people asked. `self` means the account linked to the
  -- learner; `guardian` means an adult in the family that holds them.
  requested_as       text not null check (requested_as in ('self', 'guardian')),

  decision           text not null check (decision in ('keep', 'delete')),

  -- The statement, in the platform's words, recorded rather than verified.
  declaration        text not null check (length(btrim(declaration)) > 20),

  status             text not null default 'requested'
                       check (status in ('requested', 'completed')),

  completed_at       timestamptz,
  created_at         timestamptz not null default now()
);

-- One open request per learner. A young person may change their mind before it is
-- acted on, and a second request while the first is open would be two answers to
-- one question.
create unique index if not exists learner_handovers_one_open
  on public.learner_handovers (learner_profile_id)
  where status = 'requested';

create index if not exists learner_handovers_by_requester
  on public.learner_handovers (requested_by, created_at desc);

comment on table public.learner_handovers is
  'A young person taking their learning record into an account of their own, or deciding it is not kept. Written only by request_learner_handover(); the profile changes it authorises are checked against it by guard_learner_profile_identity().';

alter table public.learner_handovers enable row level security;
revoke all on public.learner_handovers from anon, authenticated;

-- The person who asked may read their own history, and staff may read the record.
create policy learner_handovers_read_own on public.learner_handovers
  for select to authenticated
  using (
    requested_by = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

-- No insert, update or delete policy on purpose: the only writer is the definer
-- function below, which reads the session for the actor.

-- -----------------------------------------------------------------------------
-- 2. The identity guard learns one transition more
-- -----------------------------------------------------------------------------
-- The guard has refused a change of `learner_type` since it was written, and it was
-- right to: a profile becoming a different kind of learner is normally a profile
-- becoming a different person. A handover is the exception, and it is written as
-- narrowly as possible — the old row must be a child, the new row an adult, and an
-- open `keep` handover must exist for that exact profile. The family change that
-- goes with it is allowed on the same evidence, because an adult learner does not
-- live inside somebody else's household account.
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
  v_handover boolean := false;
begin
  -- Staff may correct anything, in writing, and the audit trail is theirs to read.
  if v_actor is null or public.is_privileged(v_actor) then
    return new;
  end if;

  -- One capacity is granted by a row rather than by a role: a recorded handover.
  -- `request_learner_handover()` is the only writer of `learner_handovers`, and it
  -- inserts the row *before* it touches the profile — so the existence of an open
  -- "keep" request is evidence that somebody entitled to ask has asked, and this
  -- guard can trust it without re-deriving who that was. Narrow on purpose: it
  -- allows exactly the two changes a handover makes, and nothing else.
  v_handover := exists (
    select 1 from public.learner_handovers h
     where h.learner_profile_id = old.id
       and h.status = 'requested'
       and h.decision = 'keep');

  -- A profile does not become a different kind of learner — with one transition,
  -- added when the eighteenth-birthday handover was built. A child who asks for
  -- their own record, with the guardian's family in the loop or without it, becomes
  -- an adult learner; the handover row above is what says so, and the profile does
  -- not move without one.
  if new.learner_type is distinct from old.learner_type then
    if not (old.learner_type = 'child' and new.learner_type = 'adult' and v_handover) then
      raise exception
        'a learner profile cannot change how it is linked: a profile becoming a different person is not an edit'
        using errcode = 'insufficient_privilege';
    end if;
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

  -- Out of the family on a handover: the record is the young person's now, and an
  -- adult learner does not sit inside somebody else's account.
  if not v_is_own_adult and not v_handover then
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


revoke all on function public.guard_learner_profile_identity() from public, anon;
grant execute on function public.guard_learner_profile_identity() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. The one door
-- -----------------------------------------------------------------------------
/**
 * Ask for the record, and act on the answer.
 *
 * Immediate rather than queued: the two people entitled to ask are the learner and
 * the adult who holds the record, and neither is asking a third for permission to
 * be 18. What the database adds is not a gate but a receipt — who asked, in which
 * capacity, what they stated, and what changed.
 *
 * The declaration is required, not assumed. A caller that asks for `keep` without
 * saying the learner is eighteen gets a refusal naming the sentence, because the
 * platform is recording a statement it cannot check and should not imply otherwise.
 */
create or replace function public.request_learner_handover(
  p_learner_id      uuid,
  p_decision        text,
  p_declares_adult  boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor     uuid := public.current_user_id();
  v_decision  text := lower(btrim(coalesce(p_decision, '')));
  v_learner   public.learner_profiles;
  v_own       boolean;
  v_in_family boolean;
  v_as        text;
  v_declare   text;
  v_handover  uuid;
  v_prior_family uuid;
begin
  if v_actor is null then
    raise exception 'handover:not_signed_in' using errcode = 'insufficient_privilege';
  end if;
  if v_decision not in ('keep', 'delete') then
    raise exception 'handover:decision_invalid'
      using errcode = 'check_violation',
            hint = 'keep the record, or let it be deleted';
  end if;
  if not coalesce(p_declares_adult, false) then
    raise exception 'handover:declaration_required'
      using errcode = 'check_violation',
            hint = 'the platform records that this learner is 18 or older; it does not store a date of birth to check';
  end if;

  select * into v_learner from public.learner_profiles where id = p_learner_id;
  if not found then
    raise exception 'handover:not_found' using errcode = 'no_data_found';
  end if;
  if v_learner.learner_type <> 'child' then
    raise exception 'handover:not_a_child'
      using errcode = 'check_violation',
            hint = 'an adult already holds their own record; there is nothing to hand over';
  end if;
  if v_learner.deleted_at is not null or v_learner.status <> 'active' then
    raise exception 'handover:not_active'
      using errcode = 'check_violation',
            hint = 'this record is already on its way out';
  end if;

  -- `coalesce`, because `null = uuid` is null and `not null` is still null: a profile
  -- with no linked account would have slipped past the refusal below and let a
  -- stranger hand over somebody else's child. Three-valued logic, one line, and the
  -- test that caught it is the first one in the suite.
  v_own       := coalesce(v_learner.linked_user_id = v_actor, false);
  v_in_family := public.is_learner_family_member(p_learner_id);

  if not v_own and not v_in_family then
    raise exception 'handover:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'the learner, or an adult in their family, is the only one who can ask for this';
  end if;

  -- Keeping the record means it becomes an account. There has to be an account.
  if v_decision = 'keep' and v_learner.linked_user_id is null then
    raise exception 'handover:needs_an_account'
      using errcode = 'check_violation',
            hint = 'the record can only become their own account once they have one; make them a login first, then hand it over';
  end if;

  if exists (select 1 from public.learner_handovers h
              where h.learner_profile_id = p_learner_id and h.status = 'requested') then
    raise exception 'handover:already_requested'
      using errcode = 'unique_violation',
            hint = 'one request at a time; the last one has not been acted on yet';
  end if;

  v_as := case when v_own then 'self' else 'guardian' end;
  v_declare := case when v_own
    then 'The learner asked for this themselves and states that they are 18 or older.'
    else 'An adult in the learner''s family asked for this and states that the learner is 18 or older.'
  end;

  insert into public.learner_handovers
    (learner_profile_id, requested_by, requested_as, decision, declaration)
  values
    (p_learner_id, v_actor, v_as, v_decision, v_declare)
  returning id into v_handover;

  v_prior_family := v_learner.family_id;

  if v_decision = 'keep' then
    -- Two statements, in this order: the profile becomes an adult first, and only
    -- then may it leave the family. The guard reads the *old* row, so doing both in
    -- one statement would be judged as "a child changing family", which is refused.
    update public.learner_profiles
       set learner_type = 'adult',
           age_band     = '18+'
     where id = p_learner_id;

    update public.learner_profiles
       set family_id = null
     where id = p_learner_id;

    -- The login stops being something a guardian manages. The account itself is
    -- untouched: it is the young person's now, and their password is their own.
    update public.child_logins
       set disabled_at = now()
     where learner_profile_id = p_learner_id
       and disabled_at is null;
  else
    -- Not kept. The existing clock does the deleting — thirty days, by the job that
    -- already deletes a child's learning record, with the certificate exception the
    -- children's policy states. Marking it here starts that clock.
    update public.learner_profiles
       set deleted_at = now()
     where id = p_learner_id;
  end if;

  update public.learner_handovers
     set status = 'completed',
         completed_at = now()
   where id = v_handover;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'learner.handover_completed', 'learner_profile', p_learner_id,
          jsonb_build_object(
            'decision', v_decision,
            'requestedAs', v_as,
            'declaration', v_declare,
            'linkAccount', v_learner.linked_user_id,
            'leftFamily', v_prior_family is not null,
            'deletionDue', case when v_decision = 'delete'
                                then (now() + interval '30 days')::date end,
            'handoverId', v_handover));

  return jsonb_build_object(
    'status', 'completed',
    'decision', v_decision,
    'learnerProfileId', p_learner_id,
    'requestedAs', v_as,
    'becameOwnAccount', v_learner.linked_user_id,
    'leftFamily', v_prior_family is not null,
    'deletionDue', case when v_decision = 'delete'
                        then (now() + interval '30 days')::date end);
end;
$$;

revoke all on function public.request_learner_handover(uuid, text, boolean) from public, anon;
grant execute on function public.request_learner_handover(uuid, text, boolean) to authenticated;

comment on function public.request_learner_handover(uuid, text, boolean) is
  'The learner, or an adult in their family, records that they are 18 or older and decides whether the record becomes their own account or is deleted in thirty days. Records the statement rather than checking it; the profile changes are authorised by the row this function writes first.';
