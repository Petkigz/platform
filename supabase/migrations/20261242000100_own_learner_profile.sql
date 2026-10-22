-- An adult can become a learner.
--
-- Until now they could not. Nothing in the application ever created an adult
-- `learner_profile`: `/family` creates children, and the checkout needs a learner to
-- name, so a person who signed up and chose a course met a page that said "there is
-- nobody to buy this for yet — add a learner profile first" and offered a link to a
-- screen that can only add a child. Every learner flow — enrolment, checkout, progress,
-- certificates, sharing — starts from a profile, and the first step of all of them was
-- missing.
--
-- So this is one small writer, and it is the only one that can create an adult profile:
--
--   * **Idempotent.** Calling it twice returns the same profile rather than failing or
--     making a second one. `learner_profiles_linked_user_key` is unique on
--     `linked_user_id`, so a second row could not exist anyway — but the sentence a
--     double-click reads should be "you are ready", not a unique-violation.
--   * **It does not undo moderation.** A profile that exists but is archived or
--     soft-deleted is not silently revived: that state was a decision, and a button on
--     an account page is not the place to overturn it. It is refused, in words that say
--     to contact support.
--   * **The name is the account's name.** `display_name` is required and not blank, so
--     the account's own display name is the obvious source; a blank one falls back
--     rather than failing, because a missing name is not a reason to block somebody.

create or replace function public.claim_own_learner_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_existing public.learner_profiles;
  v_name     text;
  v_id       uuid;
begin
  if v_actor is null then
    raise exception 'sign in to start learning'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_existing
    from public.learner_profiles lp
   where lp.linked_user_id = v_actor;

  if found then
    if v_existing.deleted_at is not null or v_existing.status <> 'active' then
      raise exception
        'a learner profile for this account was removed, so it cannot be recreated here. Contact us and we will sort it out'
        using errcode = 'insufficient_privilege';
    end if;

    -- Already ready. The second click, and every page that offers the button before it
    -- knows better, gets the same answer.
    return jsonb_build_object(
      'learnerProfileId', v_existing.id,
      'created', false,
      'learnerType', v_existing.learner_type,
      'ageBand', v_existing.age_band
    );
  end if;

  select nullif(btrim(up.display_name), '')
    into v_name
    from public.user_profiles up
   where up.user_id = v_actor;

  insert into public.learner_profiles
    (display_name, learner_type, age_band, linked_user_id, status)
  values
    (coalesce(v_name, 'My learning'), 'adult', '18+', v_actor, 'active')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'learner.profile_created', 'learner_profile', v_id,
          jsonb_build_object('learnerType', 'adult', 'source', 'self'));

  return jsonb_build_object(
    'learnerProfileId', v_id,
    'created', true,
    'learnerType', 'adult',
    'ageBand', '18+'
  );
end;
$$;

comment on function public.claim_own_learner_profile() is
  'Creates the signed-in adult''s own learner profile, or returns the one they already have. Idempotent; refuses to revive a profile that was archived or deleted.';

revoke all on function public.claim_own_learner_profile() from public, anon;
grant  execute on function public.claim_own_learner_profile() to authenticated;
