-- Coordinate with the resource-aware player and a rollout that drains older
-- app instances before enabling writes. The old lesson-wide value remains
-- readable for explicit learner review; authenticated clients can no longer
-- write it. Function owners and service roles are outside this boundary.
-- Revocation does not cancel a statement already running when this is applied.
revoke all on function public.compare_record_lesson_position(uuid, uuid, integer, uuid)
  from public, anon, authenticated;
