-- Group 3 · platform settings and reviewers
--
-- platform_settings exists because governance needs a runtime switch. The
-- feature-flag audit found that no settings or flag table existed anywhere in
-- the design, which makes every "enable later" promise unimplementable. This
-- is the minimum viable version: typed key/value with an audit trail.

create table public.platform_settings (
  key text primary key check (length(trim(key)) > 0),

  value_type text not null default 'boolean'
    check (value_type in ('boolean', 'text', 'integer', 'json')),
  value_text text,

  description text not null check (length(trim(description)) > 0),

  updated_by uuid references public.user_profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platform_settings_typed_value check (
    case value_type
      when 'boolean' then value_text in ('true', 'false')
      when 'integer' then value_text ~ '^-?[0-9]+$'
      else value_text is not null
    end
  )
);

create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- Typed accessor. security definer so policy code can read settings without
-- the table being world-readable.
create or replace function public.setting_bool(p_key text, p_default boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value_text = 'true') from public.platform_settings where key = p_key),
    p_default
  );
$$;

-- P6: peer review now, panel dormant. Flipping this on is a settings change,
-- not a migration.
insert into public.platform_settings (key, value_type, value_text, description) values
  ('governance.panel_required', 'boolean', 'false',
   'Require a scholarly panel decision before publication. Off: peer review by an authorised reviewer is sufficient (P6).'),
  ('governance.min_approvals', 'integer', '1',
   'Minimum independent approvals required before a version may be published.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- reviewer_profiles
-- ---------------------------------------------------------------------------
create table public.reviewer_profiles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique
    references public.user_profiles (user_id) on delete cascade,

  reviewer_status text not null default 'applicant'
    check (reviewer_status in
      ('applicant', 'pending_verification', 'active', 'suspended', 'inactive')),

  public_bio text,
  internal_notes text,

  verified_at timestamptz,
  verified_by uuid references public.user_profiles (user_id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- Verification is a fact, not a label: a reviewer cannot be active without
  -- a record of who verified them and when.
  constraint rp_active_requires_verification check (
    reviewer_status not in ('active', 'suspended') or verified_at is not null
  ),
  constraint rp_verification_agrees check (
    (verified_at is null) = (verified_by is null)
  )
);

create trigger reviewer_profiles_set_updated_at
  before update on public.reviewer_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reviewer_qualifications
--
-- "Restricted evidence reference": the document is stored outside the
-- database and never served to a client. Only a storage reference lives here.
-- ---------------------------------------------------------------------------
create table public.reviewer_qualifications (
  id uuid primary key default gen_random_uuid(),

  reviewer_profile_id uuid not null
    references public.reviewer_profiles (id) on delete cascade,

  qualification_type text not null default 'certificate'
    check (qualification_type in
      ('certificate', 'degree', 'ijazah', 'experience', 'institutional_affiliation')),

  issuing_institution text,
  qualification_title text not null check (length(trim(qualification_title)) > 0),

  subject_area_id uuid references public.subject_areas (id) on delete set null,

  -- Storage key, not the document.
  evidence_reference text,

  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected', 'expired')),

  verified_by uuid references public.user_profiles (user_id) on delete set null,
  verified_at timestamptz,
  valid_until timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rq_verification_agrees check (
    (verified_at is null) = (verified_by is null)
  ),
  constraint rq_verified_needs_verifier check (
    verification_status not in ('verified', 'rejected')
    or (verified_by is not null and verified_at is not null)
  ),
  constraint rq_validity_window check (
    valid_until is null or verified_at is null or verified_at <= valid_until
  )
);

create index reviewer_qualifications_reviewer_idx
  on public.reviewer_qualifications (reviewer_profile_id);

create trigger reviewer_qualifications_set_updated_at
  before update on public.reviewer_qualifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reviewer_subject_authorizations
--
-- Recorded note: "Qualification does not automatically grant authorization."
-- A verified ijazah in tajweed does not let someone approve fiqh, and it does
-- not even let them approve tajweed until a privileged actor says so.
-- ---------------------------------------------------------------------------
create table public.reviewer_subject_authorizations (
  id uuid primary key default gen_random_uuid(),

  reviewer_profile_id uuid not null
    references public.reviewer_profiles (id) on delete cascade,

  subject_area_id uuid not null
    references public.subject_areas (id) on delete restrict,

  -- 'technical' is the limited check the recorded decision allows an author
  -- to perform on their own course. 'scholarly' is the approval that may not
  -- be self-granted.
  review_scope text not null default 'scholarly'
    check (review_scope in ('technical', 'scholarly')),

  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'revoked')),

  approver uuid references public.user_profiles (user_id) on delete set null,
  approved_at timestamptz,

  effective_from timestamptz not null default now(),
  effective_until timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rsa_active_requires_approver check (
    status <> 'active' or (approver is not null and approved_at is not null)
  ),
  constraint rsa_window check (
    effective_until is null or effective_from <= effective_until
  )
);

-- One authorization per reviewer per subject per scope.
create unique index rsa_one_per_subject_scope
  on public.reviewer_subject_authorizations (reviewer_profile_id, subject_area_id, review_scope)
  where status in ('pending', 'active');

create index rsa_subject_idx on public.reviewer_subject_authorizations (subject_area_id);

create trigger rsa_set_updated_at
  before update on public.reviewer_subject_authorizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- authorization helper, used by the assignment rules
-- ---------------------------------------------------------------------------
create or replace function public.is_authorised_reviewer(
  p_user_id      uuid,
  p_subject_id   uuid,
  p_scope        text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.reviewer_profiles rp
      join public.reviewer_subject_authorizations rsa
        on rsa.reviewer_profile_id = rp.id
     where rp.user_id = p_user_id
       and rp.reviewer_status = 'active'
       and rsa.subject_area_id = p_subject_id
       and rsa.review_scope = p_scope
       and rsa.status = 'active'
       and rsa.effective_from <= now()
       and (rsa.effective_until is null or rsa.effective_until > now())
  );
$$;

comment on table public.platform_settings is
  'Typed runtime settings with an audit trail. The minimum needed to make "enable later" real.';
comment on table public.reviewer_profiles is
  'One per user who reviews. Active status requires a recorded verification.';
comment on table public.reviewer_qualifications is
  'Evidence is referenced, not stored. Verification status is separate from authorisation.';
comment on table public.reviewer_subject_authorizations is
  'P6: a qualification does not grant authorisation. technical scope may be self-held; scholarly may not.';
comment on function public.is_authorised_reviewer(uuid, uuid, text) is
  'Active reviewer holding an unexpired authorisation for this subject and scope.';
