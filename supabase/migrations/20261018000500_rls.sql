-- Group 3 · row level security
--
-- Governance data splits three ways: what the public may see (provenance,
-- public bios, publication history), what the participants may see (their own
-- reviews, conflicts, appeals), and what only staff may see (internal notes,
-- evidence, audit events, panel deliberations).

alter table public.platform_settings                enable row level security;
alter table public.reviewer_profiles                enable row level security;
alter table public.reviewer_qualifications          enable row level security;
alter table public.reviewer_subject_authorizations  enable row level security;
alter table public.content_review_requirements      enable row level security;
alter table public.content_review_assignments       enable row level security;
alter table public.content_review_decisions         enable row level security;
alter table public.technical_review_checks          enable row level security;
alter table public.content_sources                  enable row level security;
alter table public.content_source_links             enable row level security;
alter table public.reviewer_conflict_declarations   enable row level security;
alter table public.content_reports                  enable row level security;
alter table public.governance_appeals               enable row level security;
alter table public.publication_events               enable row level security;
alter table public.scholarly_panels                 enable row level security;
alter table public.scholarly_panel_memberships      enable row level security;
alter table public.scholarly_panel_cases            enable row level security;
alter table public.scholarly_panel_votes            enable row level security;
alter table public.content_change_assessments       enable row level security;
alter table public.governance_audit_events          enable row level security;

-- ---------------------------------------------------------------------------
-- platform_settings
--
-- No read policy at all. Clients read settings through setting_bool(), which
-- is security definer. A settings table that anyone can enumerate tells a
-- caller exactly which guards are switched off.
-- ---------------------------------------------------------------------------
create policy platform_settings_write on public.platform_settings
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy platform_settings_update on public.platform_settings
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- reviewer_profiles
--
-- internal_notes is protected by column privileges for the same reason
-- answer_key is: RLS cannot hide a column, and SELECT * must not leak it.
-- ---------------------------------------------------------------------------
create policy reviewer_profiles_read on public.reviewer_profiles
  for select to anon, authenticated
  using (reviewer_status = 'active' and deleted_at is null
         or user_id = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

create policy reviewer_profiles_insert on public.reviewer_profiles
  for insert to authenticated
  with check (user_id = public.current_user_id());

create policy reviewer_profiles_update on public.reviewer_profiles
  for update to authenticated
  using (user_id = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- qualifications — the reviewer and staff only
-- ---------------------------------------------------------------------------
create policy reviewer_qualifications_read on public.reviewer_qualifications
  for select to authenticated
  using (exists (
    select 1 from public.reviewer_profiles rp
     where rp.id = reviewer_qualifications.reviewer_profile_id
       and (rp.user_id = public.current_user_id()
            or public.is_privileged(public.current_user_id()))
  ));

create policy reviewer_qualifications_insert on public.reviewer_qualifications
  for insert to authenticated
  with check (exists (
    select 1 from public.reviewer_profiles rp
     where rp.id = reviewer_qualifications.reviewer_profile_id
       and (rp.user_id = public.current_user_id()
            or public.is_privileged(public.current_user_id()))
  ));

-- ---------------------------------------------------------------------------
-- authorizations — readable, staff-writable
-- ---------------------------------------------------------------------------
create policy rsa_read on public.reviewer_subject_authorizations
  for select to anon, authenticated
  using (true);

create policy rsa_write on public.reviewer_subject_authorizations
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy rsa_update on public.reviewer_subject_authorizations
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- review workflow — the version's author, the assigned reviewer, and staff
-- ---------------------------------------------------------------------------
create or replace function public.can_see_review_of(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_author_version(p_version_id)
      or public.is_enrolled_in_version(p_version_id)
      or exists (
        select 1
          from public.content_review_assignments cra
          join public.reviewer_profiles rp on rp.id = cra.reviewer_profile_id
         where cra.course_version_id = p_version_id
           and rp.user_id = public.current_user_id()
      );
$$;

create policy crr_read on public.content_review_requirements
  for select to anon, authenticated
  using (public.can_see_review_of(course_version_id));

create policy crr_write on public.content_review_requirements
  for insert to authenticated
  with check (public.can_author_version(course_version_id)
              or public.is_privileged(public.current_user_id()));

create policy crr_update on public.content_review_requirements
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy cra_read on public.content_review_assignments
  for select to authenticated
  using (public.can_see_review_of(course_version_id)
         or exists (
           select 1 from public.reviewer_profiles rp
            where rp.id = content_review_assignments.reviewer_profile_id
              and rp.user_id = public.current_user_id()));

create policy cra_write on public.content_review_assignments
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy cra_update on public.content_review_assignments
  for update to authenticated
  using (public.is_privileged(public.current_user_id())
         or exists (
           select 1 from public.reviewer_profiles rp
            where rp.id = content_review_assignments.reviewer_profile_id
              and rp.user_id = public.current_user_id()));

create policy crd_read on public.content_review_decisions
  for select to authenticated
  using (public.can_see_review_of(course_version_id));

create policy crd_write on public.content_review_decisions
  for insert to authenticated
  with check (decided_by = public.current_user_id());

create policy trc_read on public.technical_review_checks
  for select to authenticated
  using (public.can_see_review_of(course_version_id));

create policy trc_write on public.technical_review_checks
  for insert to authenticated
  with check (performed_by = public.current_user_id());

-- ---------------------------------------------------------------------------
-- provenance — deliberately public once the version is readable
-- ---------------------------------------------------------------------------
create policy content_sources_read on public.content_sources
  for select to anon, authenticated
  using (public.can_read_version(course_version_id)
         or public.can_author_version(course_version_id));

create policy content_sources_write on public.content_sources
  for insert to authenticated
  with check (public.can_author_version(course_version_id));

create policy csl_read on public.content_source_links
  for select to anon, authenticated
  using (exists (
    select 1 from public.content_sources cs
     where cs.id = content_source_links.content_source_id
       and (public.can_read_version(cs.course_version_id)
            or public.can_author_version(cs.course_version_id))
  ));

create policy csl_write on public.content_source_links
  for insert to authenticated
  with check (exists (
    select 1 from public.content_sources cs
     where cs.id = content_source_links.content_source_id
       and public.can_author_version(cs.course_version_id)
  ));

create policy cca_read on public.content_change_assessments
  for select to authenticated
  using (public.can_see_review_of(course_version_id));

create policy cca_write on public.content_change_assessments
  for insert to authenticated
  with check (assessed_by = public.current_user_id());

create policy publication_events_read on public.publication_events
  for select to anon, authenticated
  using (public.can_read_version(course_version_id));

-- ---------------------------------------------------------------------------
-- conflicts, reports, appeals — the participant and staff
-- ---------------------------------------------------------------------------
create policy rcd_read on public.reviewer_conflict_declarations
  for select to authenticated
  using (exists (
    select 1 from public.reviewer_profiles rp
     where rp.id = reviewer_conflict_declarations.reviewer_profile_id
       and (rp.user_id = public.current_user_id()
            or public.is_privileged(public.current_user_id()))
  ));

create policy rcd_insert on public.reviewer_conflict_declarations
  for insert to authenticated
  with check (exists (
    select 1 from public.reviewer_profiles rp
     where rp.id = reviewer_conflict_declarations.reviewer_profile_id
       and rp.user_id = public.current_user_id()
  ));

create policy rcd_update on public.reviewer_conflict_declarations
  for update to authenticated
  using (public.is_privileged(public.current_user_id()));

-- Reports may be filed anonymously; the record allows reported_by to be NULL.
create policy content_reports_read on public.content_reports
  for select to authenticated
  using (reported_by = public.current_user_id()
         or assigned_to = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

create policy content_reports_insert on public.content_reports
  for insert to anon, authenticated
  with check (reported_by is null or reported_by = public.current_user_id());

create policy content_reports_update on public.content_reports
  for update to authenticated
  using (public.is_privileged(public.current_user_id())
         or assigned_to = public.current_user_id());

create policy ga_read on public.governance_appeals
  for select to authenticated
  using (submitted_by = public.current_user_id()
         or assigned_to = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

create policy ga_insert on public.governance_appeals
  for insert to authenticated
  with check (submitted_by = public.current_user_id());

create policy ga_update on public.governance_appeals
  for update to authenticated
  using (public.is_privileged(public.current_user_id())
         or assigned_to = public.current_user_id());

-- ---------------------------------------------------------------------------
-- panels and audit — staff only
-- ---------------------------------------------------------------------------
create policy panels_read on public.scholarly_panels
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy panels_write on public.scholarly_panels
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy spm_read on public.scholarly_panel_memberships
  for select to authenticated
  using (public.is_privileged(public.current_user_id())
         or exists (
           select 1 from public.reviewer_profiles rp
            where rp.id = scholarly_panel_memberships.reviewer_profile_id
              and rp.user_id = public.current_user_id()));

create policy spm_write on public.scholarly_panel_memberships
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy spc_read on public.scholarly_panel_cases
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy spc_write on public.scholarly_panel_cases
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

create policy spv_read on public.scholarly_panel_votes
  for select to authenticated
  using (public.is_privileged(public.current_user_id())
         or exists (
           select 1 from public.reviewer_profiles rp
            where rp.id = scholarly_panel_votes.reviewer_profile_id
              and rp.user_id = public.current_user_id()));

create policy spv_write on public.scholarly_panel_votes
  for insert to authenticated
  with check (exists (
    select 1 from public.reviewer_profiles rp
     where rp.id = scholarly_panel_votes.reviewer_profile_id
       and rp.user_id = public.current_user_id()));

create policy gae_read on public.governance_audit_events
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy gae_write on public.governance_audit_events
  for insert to authenticated
  with check (public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
grant select on public.reviewer_profiles,
                public.reviewer_subject_authorizations,
                public.content_sources, public.content_source_links,
                public.publication_events
  to anon;

grant select, insert, update, delete on
  public.reviewer_profiles,
  public.reviewer_qualifications,
  public.reviewer_subject_authorizations,
  public.content_review_requirements,
  public.content_review_assignments,
  public.content_review_decisions,
  public.technical_review_checks,
  public.content_sources,
  public.content_source_links,
  public.reviewer_conflict_declarations,
  public.content_reports,
  public.governance_appeals,
  public.publication_events,
  public.scholarly_panels,
  public.scholarly_panel_memberships,
  public.scholarly_panel_cases,
  public.scholarly_panel_votes,
  public.content_change_assessments,
  public.governance_audit_events,
  public.platform_settings
  to authenticated;

-- platform_settings is granted above but has no SELECT policy, so it stays
-- unreadable. Keeping the grant is deliberate: the security definer helpers
-- need it, and removing it would look like the protection rather than being it.

-- reviewer_profiles and reviewer_qualifications are NOT table-granted here
-- for the same reason as assessment_questions: internal_notes and
-- evidence_reference must not survive a SELECT *.
revoke select on public.reviewer_profiles, public.reviewer_qualifications from authenticated;

grant select (id, user_id, reviewer_status, public_bio, verified_at, created_at, updated_at),
      insert (user_id, public_bio),
      update (public_bio, reviewer_status, verified_at, verified_by)
  on public.reviewer_profiles to authenticated;

grant select (id, reviewer_profile_id, qualification_type, issuing_institution,
              qualification_title, subject_area_id, verification_status,
              verified_at, valid_until),
      insert (reviewer_profile_id, qualification_type, issuing_institution,
              qualification_title, subject_area_id, evidence_reference),
      update (verification_status, verified_by, verified_at, valid_until)
  on public.reviewer_qualifications to authenticated;

comment on function public.can_see_review_of(uuid) is
  'The version author, an enrolled learner, the assigned reviewer, or staff.';
