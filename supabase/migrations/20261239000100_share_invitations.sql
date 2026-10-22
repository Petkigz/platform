-- Sharing with an address that has no account — by invitation, not by disclosure.
--
-- Decided 2026-10-22. `/account/sharing` resolved an address to an account and
-- said so when there was none, as `invite_family_member()` always had. Both easy
-- alternatives are wrong: a silent no-op leaves the sharer believing something
-- was shared, and a disclosure lets anybody test whether an address is registered
-- here.
--
-- So sharing by address now always produces an invitation, whether or not an
-- account exists. The response is identical in either case, which is what makes
-- the non-disclosure real rather than cosmetic — there is no branch to leak.
--
-- Three properties make the token safe to put in an email:
--
--   * only its hash is stored, so reading the table cannot grant anybody access;
--   * it is bound to the address it was sent to, so a forwarded message is not
--     enough on its own — accepting requires being signed in as that address;
--   * it expires, and accepting it once is all it can do.
--
-- The message itself goes through `queue_message()`, which records what would be
-- sent. Nothing is delivered yet, because no provider exists, and the row in the
-- outbox says so exactly as loudly as the screen does.

create table if not exists public.share_invitations (
  id uuid primary key default gen_random_uuid(),

  -- The adult whose learning is being shared.
  learner_profile_id uuid not null
    references public.learner_profiles (id) on delete cascade,

  invited_by uuid not null
    references public.user_profiles (user_id) on delete cascade,

  -- Lower-cased. The address is the claim the token is bound to.
  email text not null
    check (length(btrim(email)) between 3 and 320 and position('@' in email) > 1),

  -- md5 of the token, never the token. md5 is chosen over sha256 because the
  -- token is already 122 random bits from gen_random_uuid(), so the hash is
  -- protecting against a table reader rather than against a guessing attack, and
  -- md5 is available in every Postgres without an extension.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{32}$'),

  scope text not null
    check (scope in ('progress', 'achievements', 'progress_and_achievements')),

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),

  expires_at timestamptz not null,
  accepted_by uuid references public.user_profiles (user_id) on delete set null,
  accepted_at timestamptz,

  created_at timestamptz not null default now(),

  constraint si_accept_agrees check (
    (status = 'accepted') = (accepted_at is not null)
  )
);

create index share_invitations_email_idx on public.share_invitations (lower(email), status);
create index share_invitations_learner_idx on public.share_invitations (learner_profile_id);

comment on table public.share_invitations is
  'An invitation to see an adult''s learning. Created whether or not the address has an account, which is what keeps the response from disclosing one.';

-- ---------------------------------------------------------------------------
-- Inviting
-- ---------------------------------------------------------------------------
create or replace function public.invite_learning_share(
  p_email   text,
  p_scope   text,
  p_days    integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_scope   text := coalesce(p_scope, 'progress');
  v_days    integer := coalesce(p_days, 7);
  v_learner uuid;
  v_token   uuid := gen_random_uuid();
  v_expires timestamptz;
  v_name    text;
  v_id      uuid;
  v_subject text;
  v_body    text;
begin
  if v_actor is null then
    raise exception 'sign in first'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('family.adult_shares', false) then
    raise exception 'sharing an adult''s learning is not enabled on this platform'
      using errcode = 'insufficient_privilege';
  end if;

  if v_email = '' or length(v_email) > 320
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'that is not an email address' using errcode = 'check_violation';
  end if;

  if v_scope not in ('progress', 'achievements', 'progress_and_achievements') then
    raise exception 'a share covers progress, achievements, or both'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_days < 1 or v_days > 90 then
    raise exception 'an invitation lasts between 1 and 90 days'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The sharer's own adult learner profile. An adult shares their own learning
  -- through this path; a child's learning is never shared by invitation.
  select lp.id into v_learner
    from public.learner_profiles lp
   where lp.linked_user_id = v_actor
     and lp.learner_type = 'adult'
     and lp.status = 'active'
     and lp.deleted_at is null
   order by lp.created_at
   limit 1;

  if v_learner is null then
    raise exception 'there is no adult learner profile to share from'
      using errcode = 'no_data_found';
  end if;

  -- Inviting your own address is a loop; refused rather than silently accepted.
  if v_email = lower(coalesce((select u.email from auth.users u where u.id = v_actor), '')) then
    raise exception 'that is your own address' using errcode = 'check_violation';
  end if;

  v_expires := now() + make_interval(days => v_days);

  insert into public.share_invitations
    (learner_profile_id, invited_by, email, token_hash, scope, expires_at)
  values
    (v_learner, v_actor, v_email, md5(v_token::text), v_scope, v_expires)
  returning id into v_id;

  select nullif(btrim(up.display_name), '') into v_name
    from public.user_profiles up where up.user_id = v_actor;

  -- The message is written straight to the outbox rather than through
  -- `queue_message()`, which is staff-only: an invitation is sent by the person
  -- sharing, and opening that function to every signed-in caller would open a way
  -- to post arbitrary mail. This function is itself the check — it knows the
  -- sharer, the scope and the address — so it renders the same named template
  -- and writes the same row shape.
  --
  -- `url` is relative because the database does not know this deployment's host;
  -- the dispatcher joins it with the configured base when one exists.
  select subject_template, body_template into v_subject, v_body
    from public.message_templates where code = 'invite_email';

  v_subject := replace(replace(v_subject,
    '{{inviter}}', coalesce(v_name, 'Somebody you know')),
    '{{resource}}', 'their learning progress');
  v_body := replace(replace(replace(replace(v_body,
    '{{inviter}}', coalesce(v_name, 'Somebody you know')),
    '{{resource}}', 'their learning progress'),
    '{{url}}', '/share/invite/' || v_token::text),
    '{{expires}}', to_char(v_expires at time zone 'UTC', 'DD Mon YYYY'));

  insert into public.outbound_messages
    (channel, template_code, purpose, to_address, subject, body, payload, created_by)
  values
    ('email', 'invite_email', 'invite', v_email, v_subject, v_body,
     jsonb_build_object('invitationId', v_id, 'expiresAt', v_expires), v_actor);

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'sharing.invited', 'share_invitation', v_id,
          jsonb_build_object('scope', v_scope, 'expiresAt', v_expires));

  -- The same shape whether or not the address has an account. Nothing in this
  -- reply can be used to tell the two apart.
  return jsonb_build_object('invitationId', v_id, 'expiresAt', v_expires);
end;
$$;

comment on function public.invite_learning_share(text,text,integer) is
  'Invites an address to see this adult''s learning, whether or not an account exists, and queues the message. The reply never discloses which.';

-- ---------------------------------------------------------------------------
-- Accepting
-- ---------------------------------------------------------------------------
create or replace function public.accept_learning_share(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_token text := btrim(coalesce(p_token, ''));
  v_email text;
  v_inv   public.share_invitations;
  v_share uuid;
begin
  if v_actor is null then
    raise exception 'sign in to accept an invitation'
      using errcode = 'insufficient_privilege';
  end if;

  if v_token = '' then
    raise exception 'that invitation link is not complete'
      using errcode = 'invalid_parameter_value';
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_actor;

  select * into v_inv
    from public.share_invitations si
   where si.token_hash = md5(v_token)
   for update;

  if not found then
    raise exception 'that invitation does not exist'
      using errcode = 'no_data_found';
  end if;

  if v_inv.status = 'accepted' then
    raise exception 'that invitation has already been accepted'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'that invitation was withdrawn'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v_inv.status = 'expired' or v_inv.expires_at <= now() then
    raise exception 'that invitation has expired'
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  -- The token is bound to the address it was sent to: possessing the mail is not
  -- enough if you are signed in as somebody else.
  if v_email is null or v_email <> v_inv.email then
    raise exception 'that invitation was sent to a different address'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.setting_bool('family.adult_shares', false) then
    raise exception 'sharing an adult''s learning is not enabled on this platform'
      using errcode = 'insufficient_privilege';
  end if;

  -- One live share per person per scope, as `share_adult_learning()` enforces.
  if exists (
    select 1 from public.adult_learning_shares als
     where als.learner_profile_id = v_inv.learner_profile_id
       and als.grantee_user_id = v_actor
       and als.status = 'active'
       and (als.expires_at is null or als.expires_at > now())
       and als.scope = v_inv.scope
  ) then
    raise exception 'you already have that share'
      using errcode = 'unique_violation';
  end if;

  insert into public.adult_learning_shares
    (learner_profile_id, grantee_user_id, scope, status, expires_at)
  values
    (v_inv.learner_profile_id, v_actor, v_inv.scope, 'active', v_inv.expires_at)
  returning id into v_share;

  update public.share_invitations
     set status = 'accepted', accepted_by = v_actor, accepted_at = now()
   where id = v_inv.id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'sharing.invitation_accepted', 'share_invitation', v_inv.id,
          jsonb_build_object('shareId', v_share, 'scope', v_inv.scope));

  return jsonb_build_object('shareId', v_share, 'scope', v_inv.scope);
end;
$$;

comment on function public.accept_learning_share(text) is
  'Accepts an invitation, only while signed in as the address it was sent to, once, before it expires.';

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
alter table public.share_invitations enable row level security;

-- The sharer sees the invitations they sent. The invitee sees nothing until they
-- accept: looking up a token is the function's job, not a table read, so a leaked
-- hash cannot be probed with a select.
create policy share_invitations_read on public.share_invitations
  for select to authenticated
  using (invited_by = public.current_user_id()
         or public.is_privileged(public.current_user_id()));

revoke all on public.share_invitations from public, anon;
grant select on public.share_invitations to authenticated;

revoke all on function public.invite_learning_share(text,text,integer) from public, anon;
grant  execute on function public.invite_learning_share(text,text,integer) to authenticated;

revoke all on function public.accept_learning_share(text) from public, anon;
grant  execute on function public.accept_learning_share(text) to authenticated;

-- `resolve_share_grantee()` answers exactly the question invitations exist to stop
-- being answerable: whether an address has an account here. Leaving it callable would
-- leave the side door open next to the closed one, so it is closed for every signed-in
-- caller. Nothing in the app calls it any more; a service-role tool still can.
revoke execute on function public.resolve_share_grantee(text) from authenticated;
