-- Group 1 · guardians and privacy
--
-- Recorded rules enforced here:
--   * Guardian access requires an active, verified relationship AND the
--     relevant permission flag. Pending or revoked relationships get nothing.
--   * Multiple guardians per learner are allowed.
--   * Billing authority is NOT here. It belongs to the billing account and
--     family membership, never implicitly to a guardian relationship.
--   * Adult learning is private by default. Sharing is explicit, scoped and
--     revocable.

-- ---------------------------------------------------------------------------
-- guardian_relationships
-- ---------------------------------------------------------------------------
create table public.guardian_relationships (
  id                 uuid primary key default gen_random_uuid(),
  guardian_user_id   uuid not null
                       references public.user_profiles (user_id) on delete cascade,
  learner_profile_id uuid not null
                       references public.learner_profiles (id) on delete cascade,
  relationship_type  text not null
                       check (relationship_type in ('parent','guardian','other')),
  status             text not null default 'pending_verification'
                       check (status in ('pending_verification','active','revoked')),
  can_manage_profile boolean not null default false,
  can_view_progress  boolean not null default false,
  can_manage_learning boolean not null default false,
  verified_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  constraint gr_active_requires_verification
    check (status <> 'active' or verified_at is not null),
  constraint gr_revoked_clears_permissions
    check (status <> 'revoked'
           or (not can_manage_profile and not can_view_progress and not can_manage_learning))
);

comment on table public.guardian_relationships is
  'Deliberately carries no billing permission. Billing authority lives on the '
  'billing account and family membership.';

-- Multiple guardians allowed; a duplicate pending or active claim is not.
create unique index gr_one_live_relationship_key
  on public.guardian_relationships (guardian_user_id, learner_profile_id)
  where status in ('pending_verification','active') and deleted_at is null;

create index gr_learner_active_key
  on public.guardian_relationships (learner_profile_id)
  where status = 'active' and deleted_at is null;

create trigger gr_set_updated_at
  before update on public.guardian_relationships
  for each row execute function public.set_updated_at();

-- A guardian cannot grant themselves permissions or activate their own
-- relationship. Activation happens only through a verified case (below) or by
-- a privileged user.
create or replace function public.protect_guardian_relationship()
returns trigger
language plpgsql
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null or public.is_privileged(v_actor) then
    return new;
  end if;

  if new.status = 'active' and (old.id is null or old.status <> 'active') then
    raise exception 'a guardian relationship may only be activated through verification'
      using errcode = '42501';
  end if;

  if new.verified_at is distinct from old.verified_at then
    raise exception 'verified_at may only be set through the verification workflow'
      using errcode = '42501';
  end if;

  if new.can_manage_profile and not old.can_manage_profile then
    raise exception 'can_manage_profile may only be widened by an administrator'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger gr_protect_update
  before update on public.guardian_relationships
  for each row execute function public.protect_guardian_relationship();

-- ---------------------------------------------------------------------------
-- guardian_verification_cases
-- ---------------------------------------------------------------------------
create table public.guardian_verification_cases (
  id                     uuid primary key default gen_random_uuid(),
  guardian_relationship_id uuid not null
                             references public.guardian_relationships (id) on delete cascade,
  status                 text not null default 'pending'
                           check (status in
                             ('pending','in_review','verified','rejected','needs_information','revoked')),
  submitted_at           timestamptz not null default now(),
  reviewed_by            uuid references public.user_profiles (user_id) on delete set null,
  reviewed_at            timestamptz,
  decision_reason        text,
  -- A POINTER to restricted evidence held elsewhere, never the evidence
  -- itself. Retention: delete on decision unless disputed.
  evidence_reference     text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint gvc_decision_needs_review
    check (status not in ('verified','rejected','revoked')
           or (reviewed_at is not null and reviewed_by is not null)),
  constraint gvc_rejection_needs_reason
    check (status <> 'rejected' or length(btrim(coalesce(decision_reason,''))) > 0),
  constraint gvc_review_after_submission
    check (reviewed_at is null or reviewed_at >= submitted_at)
);

comment on column public.guardian_verification_cases.evidence_reference is
  'Restricted. Store a reference to evidence held in access-controlled '
  'storage; do not store the document in this table.';

create index gvc_open_key
  on public.guardian_verification_cases (status)
  where status in ('pending','in_review','needs_information');

create trigger gvc_set_updated_at
  before update on public.guardian_verification_cases
  for each row execute function public.set_updated_at();

-- The single path from "claimed" to "can see the child".
create or replace function public.apply_guardian_verification_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- INSERT triggers cannot reference OLD, so the "did the status actually
  -- change" test lives here rather than in a WHEN clause.
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;

  if new.status = 'verified' then
    update public.guardian_relationships
       set status = 'active',
           verified_at = coalesce(new.reviewed_at, now())
     where id = new.guardian_relationship_id
       and status <> 'revoked';
  elsif new.status in ('rejected','revoked') then
    update public.guardian_relationships
       set status = 'revoked',
           can_manage_profile = false,
           can_view_progress = false,
           can_manage_learning = false
     where id = new.guardian_relationship_id;
  end if;
  return new;
end;
$$;

create trigger gvc_apply_decision
  after insert or update of status on public.guardian_verification_cases
  for each row execute function public.apply_guardian_verification_decision();

-- ---------------------------------------------------------------------------
-- adult_learning_shares
-- ---------------------------------------------------------------------------
create table public.adult_learning_shares (
  id                 uuid primary key default gen_random_uuid(),
  learner_profile_id uuid not null
                       references public.learner_profiles (id) on delete cascade,
  grantee_user_id    uuid not null
                       references public.user_profiles (user_id) on delete cascade,
  scope              text not null
                       check (scope in ('progress','achievements','progress_and_achievements')),
  status             text not null default 'active'
                       check (status in ('active','revoked','expired')),
  granted_at         timestamptz not null default now(),
  expires_at         timestamptz,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint als_adults_only
    check (scope is not null),  -- learner_type enforced by trigger below
  constraint als_terminal_state_timestamp
    check (status <> 'revoked' or revoked_at is not null),
  constraint als_expiry_in_future
    check (expires_at is null or expires_at > granted_at)
);

comment on table public.adult_learning_shares is
  'Adult learning is private by default, including inside a family. A share '
  'must be explicit, scoped and revocable. Disabled unless a flag enables it.';

create unique index als_one_active_share_key
  on public.adult_learning_shares (learner_profile_id, grantee_user_id, scope)
  where status = 'active';

create trigger als_set_updated_at
  before update on public.adult_learning_shares
  for each row execute function public.set_updated_at();

create or replace function public.validate_adult_learning_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learner_type  text;
  v_linked_user   uuid;
begin
  select lp.learner_type, lp.linked_user_id
    into v_learner_type, v_linked_user
    from public.learner_profiles lp
   where lp.id = new.learner_profile_id;

  if v_learner_type is null then
    raise exception 'learner profile does not exist';
  end if;

  if v_learner_type <> 'adult' then
    raise exception 'adult_learning_shares applies only to adult learners'
      using errcode = '23514';
  end if;

  if v_linked_user is not null and v_linked_user = new.grantee_user_id then
    raise exception 'an adult learner may not share with their own account'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger als_validate
  before insert or update of learner_profile_id, grantee_user_id
  on public.adult_learning_shares
  for each row execute function public.validate_adult_learning_share();
