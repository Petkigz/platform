-- Review records are attestations, not proof of viewing. The marker and the
-- explicitly configured owner may record them only where they may open the file.
-- Preserve existing reviews and notes; this does not prove anyone saw the bytes.
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

  select * into v_asset from public.media_assets where id = p_asset_id for update;
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
     or public.is_learner_family_member(v_learner)
     or exists (select 1 from public.guardian_relationships gr
                 where gr.learner_profile_id = v_learner and gr.guardian_user_id = v_actor
                   and gr.deleted_at is null and (gr.status = 'active' or gr.verified_at is not null)) then
    raise exception 'the family that sent a file cannot vouch for it'
      using errcode = 'insufficient_privilege',
            hint = 'a review is a second pair of eyes. Ask the course author or staff.';
  end if;

  -- A staff role alone is not the identified safeguarding owner.
  if not (v_author = v_actor or (public.has_role(v_actor, 'platform_admin')
      and exists (select 1 from public.safeguarding_owner so
                   where so.singleton and so.owner_user_id = v_actor))) then
    raise exception 'only the teacher the work was handed to, or the safeguarding owner, may review it'
      using errcode = 'insufficient_privilege';
  end if;

  if v_asset.status <> 'available' then
    raise exception 'that file is %, so there is nothing to look at yet', v_asset.status
      using errcode = 'check_violation';
  end if;

  -- Being able to record a review must not be broader than being allowed to
  -- open the file. A conflicting historical context cannot safely be attributed.
  if (select count(*) from (
        select d.submission_id from public.coursework_upload_declarations d where d.asset_id = p_asset_id
        union
        select asa.submission_id from public.assignment_submission_assets asa where asa.media_asset_id = p_asset_id
      ) contexts) <> 1 or not public.may_watch_master(p_asset_id) then
    raise exception 'this file is not available for your review; its access or assignment context needs checking'
      using errcode = 'insufficient_privilege';
  end if;

  -- A duplicate before acknowledgement is a retry. A changed note, or a concern
  -- reported again after acknowledgement, is new information.
  select * into v_last
    from public.coursework_file_reviews r
   where r.asset_id = p_asset_id
   order by r.review_order desc
   limit 1;
  if found and v_last.reviewed_by = v_actor and v_last.decision = v_decision
     and v_last.note is not distinct from v_note
     and (v_decision <> 'concern' or not exists (
       select 1 from public.safeguarding_concern_acknowledgements a where a.review_id = v_last.id
     )) then
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


-- The general review register used to disclose learner names and concern state to
-- every privileged role. The identified safeguarding owner alone gets the full
-- register and aggregates. The separately scoped teacher workflow stays available.
alter function public.coursework_review_queue(integer) rename to coursework_review_queue_internal;
revoke all on function public.coursework_review_queue_internal(integer) from public, anon, authenticated;
create function public.coursework_review_queue(p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if public.current_user_id() is null or not public.has_role(public.current_user_id(), 'platform_admin')
     or not exists (select 1 from public.safeguarding_owner so
                     where so.singleton and so.owner_user_id = public.current_user_id()) then
    raise exception 'coursework:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  return public.coursework_review_queue_internal(least(greatest(coalesce(p_limit, 100), 1), 200));
end;
$$;
revoke all on function public.coursework_review_queue(integer) from public, anon;
grant execute on function public.coursework_review_queue(integer) to authenticated;

alter function public.coursework_review_summary() rename to coursework_review_summary_internal;
revoke all on function public.coursework_review_summary_internal() from public, anon, authenticated;
create function public.coursework_review_summary()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if public.current_user_id() is null or not public.has_role(public.current_user_id(), 'platform_admin')
     or not exists (select 1 from public.safeguarding_owner so
                     where so.singleton and so.owner_user_id = public.current_user_id()) then
    raise exception 'coursework:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  return public.coursework_review_summary_internal();
end;
$$;
revoke all on function public.coursework_review_summary() from public, anon;
grant execute on function public.coursework_review_summary() to authenticated;

-- The older submission-file list still follows broader submission permissions.
-- Do not expose review state through that list to unrelated staff or to a
-- guardian who also happens to hold a privileged role. Other submission metadata
-- remains on its old access rule and is a separate outstanding audit.
alter function public.assignment_submission_files(uuid) rename to assignment_submission_files_internal;
revoke all on function public.assignment_submission_files_internal(uuid) from public, anon, authenticated;
create function public.assignment_submission_files(p_submission_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb; v_actor uuid := public.current_user_id(); v_learner uuid; v_author uuid; v_may_review boolean;
begin
  v_result := public.assignment_submission_files_internal(p_submission_id);
  select s.learner_profile_id, ca.created_by into v_learner, v_author
    from public.assignment_submissions s join public.course_assignments ca on ca.id = s.assignment_id
   where s.id = p_submission_id;
  v_may_review := (v_author = v_actor or (public.has_role(v_actor, 'platform_admin') and exists (
                    select 1 from public.safeguarding_owner so where so.singleton and so.owner_user_id = v_actor)))
    and not public.is_own_learner_profile(v_learner) and not public.is_learner_family_member(v_learner)
    and not exists (select 1 from public.guardian_relationships gr
                     where gr.learner_profile_id = v_learner and gr.guardian_user_id = v_actor
                       and gr.deleted_at is null and (gr.status = 'active' or gr.verified_at is not null));
  if coalesce(v_may_review, false) then return v_result; end if;
  return coalesce((select jsonb_agg(item - 'review' - 'reviewedAt' order by ord)
    from jsonb_array_elements(v_result) with ordinality as f(item, ord)), '[]'::jsonb);
end;
$$;
revoke all on function public.assignment_submission_files(uuid) from public, anon;
grant execute on function public.assignment_submission_files(uuid) to authenticated;
