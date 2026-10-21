-- The teacher decides how big their class is, including after it starts.
--
-- `cohorts.capacity` could only be set by `create_cohort()`. That was tolerable
-- while the number was something only `join_cohort()` read, and a teacher who
-- guessed wrong could close the class and open another. It stopped being tolerable
-- the moment the course page began telling a learner "3 of 12 places taken" and
-- putting a **Full** badge on a class: the number is now published to the people
-- it refuses, and there was no way to change it. A teacher with fourteen people
-- who want in and a class opened for twelve had two bad options — cancel a
-- running class and open a new one, moving everybody's membership and leaving the
-- conversation behind, or turn learners away for a number they typed once.
--
-- So the number is editable by the person who owns it, on the same terms as the
-- join window: the teacher who opened the class, or staff, while it is a draft or
-- open, under a row lock, audited.
--
-- **The floor is the people already in the room.** A capacity below the current
-- active membership is refused, naming the count. The alternatives are worse:
-- silently allowing it would put the class into a state its own page cannot
-- describe ("14 of 12 places taken"), and enforcing it would mean removing a
-- learner from a class because a number changed — which for a child's class is
-- the single most harmful thing this feature could do. Raising the limit is the
-- act that needs no protection, and it is the one a teacher actually wants.
--
-- Null is allowed and means no limit, the same as at creation. Removing a cap is
-- a real choice ("I will take everybody") and is not the same as leaving the
-- field blank by accident, so the writer takes it explicitly rather than
-- defaulting to it.
--
-- The lock matters, and it is the same lock `join_cohort()` takes. Both writers
-- select the cohort row `for update` before they count anything, so a joiner
-- cannot slip in between this function counting the members and writing the new
-- limit: either the join lands first and the floor is computed with them in it,
-- or the limit lands first and the join is refused for spare capacity. Without
-- that ordering the floor could be satisfied against a count that is already
-- stale, which is exactly how a class ends up over its own limit.
--
-- Not flag-gated, like `set_cohort_join_window()` and unlike `create_cohort()`.
-- The flag governs arriving: with `learning.cohorts` off, `join_cohort()` refuses
-- and an open cohort is invisible to a bystander, so a size change publishes
-- nothing. Taking the control away when the platform switch flips would strand a
-- teacher mid-class for a decision that is not about them, which is the same
-- reason closing and cancelling stay possible with the flag off.

create or replace function public.set_cohort_capacity(
  p_cohort_id uuid,
  p_capacity  integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_status text;
  v_old integer;
  v_active integer;
begin
  if v_actor is null then
    raise exception 'sign in to change a cohort' using errcode = 'insufficient_privilege';
  end if;

  if p_capacity is not null and p_capacity < 1 then
    raise exception 'capacity must be at least one' using errcode = 'check_violation';
  end if;

  select c.status, c.capacity
    into v_status, v_old
    from public.cohorts c
   where c.id = p_cohort_id and c.deleted_at is null
   for update;
  if not found then
    raise exception 'cohort not found' using errcode = 'no_data_found';
  end if;

  if not public.can_manage_cohort(p_cohort_id) then
    raise exception 'only the teacher who opened this cohort can change it'
      using errcode = 'insufficient_privilege';
  end if;

  -- A closed or cancelled class is not taking anybody, so its size is history
  -- rather than a setting. The same rule as the join window, for the same reason.
  if v_status not in ('draft', 'open') then
    raise exception 'a % cohort is not accepting joiners, so its size cannot change', v_status
      using errcode = 'check_violation';
  end if;

  -- Counted under the lock taken above, so this is the membership as it will
  -- still be when the update lands.
  select count(*)::integer
    into v_active
    from public.cohort_members m
   where m.cohort_id = p_cohort_id
     and m.status = 'active';

  if p_capacity is not null and p_capacity < v_active then
    raise exception 'this class already has % learner%, so its limit cannot go below that',
      v_active, case when v_active = 1 then '' else 's' end
      using errcode = 'check_violation';
  end if;

  update public.cohorts
     set capacity = p_capacity
   where id = p_cohort_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.capacity_set', 'cohort', p_cohort_id,
          jsonb_build_object('previous_capacity', v_old,
                             'capacity', p_capacity,
                             'active_members', v_active,
                             'status', v_status));

  return p_capacity;
end;
$$;

revoke all on function public.set_cohort_capacity(uuid, integer) from public;
grant execute on function public.set_cohort_capacity(uuid, integer) to authenticated;

comment on function public.set_cohort_capacity(uuid, integer) is
  'The teacher who opened the class, or staff, sets how many learners it holds — while it is a draft or open, never below the number already in it, and null for no limit. Takes the same row lock join_cohort() does, so the floor cannot be computed against a stale count. Audited as cohort.capacity_set.';

comment on column public.cohorts.capacity is
  'How many active members this class holds; null is no limit. Set when the class is opened and changed by set_cohort_capacity(), never below the members already in it. join_cohort() enforces it under a row lock, and cohort_places() publishes it to a learner as "3 of 12 places taken".';
