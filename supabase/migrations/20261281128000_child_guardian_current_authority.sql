-- These checks are used after taking row locks by creation and detachment.
-- VOLATILE obtains a fresh snapshot for its query at READ COMMITTED.
-- Use wall-clock time so consent that expires
-- during a lock wait cannot authorize a subsequent write.
create or replace function public.child_login_verified_guardian(p_guardian uuid, p_learner uuid)
returns boolean language sql volatile security definer set search_path=public as $$
  select exists (
    select 1 from public.user_profiles up
    join public.guardian_relationships gr on gr.guardian_user_id = up.user_id
    join public.learner_profiles lp on lp.id = gr.learner_profile_id
    where up.user_id = p_guardian and up.account_status = 'active' and up.deleted_at is null
      and lp.id = p_learner and lp.learner_type = 'child' and lp.deleted_at is null
      and gr.status = 'active' and gr.deleted_at is null and gr.can_manage_profile
      and gr.verified_at is not null and gr.verified_at <= clock_timestamp()
      and gr.consent_expires_at is not null and gr.consent_expires_at > clock_timestamp()
  );
$$;
