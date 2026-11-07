-- Preserve the existing function OID used by RLS while enforcing quarantine
-- for new household file access. Owner review remains available.
create or replace function public.may_read_coursework_master(p_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with contexts as (
    select d.submission_id from public.coursework_upload_declarations d where d.asset_id = p_asset_id
    union
    select a.submission_id from public.assignment_submission_assets a where a.media_asset_id = p_asset_id
    union
    select r.submission_id from public.assignment_submission_revisions r
     where r.asset_ids @> jsonb_build_array(p_asset_id::text)
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
      -- A quarantine must stop new household as well as marker links. The
      -- named owner remains able to inspect the file above; already issued
      -- bearer URLs cannot be revoked here and remain usable until expiry.
      and exists (select 1 from public.media_assets held where held.id=p_asset_id and held.status <> 'quarantined')
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
            and (exists (select 1 from public.assignment_submission_assets asa
                          where asa.media_asset_id = ma.id and asa.submission_id = s.id)
                 or exists (select 1 from public.assignment_submission_revisions r
                             where r.submission_id=s.id and r.asset_ids @> jsonb_build_array(ma.id::text)))
          )
        )
      )
    )
  );
$$;

