-- -----------------------------------------------------------------------------
-- Somebody looked at the file, and the platform can say who
-- -----------------------------------------------------------------------------
-- The second half of the coursework question the owner answered on 2026-11-01.
-- The first half — how long a handed-in file is kept — became a clock
-- (`20261281010000`). This is the other one: **a recorded review, not a queue in
-- front of every homework photograph.**
--
-- The gap it closes was one sentence wide and total. `confirm_coursework_upload()`
-- lets the uploader promote their own file from `pending` to `available` and attach
-- it to their draft in the same transaction — right for a child on metered data, and
-- fast — and **no member of staff ever sees the file or records having looked**. So
-- the platform could not answer the only question a safeguarding lead actually gets
-- asked: "who has seen my child's photograph?" Nothing was inconsistent; a fact was
-- simply absent, which is the kind of gap no test finds.
--
-- What this adds, and what shapes each part:
--
--   1. **A review is an event, not a flag.** Table rows are append-only: a later
--      review supersedes an earlier one by being later, and no screen can rewrite
--      what somebody decided while looking at a child's work. "Reviewed" is
--      therefore somebody's name, a moment, and a word — never a boolean.
--
--   2. **The household cannot vouch for its own file.** The family that sent a
--      photograph is not the reviewer of it, and neither is the child. The refusal
--      is a check on the learner's own predicates rather than on
--      `can_access_learner()`, because that helper includes staff and would have
--      refused the people this exists for.
--
--   3. **The marker sees the state, and only the marker.** The course author and
--      staff are told whether a file has been looked at; the household is not,
--      because a coarse word like "concern" on a child's own hand-in is a message
--      with no context and no adult in the room to explain it. A serious concern is
--      a conversation with a guardian, not a badge on a screen.
--
--   4. **A concern needs words.** `clear` may be silent; `concern` may not, because
--      a flag nobody explained is a file somebody has to re-open and guess about.
--      The note stays on the review row and **out of the audit entry**, which
--      records that a decision was made and which one — the same rule the retained
--      screening register follows about its evidence reference.
--
--   5. **Reviewing does not gate anything.** The file stays readable by the marker
--      the moment it arrives. This is the option the owner chose over holding every
--      file until staff release it: at three classes a release queue is a job, and
--      at thirty it reads to a parent as the platform losing homework. What the
--      record buys is the ability to *see* what nobody has looked at and to answer
--      for it later.

-- -----------------------------------------------------------------------------
-- 1. The record
-- -----------------------------------------------------------------------------
create table if not exists public.coursework_file_reviews (
  id uuid primary key default gen_random_uuid(),

  asset_id uuid not null
    references public.media_assets (id) on delete restrict,

  -- Deliberately **not** a foreign key. A review has to outlive the submission it
  -- was about: the children's retention clock deletes submissions, and a `restrict`
  -- here would make that clock fail the moment a file had been reviewed, while a
  -- cascade would delete the safeguarding record along with the homework. This is
  -- the same reasoning `governance_audit_events.target_id` follows — a reference
  -- that survives its target is worth more than a constraint that breaks it.
  submission_id uuid,

  decision text not null check (decision in ('clear', 'concern')),

  note text check (note is null or length(btrim(note)) between 3 and 2000),

  reviewed_by uuid not null
    references public.user_profiles (user_id) on delete restrict,

  reviewed_at timestamptz not null default now(),

  -- A concern with no words is a flag somebody has to guess at. A clear needs no
  -- explanation, and may still carry one.
  constraint coursework_reviews_concern_explains
    check (decision <> 'concern' or note is not null)
);

create index if not exists coursework_file_reviews_asset_idx
  on public.coursework_file_reviews (asset_id, reviewed_at desc);

create index if not exists coursework_file_reviews_submission_idx
  on public.coursework_file_reviews (submission_id);

alter table public.coursework_file_reviews enable row level security;
revoke all on public.coursework_file_reviews from anon, authenticated;

comment on table public.coursework_file_reviews is
  'Somebody looked at a handed-in file. Append-only, read through the staff functions: a review is a person, a moment and a word, never a boolean a form can overwrite.';

-- The record of a review is the review. Nothing edits it and nothing deletes it —
-- a second look is a second row, which is what makes the history worth reading.
create or replace function public.refuse_coursework_review_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'a review is a record of what somebody saw; record a new one instead of changing this'
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists coursework_file_reviews_append_only on public.coursework_file_reviews;
create trigger coursework_file_reviews_append_only
  before update or delete on public.coursework_file_reviews
  for each row execute function public.refuse_coursework_review_change();

-- -----------------------------------------------------------------------------
-- 2. Every handed-in file, and the last thing anybody said about it
-- -----------------------------------------------------------------------------
-- One definition of "reviewed", read by the marker's list, the staff queue and
-- `psql`, so a file cannot be reviewed on one screen and unreviewed on another.
-- Revoked from everybody: it runs as its owner and names children.
create or replace view public.coursework_file_state as
  select asa.media_asset_id      as asset_id,
         asa.submission_id,
         ma.display_name         as file_name,
         ma.mime_type,
         ma.byte_size,
         ma.status,
         ma.deleted_at,
         asa.created_at          as attached_at,
         s.learner_profile_id,
         lp.display_name         as learner_name,
         ca.course_id,
         ca.created_by           as author_id,
         ca.course_version_id,
         c.title                 as course_title,
         r.decision,
         r.note,
         r.reviewed_at,
         r.reviewed_by,
         r.reviewer_name
    from public.assignment_submission_assets asa
    join public.media_assets ma
      on ma.id = asa.media_asset_id and ma.purpose = 'coursework'
    join public.assignment_submissions s on s.id = asa.submission_id
    join public.course_assignments ca    on ca.id = s.assignment_id
    join public.courses c                on c.id = ca.course_id
    join public.learner_profiles lp      on lp.id = s.learner_profile_id
    -- The latest review wins. `id` breaks a tie between two reviews written in
    -- the same transaction, which a clock alone cannot order.
    left join lateral (
      select r.decision, r.note, r.reviewed_at, r.reviewed_by,
             up.display_name as reviewer_name
        from public.coursework_file_reviews r
        join public.user_profiles up on up.user_id = r.reviewed_by
       where r.asset_id = asa.media_asset_id
       order by r.reviewed_at desc, r.id desc
       limit 1
    ) r on true;

revoke all on public.coursework_file_state from public, anon, authenticated;

comment on view public.coursework_file_state is
  'Every attached coursework file with the latest review of it. Internal: it names children, and every reader below applies its own permission.';

-- -----------------------------------------------------------------------------
-- 3. Recording a review
-- -----------------------------------------------------------------------------
create or replace function public.record_coursework_review(
  p_asset_id uuid,
  p_decision text,
  p_note     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
  v_asset        public.media_assets;
  v_submission   uuid;
  v_learner      uuid;
  v_author       uuid;
  v_last         public.coursework_file_reviews;
begin
  if v_actor is null then
    raise exception 'sign in to record a review'
      using errcode = 'insufficient_privilege';
  end if;

  if v_decision not in ('clear', 'concern') then
    raise exception 'a review is either clear or a concern'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_decision = 'concern' and (v_note is null or length(v_note) < 3) then
    raise exception 'a concern needs a sentence saying what worried you'
      using errcode = 'check_violation';
  end if;

  select * into v_asset from public.media_assets where id = p_asset_id;
  if not found or v_asset.purpose <> 'coursework' then
    raise exception 'that file was not handed in as coursework'
      using errcode = 'no_data_found';
  end if;

  if v_asset.deleted_at is not null or v_asset.status = 'deleted' then
    raise exception 'that file has been deleted, so there is nothing to review'
      using errcode = 'check_violation';
  end if;

  -- Attached, or still being declared: both say which submission the file belongs
  -- to, and a file that says neither is not something anybody can review.
  select st.submission_id, st.learner_profile_id, st.author_id
    into v_submission, v_learner, v_author
    from public.coursework_file_state st
   where st.asset_id = p_asset_id;

  if v_submission is null then
    select d.submission_id into v_submission
      from public.coursework_upload_declarations d
     where d.asset_id = p_asset_id;

    select s.learner_profile_id, ca.created_by
      into v_learner, v_author
      from public.assignment_submissions s
      join public.course_assignments ca on ca.id = s.assignment_id
     where s.id = v_submission;
  end if;

  if v_submission is null then
    raise exception 'that file is not attached to an assignment, so there is nothing to review'
      using errcode = 'no_data_found';
  end if;

  -- The household first, so the family that sent the file is told the truth about
  -- why they cannot vouch for it rather than being handed the general refusal.
  -- `can_access_learner()` is deliberately not used: it is true for privileged
  -- staff, which would have refused the people this function exists for.
  if public.is_own_learner_profile(v_learner)
     or public.is_learner_family_member(v_learner) then
    raise exception 'the family that sent a file cannot vouch for it'
      using errcode = 'insufficient_privilege',
            hint = 'a review is a second pair of eyes. Ask the course author or staff.';
  end if;

  -- The two people who may review: the teacher the work was handed to, or staff.
  if not (public.is_privileged(v_actor) or v_author = v_actor) then
    raise exception 'only the teacher the work was handed to, or staff, may review it'
      using errcode = 'insufficient_privilege';
  end if;

  if v_asset.status <> 'available' then
    raise exception 'that file is %, so there is nothing to look at yet', v_asset.status
      using errcode = 'check_violation';
  end if;

  -- A double click, or a form that posts twice, must not become two reviews: the
  -- same person reaching the same conclusion with nothing changed in between is the
  -- same review.
  select * into v_last
    from public.coursework_file_reviews r
   where r.asset_id = p_asset_id
   order by r.reviewed_at desc, r.id desc
   limit 1;
  if found and v_last.reviewed_by = v_actor and v_last.decision = v_decision then
    return jsonb_build_object(
      'id', v_last.id, 'decision', v_last.decision,
      'reviewedAt', v_last.reviewed_at, 'recorded', false);
  end if;

  insert into public.coursework_file_reviews
    (asset_id, submission_id, decision, note, reviewed_by)
  values (p_asset_id, v_submission, v_decision, v_note, v_actor)
  returning * into v_last;

  -- What was decided and which file, never the sentence that was written about a
  -- child's photograph: the note belongs on the review, where the people who may
  -- read the file can read it.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'coursework.reviewed', 'media_asset', p_asset_id,
          jsonb_build_object('decision', v_decision, 'submissionId', v_submission));

  return jsonb_build_object(
    'id', v_last.id, 'decision', v_last.decision,
    'reviewedAt', v_last.reviewed_at, 'recorded', true);
end;
$$;

revoke all on function public.record_coursework_review(uuid, text, text) from public, anon;
grant execute on function public.record_coursework_review(uuid, text, text) to authenticated;

comment on function public.record_coursework_review(uuid, text, text) is
  'Records that the teacher the work was handed to, or staff, looked at a handed-in file. The household and the child cannot review their own file; a concern needs a sentence; the same person reaching the same conclusion twice is one review, not two.';

-- -----------------------------------------------------------------------------
-- 4. What the people who may look at the file are told
-- -----------------------------------------------------------------------------
-- Reproduced in full: PostgreSQL cannot wrap a function it replaces. The change is
-- the review keys at the end of each object, and they are present **only** for a
-- caller who may review — so the household's own screen never learns that a
-- teacher once wrote "concern".
create or replace function public.assignment_submission_files(p_submission_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_out        jsonb := '[]'::jsonb;
  v_row        record;
  v_actor      uuid := public.current_user_id();
  v_may_review boolean := false;
  v_author     uuid;
  v_learner    uuid;
begin
  if v_actor is null then
    raise exception 'sign in to read a submission'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.can_read_assignment_submission(p_submission_id) then
    raise exception 'that submission is not yours to read'
      using errcode = 'insufficient_privilege';
  end if;

  select ca.created_by, s.learner_profile_id
    into v_author, v_learner
    from public.assignment_submissions s
    join public.course_assignments ca on ca.id = s.assignment_id
   where s.id = p_submission_id;

  v_may_review := (public.is_privileged(v_actor) or v_author = v_actor)
                  and not (public.is_own_learner_profile(v_learner)
                           or public.is_learner_family_member(v_learner));

  for v_row in
    -- Handed in, in the order they were attached.
    select asa.id, asa.media_asset_id, asa.position, ma.display_name,
           ma.mime_type, ma.byte_size, ma.status, ma.created_at,
           st.decision, st.reviewed_at
      from public.assignment_submission_assets asa
      join public.media_assets ma on ma.id = asa.media_asset_id
      left join public.coursework_file_state st on st.asset_id = asa.media_asset_id
     where asa.submission_id = p_submission_id
       and ma.deleted_at is null

    union all

    -- Declared and still arriving. Shown because a learner who reloads
    -- mid-transfer should see the file they started, not an empty list that
    -- invites a second upload.
    select null::uuid, ma.id, 0, ma.display_name,
           ma.mime_type, ma.byte_size, ma.status, ma.created_at,
           null::text, null::timestamptz
      from public.coursework_upload_declarations d
      join public.media_assets ma on ma.id = d.asset_id
     where d.submission_id = p_submission_id
       and ma.deleted_at is null
       and ma.status = 'pending'
  loop
    v_out := v_out || (jsonb_build_object(
      'attachmentId', case when v_row.id is null then null else v_row.id end,
      'assetId',      v_row.media_asset_id,
      'name',         v_row.display_name,
      'mimeType',     v_row.mime_type,
      'byteSize',     v_row.byte_size::text,
      'status',       v_row.status,
      'uploadedAt',   v_row.created_at
    ) || case when v_may_review then jsonb_build_object(
      'review',     coalesce(v_row.decision, 'none'),
      'reviewedAt', v_row.reviewed_at
    ) else '{}'::jsonb end);
  end loop;

  return v_out;
end;
$$;

revoke all on function public.assignment_submission_files(uuid) from public;
grant execute on function public.assignment_submission_files(uuid) to authenticated;

comment on function public.assignment_submission_files(uuid) is
  'The named files on one hand-in, with the review state for a caller who may review — the course author or staff — and nothing about reviews for the household that sent them.';

-- -----------------------------------------------------------------------------
-- 5. The queue nobody is behind, and the number that says so
-- -----------------------------------------------------------------------------
create or replace function public.coursework_review_queue(p_limit integer default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_out   jsonb := '[]'::jsonb;
  v_row   record;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'coursework:not_allowed'
      using errcode = 'insufficient_privilege',
            hint = 'the review record is for staff; a teacher records a review on their own queue';
  end if;

  for v_row in
    select st.*
      from public.coursework_file_state st
     where st.deleted_at is null
       and st.status = 'available'
     order by (st.decision is not null), st.attached_at
     limit greatest(coalesce(p_limit, 100), 1)
  loop
    v_out := v_out || jsonb_build_object(
      'assetId',      v_row.asset_id,
      'submissionId', v_row.submission_id,
      'courseTitle',  v_row.course_title,
      'learnerName',  v_row.learner_name,
      'fileName',     v_row.file_name,
      'mimeType',     v_row.mime_type,
      'byteSize',     v_row.byte_size::text,
      'attachedAt',   v_row.attached_at,
      'review',       coalesce(v_row.decision, 'none'),
      'reviewedAt',   v_row.reviewed_at,
      'reviewerName', v_row.reviewer_name
    );
  end loop;

  return v_out;
end;
$$;

revoke all on function public.coursework_review_queue(integer) from public, anon;
grant execute on function public.coursework_review_queue(integer) to authenticated;

comment on function public.coursework_review_queue(integer) is
  'Every handed-in file nobody has looked at, first, then the reviewed ones. Staff only; the file itself is still readable by the marker whether or not it is on this list.';

create or replace function public.coursework_review_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor       uuid := public.current_user_id();
  v_files       integer;
  v_reviewed    integer;
  v_clear       integer;
  v_concern     integer;
  v_oldest      timestamptz;
  v_oldest_any  timestamptz;
  v_outliving   integer;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'coursework:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select count(*)::int,
         count(*) filter (where decision is not null)::int,
         count(*) filter (where decision = 'clear')::int,
         count(*) filter (where decision = 'concern')::int,
         min(attached_at) filter (where decision is null),
         min(attached_at)
    into v_files, v_reviewed, v_clear, v_concern, v_oldest, v_oldest_any
    from public.coursework_file_state
   where deleted_at is null
     and status = 'available';

  -- A review is a record that somebody saw a file, and it outlives the file: the
  -- lead asking "was this photograph ever looked at?" is answered here, not by the
  -- bytes. Counted so it is never mistaken for nothing.
  select count(distinct r.asset_id)::int into v_outliving
    from public.coursework_file_reviews r
    join public.media_assets ma on ma.id = r.asset_id
   where ma.deleted_at is not null;

  return jsonb_build_object(
    'files',       v_files,
    'reviewed',    v_reviewed,
    'unreviewed',  v_files - v_reviewed,
    'clear',       v_clear,
    'concerns',    v_concern,
    'oldestUnreviewed', v_oldest,
    'oldestFile',  v_oldest_any,
    'reviewsOutlivingFiles', v_outliving,
    -- Said on the screen rather than implied: nothing is waiting behind this
    -- number, and a file does not need a review to be opened by its marker.
    'gates', false);
end;
$$;

revoke all on function public.coursework_review_summary() from public, anon;
grant execute on function public.coursework_review_summary() to authenticated;

comment on function public.coursework_review_summary() is
  'How many handed-in files exist, how many somebody has looked at, how many carry a concern, how long the oldest unreviewed one has been waiting, and how many reviews outlive the file they were about. Counts only — no names, no titles.';
