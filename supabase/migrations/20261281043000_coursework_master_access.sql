-- Fail closed for coursework master bytes and coordinates. Until historical age
-- attribution is reliable, apply this rule to all coursework, not only files
-- whose learner is currently marked as a child. The owner is separately named;
-- platform staff status alone, uploading, or family membership alone are not
-- reasons to see a coursework master.
create function public.may_read_coursework_master(p_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with contexts as (
    select d.submission_id from public.coursework_upload_declarations d where d.asset_id = p_asset_id
    union
    select a.submission_id from public.assignment_submission_assets a where a.media_asset_id = p_asset_id
  )
  select public.current_user_id() is not null and (
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
               and gr.verified_at is not null and gr.can_view_progress
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
revoke all on function public.may_read_coursework_master(uuid) from public, anon, authenticated;

create or replace function public.may_watch_master(p_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_asset_id is not null and public.current_user_id() is not null
    and exists (
      select 1 from public.media_assets ma
       where ma.id = p_asset_id and ma.deleted_at is null
         and (
           (not public.is_library_delivery_asset(ma.id) and public.may_read_coursework_master(ma.id))
           or (public.is_library_delivery_asset(ma.id) and (
             ma.uploaded_by = public.current_user_id()
             or public.is_privileged(public.current_user_id())
             or (ma.status = 'available' and exists (
               select 1 from public.lesson_resources lr
               join public.lessons l on l.id = lr.lesson_id
               join public.course_sections cs on cs.id = l.section_id
                where lr.media_asset_id = ma.id and public.can_author_version(cs.course_version_id)
             ))
           ))
         )
    );
$$;
comment on function public.may_watch_master(uuid) is
  'For coursework and currently attached legacy assets: the identified safeguarding owner, the learner, a current verified guardian with progress permission, or the assignment author while attached and available. Ambiguous or unattributed files fail closed except to the owner. Library rules are unchanged.';

-- Keep direct coordinate/metadata reads and descriptive edits from bypassing the
-- same boundary. Return only a caller-specific access decision, not a private
-- classification oracle. Assignment authors still receive coordinates via the
-- existing checked master target, not a broad table grant.
create function public.may_read_media_asset_row(p_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_id() is not null and exists (
    select 1 from public.media_assets ma where ma.id = p_asset_id
      and (ma.uploaded_by = public.current_user_id() or public.is_privileged(public.current_user_id()))
      and (public.is_library_delivery_asset(ma.id) or public.may_read_coursework_master(ma.id))
  );
$$;
revoke all on function public.may_read_media_asset_row(uuid) from public, anon;
grant execute on function public.may_read_media_asset_row(uuid) to authenticated;
drop policy media_assets_read on public.media_assets;
create policy media_assets_read on public.media_assets for select to authenticated
  using (public.may_read_media_asset_row(id));
drop policy media_assets_update on public.media_assets;
create policy media_assets_update on public.media_assets for update to authenticated
  using (public.may_read_media_asset_row(id)) with check (public.may_read_media_asset_row(id));
