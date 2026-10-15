-- Group 1 · row level security
--
-- Recorded principle: deny by default, server-side resource-level
-- authorization, RLS as an additional layer. Every table gets RLS enabled; a
-- table with no policy is therefore invisible, which is the correct failure
-- mode.

alter table public.institutions                enable row level security;
alter table public.roles                       enable row level security;
alter table public.user_profiles               enable row level security;
alter table public.user_role_assignments       enable row level security;
alter table public.families                    enable row level security;
alter table public.family_memberships          enable row level security;
alter table public.learner_profiles            enable row level security;
alter table public.guardian_relationships      enable row level security;
alter table public.guardian_verification_cases enable row level security;
alter table public.adult_learning_shares       enable row level security;

-- ---------------------------------------------------------------------------
-- helper
-- ---------------------------------------------------------------------------
create or replace function public.is_own_learner_profile(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.learner_profiles lp
     where lp.id = p_learner_id
       and lp.linked_user_id = public.current_user_id()
  );
$$;

create or replace function public.is_learner_family_member(p_learner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.learner_profiles lp
     where lp.id = p_learner_id
       and lp.family_id is not null
       and public.is_active_family_member(lp.family_id, public.current_user_id())
  );
$$;

-- ---------------------------------------------------------------------------
-- institutions
-- ---------------------------------------------------------------------------
create policy institutions_read on public.institutions
  for select to authenticated
  using (true);

create policy institutions_write on public.institutions
  for all to authenticated
  using (public.has_role(public.current_user_id(), 'platform_admin'))
  with check (public.has_role(public.current_user_id(), 'platform_admin'));

-- ---------------------------------------------------------------------------
-- roles  (read-only to the application; writes are administrative)
-- ---------------------------------------------------------------------------
create policy roles_read on public.roles
  for select to authenticated
  using (true);

create policy roles_write on public.roles
  for all to authenticated
  using (public.has_role(public.current_user_id(), 'platform_admin'))
  with check (public.has_role(public.current_user_id(), 'platform_admin'));

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
create policy user_profiles_read_own on public.user_profiles
  for select to authenticated
  using (
    user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

create policy user_profiles_insert_own on public.user_profiles
  for insert to authenticated
  with check (user_id = public.current_user_id());

create policy user_profiles_update_own on public.user_profiles
  for update to authenticated
  using (
    user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  )
  with check (
    user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- user_role_assignments
-- ---------------------------------------------------------------------------
create policy ura_read_own on public.user_role_assignments
  for select to authenticated
  using (
    user_id = public.current_user_id()
    or public.is_privileged(public.current_user_id())
  );

-- Granting and revoking is administrative. The trigger additionally blocks
-- self-escalation into a privileged role.
create policy ura_write_admin on public.user_role_assignments
  for all to authenticated
  using (public.is_privileged(public.current_user_id()))
  with check (public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------------
create policy families_read on public.families
  for select to authenticated
  using (
    public.is_active_family_member(id, public.current_user_id())
    or public.is_privileged(public.current_user_id())
  );

create policy families_insert on public.families
  for insert to authenticated
  with check (created_by = public.current_user_id());

create policy families_update on public.families
  for update to authenticated
  using (
    public.is_family_owner(id, public.current_user_id())
    or public.is_privileged(public.current_user_id())
  )
  with check (
    public.is_family_owner(id, public.current_user_id())
    or public.is_privileged(public.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- family_memberships
-- ---------------------------------------------------------------------------
create policy fm_read on public.family_memberships
  for select to authenticated
  using (
    public.is_active_family_member(family_id, public.current_user_id())
    or user_id = public.current_user_id()          -- see your own invitation
    or public.is_privileged(public.current_user_id())
  );

create policy fm_write_owner on public.family_memberships
  for all to authenticated
  using (
    public.is_family_owner(family_id, public.current_user_id())
    or public.is_privileged(public.current_user_id())
  )
  with check (
    public.is_family_owner(family_id, public.current_user_id())
    or public.is_privileged(public.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- learner_profiles
-- ---------------------------------------------------------------------------
create policy lp_read on public.learner_profiles
  for select to authenticated
  using (
    public.is_own_learner_profile(id)
    or public.is_learner_family_member(id)
    or public.is_privileged(public.current_user_id())
  );

-- An adult creates their own profile; a family member creates a child profile.
create policy lp_insert on public.learner_profiles
  for insert to authenticated
  with check (
    linked_user_id = public.current_user_id()
    or (family_id is not null
        and public.is_active_family_member(family_id, public.current_user_id()))
    or public.is_privileged(public.current_user_id())
  );

create policy lp_update on public.learner_profiles
  for update to authenticated
  using (
    public.is_own_learner_profile(id)
    or public.is_learner_family_member(id)
    or public.is_privileged(public.current_user_id())
  )
  with check (
    public.is_own_learner_profile(id)
    or public.is_learner_family_member(id)
    or public.is_privileged(public.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- guardian_relationships
-- ---------------------------------------------------------------------------
create policy gr_read on public.guardian_relationships
  for select to authenticated
  using (
    guardian_user_id = public.current_user_id()
    or public.is_learner_family_member(learner_profile_id)
    or public.is_privileged(public.current_user_id())
  );

-- A guardian claims a relationship; it starts pending and grants nothing.
create policy gr_insert on public.guardian_relationships
  for insert to authenticated
  with check (
    guardian_user_id = public.current_user_id()
    or public.is_learner_family_member(learner_profile_id)
    or public.is_privileged(public.current_user_id())
  );

create policy gr_update on public.guardian_relationships
  for update to authenticated
  using (
    public.is_learner_family_member(learner_profile_id)
    or public.is_privileged(public.current_user_id())
  )
  with check (
    public.is_learner_family_member(learner_profile_id)
    or public.is_privileged(public.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- guardian_verification_cases — administrative only.
-- Contains restricted evidence references; no learner, guardian or family
-- member may read these.
-- ---------------------------------------------------------------------------
create policy gvc_admin on public.guardian_verification_cases
  for all to authenticated
  using (
    public.has_role(public.current_user_id(), 'governance_admin')
    or public.has_role(public.current_user_id(), 'platform_admin')
  )
  with check (
    public.has_role(public.current_user_id(), 'governance_admin')
    or public.has_role(public.current_user_id(), 'platform_admin')
  );

-- ---------------------------------------------------------------------------
-- adult_learning_shares
-- ---------------------------------------------------------------------------
create policy als_read on public.adult_learning_shares
  for select to authenticated
  using (
    public.is_own_learner_profile(learner_profile_id)
    or (grantee_user_id = public.current_user_id() and status = 'active')
    or public.is_privileged(public.current_user_id())
  );

create policy als_insert on public.adult_learning_shares
  for insert to authenticated
  with check (public.is_own_learner_profile(learner_profile_id));

-- Only the adult who granted it, or an administrator, may revoke.
create policy als_update on public.adult_learning_shares
  for update to authenticated
  using (
    public.is_own_learner_profile(learner_profile_id)
    or public.is_privileged(public.current_user_id())
  )
  with check (
    public.is_own_learner_profile(learner_profile_id)
    or public.is_privileged(public.current_user_id())
  );

-- ---------------------------------------------------------------------------
-- Grants. RLS still applies on top of these.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.institutions, public.roles to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
