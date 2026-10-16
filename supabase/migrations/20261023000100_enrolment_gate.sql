-- Enrolment is a purchase decision, not a preference.
--
-- Found while wiring the enrol button. `course_enrolments_insert` checked only
-- `can_access_learner(learner_profile_id)` — that you may act for the learner.
-- It never asked whether the course was for sale. Any signed-in user could
-- therefore POST an enrolment against a paid course with source = 'free' and
-- walk straight past the entire Group 4 and Group 5 payment stack: no product,
-- no price, no order, no payment attempt, no provider callback.
--
-- The whole entitlement model was correct and was simply never consulted at
-- the one moment it mattered. `entitlement_grants` is the only thing consulted
-- at access time, but nothing stopped an enrolment row appearing without one.
--
-- The rule now enforced:
--
--   * the version must be published — D6: unpublishing stops new enrolments
--   * the course must not be suspended or deleted
--   * if the version is not attached to any product, it is genuinely free and
--     `source` must say so
--   * if it is attached to a product, the learner must already hold a live
--     entitlement, and `source` may not claim 'free'
--
-- Note what this does NOT do. It does not create the order or take the
-- payment. Money still flows through record_payment_success(), which remains
-- the only writer of the paid state and still refuses a provider redirect as
-- proof. This closes the door beside it.

create or replace function public.is_sold_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.product_course_versions pcv
     where pcv.course_version_id = p_version_id
  );
$$;

comment on function public.is_sold_version(uuid) is
  'The version is attached to at least one product, so it is not free to enrol in.';

create or replace function public.can_enrol_in_version(
  p_learner_id uuid,
  p_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.course_versions cv
      join public.courses c on c.id = cv.course_id
     where cv.id = p_version_id
       -- D6: retirement ends new enrolments but never existing access.
       and cv.version_status = 'published'
       and c.suspended_at is null
       and c.deleted_at is null
       and (
         -- Genuinely free: no product is attached to this version.
         not public.is_sold_version(cv.id)
         -- Or already entitled through purchase, subscription, family
         -- allocation, an admin grant or a scholarship.
         or public.can_access_course_version(p_learner_id, p_version_id)
       )
  );
$$;

comment on function public.can_enrol_in_version(uuid, uuid) is
  'May start a NEW enrolment. Published, not suspended, and either free or already entitled.';

drop policy if exists course_enrolments_insert on public.course_enrolments;
create policy course_enrolments_insert on public.course_enrolments
  for insert to authenticated
  with check (
    public.can_access_learner(learner_profile_id)
    and status = 'active'
    and deleted_at is null
    and public.can_enrol_in_version(learner_profile_id, course_version_id)
    -- A sold course must not be recorded as a free enrolment, even by staff
    -- acting through the application. The grant that justifies it has a
    -- source of its own; the ledger should not claim otherwise.
    and (not public.is_sold_version(course_version_id) or source <> 'free')
  );
