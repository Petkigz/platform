-- D1: do not silently discard an updated safeguarding concern.
-- A duplicate submission has the same reviewer, decision AND normalized note.
-- A different note is appended as a new review; the prior record remains intact.
-- This does not deliver a concern or establish who may open the underlying file.
-- Assignments and cohorts remain off while those safeguards are unresolved.

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
  -- same person reaching the same conclusion with the same note is the same
  -- review. A changed note is new information, even when the decision is unchanged.
  select * into v_last
    from public.coursework_file_reviews r
   where r.asset_id = p_asset_id
   order by r.reviewed_at desc, r.id desc
   limit 1;
  if found and v_last.reviewed_by = v_actor and v_last.decision = v_decision
     and v_last.note is not distinct from v_note then
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

