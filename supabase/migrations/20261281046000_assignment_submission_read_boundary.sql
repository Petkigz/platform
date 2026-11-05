-- Assignment text, feedback, revision snapshots and attachment references are
-- sensitive too. The generic learner predicate admits broad staff and, when the
-- general guardian flag is off, unverified household members. Apply the stricter
-- coursework reader rule to all ages until historical child attribution is safe.
create or replace function public.can_read_assignment_submission(p_submission_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_id() is not null and exists (
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
comment on function public.can_read_assignment_submission(uuid) is
  'Reads assignment submissions and revision snapshots for the learner, a current verified guardian with progress permission, the assignment author, or the separately configured active safeguarding owner. Applies to all ages independently of the general verification switch.';
