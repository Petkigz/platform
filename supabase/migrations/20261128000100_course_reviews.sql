-- =============================================================================
-- AyahSpring — learner ratings and reviews on courses
--
-- `learning.reviews` has been in the register since the flag audit with the
-- precondition "Table does not exist. Satisfaction signal only — never a
-- substitute for scholarly review. Needs a moderation policy." The table is
-- here, and both halves of that sentence are honoured in the design rather than
-- in a disclaimer:
--
--   * A review never gates publication and is never read by the review
--     workflow. `content_review_assignments` and `content_review_decisions` are
--     untouched by this migration, and nothing here can approve a version.
--   * The moderation policy is the one already settled for discussion, applied
--     to the part that needs it: **text a learner writes is held until a person
--     approves it.** A rating with no text has nothing to moderate and is
--     counted immediately, which is what makes leaving one a two-tap action
--     rather than a form.
--
-- The rules that are not obvious, and why:
--
--   * **You can only review a course you are enrolled in.** Without this a
--     rating is an opinion about a marketing page, and a competitor can bury a
--     course without ever opening it.
--   * **An account reviews as itself, not as a child in its family.** Children
--     have no login (D2), so a child course will collect no reviews. That is
--     the honest result: a seven-year-old's star rating is not a satisfaction
--     signal, and a parent's complaint already has two better homes — the
--     support desk and the report form on the lesson.
--   * **The course author cannot review their own course.**
--   * **One review per learner per course.** Writing again updates it, and
--     updating text sends it back through moderation — otherwise editing is a
--     way to publish an unreviewed sentence.
--   * **The version studied is recorded next to the rating.** The aggregate
--     belongs to the course, because that is what a learner chooses between;
--     the words belong to the version they actually saw, because a course can be
--     rewritten and an old complaint should not read as a current one.
--
-- Deleting your own review is allowed and is a real DELETE, with an audit entry
-- that records the fact and not the text. It is the one table in the schema
-- where removal is the right answer: it is an opinion, not a record of
-- something that happened, and a person may change their mind about publishing
-- theirs.
-- =============================================================================

update public.platform_settings
   set description   = 'Learner ratings and reviews on courses',
       preconditions = 'Someone available to moderate review text before it appears. Satisfaction signal only — never a substitute for scholarly review, and never read by the publication workflow. Ratings and badges in the catalogue stay behind learning.badges.'
 where key = 'learning.reviews';

create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),

  -- The aggregate hangs off the course; a learner chooses between courses, not
  -- between internal versions of one.
  course_id uuid not null
    references public.courses (id) on delete restrict,

  -- What they actually studied. Kept so a review of a rewritten course can be
  -- read as a review of the thing that existed then.
  course_version_id uuid not null
    references public.course_versions (id) on delete restrict,

  -- The learner whose enrolment qualifies the review, and the account that
  -- wrote it. Deliberately two columns: they are the same person for an adult,
  -- and the difference is what stops a parent reviewing as a child.
  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete restrict,
  written_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  rating integer not null check (rating between 1 and 5),

  -- Optional. A rating with no words needs no moderation.
  body text check (body is null or length(trim(body)) between 1 and 2000),

  -- visible: counted and readable by anyone
  -- pending: has text nobody has approved yet
  -- withdrawn: pulled by staff; not counted, still readable by staff and by
  --              its author so the reason is not a mystery
  visibility_state text not null default 'visible'
    check (visibility_state in ('visible', 'pending', 'withdrawn')),

  moderated_by uuid references public.user_profiles (user_id) on delete set null,
  moderated_at timestamptz,
  moderation_note text,
  withdrawn_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One voice per learner per course. Writing again updates this row.
  constraint course_reviews_one_per_learner unique (course_id, learner_profile_id),

  -- A pending review has not been decided yet.
  constraint course_reviews_pending_is_unmoderated check (
    visibility_state <> 'pending'
    or (moderated_by is null and moderated_at is null)
  ),
  -- Only text needs holding, so a review with no text is never pending. Without
  -- this the "rating is immediate, text is held" rule is a convention.
  constraint course_reviews_pending_needs_body check (
    visibility_state <> 'pending' or body is not null
  ),
  constraint course_reviews_withdrawn_needs_reason check (
    visibility_state <> 'withdrawn'
    or length(trim(coalesce(withdrawn_reason, ''))) > 0
  ),
  constraint course_reviews_moderation_together check (
    (moderated_by is null) = (moderated_at is null)
  )
);

create index course_reviews_course_idx
  on public.course_reviews (course_id, created_at desc);
create index course_reviews_moderation_queue_idx
  on public.course_reviews (created_at)
  where visibility_state = 'pending';
create index course_reviews_author_idx
  on public.course_reviews (written_by);

create trigger course_reviews_set_updated_at
  before update on public.course_reviews
  for each row execute function public.set_updated_at();

alter table public.course_reviews enable row level security;

-- Published reviews are public: that is what a review is for. A learner also
-- sees their own held or withdrawn one, so "where did my review go" has an
-- answer on the page instead of a support case. Staff see the queue.
create policy course_reviews_read on public.course_reviews
  for select to anon, authenticated
  using (
    visibility_state = 'visible'
    or written_by = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

-- No write policies and no DML grant: the functions below are the only door.
revoke all on public.course_reviews from public, anon, authenticated;
grant select on public.course_reviews to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Writing a review
-- -----------------------------------------------------------------------------

create or replace function public.write_course_review(
  p_course_id uuid,
  p_rating    integer,
  p_body      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_learner  uuid;
  v_course   public.courses;
  v_version  uuid;
  v_body     text := nullif(trim(coalesce(p_body, '')), '');
  v_state    text;
  v_existing uuid;
  v_id       uuid;
begin
  if v_actor is null then
    raise exception 'sign in to review a course' using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('learning.reviews', false) then
    raise exception
      'course reviews are not open yet (learning.reviews is off)'
      using errcode = 'check_violation';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'a rating is between 1 and 5' using errcode = 'check_violation';
  end if;

  if v_body is not null and length(v_body) > 2000 then
    raise exception 'please keep a review under 2000 characters'
      using errcode = 'check_violation';
  end if;

  -- An account reviews as itself. A child has no account (D2), and a parent
  -- writing as their child would put an adult's words behind a learner's
  -- enrolment — which is exactly what the aggregate is supposed to mean.
  select lp.id into v_learner
    from public.learner_profiles lp
   where lp.linked_user_id = v_actor
     and lp.deleted_at is null
   limit 1;
  if v_learner is null then
    raise exception
      'create your own learner profile before reviewing a course'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  if v_course.id is null or v_course.deleted_at is not null then
    raise exception 'course not found' using errcode = 'P0002';
  end if;

  if v_course.created_by = v_actor then
    raise exception
      'you cannot review a course you wrote'
      using errcode = 'insufficient_privilege';
  end if;

  -- The qualification to review: an enrolment, with the version it pinned. The
  -- most recent one wins for somebody who left and came back.
  select ce.course_version_id into v_version
    from public.course_enrolments ce
   where ce.course_id = p_course_id
     and ce.learner_profile_id = v_learner
     and ce.deleted_at is null
     and ce.status in ('active', 'completed')
   order by ce.created_at desc
   limit 1;
  if v_version is null then
    raise exception
      'you can only review a course you are enrolled in'
      using errcode = 'insufficient_privilege';
  end if;

  -- Text is held; a bare rating is not. Computed here rather than trusted from
  -- the caller for the same reason discussion computes author_kind.
  v_state := case when v_body is null then 'visible' else 'pending' end;

  select id into v_existing
    from public.course_reviews
   where course_id = p_course_id and learner_profile_id = v_learner;

  if v_existing is not null then
    update public.course_reviews
       set rating = p_rating,
           body = v_body,
           course_version_id = v_version,
           visibility_state = v_state,
           moderated_by = null,
           moderated_at = null,
           moderation_note = null,
           withdrawn_reason = null
     where id = v_existing
    returning id into v_id;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'course_review.updated', 'course_review', v_id,
            jsonb_build_object('rating', p_rating, 'has_body', v_body is not null,
                               'visibility_state', v_state));
    return v_id;
  end if;

  insert into public.course_reviews
    (course_id, course_version_id, learner_profile_id, written_by,
     rating, body, visibility_state)
  values
    (p_course_id, v_version, v_learner, v_actor, p_rating, v_body, v_state)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'course_review.written', 'course_review', v_id,
          jsonb_build_object('course_id', p_course_id, 'rating', p_rating,
                             'has_body', v_body is not null,
                             'visibility_state', v_state));

  return v_id;
end;
$$;
revoke execute on function public.write_course_review(uuid, integer, text) from public;
grant execute on function public.write_course_review(uuid, integer, text) to authenticated;

comment on function public.write_course_review(uuid, integer, text) is
  'Writes or updates the signed-in learner''s own review of a course they are enrolled in. Text is held for moderation; a bare rating is published.';

-- -----------------------------------------------------------------------------
-- Removing your own review
-- -----------------------------------------------------------------------------

create or replace function public.remove_course_review(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_review public.course_reviews;
begin
  if v_actor is null then
    raise exception 'sign in to remove a review' using errcode = 'insufficient_privilege';
  end if;

  select * into v_review from public.course_reviews where id = p_review_id;
  if v_review.id is null then
    raise exception 'review not found' using errcode = 'P0002';
  end if;

  -- Staff may withdraw instead, which keeps the record and the reason. Deleting
  -- is the author's own right and nobody else's.
  if v_review.written_by <> v_actor then
    raise exception
      'you can only remove your own review'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.course_reviews where id = p_review_id;

  -- The fact is recorded, not the words. An audit trail that copies removed
  -- content back into another table has not removed it.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'course_review.removed', 'course_review', p_review_id,
          jsonb_build_object('course_id', v_review.course_id));

  return true;
end;
$$;
revoke execute on function public.remove_course_review(uuid) from public;
grant execute on function public.remove_course_review(uuid) to authenticated;

comment on function public.remove_course_review(uuid) is
  'The author removes their own review outright. Staff withdraw instead, which keeps the reason.';

-- -----------------------------------------------------------------------------
-- Moderation
-- -----------------------------------------------------------------------------

create or replace function public.moderate_course_review(
  p_review_id uuid,
  p_state     text,
  p_note      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_review public.course_reviews;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only staff may moderate a review'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_review from public.course_reviews where id = p_review_id;
  if v_review.id is null then
    raise exception 'review not found' using errcode = 'P0002';
  end if;

  if p_state not in ('visible', 'withdrawn') then
    raise exception 'a review is published or withdrawn, not %', coalesce(p_state, '(nothing)')
      using errcode = 'check_violation';
  end if;

  -- Withdrawing takes a rating out of the aggregate, which is a decision about
  -- somebody's published opinion. It needs a written reason.
  if p_state = 'withdrawn' and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception 'withdrawing a review needs a written reason'
      using errcode = 'check_violation';
  end if;

  update public.course_reviews
     set visibility_state = p_state,
         moderated_by = v_actor,
         moderated_at = now(),
         moderation_note = nullif(trim(coalesce(p_note, '')), ''),
         withdrawn_reason = case when p_state = 'withdrawn'
                                 then trim(p_note) else null end
   where id = p_review_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    v_actor,
    case when p_state = 'visible' then 'course_review.published'
         else 'course_review.withdrawn' end,
    'course_review', p_review_id,
    jsonb_build_object('from_state', v_review.visibility_state, 'reason',
                       case when p_state = 'withdrawn' then trim(p_note) else null end)
  );
end;
$$;
revoke execute on function public.moderate_course_review(uuid, text, text) from public;
grant execute on function public.moderate_course_review(uuid, text, text) to authenticated;

comment on function public.moderate_course_review(uuid, text, text) is
  'Staff publish a held review or withdraw one. Withdrawing requires the written reason the author can see.';

-- -----------------------------------------------------------------------------
-- The aggregate
--
-- A function rather than a client-side average: the count and the mean have to
-- agree about which rows are published, and computing that in two places is how
-- a page ends up showing 4.8 from 12 reviews above a list of 9.
-- -----------------------------------------------------------------------------

create or replace function public.course_review_summary(p_course_id uuid)
returns table (average_rating numeric, review_count bigint, rating_rows jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(round(avg(cr.rating)::numeric, 1), 0)::numeric(3,1),
    count(*),
    coalesce(
      (select jsonb_object_agg(d.rating, d.n)
         from (
           select c.rating, count(*)::int as n
             from public.course_reviews c
            where c.course_id = p_course_id
              and c.visibility_state = 'visible'
            group by c.rating
         ) d),
      '{}'::jsonb
    )
  from public.course_reviews cr
  where cr.course_id = p_course_id
    and cr.visibility_state = 'visible';
$$;
revoke all on function public.course_review_summary(uuid) from public;
grant execute on function public.course_review_summary(uuid) to anon, authenticated;

comment on function public.course_review_summary(uuid) is
  'Published reviews only: mean rating, count, and the 1-5 distribution. Held and withdrawn reviews are in neither number.';

comment on table public.course_reviews is
  'Learner satisfaction, not scholarly approval. Requires an enrolment; text is moderated before it appears; one review per learner per course.';
comment on column public.course_reviews.visibility_state is
  'visible counts and is public; pending is held text awaiting a person; withdrawn is staff-removed with a reason and counts for nothing.';
comment on column public.course_reviews.course_version_id is
  'The version actually studied, so a review of a rewritten course reads as a review of what existed then.';
