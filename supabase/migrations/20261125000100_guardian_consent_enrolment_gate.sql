-- Make the guardian-consent workflow a real enrolment precondition when the
-- admin_setup flag is enabled. The flag ships off; enable it before any US child
-- enrols, after the evidence-handling and review-capacity preconditions are met.
-- Locale-specific scope cannot be narrowed until jurisdiction data and legal
-- review exist, so the enabled gate applies consistently to child enrolments.

create or replace function public.can_enrol_in_version(
  p_learner_id uuid,
  p_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
      from public.course_versions cv
      join public.courses c on c.id=cv.course_id
      join public.learner_profiles lp on lp.id=p_learner_id
     where cv.id=p_version_id
       -- D6: retirement ends new enrolments but never existing access.
       and cv.version_status='published'
       and c.suspended_at is null
       and c.deleted_at is null
       and (
         not public.is_sold_version(cv.id)
         or public.can_access_course_version(p_learner_id,cv.id)
       )
       and (
         -- Until the human review workflow is enabled, the platform has not
         -- activated guardian verification. Once enabled, a child enrolment
         -- requires this session to be the verified guardian with learning
         -- authority for that exact child. Adult enrolments are unaffected.
         not exists (
           select 1 from public.platform_settings ps
            where ps.key='family.guardian_verification'
              and lower(trim(ps.value_text)) in ('true','on','1')
         )
         or lp.learner_type<>'child'
         or exists (
           select 1 from public.guardian_relationships gr
            where gr.learner_profile_id=lp.id
              and gr.guardian_user_id=public.current_user_id()
              and gr.status='active'
              and gr.verified_at is not null
              and gr.can_manage_learning
              and gr.deleted_at is null
         )
       )
  );
$$;

comment on function public.can_enrol_in_version(uuid,uuid) is
  'May start a new enrolment: published, active course, free or entitled; when guardian verification is enabled, child enrolment also requires a verified session guardian with learning authority.';

-- RLS is not enough: payment fulfilment and other internal SECURITY DEFINER
-- writers can bypass policies. A trigger makes the same condition apply to
-- every insertion path and reports a useful, non-sensitive refusal reason.
create or replace function public.enforce_guardian_consent_on_enrolment()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_learner_type text;
  v_enabled boolean;
begin
  select coalesce(lower(trim(ps.value_text)) in ('true','on','1'),false)
    into v_enabled
    from public.platform_settings ps
   where ps.key='family.guardian_verification';
  v_enabled:=coalesce(v_enabled,false);
  if not v_enabled then return new; end if;

  select lp.learner_type into v_learner_type
    from public.learner_profiles lp
   where lp.id=new.learner_profile_id and lp.deleted_at is null;
  if not found or v_learner_type<>'child' then return new; end if;

  if not exists (
    select 1 from public.guardian_relationships gr
     where gr.learner_profile_id=new.learner_profile_id
       and gr.guardian_user_id=public.current_user_id()
       and gr.status='active'
       and gr.verified_at is not null
       and gr.can_manage_learning
       and gr.deleted_at is null
  ) then
    raise exception 'verified guardian consent is required before enrolling this child'
      using errcode='insufficient_privilege';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_guardian_consent_on_enrolment() from public,anon,authenticated;

drop trigger if exists course_enrolments_guardian_consent on public.course_enrolments;
create trigger course_enrolments_guardian_consent
  before insert or update of learner_profile_id on public.course_enrolments
  for each row execute function public.enforce_guardian_consent_on_enrolment();

comment on function public.enforce_guardian_consent_on_enrolment() is
  'When guardian verification is enabled, every enrolment write path requires a verified current-session guardian for a child, including SECURITY DEFINER fulfilment.';
