-- An institution has a home.
--
-- WHAT WAS MISSING
-- ----------------
-- `institutions` has been the tenancy root since the first migration and it has
-- never had a screen, a member, a colour or a report. Four flags sat beside it
-- as CODE — branding, reporting, api, sso — each waiting for "trademark
-- permission", "privacy rules", "rate limits and versioning", "an identity
-- provider". Three of those four are now answered here:
--
--   * branding   — a display name, a tagline, a tone from the platform's own
--                  palette and a logo address. Not a separate domain, and not a
--                  logo upload: there is no media path for institutions, so a
--                  logo is a link to somewhere the institution already hosts,
--                  which is also what a partner can change without a deploy.
--   * reporting  — counts per member, per course, per month. **No name, no
--                  profile id, no row per person.** A count is not a record; the
--                  screen says so, because a count of two can still identify
--                  somebody and the alternative — inventing a suppression
--                  threshold — is a policy the owner has not set.
--   * api        — keys whose secret is hashed **before it reaches the
--                  database**, a per-key hourly ceiling, and one real endpoint
--                  that returns exactly the report the screen shows.
--
-- sso is the fourth, and it moves to ADMIN only because the part of it that can
-- exist does exist: a **domain claim** — prove you control `school.example` and
-- an account whose address is at that domain may ask to join. A SAML or OIDC
-- connection is still a provider nobody has connected, so there is no
-- single-sign-on login button anywhere and the page says so. A flag that could
-- not be switched on while its feature worked would be the worse dishonesty.
--
-- Also deliberately absent: `commerce.institutions`. Invoicing, bulk seats and
-- purchase orders need B2B terms and a payment provider, neither of which exists.

-- ---------------------------------------------------------------------------
-- Who belongs
-- ---------------------------------------------------------------------------
create table public.institution_memberships (
  id uuid primary key default gen_random_uuid(),

  institution_id uuid not null
    references public.institutions (id) on delete cascade,

  user_id uuid not null
    references public.user_profiles (user_id) on delete cascade,

  -- An institution has administrators and ordinary members. There is no third
  -- kind: a teacher who happens to work at a school is appointed by the
  -- teaching queue, and that appointment is a different thing entirely.
  role text not null default 'member'
    check (role in ('admin', 'member')),

  status text not null default 'active'
    check (status in ('active', 'left', 'removed')),

  joined_at timestamptz not null default now(),
  joined_by uuid references public.user_profiles (user_id) on delete set null,
  left_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint im_left_needs_time check ((status = 'left') = (left_at is not null))
);

create unique index institution_memberships_one_active
  on public.institution_memberships (institution_id, user_id)
  where status = 'active';

create index institution_memberships_user_active
  on public.institution_memberships (user_id)
  where status = 'active';

create trigger institution_memberships_set_updated_at
  before update on public.institution_memberships
  for each row execute function public.set_updated_at();

comment on table public.institution_memberships is
  'An account belongs to at most one institution at a time, as an admin or a member. Membership is what a report counts.';

-- ---------------------------------------------------------------------------
-- What it looks like
-- ---------------------------------------------------------------------------
create table public.institution_branding (
  institution_id uuid primary key
    references public.institutions (id) on delete cascade,

  display_name text check (
    display_name is null or length(btrim(display_name)) between 2 and 120),

  tagline text check (tagline is null or length(btrim(tagline)) <= 200),

  -- A tone, not a colour picker. The platform is white and green on purpose,
  -- and a partner choosing `#ff00ff` would be a partner undoing that on their
  -- own page. Five named tones are what a stylesheet can actually honour.
  accent text check (accent is null or accent in ('green', 'teal', 'olive', 'plum', 'slate')),

  -- A link to a logo the institution already hosts. There is no upload path for
  -- institutions, and inventing one would mean a media pipeline per tenant.
  logo_url text check (
    logo_url is null
    or (logo_url ~* '^https://[^\s]+$' and length(logo_url) <= 500)),

  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles (user_id) on delete set null
);

create trigger institution_branding_set_updated_at
  before update on public.institution_branding
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- What its address is
-- ---------------------------------------------------------------------------
create table public.institution_domains (
  id uuid primary key default gen_random_uuid(),

  institution_id uuid not null
    references public.institutions (id) on delete cascade,

  -- Lower case, no scheme, no path. `School.Example.edu/arabic` is a URL; a
  -- domain is the part a DNS record can prove.
  domain text not null check (
    domain = lower(domain)
    and length(domain) between 4 and 253
    and domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),

  status text not null default 'claimed'
    check (status in ('claimed', 'verified', 'rejected', 'released')),

  -- Printed for the administrator to publish as a DNS TXT record. Verification
  -- is a person saying they looked, because the app cannot read DNS for a
  -- partner's zone without a resolver, and a "verified" badge nobody checked is
  -- worse than no badge.
  claim_token text not null check (claim_token ~ '^ayahspring-site-verification=[a-f0-9]{32}$'),

  note text check (note is null or length(note) <= 1000),
  verified_by uuid references public.user_profiles (user_id) on delete set null,
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles (user_id) on delete set null,

  constraint id_verified_needs_verifier check (
    (status = 'verified') = (verified_at is not null and verified_by is not null)
  )
);

-- One claim at a time per domain, and one institution per verified domain.
create unique index institution_domains_live
  on public.institution_domains (domain)
  where status in ('claimed', 'verified');

-- ---------------------------------------------------------------------------
-- What it may call
-- ---------------------------------------------------------------------------
create table public.institution_api_keys (
  id uuid primary key default gen_random_uuid(),

  institution_id uuid not null
    references public.institutions (id) on delete cascade,

  name text not null check (length(btrim(name)) between 2 and 80),

  -- `ayi_` + twelve hex characters, shown in the console so a key can be
  -- recognised without being usable.
  prefix text not null unique check (prefix ~ '^[a-f0-9]{12}$'),

  -- SHA-256 of the secret, hex. The secret itself is generated in the web app
  -- and is never sent here — this row is only ever compared against a hash of
  -- what a caller presents, so a database dump cannot be replayed as a key.
  secret_hash text not null check (secret_hash ~ '^[a-f0-9]{64}$'),

  created_by uuid references public.user_profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),

  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.user_profiles (user_id) on delete set null,
  revoked_reason text check (revoked_reason is null or length(btrim(revoked_reason)) <= 500)
);

create index institution_api_keys_institution
  on public.institution_api_keys (institution_id)
  where revoked_at is null;

-- One counter per key per hour. A rate limit is arithmetic, not a policy, so it
-- is a constant in the function rather than a setting somebody can forget. The
-- ceiling is 240 calls an hour — generous for a nightly export, useless for a
-- scraper.
create table public.institution_api_usage (
  api_key_id uuid not null
    references public.institution_api_keys (id) on delete cascade,

  hour_start timestamptz not null,
  calls integer not null default 0 check (calls >= 0),

  primary key (api_key_id, hour_start)
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.institution_memberships enable row level security;
alter table public.institution_branding enable row level security;
alter table public.institution_domains enable row level security;
alter table public.institution_api_keys enable row level security;
alter table public.institution_api_usage enable row level security;

-- One question, asked by four policies and a dozen functions.
create or replace function public.is_institution_admin(
  p_user_id uuid,
  p_institution_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.institution_memberships m
     where m.institution_id = p_institution_id
       and m.user_id = p_user_id
       and m.role = 'admin'
       and m.status = 'active'
  );
$$;

comment on function public.is_institution_admin(uuid, uuid) is
  'An active administrator of that institution. Not the same as staff, and not implied by any platform role.';

create policy institution_memberships_read on public.institution_memberships
  for select to authenticated
  using (
    user_id = public.current_user_id()
    or public.is_institution_admin(public.current_user_id(), institution_id)
    or public.is_privileged(public.current_user_id())
  );

create policy institution_branding_read on public.institution_branding
  for select to authenticated
  using (
    exists (
      select 1 from public.institution_memberships m
       where m.institution_id = institution_branding.institution_id
         and m.user_id = public.current_user_id()
         and m.status = 'active'
    )
    or public.is_privileged(public.current_user_id())
  );

create policy institution_domains_read on public.institution_domains
  for select to authenticated
  using (
    public.is_institution_admin(public.current_user_id(), institution_id)
    or public.is_privileged(public.current_user_id())
  );

-- The hash is readable by nobody: a client never needs it to do anything, and
-- the console is served by a definer function that omits it.
create policy institution_api_keys_read on public.institution_api_keys
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));

create policy institution_api_usage_read on public.institution_api_usage
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- The console's read
-- ---------------------------------------------------------------------------
create or replace function public.my_institution()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_member   public.institution_memberships;
  v_inst     public.institutions;
  v_brand    public.institution_branding;
begin
  if v_actor is null then
    raise exception 'institution:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_member
    from public.institution_memberships
   where user_id = v_actor and status = 'active'
   limit 1;

  if v_member.id is null then
    -- Not a member: still answer, because the page has to say whether there is
    -- a verified domain this person's address could join.
    return jsonb_build_object(
      'joined', false,
      'joinable', public.institution_joinable_domain() is not null,
      'flags', jsonb_build_object(
        'branding', public.setting_bool('institution.branding', false),
        'reporting', public.setting_bool('institution.reporting', false),
        'api', public.setting_bool('institution.api', false),
        'sso', public.setting_bool('institution.sso', false)));
  end if;

  select * into v_inst from public.institutions where id = v_member.institution_id;
  select * into v_brand from public.institution_branding
   where institution_id = v_member.institution_id;

  return jsonb_build_object(
    'joined', true,
    'joinable', false,
    'institution', jsonb_build_object(
      'id', v_inst.id,
      'code', v_inst.code,
      'name', v_inst.name,
      'type', v_inst.institution_type,
      'status', v_inst.status),
    'role', v_member.role,
    'joinedAt', v_member.joined_at,
    'branding', case when v_brand.institution_id is null then null else jsonb_build_object(
      'displayName', v_brand.display_name,
      'tagline', v_brand.tagline,
      'accent', v_brand.accent,
      'logoUrl', v_brand.logo_url,
      'updatedAt', v_brand.updated_at) end,
    'domains', case when v_member.role = 'admin' then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id,
               'domain', d.domain,
               'status', d.status,
               -- The token is only useful while the claim is waiting to be
               -- checked; a verified domain does not publish it again.
               'claimToken', case when d.status = 'claimed' then d.claim_token else null end,
               'note', d.note,
               'verifiedAt', d.verified_at) order by d.created_at)
        from public.institution_domains d
       where d.institution_id = v_member.institution_id), '[]'::jsonb) else '[]'::jsonb end,
    'keys', case when v_member.role = 'admin' then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id,
               'name', k.name,
               'prefix', k.prefix,
               'createdAt', k.created_at,
               'lastUsedAt', k.last_used_at,
               'revokedAt', k.revoked_at,
               'revokedReason', k.revoked_reason) order by k.created_at desc)
        from public.institution_api_keys k
       where k.institution_id = v_member.institution_id), '[]'::jsonb) else '[]'::jsonb end,
    'flags', jsonb_build_object(
      'branding', public.setting_bool('institution.branding', false),
      'reporting', public.setting_bool('institution.reporting', false),
      'api', public.setting_bool('institution.api', false),
      'sso', public.setting_bool('institution.sso', false)));
end;
$$;

/**
 * The verified domain this account's address belongs to, if any — the whole of
 * what "SSO" means today. `auth.users` is read here and nowhere else, so the
 * address never travels to a screen.
 */
create or replace function public.institution_joinable_domain()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_email text;
begin
  if v_actor is null then
    return null;
  end if;
  if not public.setting_bool('institution.sso', false) then
    return null;
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_actor;
  if v_email is null or position('@' in v_email) = 0 then
    return null;
  end if;

  return (
    select d.domain
      from public.institution_domains d
     where d.status = 'verified'
       and lower(split_part(v_email, '@', 2)) = d.domain
     limit 1
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Joining and leaving
-- ---------------------------------------------------------------------------
create or replace function public.join_institution()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_domain text;
  v_inst   uuid;
  v_id     uuid;
begin
  if v_actor is null then
    raise exception 'institution:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if exists (
    select 1 from public.institution_memberships
     where user_id = v_actor and status = 'active'
  ) then
    raise exception 'institution:already_joined'
      using errcode = 'unique_violation';
  end if;

  v_domain := public.institution_joinable_domain();
  if v_domain is null then
    raise exception 'institution:no_verified_domain'
      using errcode = 'no_data_found';
  end if;

  select institution_id into v_inst
    from public.institution_domains
   where domain = v_domain and status = 'verified';

  insert into public.institution_memberships (institution_id, user_id, role, joined_by)
  values (v_inst, v_actor, 'member', v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.joined', 'institution', v_inst,
          jsonb_build_object('domain', v_domain, 'membershipId', v_id));

  return jsonb_build_object('institutionId', v_inst, 'role', 'member', 'domain', v_domain);
end;
$$;

create or replace function public.leave_institution()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_member public.institution_memberships;
  v_others int;
begin
  select * into v_member
    from public.institution_memberships
   where user_id = v_actor and status = 'active'
   for update;

  if v_member.id is null then
    raise exception 'institution:not_a_member'
      using errcode = 'no_data_found';
  end if;

  if v_member.role = 'admin' then
    select count(*) into v_others
      from public.institution_memberships
     where institution_id = v_member.institution_id
       and status = 'active' and role = 'admin' and user_id <> v_actor;
    if v_others = 0 then
      raise exception 'institution:last_admin'
        using errcode = 'check_violation';
    end if;
  end if;

  update public.institution_memberships
     set status = 'left', left_at = now()
   where id = v_member.id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.left', 'institution', v_member.institution_id, '{}'::jsonb);

  return jsonb_build_object('status', 'left');
end;
$$;

-- ---------------------------------------------------------------------------
-- Branding
-- ---------------------------------------------------------------------------
create or replace function public.update_institution_branding(
  p_display_name text,
  p_tagline      text,
  p_accent       text,
  p_logo_url     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_member public.institution_memberships;
begin
  select * into v_member
    from public.institution_memberships
   where user_id = v_actor and status = 'active' and role = 'admin';

  if v_member.id is null then
    raise exception 'institution:not_an_admin'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('institution.branding', false) then
    raise exception 'institution:branding_closed'
      using errcode = 'feature_not_supported';
  end if;

  insert into public.institution_branding
    (institution_id, display_name, tagline, accent, logo_url, updated_by)
  values
    (v_member.institution_id,
     nullif(btrim(coalesce(p_display_name, '')), ''),
     nullif(btrim(coalesce(p_tagline, '')), ''),
     nullif(btrim(coalesce(p_accent, '')), ''),
     nullif(btrim(coalesce(p_logo_url, '')), ''),
     v_actor)
  on conflict (institution_id) do update
    set display_name = excluded.display_name,
        tagline = excluded.tagline,
        accent = excluded.accent,
        logo_url = excluded.logo_url,
        updated_by = excluded.updated_by;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.branding_updated', 'institution', v_member.institution_id,
          jsonb_build_object('displayName', nullif(btrim(coalesce(p_display_name, '')), ''),
                             'accent', nullif(btrim(coalesce(p_accent, '')), '')));

  return jsonb_build_object('institutionId', v_member.institution_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Domains
-- ---------------------------------------------------------------------------
create or replace function public.claim_institution_domain(p_domain text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_member public.institution_memberships;
  v_domain text := lower(btrim(coalesce(p_domain, '')));
  v_token  text;
  v_id     uuid;
begin
  select * into v_member
    from public.institution_memberships
   where user_id = v_actor and status = 'active' and role = 'admin';

  if v_member.id is null then
    raise exception 'institution:not_an_admin'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('institution.sso', false) then
    raise exception 'institution:domains_closed'
      using errcode = 'feature_not_supported';
  end if;

  -- Strip a leading scheme and anything after the first slash, so pasting a URL
  -- is a convenience rather than an error somebody has to decode.
  v_domain := regexp_replace(v_domain, '^https?://', '');
  v_domain := split_part(v_domain, '/', 1);

  if v_domain = '' then
    raise exception 'institution:domain_required'
      using errcode = 'invalid_parameter_value';
  end if;

  v_token := 'ayahspring-site-verification=' || replace(gen_random_uuid()::text, '-', '');

  insert into public.institution_domains
    (institution_id, domain, claim_token, created_by)
  values (v_member.institution_id, v_domain, v_token, v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.domain_claimed', 'institution', v_member.institution_id,
          jsonb_build_object('domain', v_domain));

  return jsonb_build_object('id', v_id, 'domain', v_domain, 'claimToken', v_token,
                            'status', 'claimed');
end;
$$;

create or replace function public.verify_institution_domain(
  p_domain_id uuid,
  p_verified  boolean,
  p_reason    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_row    public.institution_domains;
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'institution:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_reason = '' then
    raise exception 'institution:reason_required'
      using errcode = 'check_violation';
  end if;

  select * into v_row from public.institution_domains where id = p_domain_id;
  if not found then
    raise exception 'institution:domain_not_found'
      using errcode = 'no_data_found';
  end if;
  if v_row.status <> 'claimed' then
    raise exception 'institution:already_decided'
      using errcode = 'check_violation';
  end if;

  if p_verified then
    update public.institution_domains
       set status = 'verified', verified_by = v_actor, verified_at = now(), note = v_reason
     where id = p_domain_id;
  else
    update public.institution_domains
       set status = 'rejected', note = v_reason
     where id = p_domain_id;
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor,
          case when p_verified then 'institution.domain_verified'
               else 'institution.domain_rejected' end,
          'institution', v_row.institution_id,
          jsonb_build_object('domain', v_row.domain, 'reason', v_reason));

  return jsonb_build_object('status', case when p_verified then 'verified' else 'rejected' end);
end;
$$;

-- ---------------------------------------------------------------------------
-- API keys
-- ---------------------------------------------------------------------------
create or replace function public.create_institution_api_key(
  p_name     text,
  p_prefix   text,
  p_hash     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_member public.institution_memberships;
  v_id     uuid;
begin
  select * into v_member
    from public.institution_memberships
   where user_id = v_actor and status = 'active' and role = 'admin';

  if v_member.id is null then
    raise exception 'institution:not_an_admin'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('institution.api', false) then
    raise exception 'institution:api_closed'
      using errcode = 'feature_not_supported';
  end if;

  insert into public.institution_api_keys
    (institution_id, name, prefix, secret_hash, created_by)
  values
    (v_member.institution_id, btrim(p_name), lower(p_prefix), lower(p_hash), v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.api_key_created', 'institution', v_member.institution_id,
          jsonb_build_object('prefix', lower(p_prefix), 'name', btrim(p_name)));

  return jsonb_build_object('id', v_id, 'prefix', lower(p_prefix));
end;
$$;

create or replace function public.revoke_institution_api_key(
  p_key_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_row    public.institution_api_keys;
begin
  if v_reason = '' then
    raise exception 'institution:reason_required'
      using errcode = 'check_violation';
  end if;

  select * into v_row from public.institution_api_keys where id = p_key_id;
  if not found then
    raise exception 'institution:key_not_found'
      using errcode = 'no_data_found';
  end if;
  if not public.is_institution_admin(v_actor, v_row.institution_id) then
    raise exception 'institution:not_an_admin'
      using errcode = 'insufficient_privilege';
  end if;
  if v_row.revoked_at is not null then
    raise exception 'institution:already_revoked'
      using errcode = 'check_violation';
  end if;

  update public.institution_api_keys
     set revoked_at = now(), revoked_by = v_actor, revoked_reason = v_reason
   where id = p_key_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.api_key_revoked', 'institution', v_row.institution_id,
          jsonb_build_object('prefix', v_row.prefix, 'reason', v_reason));

  return jsonb_build_object('status', 'revoked');
end;
$$;

-- ---------------------------------------------------------------------------
-- The report
-- ---------------------------------------------------------------------------
/**
 * Counts for one institution over a window, and nothing that names a person.
 *
 * **What is counted, exactly:** accounts with an active membership; the learner
 * profiles linked to those accounts plus the other children in their families; the
 * live enrolments of those profiles; how many of those are completed; and the
 * certificates issued against them. A learner who is not linked to a member
 * account is not counted, which is the honest limit — the institution sees the
 * people who joined it, not everybody who studies at the same address.
 *
 * The function returns no learner id, no name and no email, and the per-course
 * rows carry a course title rather than an id, so a UI cannot grow a link into
 * somebody's record from this payload.
 */
create or replace function public.institution_report_data(
  p_institution uuid,
  p_from        date,
  p_to          date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- One statement, because a report that assembles itself from several reads can
  -- disagree with itself if somebody enrols in between. The cohort is defined
  -- once in `scope`: a member account's own learner profile, plus every other
  -- profile in those families — a member's children.
  with member_users as (
    select m.user_id
      from public.institution_memberships m
     where m.institution_id = p_institution and m.status = 'active'
  ),
  scope as (
    select lp.id as learner_profile_id
      from public.learner_profiles lp
     where lp.deleted_at is null
       and (
         lp.linked_user_id in (select user_id from member_users)
         or lp.family_id in (
              select f.family_id
                from public.learner_profiles f
               where f.deleted_at is null and f.family_id is not null
                 and f.linked_user_id in (select user_id from member_users))
       )
  ),
  started as (
    select ce.learner_profile_id, ce.status, c.title
      from public.course_enrolments ce
      join public.courses c on c.id = ce.course_id
     where ce.deleted_at is null
       and ce.enrolled_at >= p_from and ce.enrolled_at < (p_to + 1)
       and ce.learner_profile_id in (select learner_profile_id from scope)
  ),
  finished as (
    select count(*) as n
      from public.course_enrolments ce
     where ce.deleted_at is null
       and ce.status = 'completed'
       and ce.completed_at >= p_from and ce.completed_at < (p_to + 1)
       and ce.learner_profile_id in (select learner_profile_id from scope)
  ),
  awarded as (
    select count(*) as n
      from public.certificates c
      join public.course_enrolments ce on ce.id = c.course_enrolment_id
     where c.status = 'issued'
       and c.issued_at >= p_from and c.issued_at < (p_to + 1)
       and ce.learner_profile_id in (select learner_profile_id from scope)
  ),
  per_course as (
    select jsonb_agg(jsonb_build_object(
             'course', title,
             'learnerProfiles', people,
             'enrolments', n,
             'completions', done) order by title) as rows
      from (
        select title,
               count(distinct learner_profile_id) as people,
               count(*) as n,
               count(*) filter (where status = 'completed') as done
          from started
         group by title
      ) grouped
  ),
  per_month as (
    select coalesce(jsonb_agg(jsonb_build_object('month', month, 'enrolments', n)
                              order by month), '[]'::jsonb) as rows
      from (
        select to_char(date_trunc('month', ce.enrolled_at), 'YYYY-MM') as month, count(*) as n
          from public.course_enrolments ce
         where ce.deleted_at is null
           and ce.enrolled_at >= p_from and ce.enrolled_at < (p_to + 1)
           and ce.learner_profile_id in (select learner_profile_id from scope)
         group by 1
      ) monthly
  )
  select jsonb_build_object(
           'institutionId', p_institution,
           'from', p_from,
           'to', p_to,
           'totals', jsonb_build_object(
             'members', (select count(*) from member_users),
             'learners', (select count(*) from scope),
             'enrolments', (select count(*) from started),
             'completions', (select n from finished),
             'certificates', (select n from awarded)),
           'courses', coalesce((select rows from per_course), '[]'::jsonb),
           'months', (select rows from per_month))
    into v_result;

  return v_result;
end;
$$;

create or replace function public.institution_report(
  p_from date,
  p_to   date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_member public.institution_memberships;
begin
  select * into v_member
    from public.institution_memberships
   where user_id = v_actor and status = 'active';

  if v_member.id is null then
    raise exception 'institution:not_a_member'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('institution.reporting', false) then
    raise exception 'institution:reporting_closed'
      using errcode = 'feature_not_supported';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'institution:bad_window'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_to - p_from > 731 then
    raise exception 'institution:window_too_long'
      using errcode = 'invalid_parameter_value';
  end if;

  return public.institution_report_data(v_member.institution_id, p_from, p_to);
end;
$$;

/**
 * The same report for a caller holding a key, and the only place a key is
 * checked. A wrong prefix and a wrong secret are the same answer on purpose:
 * distinguishing them tells somebody which half to keep guessing.
 *
 * The ceiling is per key per clock hour. It is checked after the credential, so
 * a bad key cannot consume a good key's allowance, and the counter is written in
 * the same statement as the check.
 */
create or replace function public.institution_api_report(
  p_prefix text,
  p_hash   text,
  p_from   date,
  p_to     date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key    public.institution_api_keys;
  v_hour   timestamptz := date_trunc('hour', now());
  v_calls  int;
begin
  select * into v_key
    from public.institution_api_keys
   where prefix = lower(btrim(coalesce(p_prefix, '')))
     and secret_hash = lower(btrim(coalesce(p_hash, '')))
     and revoked_at is null;

  if v_key.id is null then
    raise exception 'institution:bad_key'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.setting_bool('institution.api', false) then
    raise exception 'institution:api_closed'
      using errcode = 'feature_not_supported';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'institution:bad_window'
      using errcode = 'invalid_parameter_value';
  end if;
  if p_to - p_from > 731 then
    raise exception 'institution:window_too_long'
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.institution_api_usage (api_key_id, hour_start, calls)
  values (v_key.id, v_hour, 1)
  on conflict (api_key_id, hour_start)
    do update set calls = public.institution_api_usage.calls + 1
  returning calls into v_calls;

  if v_calls > 240 then
    raise exception 'institution:rate_limited'
      using errcode = 'program_limit_exceeded',
            hint = '240 calls per hour per key';
  end if;

  update public.institution_api_keys
     set last_used_at = now()
   where id = v_key.id;

  return public.institution_report_data(v_key.institution_id, p_from, p_to);
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff: create one, appoint its administrators
-- ---------------------------------------------------------------------------
create or replace function public.create_institution(
  p_code          text,
  p_name          text,
  p_type          text,
  p_admin_user_id uuid,
  p_reason        text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_id     uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'institution:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_reason = '' then
    raise exception 'institution:reason_required'
      using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.user_profiles where user_id = p_admin_user_id) then
    raise exception 'institution:admin_not_found'
      using errcode = 'no_data_found';
  end if;

  insert into public.institutions (code, name, institution_type)
  values (lower(btrim(p_code)), btrim(p_name), p_type)
  returning id into v_id;

  insert into public.institution_memberships
    (institution_id, user_id, role, joined_by)
  values (v_id, p_admin_user_id, 'admin', v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.created', 'institution', v_id,
          jsonb_build_object('code', lower(btrim(p_code)), 'name', btrim(p_name),
                             'adminUserId', p_admin_user_id, 'reason', v_reason));

  return jsonb_build_object('institutionId', v_id);
end;
$$;

/**
 * Finding the person who will administer a new institution.
 *
 * By address, because the owner knows who the head teacher is and does not know
 * their uuid. The answer is a name and an id for the form to confirm — never an
 * address list, and never anybody's learner data.
 */
create or replace function public.institution_admin_candidate(p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_id    uuid;
  v_name  text;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'institution:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select u.id, p.display_name
    into v_id, v_name
    from auth.users u
    join public.user_profiles p on p.user_id = u.id
   where lower(u.email) = lower(btrim(coalesce(p_email, '')))
   limit 1;

  if v_id is null then
    raise exception 'institution:admin_not_found'
      using errcode = 'no_data_found';
  end if;

  return jsonb_build_object('userId', v_id, 'name', v_name);
end;
$$;

create or replace function public.set_institution_admin(
  p_institution uuid,
  p_user_id     uuid,
  p_make_admin  boolean,
  p_reason      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_member public.institution_memberships;
  v_admins int;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'institution:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_reason = '' then
    raise exception 'institution:reason_required'
      using errcode = 'check_violation';
  end if;

  select * into v_member
    from public.institution_memberships
   where institution_id = p_institution and user_id = p_user_id and status = 'active';

  if v_member.id is null then
    raise exception 'institution:not_a_member'
      using errcode = 'no_data_found';
  end if;

  if not p_make_admin and v_member.role = 'admin' then
    select count(*) into v_admins
      from public.institution_memberships
     where institution_id = p_institution and status = 'active' and role = 'admin';
    if v_admins <= 1 then
      raise exception 'institution:last_admin'
        using errcode = 'check_violation';
    end if;
  end if;

  update public.institution_memberships
     set role = case when p_make_admin then 'admin' else 'member' end
   where id = v_member.id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'institution.admin_changed', 'institution', p_institution,
          jsonb_build_object('userId', p_user_id, 'admin', p_make_admin, 'reason', v_reason));

  return jsonb_build_object('role', case when p_make_admin then 'admin' else 'member' end);
end;
$$;

/** Staff view of every institution: counts, never people. */
create or replace function public.institution_directory()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'institution:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'institutions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id,
               'code', i.code,
               'name', i.name,
               'type', i.institution_type,
               'status', i.status,
               'members', (select count(*) from public.institution_memberships m
                            where m.institution_id = i.id and m.status = 'active'),
               'admins', (select count(*) from public.institution_memberships m
                           where m.institution_id = i.id and m.status = 'active' and m.role = 'admin'),
               'domains', (select count(*) from public.institution_domains d
                            where d.institution_id = i.id and d.status = 'verified'),
               'waitingDomains', (select count(*) from public.institution_domains d
                                   where d.institution_id = i.id and d.status = 'claimed'))
             order by i.name)
        from public.institutions i
       where i.deleted_at is null and i.institution_type <> 'default'), '[]'::jsonb),
    'waitingDomains', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id,
               'domain', d.domain,
               'institution', i.name,
               'claimToken', d.claim_token,
               'claimedAt', d.created_at) order by d.created_at)
        from public.institution_domains d
        join public.institutions i on i.id = d.institution_id
       where d.status = 'claimed'), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.is_institution_admin(uuid, uuid) from public, anon;
grant execute on function public.is_institution_admin(uuid, uuid) to authenticated;

revoke all on function public.my_institution() from public, anon;
grant execute on function public.my_institution() to authenticated;

revoke all on function public.institution_joinable_domain() from public, anon;
grant execute on function public.institution_joinable_domain() to authenticated;

revoke all on function public.join_institution() from public, anon;
grant execute on function public.join_institution() to authenticated;

revoke all on function public.leave_institution() from public, anon;
grant execute on function public.leave_institution() to authenticated;

revoke all on function public.update_institution_branding(text, text, text, text) from public, anon;
grant execute on function public.update_institution_branding(text, text, text, text) to authenticated;

revoke all on function public.claim_institution_domain(text) from public, anon;
grant execute on function public.claim_institution_domain(text) to authenticated;

revoke all on function public.verify_institution_domain(uuid, boolean, text) from public, anon;
grant execute on function public.verify_institution_domain(uuid, boolean, text) to authenticated;

revoke all on function public.create_institution_api_key(text, text, text) from public, anon;
grant execute on function public.create_institution_api_key(text, text, text) to authenticated;

revoke all on function public.revoke_institution_api_key(uuid, text) from public, anon;
grant execute on function public.revoke_institution_api_key(uuid, text) to authenticated;

revoke all on function public.institution_report(date, date) from public, anon;
grant execute on function public.institution_report(date, date) to authenticated;

-- The API is called by a machine holding a key, so `anon` may execute it — the
-- secret is the credential, and without it the function raises.
revoke all on function public.institution_api_report(text, text, date, date) from public;
grant execute on function public.institution_api_report(text, text, date, date) to anon, authenticated;

revoke all on function public.institution_report_data(uuid, date, date) from public, anon, authenticated;

revoke all on function public.create_institution(text, text, text, uuid, text) from public, anon;
grant execute on function public.create_institution(text, text, text, uuid, text) to authenticated;

revoke all on function public.institution_admin_candidate(text) from public, anon;
grant execute on function public.institution_admin_candidate(text) to authenticated;

revoke all on function public.set_institution_admin(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.set_institution_admin(uuid, uuid, boolean, text) to authenticated;

revoke all on function public.institution_directory() from public, anon;
grant execute on function public.institution_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- The switches
-- ---------------------------------------------------------------------------
update public.platform_settings
   set gate_type = 'admin',
       description = 'An institution can put its own name, tagline and tone on its own screens.',
       preconditions = 'None blocking. A partner name and logo are theirs to set; the tone is chosen from five named tones because the platform is white and green, not a colour picker. The logo is a link to a file the institution already hosts — there is no upload path for institutions — and the database refuses anything but https.'
 where key = 'institution.branding';

update public.platform_settings
   set gate_type = 'admin',
       description = 'An institution sees counts of its own members'' learning, never a row per person.',
       preconditions = 'None blocking. The report counts accounts with an active membership, the learner profiles linked to them and the other children in those families, their live enrolments in the window, completions and certificates. It returns no name, no learner id and no email, and it is the same payload the API serves. A count of one can still identify somebody — that is said on the screen, and a suppression threshold is a policy the owner has not set.'
 where key = 'institution.reporting';

update public.platform_settings
   set gate_type = 'admin',
       description = 'A key an institution can use to read its own report from its own systems.',
       preconditions = 'None blocking. The secret is generated in the web app and only its SHA-256 is stored, so it is shown once and cannot be recovered; a key is revoked with a written reason and stops working immediately. One endpoint exists — the report the screen shows — with a ceiling of 240 calls an hour per key. There are no webhooks: nothing here can call out, because there is no queue and no scheduler behind it.'
 where key = 'institution.api';

update public.platform_settings
   set gate_type = 'admin',
       description = 'Domain identity: a verified email domain lets an account at that domain ask to join the institution.',
       preconditions = 'Domain identity is built and this switch turns it on: an administrator claims a domain, a staff member records that the DNS TXT record was checked, and an account whose address is at that domain may join — nothing is automatic and no account is created. What is still missing is a real identity provider: SAML or OIDC needs a provider nobody has connected, so there is no single-sign-on login button anywhere, and the screen says so rather than showing one that cannot work.'
 where key = 'institution.sso';
