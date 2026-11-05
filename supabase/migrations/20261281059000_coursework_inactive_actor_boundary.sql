-- Coursework privacy applies to the account behind the current session as well
-- as its learner/guardian/author relationship. Do not return NULL from
-- current_user_id(): other definer functions use a missing actor for trusted
-- operations. This boundary is specific to coursework, not a platform-wide
-- session revocation. Previously issued signed URLs are not revoked here.
create function public.coursework_active_actor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_profiles p
    where p.user_id = public.current_user_id()
      and p.account_status = 'active' and p.deleted_at is null);
$$;
revoke all on function public.coursework_active_actor() from public, anon, authenticated;

create or replace function public.coursework_hand_in_authorized(p_learner_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id();
begin
  if v_actor is null then return false; end if;
  -- Keep the active account status stable through the write transaction.
  perform 1 from public.user_profiles p where p.user_id = v_actor
    and p.account_status = 'active' and p.deleted_at is null for share;
  if not found then return false; end if;
  -- Hold the identity or guardian row until the statement's transaction ends,
  -- so a simultaneous change cannot pass the check on stale authority.
  perform 1 from public.learner_profiles lp
   where lp.id = p_learner_id and lp.linked_user_id = v_actor and lp.deleted_at is null
   for share;
  if found then return true; end if;
  perform 1 from public.guardian_relationships gr
    join public.learner_profiles lp on lp.id = gr.learner_profile_id
   where gr.learner_profile_id = p_learner_id and lp.deleted_at is null
     and gr.guardian_user_id = v_actor and gr.status = 'active' and gr.deleted_at is null
     and gr.verified_at is not null and gr.verified_at <= now()
     and gr.can_view_progress and gr.consent_expires_at is not null and gr.consent_expires_at > now()
   for share of gr, lp;
  return found;
end;
$$;

create or replace function public.may_read_coursework_master(p_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with contexts as (
    select d.submission_id from public.coursework_upload_declarations d where d.asset_id = p_asset_id
    union
    select a.submission_id from public.assignment_submission_assets a where a.media_asset_id = p_asset_id
  )
  select public.coursework_active_actor() and (
    (public.has_role(public.current_user_id(), 'platform_admin') and exists (
      select 1 from public.safeguarding_owner so
       where so.singleton and so.owner_user_id = public.current_user_id()
    ))
    or (
      -- Legacy files associated with different submissions are ambiguous: only
      -- the owner can open them until an operator has reviewed their history.
      (select count(*) from contexts) = 1
      and exists (
        select 1 from contexts c
        join public.assignment_submissions s on s.id = c.submission_id
        join public.learner_profiles lp on lp.id = s.learner_profile_id
        join public.course_assignments ca on ca.id = s.assignment_id
        join public.media_assets ma on ma.id = p_asset_id
        where (
          lp.linked_user_id = public.current_user_id()
          or exists (
            select 1 from public.guardian_relationships gr
             where gr.learner_profile_id = lp.id
               and gr.guardian_user_id = public.current_user_id()
               and gr.status = 'active' and gr.deleted_at is null
               and gr.verified_at is not null and gr.verified_at <= now() and gr.can_view_progress
               -- The owner's choice is verified guardian even if the general
               -- guardian verification switch has been turned off.
               and gr.consent_expires_at is not null and gr.consent_expires_at > now()
          )
          or (
            ca.created_by = public.current_user_id() and ma.status = 'available'
            and exists (select 1 from public.assignment_submission_assets asa
                        where asa.media_asset_id = ma.id and asa.submission_id = s.id)
          )
        )
      )
    )
  );
$$;

create or replace function public.can_read_assignment_submission(p_submission_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.coursework_active_actor() and exists (
    select 1 from public.assignment_submissions s
    join public.course_assignments a on a.id = s.assignment_id
    join public.learner_profiles lp on lp.id = s.learner_profile_id
    where s.id = p_submission_id and (
      lp.linked_user_id = public.current_user_id()
      or a.created_by = public.current_user_id()
      or (public.has_role(public.current_user_id(), 'platform_admin') and exists (
        select 1 from public.safeguarding_owner so
         where so.singleton and so.owner_user_id = public.current_user_id()
      ))
      or exists (
        select 1 from public.guardian_relationships gr
         where gr.learner_profile_id = lp.id and gr.guardian_user_id = public.current_user_id()
           and gr.status = 'active' and gr.deleted_at is null and gr.can_view_progress
           and gr.verified_at is not null and gr.verified_at <= now()
           and gr.consent_expires_at is not null and gr.consent_expires_at > now()
      )
    )
  );
$$;

create or replace function public.mark_assignment_submission(p_submission_id uuid, p_score numeric, p_feedback text)
returns void language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  if public.current_user_id() is null then
    raise exception 'sign in to mark this assignment' using errcode = 'insufficient_privilege';
  end if;
  select a.created_by into v_author
    from public.assignment_submissions s join public.course_assignments a on a.id = s.assignment_id
   where s.id = p_submission_id and a.deleted_at is null for update of s for share of a;
  if not found then raise exception 'assignment submission not found' using errcode = 'no_data_found'; end if;
  if v_author is distinct from public.current_user_id() then
    raise exception 'only the course author assigned to this work can mark it' using errcode = 'insufficient_privilege';
  end if;
  -- Serialize grading with an account suspension or closure.
  perform 1 from public.user_profiles p where p.user_id = public.current_user_id()
    and p.account_status = 'active' and p.deleted_at is null for share;
  if not found then
    raise exception 'only an active account can mark this assignment' using errcode = 'insufficient_privilege';
  end if;
  perform public.mark_assignment_submission_internal(p_submission_id, p_score, p_feedback);
end;
$$;

-- Reviews are writes too. Lock the actor's profile for the duration rather than
-- relying only on the read predicate's statement snapshot.
alter function public.record_coursework_review(uuid,text,text) rename to record_coursework_review_internal;
revoke all on function public.record_coursework_review_internal(uuid,text,text) from public, anon, authenticated;
create function public.record_coursework_review(p_asset_id uuid, p_decision text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if public.current_user_id() is null then
    raise exception 'sign in to record a review' using errcode = 'insufficient_privilege';
  end if;
  perform 1 from public.user_profiles p where p.user_id = public.current_user_id()
    and p.account_status = 'active' and p.deleted_at is null for share;
  if not found then
    raise exception 'only an active account can review coursework' using errcode = 'insufficient_privilege';
  end if;
  return public.record_coursework_review_internal(p_asset_id, p_decision, p_note);
end;
$$;
revoke all on function public.record_coursework_review(uuid,text,text) from public, anon;
grant execute on function public.record_coursework_review(uuid,text,text) to authenticated;


-- Export runs as a definer, bypassing the submission RLS above. Restrict the
-- learner study sections with the same account boundary, without pretending to
-- revoke access to every other personal-data section.
create or replace function public.can_export_learner(p_learner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.coursework_active_actor() and exists (
    select 1 from public.learner_profiles lp where lp.id = p_learner_id and (
      lp.linked_user_id = public.current_user_id()
      or exists (
        select 1 from public.guardian_relationships gr
        where gr.learner_profile_id = lp.id and gr.guardian_user_id = public.current_user_id()
          and gr.status = 'active' and gr.deleted_at is null and gr.can_view_progress
          and gr.verified_at is not null and gr.verified_at <= now()
          and gr.consent_expires_at is not null and gr.consent_expires_at > now()
      )
    )
  );
$$;
