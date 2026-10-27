-- The documents the platform has to publish, versioned, and the record of who
-- agreed to which version.
--
-- WHY THIS EXISTS
-- ---------------
-- Seven flags sat here saying "Nothing exists": `platform.legal`,
-- `platform.terms_versioning`, `platform.safeguarding`, `platform.takedown`,
-- `platform.incident`, `platform.age_assurance` and `platform.withdrawal_right`.
-- None of them is waiting for code. They are waiting for **decisions** — a
-- governing law, a retention period, a liability position — and a decision
-- nobody has written down is a decision the platform cannot keep.
--
-- WHAT IS BUILT HERE
-- ------------------
--   * a register of the documents the platform owes its users, seeded as
--     **drafts** with the questions only the owner can answer marked inline as
--     `[OWNER DECISION: …]`;
--   * versioning, so a change to a term is a new version rather than an edit to
--     something somebody already agreed to — an in-force version is immutable;
--   * acceptance recorded per account per version, with a timestamp, so "which
--     terms did they agree to" has an answer years later;
--   * an approval step that **refuses while any owner decision is still open**.
--
-- That refusal is the point. Writing plausible legal text is easy; a policy that
-- reads as settled while the jurisdiction is still a placeholder is worse than no
-- policy, because it is the version somebody acts on. The database will not put
-- a draft in force until the markers are gone, so this repository cannot quietly
-- make the owner's decisions for them.
--
-- These drafts are written from what the platform **actually does** — the
-- retention, the refund window, the child model, the teacher's share. They are
-- not legal advice, the admin screen says so, and a lawyer should read them
-- before the first one goes in force.

-- ---------------------------------------------------------------------------
-- The register
-- ---------------------------------------------------------------------------
create table public.policy_documents (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),

  title text not null check (length(btrim(title)) between 3 and 120),

  -- One sentence a person reads in the list, so they know which one they want.
  summary text not null check (length(btrim(summary)) between 10 and 400),

  -- Who it is written for. A teacher is also a learner; this is about which
  -- door the person most likely came through, not who the text applies to.
  audience text not null default 'everyone'
    check (audience in ('everyone', 'child', 'teacher', 'institution')),

  -- Whether signing up (or a later change) requires an explicit acceptance.
  -- A safeguarding policy is read; terms are agreed to. Both are honest, and
  -- they are not the same act, so the register distinguishes them.
  acceptance_required boolean not null default false,

  sort_order integer not null default 100,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger policy_documents_set_updated_at
  before update on public.policy_documents
  for each row execute function public.set_updated_at();

comment on table public.policy_documents is
  'The documents the platform owes its users. A document is a slot; its text lives in policy_versions, because people agreed to a version, not to a document.';

-- ---------------------------------------------------------------------------
-- The text, as versions
-- ---------------------------------------------------------------------------
create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),

  document_id uuid not null
    references public.policy_documents (id) on delete cascade,

  version_number integer not null check (version_number > 0),

  body text not null check (length(btrim(body)) >= 200),

  -- Why this version exists, in the words of whoever wrote it. Shown to a
  -- reader so a change to the terms is never a silent one.
  change_note text not null check (length(btrim(change_note)) between 3 and 500),

  status text not null default 'draft'
    check (status in ('draft', 'in_force', 'retired')),

  -- The day it binds from. A date, not a timestamp: "from 1 November" is what a
  -- person is told, and a timestamp would invite a precision nobody means.
  effective_at date,

  approved_by uuid references public.user_profiles (user_id) on delete set null,
  approved_at timestamptz,
  -- The written reason for putting it in force. The owner's own words.
  approval_reason text,

  created_by uuid references public.user_profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),

  constraint pv_version_unique unique (document_id, version_number),

  -- Only an in-force version needs an approver. A retired one keeps the record
  -- of who approved it when it was live, and a draft has none.
  constraint pv_in_force_needs_approval check (
    status <> 'in_force'
    or (approved_by is not null and approved_at is not null
        and effective_at is not null and length(btrim(coalesce(approval_reason, ''))) > 0)
  )
);

-- One live version per document. Two would make "the terms" ambiguous, and the
-- database is the only place that ambiguity can be refused outright.
create unique index policy_versions_one_live
  on public.policy_versions (document_id)
  where status = 'in_force';

create index policy_versions_document_idx
  on public.policy_versions (document_id, version_number desc);

comment on table public.policy_versions is
  'One version of one policy. An in-force version is immutable: a change is a new version, because somebody agreed to the old text.';

-- An approved version is frozen. Not "should not be edited" — cannot be: the
-- acceptance rows point at this exact text, and rewriting it would rewrite what
-- somebody agreed to, which is the one thing a record of consent must not do.
create or replace function public.freeze_policy_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'in_force' and new.body is distinct from old.body then
    raise exception 'a policy in force cannot be edited; publish a new version instead'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger policy_versions_freeze
  before update on public.policy_versions
  for each row execute function public.freeze_policy_version();

-- A version that has been live is history, not a row to tidy away: the
-- acceptance records point at it. A draft never seen by anybody may go.
create or replace function public.keep_policy_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status <> 'draft' then
    raise exception 'a policy version that has been in force cannot be deleted'
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger policy_versions_no_delete
  before delete on public.policy_versions
  for each row execute function public.keep_policy_history();

-- ---------------------------------------------------------------------------
-- Who agreed to what
-- ---------------------------------------------------------------------------
create table public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.user_profiles (user_id) on delete cascade,

  policy_version_id uuid not null
    references public.policy_versions (id) on delete restrict,

  accepted_at timestamptz not null default now(),

  -- A person accepts a version once. Accepting again adds nothing, and a second
  -- row would make it look as though they had to agree twice.
  constraint pa_once unique (user_id, policy_version_id)
);

create index policy_acceptances_user_idx
  on public.policy_acceptances (user_id, accepted_at desc);

comment on table public.policy_acceptances is
  'Which version of which document an account accepted, and when. Never edited, never deleted while the account exists.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.policy_documents enable row level security;
alter table public.policy_versions enable row level security;
alter table public.policy_acceptances enable row level security;

-- A policy has to be readable before somebody agrees to it, and before they
-- sign up — so this is one of the few tables `anon` may read.
create policy policy_documents_read on public.policy_documents
  for select to anon, authenticated
  using (true);

create policy policy_versions_read_live on public.policy_versions
  for select to anon, authenticated
  using (status = 'in_force');

-- Staff read drafts and history; the register page needs them and nobody else
-- does.
create policy policy_versions_read_staff on public.policy_versions
  for select to authenticated
  using (
    public.has_role(public.current_user_id(), 'platform_admin')
    or public.has_role(public.current_user_id(), 'governance_admin')
  );

create policy policy_acceptances_read_own on public.policy_acceptances
  for select to authenticated
  using (
    user_id = public.current_user_id()
    or public.has_role(public.current_user_id(), 'platform_admin')
    or public.has_role(public.current_user_id(), 'governance_admin')
  );

-- No insert policy on acceptances on purpose: they are written by a definer
-- function that reads the session, so an account cannot accept on behalf of
-- another one, and a version id cannot be invented.

-- ---------------------------------------------------------------------------
-- The marker that keeps this honest
-- ---------------------------------------------------------------------------
/**
 * How many questions in this text are the owner's, not the writer's.
 *
 * A draft carries them as `[OWNER DECISION: …]`. They are not decoration: the
 * approval below refuses while the count is above zero, so a document cannot
 * reach a person as a settled term while its governing law is still a guess.
 */
create or replace function public.policy_open_decisions(p_body text)
returns integer
language sql
immutable
as $$
  select coalesce(count(*)::int, 0)
    from regexp_matches(coalesce(p_body, ''), '\[OWNER DECISION', 'g');
$$;

comment on function public.policy_open_decisions(text) is
  'Counts the [OWNER DECISION: …] markers left in a draft. Approving a policy with any of them is refused.';

-- ---------------------------------------------------------------------------
-- Reading, publicly
-- ---------------------------------------------------------------------------
create or replace function public.policies_in_force()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'slug', d.slug,
           'title', d.title,
           'summary', d.summary,
           'audience', d.audience,
           'acceptanceRequired', d.acceptance_required,
           'versionNumber', v.version_number,
           'effectiveAt', v.effective_at,
           'changeNote', v.change_note) order by d.sort_order, d.title), '[]'::jsonb)
    from public.policy_documents d
    join public.policy_versions v
      on v.document_id = d.id and v.status = 'in_force';
$$;

revoke all on function public.policies_in_force() from public;
grant execute on function public.policies_in_force() to anon, authenticated;

/** One document's live text. Null when nothing is in force — which is honest. */
create or replace function public.policy_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'slug', d.slug,
           'title', d.title,
           'summary', d.summary,
           'audience', d.audience,
           'acceptanceRequired', d.acceptance_required,
           'versionNumber', v.version_number,
           'effectiveAt', v.effective_at,
           'changeNote', v.change_note,
           'body', v.body)
    from public.policy_documents d
    join public.policy_versions v
      on v.document_id = d.id and v.status = 'in_force'
   where d.slug = lower(btrim(coalesce(p_slug, '')));
$$;

revoke all on function public.policy_page(text) from public;
grant execute on function public.policy_page(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- What this account has agreed to
-- ---------------------------------------------------------------------------
create or replace function public.my_policy_standing()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null then
    raise exception 'policy:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'acceptanceRequired', coalesce((
      select jsonb_agg(jsonb_build_object(
               'slug', d.slug,
               'title', d.title,
               'versionNumber', v.version_number,
               'effectiveAt', v.effective_at,
               'acceptedAt', a.accepted_at
             ) order by d.sort_order, d.title)
        from public.policy_documents d
        join public.policy_versions v
          on v.document_id = d.id and v.status = 'in_force'
        left join public.policy_acceptances a
          on a.policy_version_id = v.id and a.user_id = v_actor
       where d.acceptance_required), '[]'::jsonb),
    'outstanding', (
      select count(*)::int
        from public.policy_documents d
        join public.policy_versions v
          on v.document_id = d.id and v.status = 'in_force'
        left join public.policy_acceptances a
          on a.policy_version_id = v.id and a.user_id = v_actor
       where d.acceptance_required and a.id is null),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
               'slug', d.slug,
               'title', d.title,
               'versionNumber', v.version_number,
               'acceptedAt', a.accepted_at) order by a.accepted_at desc)
        from public.policy_acceptances a
        join public.policy_versions v on v.id = a.policy_version_id
        join public.policy_documents d on d.id = v.document_id
       where a.user_id = v_actor), '[]'::jsonb));
end;
$$;

revoke all on function public.my_policy_standing() from public, anon;
grant execute on function public.my_policy_standing() to authenticated;

/**
 * Agree to the version that is live right now.
 *
 * By slug rather than by id: a client that sent a version id could name an old
 * one, and "they accepted the retired version" is not an agreement to anything.
 * The live version is resolved here, at the moment of acceptance.
 */
create or replace function public.accept_policy(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_version public.policy_versions;
  v_doc     public.policy_documents;
  v_when    timestamptz;
begin
  if v_actor is null then
    raise exception 'policy:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_doc
    from public.policy_documents
   where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then
    raise exception 'policy:not_found'
      using errcode = 'no_data_found';
  end if;

  select * into v_version
    from public.policy_versions
   where document_id = v_doc.id and status = 'in_force';
  if not found then
    raise exception 'policy:not_in_force'
      using errcode = 'check_violation';
  end if;

  insert into public.policy_acceptances (user_id, policy_version_id)
  values (v_actor, v_version.id)
  on conflict (user_id, policy_version_id) do nothing
  returning accepted_at into v_when;

  if v_when is null then
    -- Already accepted. Answer with the time they did, not with an error: the
    -- second click of a double submit is not a failure.
    select accepted_at into v_when
      from public.policy_acceptances
     where user_id = v_actor and policy_version_id = v_version.id;
    return jsonb_build_object('slug', v_doc.slug, 'versionNumber', v_version.version_number,
                              'acceptedAt', v_when, 'already', true);
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'policy.accepted', 'policy_version', v_version.id,
          jsonb_build_object('slug', v_doc.slug, 'versionNumber', v_version.version_number));

  return jsonb_build_object('slug', v_doc.slug, 'versionNumber', v_version.version_number,
                            'acceptedAt', v_when, 'already', false);
end;
$$;

revoke all on function public.accept_policy(text) from public, anon;
grant execute on function public.accept_policy(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Writing and approving, for the owner
-- ---------------------------------------------------------------------------
create or replace function public.policy_register()
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
    raise exception 'policy:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id,
               'slug', d.slug,
               'title', d.title,
               'summary', d.summary,
               'audience', d.audience,
               'acceptanceRequired', d.acceptance_required,
               'live', case when live.id is null then null else jsonb_build_object(
                 'versionNumber', live.version_number,
                 'effectiveAt', live.effective_at,
                 'approvedAt', live.approved_at,
                 'approvalReason', live.approval_reason) end,
               'acceptedAccounts', (
                 select count(*)::int from public.policy_acceptances a
                  where a.policy_version_id = live.id),
               'draft', case when draft.id is null then null else jsonb_build_object(
                 'id', draft.id,
                 'versionNumber', draft.version_number,
                 'openDecisions', public.policy_open_decisions(draft.body),
                 'changeNote', draft.change_note,
                 'createdAt', draft.created_at) end,
               'versions', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', v.id,
                          'versionNumber', v.version_number,
                          'status', v.status,
                          'effectiveAt', v.effective_at,
                          'approvedAt', v.approved_at,
                          'openDecisions', public.policy_open_decisions(v.body)) order by v.version_number desc)
                   from public.policy_versions v
                  where v.document_id = d.id), '[]'::jsonb))
             order by d.sort_order, d.title)
        from public.policy_documents d
        left join lateral (
          select * from public.policy_versions v
           where v.document_id = d.id and v.status = 'in_force' limit 1) live on true
        left join lateral (
          select * from public.policy_versions v
           where v.document_id = d.id and v.status = 'draft'
           order by v.version_number desc limit 1) draft on true), '[]'::jsonb),
    'counts', jsonb_build_object(
      'documents', (select count(*)::int from public.policy_documents),
      'inForce', (select count(*)::int from public.policy_versions where status = 'in_force'),
      'drafts', (select count(*)::int from public.policy_versions where status = 'draft'),
      'openDecisions', (select coalesce(sum(public.policy_open_decisions(body)), 0)::int
                          from public.policy_versions where status <> 'retired')));
end;
$$;

revoke all on function public.policy_register() from public, anon;
grant execute on function public.policy_register() to authenticated;

/** The full text of one draft, for the editor. Staff only. */
create or replace function public.policy_draft(p_version_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'policy:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return (
    select jsonb_build_object(
             'id', v.id,
             'slug', d.slug,
             'title', d.title,
             'versionNumber', v.version_number,
             'status', v.status,
             'body', v.body,
             'changeNote', v.change_note,
             'openDecisions', public.policy_open_decisions(v.body))
      from public.policy_versions v
      join public.policy_documents d on d.id = v.document_id
     where v.id = p_version_id);
end;
$$;

revoke all on function public.policy_draft(uuid) from public, anon;
grant execute on function public.policy_draft(uuid) to authenticated;

/**
 * Write a new draft.
 *
 * Always a new version, even when the previous one was never in force: a
 * version number is how a reader and a lawyer refer to a text, and reusing one
 * for two different texts makes every reference ambiguous.
 */
create or replace function public.save_policy_draft(
  p_slug        text,
  p_body        text,
  p_change_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_doc   public.policy_documents;
  v_next  int;
  v_id    uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'policy:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(p_change_note, ''))) < 3 then
    raise exception 'policy:change_note_required'
      using errcode = 'check_violation';
  end if;
  if length(btrim(coalesce(p_body, ''))) < 200 then
    raise exception 'policy:body_too_short'
      using errcode = 'check_violation';
  end if;

  select * into v_doc from public.policy_documents
   where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then
    raise exception 'policy:not_found'
      using errcode = 'no_data_found';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next
    from public.policy_versions where document_id = v_doc.id;

  insert into public.policy_versions
    (document_id, version_number, body, change_note, status, created_by)
  values (v_doc.id, v_next, btrim(p_body), btrim(p_change_note), 'draft', v_actor)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'policy.draft_saved', 'policy_version', v_id,
          jsonb_build_object('slug', v_doc.slug, 'versionNumber', v_next,
                             'openDecisions', public.policy_open_decisions(p_body)));

  return jsonb_build_object('id', v_id, 'versionNumber', v_next,
                            'openDecisions', public.policy_open_decisions(p_body));
end;
$$;

revoke all on function public.save_policy_draft(text, text, text) from public, anon;
grant execute on function public.save_policy_draft(text, text, text) to authenticated;

/**
 * Put a version in force.
 *
 * Refused while any `[OWNER DECISION: …]` remains. That is the whole guard: the
 * platform will publish a policy the owner has finished, and will not publish
 * one where the governing law is still a placeholder.
 */
create or replace function public.approve_policy_version(
  p_version_id uuid,
  p_effective  date,
  p_reason     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_reason  text := btrim(coalesce(p_reason, ''));
  v_row     public.policy_versions;
  v_doc     public.policy_documents;
  v_open    int;
  v_prev    uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'policy:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_reason = '' then
    raise exception 'policy:reason_required'
      using errcode = 'check_violation';
  end if;

  select * into v_row from public.policy_versions where id = p_version_id;
  if not found then
    raise exception 'policy:not_found'
      using errcode = 'no_data_found';
  end if;
  if v_row.status <> 'draft' then
    raise exception 'policy:already_decided'
      using errcode = 'check_violation';
  end if;

  v_open := public.policy_open_decisions(v_row.body);
  if v_open > 0 then
    raise exception 'policy:decisions_open'
      using errcode = 'check_violation',
            hint = format('%s owner decision(s) are still marked in the text', v_open);
  end if;

  select * into v_doc from public.policy_documents where id = v_row.document_id;

  -- The version this replaces, if any. Retired, never deleted: somebody agreed
  -- to it and the record of what they agreed to has to survive.
  select id into v_prev
    from public.policy_versions
   where document_id = v_row.document_id and status = 'in_force'
   limit 1;

  if v_prev is not null then
    update public.policy_versions set status = 'retired' where id = v_prev;
  end if;

  update public.policy_versions
     set status = 'in_force',
         effective_at = coalesce(p_effective, current_date),
         approved_by = v_actor,
         approved_at = now(),
         approval_reason = v_reason
   where id = p_version_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'policy.in_force', 'policy_version', p_version_id,
          jsonb_build_object('slug', v_doc.slug,
                             'versionNumber', v_row.version_number,
                             'replaced', v_prev,
                             'effectiveAt', coalesce(p_effective, current_date),
                             'reason', v_reason));

  return jsonb_build_object('status', 'in_force', 'slug', v_doc.slug,
                            'versionNumber', v_row.version_number,
                            'replaced', v_prev);
end;
$$;

revoke all on function public.approve_policy_version(uuid, date, text) from public, anon;
grant execute on function public.approve_policy_version(uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The register, seeded as drafts
-- ---------------------------------------------------------------------------
-- Every body below describes what the platform **actually does**, taken from the
-- code beside it — the retention of analytics, the 72-hour refund window, the
-- child model, the teacher's share. What it cannot describe is anything the owner
-- has not decided, and those places are marked. They are not placeholders to be
-- tidied later; the approval function refuses until each one is answered.

insert into public.policy_documents (slug, title, summary, audience, acceptance_required, sort_order)
values
  ('terms', 'Terms of use', 'What you agree to when you use AyahSpring, what the platform promises, and what it does not.', 'everyone', true, 10),
  ('privacy', 'Privacy notice', 'What is collected, who can see it, how long it is kept, and how to get it out or have it removed.', 'everyone', true, 20),
  ('children', 'Children and young learners', 'How a child uses this platform without holding an account of their own.', 'child', false, 30),
  ('refunds', 'Refunds and withdrawal', 'When you can ask for money back, how long it takes, and what a refund does to a teacher.', 'everyone', false, 40),
  ('teaching', 'Terms for teachers', 'Appointment, copyright, the revenue share, review, and what happens when a course is retired.', 'teacher', true, 50),
  ('safeguarding', 'Safeguarding and conduct', 'How adults and children share this platform, how to report a concern, and what happens next.', 'everyone', false, 60),
  ('takedown', 'Copyright and takedown', 'How to report content you own, what happens to it while a notice is looked at, and how to reply.', 'everyone', false, 70)
on conflict (slug) do nothing;

insert into public.policy_versions (document_id, version_number, body, change_note, status)
select d.id, 1, $doc$## What this is

AyahSpring teaches the Islamic faith to children and adults, online. These terms
are the agreement between you and whoever operates this deployment of the
platform. They describe what the platform actually does today, not what it hopes
to do.

## Who may use it

You need an account to learn, and an account is for one person. A child does not
hold one: a child is a learner profile inside an adult's account, and the adult
is responsible for it. You must give accurate details, keep your password to
yourself, and not share your sign-in with anybody.

## Courses

Every course is written by an appointed teacher and reviewed before it is
published. Enrolling pins you to the version that was live when you enrolled, so
a later revision cannot change what you are studying. If a course is retired,
learners already enrolled keep access to the version they hold — retiring a
course stops new enrolments, it does not take anything away from you.

A certificate carries a number that anybody can check on a public page. It
records what was completed and when; it is not accredited by any government or
university, and the platform does not claim otherwise.

## Money

Prices are shown in your own market's currency, resolved from where you are. Tax
and any transfer fee are shown before you pay. Nothing is charged without you
confirming it, and what you paid is itemised in your account.

Paid access is one learner: buying a course opens it for the person you chose,
not for a family, a class or a group. A sponsored seat is paid for by somebody
else and is not a purchase by you.

[OWNER DECISION: state whether courses are sold at launch, and in which markets,
since the platform has no payment provider connected yet.]

## What you agree not to do

Do not attack another learner or teacher for their school of thought. Do not
upload anything you do not have the right to share. Do not scrape the catalogue,
copy a course out of the platform, or sell access to it. Do not impersonate
anybody, and do not use the platform to contact a child outside it.

## What you write

Your notes are private to you. A review, a discussion post or a support case is
yours; by posting it you let the platform show it to the people who are meant to
see it, and nothing more. You keep the copyright in what you write.

The platform's own text, design and code belong to its operator. A course belongs
to the teacher who wrote it; the platform holds the licence described in the terms
for teachers.

## Ending it

You may close your account at any time, from your own account page. The platform
may suspend or close an account that abuses these terms, and will give a reason.

## Liability and law

The platform is provided as it is. It teaches; it does not replace a scholar, a
school or a doctor, and it is not a fatwa service.

[OWNER DECISION: the limitation of liability this operator is willing to accept.]
[OWNER DECISION: the governing law and the courts that hear a dispute.]

## Changes

These terms are versioned. A change is a new version with its own effective date,
and the page shows which version you are reading. Where a change requires your
agreement, you will be asked for it on your account page and it will be recorded
against your account with a timestamp.
$doc$, 'First draft, written from what the platform does.', 'draft'
  from public.policy_documents d
 where d.slug = 'terms'
   and not exists (select 1 from public.policy_versions v where v.document_id = d.id);

insert into public.policy_versions (document_id, version_number, body, change_note, status)
select d.id, 1, $doc$## What this notice covers

This is what AyahSpring collects, who can see it, and what you can do about it.
It is written from what the platform does — the database and the screens are the
description.

## What is collected

When you create an account: your email address and a password, which is stored
only as a hash by the authentication provider. Signing in with Google stores the
identifier Google returns, not your Google password.

When you fill in your profile: a display name, a country, a time zone and a
preferred language. There is no date of birth anywhere on this platform — a child
has an age band instead.

As you learn: which courses you enrolled in, which lessons you opened, your
progress, your notes and bookmarks, assessment attempts and results, certificates
issued, orders and refunds, reviews you write, support cases you open, and the
notifications you chose to receive.

As you browse: page and course views, and search terms, recorded against your
account when you are signed in.

What is never collected: your date of birth, your location beyond the country you
set (a request's country is used to price a course and is not stored as a
position), advertising identifiers, or anything from a third-party tracker. This
platform runs no advertising and sells no data.

## Who can see it

You can. A family member sees your progress only if you have invited them and
chosen what they see, and you can end that at any time.

A teacher sees a learner's name and progress only inside a class they run and you
joined. Otherwise they see counts: how many enrolled, how many completed. A
teacher never sees your notes.

An institution sees counts of its own members — never a name, never a row per
person.

Staff see what their work requires and record a written reason when they act on
an account, a payment or a course. Support can read a case you opened; support
cannot read your password, because nobody can.

## Where it is processed

The database and sign-in are provided by Supabase. Lesson recordings are stored
in Cloudflare R2. The application runs on a hosting provider.

[OWNER DECISION: name the hosting provider and confirm the region data is stored
in.]
[OWNER DECISION: whether personal data is transferred outside the region a learner
lives in, and on what safeguard.]

## How long it is kept

Your account and learning record are kept while your account exists. Usage
analytics are kept indefinitely: a decision recorded on 2026-10-22, because a
year of history cannot be reconstructed after the fact.

Closing your account anonymises the account and archives the learner record
instead of deleting it, so a certificate already issued can still be verified.
Orders and payments are kept because accounting records outlive an account. What
you did is kept, without you attached to it.

[OWNER DECISION: the retention period for a support case, and for a safeguarding
record.]

## Your rights

You can download everything held about you, as one file, from your account page —
that is built and it is not behind a flag. You can correct your details. You can
close your account. None of these costs anything and none requires a request by
email.

Where the law gives you more — access, portability, objection, a copy in another
format — ask and it will be honoured.

## Children

A child is a learner profile inside an adult's account and never holds a sign-in.
Verifiable parental consent for a child under 13 in the United States is built but
switched off; until it is on, this platform does not knowingly enrol a child under
13 there.

## Who is responsible

[OWNER DECISION: name the person or company responsible for personal data, with a
contact address.]
[OWNER DECISION: name the supervisory authority a complaint may go to, and the
law this notice is written against.]

## Changes

This notice is versioned. A change is a new version with an effective date, and
where it needs your agreement you will be asked for it and it will be recorded
with a timestamp on your account.
$doc$, 'First draft, written from what the platform does.', 'draft'
  from public.policy_documents d
 where d.slug = 'privacy'
   and not exists (select 1 from public.policy_versions v where v.document_id = d.id);

insert into public.policy_versions (document_id, version_number, body, change_note, status)
select d.id, 1, $doc$## A child is not an account

On this platform a child never holds a sign-in. A child is a learner profile
inside an adult's account — a parent, a guardian, or a teacher running a class.
There is no child login to phish, no password for a seven-year-old to remember,
and no place for a stranger to message a child.

The adult who adds the child is responsible for it. Adding one takes a name and
an age band — 5–7, 8–10, 11–13, 14–17 — and never a date of birth. An age band is
what the content needs; a birthday is what an advertising profile needs.

## What a child's profile shows

Nothing public. A child's name is visible to the adult who holds the account, to
family members that adult has invited, and to a teacher whose class the child
joined — and to staff doing their work, with a written reason.

A child's progress, notes and assessment results are private in the same way.

## Classes, discussion and contact

Discussion on a lesson is moderated: a teacher's post is visible at once, a
learner's post is held until it is read. A child cannot open a private
conversation with an adult, and a teacher is never given a child's contact
details.

Live classes are attended from inside the platform. Nobody is asked to join a
call from a private address.

## Under 13, and the United States

Verifiable parental consent for a child under 13 in the United States is built —
a guardian relationship, a verification step and a record of who consented — and
it is switched off. Until the operator turns it on for a country, this platform
does not knowingly enrol a child under 13 there.

[OWNER DECISION: whether children under 13 may enrol anywhere at all before that
verification is enabled, and in which countries.]

## If something goes wrong

A concern about a child goes to the safeguarding route described in the
safeguarding policy. It is read by a person, not a bot, and content can be
withheld while it is looked at.

[OWNER DECISION: the named person responsible for child protection, and how they
are reached.]

## When a child grows up

[OWNER DECISION: what happens to a child's learning record when they turn 18 —
whether it becomes their own account, is handed over with consent, or is
archived.]

[OWNER DECISION: how long a child's learning record is kept after the adult's
account closes.]
$doc$, 'First draft, written from what the platform does.', 'draft'
  from public.policy_documents d
 where d.slug = 'children'
   and not exists (select 1 from public.policy_versions v where v.document_id = d.id);

insert into public.policy_versions (document_id, version_number, body, change_note, status)
select d.id, 1, $doc$## Asking is not the same as being refunded

You have 72 hours after a payment to ask for a refund. The window is measured
from the moment the payment was recorded, by the platform's own clock. Asking
inside the window is not a promise of a refund: a person reads the request and
decides, and the decision carries a written reason you can read.

Staff can also open a refund request on your behalf, which is how a request made
after the window but about a real failure is handled.

## What a refund does

The money goes back to the way it was paid. On this platform a refund also
reverses the teacher's share of that sale: a teacher is not paid for a course
that was refunded.

A refund closes access to the course it paid for, unless access came from
somewhere else — a sponsorship, a subscription, or a separate purchase.

## Sponsored seats and scholarships

If somebody else paid for your seat, the money did not come from you and there is
nothing for you to be refunded. The sponsor's own payment follows the rules
above. A scholarship seat has no payment behind it at all.

## The statutory right in some countries

In the European Union and the United Kingdom a consumer buying digital content
normally has 14 days to withdraw. Where content is supplied immediately, that
right can be waived only by an explicit agreement at the point of purchase.

[OWNER DECISION: whether the 72-hour window replaces the statutory period, or
applies on top of it, market by market — and the exact wording of the waiver
shown at checkout where content starts immediately.]

## What is not refundable

A certificate that has been issued and verified is not a purchase and is not
refunded. A subscription month already used is not refunded pro rata.

[OWNER DECISION: the treatment of a subscription cancelled mid-month.]

## How long it takes

A refund is issued when it is approved. How quickly it appears depends on the
payment method and the provider, not on this platform — there is no provider
connected yet, so no refund can move money today.

[OWNER DECISION: the provider, and what a learner is told about timing.]
$doc$, 'First draft, written from what the platform does.', 'draft'
  from public.policy_documents d
 where d.slug = 'refunds'
   and not exists (select 1 from public.policy_versions v where v.document_id = d.id);

insert into public.policy_versions (document_id, version_number, body, change_note, status)
select d.id, 1, $doc$## Being appointed, not signing up

Teaching here is by appointment. You apply with what you know and a link to a
lesson you have given; the owner or the governance staff read it and decide, in
writing. Applying grants nothing. Approval creates the teacher role, and every
course you write still goes through review before a learner sees it.

## Your course is yours

You keep the copyright in everything you write. By publishing a course you give
the platform a licence to store it, show it to learners entitled to it, and keep
offering it to them — for as long as you have not retired it, and afterwards only
to learners already enrolled.

A learner enrolled in your course is pinned to the version they started. A
revision does not change what they are studying.

## What you are paid

The revenue share is 50% of the sale, per sale, in the currency it was sold in.
It is recorded the moment the payment is recorded, and it is reversed if that sale
is refunded. Currencies are never added together: what you are owed is a balance
per currency.

Nothing has been paid out yet, and no balance can be withdrawn, because no
payment provider is connected to this deployment. The earnings page says so
rather than showing a number that looks withdrawable.

[OWNER DECISION: the payout schedule, the minimum balance that may be withdrawn,
who bears the transfer fee, and what happens to a balance if an account is
closed.]

## What you may not do

Do not publish a course you do not have the right to teach from — a scanned book
belongs to whoever published it, not to whoever scanned it. Do not attack another
school of thought; explain your own and cite it. Do not teach a ruling as though
this platform had issued it: a course carries its author's name, and the
scholarly review behind it is recorded.

## Review and versions

Every course passes review by somebody authorised for its subject, and a
scholarly approval is recorded before publication. You can retire a course at any
time; learners already enrolled keep the version they hold.

If a course is found to break these terms, it can be withdrawn, with a written
reason, and you can appeal.

[OWNER DECISION: what happens to a course and to a teacher's appointment when the
breach is serious — whether courses are withdrawn automatically, and whether the
appointment ends.]
$doc$, 'First draft, written from what the platform does.', 'draft'
  from public.policy_documents d
 where d.slug = 'teaching'
   and not exists (select 1 from public.policy_versions v where v.document_id = d.id);

insert into public.policy_versions (document_id, version_number, body, change_note, status)
select d.id, 1, $doc$## The rule this platform is built around

Children and adults share AyahSpring. That is a decision, not an accident, and it
sets the rules below.

A child never holds an account of their own. A child is a learner profile inside
an adult's account. No adult on this platform can reach a child privately: there
is no messaging between a teacher and a learner, no exchange of contact details,
and no way to invite a child to a call outside the platform.

## How adults should behave

Treat every learner as somebody's child. Teach your own school of thought and
explain it; do not attack another. Cite what you take from a book. Do not ask a
learner for their age, address, school or telephone number, and if a learner
offers them, do not keep them.

A teacher who works with children is expected to have been checked. Screening is
not built into this platform yet, and that is said plainly rather than implied by
a badge.

[OWNER DECISION: the screening standard a teacher must meet before teaching
children, who performs it, and how long it lasts.]

## Reporting a concern

A concern about the conduct of a teacher, a learner or an adult holding an
account goes to support, where it opens a case that a person reads. Content can be
withheld while it is looked at. Whoever acts records a written reason, and the
person who reported it is told what happened.

A concern about a child's safety is different: it is not handled as a support
ticket and it is not waited on.

[OWNER DECISION: the named safeguarding lead, their contact, the hours they are
reachable, and the timescale for answering a child-safety report.]

## What happens to a report

A report is read, the content or the account may be withheld, and the person
reported is told what is said about them unless telling them would put somebody at
risk. A decision carries a written reason. An appeal is possible.

## What this platform does not do

It does not know who is sitting at the keyboard. It does not verify a learner's
age beyond the band an adult entered. It does not record a lesson, watch a live
class, or read a private note, and it cannot promise that an adult behaves well
outside it.

Saying so is part of the policy: a platform that claimed to guarantee safety would
be telling parents something no software can deliver.
$doc$, 'First draft, written from what the platform does.', 'draft'
  from public.policy_documents d
 where d.slug = 'safeguarding'
   and not exists (select 1 from public.policy_versions v where v.document_id = d.id);

insert into public.policy_versions (document_id, version_number, body, change_note, status)
select d.id, 1, $doc$## If you own something on this platform

A course may quote, scan or record something that belongs to you. This page says
how to tell us, what happens to the material while a notice is looked at, and how
the person who posted it can reply.

## Sending a notice

Write to the contact below with: what you own, the address on this platform where
the material appears, enough detail to find it, your contact details, and a
statement that you believe the use is not authorised and that the information in
your notice is accurate.

[OWNER DECISION: the named agent and address for copyright notices, and whether a
postal address is required in the operator's jurisdiction.]

## What happens next

The material is withheld while the notice is looked at — not deleted. Withholding
means learners stop seeing it; it does not destroy a record that may be needed to
decide the dispute. The person who posted it is told what was claimed and can
reply.

[OWNER DECISION: how long a notice has before it is decided, and whether material
is withheld at once or after a first review.]

## Replying

If your material was withheld and you believe you had the right to use it, you can
reply with your own statement. A reply that meets the standard below is passed to
the person who sent the notice, and the material may be restored if they do not
take the matter further.

[OWNER DECISION: what a counter-notice must contain, how long the original
complainant has to respond, and on what basis material is restored.]

## Repeat infringers

An account that repeatedly posts material it has no right to use can have its
teaching appointment ended.

[OWNER DECISION: what counts as repeated, and what the consequence is for a
teacher versus a learner.]

## Mistakes

A notice sent in error can take a course down unfairly. If a notice is found to be
wrong, the material is restored and the record says so.

This page is versioned like the others: a change is a new version with its own
effective date.
$doc$, 'First draft, written from what the platform does.', 'draft'
  from public.policy_documents d
 where d.slug = 'takedown'
   and not exists (select 1 from public.policy_versions v where v.document_id = d.id);

-- ---------------------------------------------------------------------------
-- The seven flags that said "Nothing exists"
-- ---------------------------------------------------------------------------
-- Six of them said so because there was nowhere for a policy to live and no way
-- to prove what somebody had agreed to. That part is now built. What is left is
-- not code: it is the owner answering the marked questions and naming the people
-- a complaint goes to. The flags say exactly which of the two is outstanding, so
-- a future reader is not told "nothing exists" about a table they can see.

update public.platform_settings
   set gate_type = 'admin',
       preconditions = 'None for the mechanism: built 2026-10-27. `policy_versions` stores each text, `policy_acceptances` records which version each account agreed to and when, `accept_policy()` resolves the *live* version rather than trusting a client, and an approved version cannot be edited or deleted. What is not automatic is the text: every draft in the register still carries `[OWNER DECISION: …]` where the law, the controller or a named person is required, and `approve_policy_version()` refuses to publish one until each is answered. Publishing is an owner action on `/admin/policies` — no deploy',
       description = 'Versioned terms, privacy notice and teacher terms, with recorded acceptance'
 where key = 'platform.terms_versioning';

update public.platform_settings
   set gate_type = 'admin_setup',
       preconditions = 'Documents built 2026-10-27: seven drafts — terms, privacy, children, refunds, teaching, safeguarding, takedown — each versioned, each publishable from `/admin/policies`, each refused while a `[OWNER DECISION: …]` remains. Set-up before it can be ON: answer those markers (governing law, limitation of liability, the named controller, the supervisory authority, retention for support and safeguarding records); name the copyright agent and the address a notice goes to; publish the versions. Nothing here needs a deploy',
       description = 'Terms, privacy, child policy, refund policy, content licence'
 where key = 'platform.legal';

update public.platform_settings
   set preconditions = 'The conduct policy now exists as a draft in the register, with the rules the code already enforces written down: a child holds no account, no adult can message a learner privately, a teacher''s post is visible and a learner''s is held. Reporting a concern runs through support cases, which are built. Not built: a screening record for an adult who teaches children — the standard, who performs the check, and how long it lasts are the owner''s decisions and are marked in the draft. Name the safeguarding lead before enabling'
 where key = 'platform.safeguarding';

update public.platform_settings
   set preconditions = 'The notice process is written as a draft in the register: what a notice must contain, that material is withheld rather than deleted while it is looked at, and that the person who posted it may reply. Not built: the withholding action itself on a course or a lesson, which needs a code change. Name the agent a notice is sent to, and decide how long a notice has before it is decided'
 where key = 'platform.takedown';

update public.platform_settings
   set preconditions = 'Nothing exists: no detection, no runbook, no notification template. Before enabling, the owner must name who is told, within what time, and what a learner is told. This one is a document first and code second'
 where key = 'platform.incident';

update public.platform_settings
   set preconditions = 'Partly built: guardian verification, the age band a child carries instead of a date of birth, and the `children` policy draft all exist, and verifiable parental consent is stored but switched off. Not built: any check of an adult''s stated age. The method is undecided, and a guessed method is worse than an honest gap'
 where key = 'platform.age_assurance';

update public.platform_settings
   set preconditions = 'The 72-hour refund window and its written-reason workflow are built and tested; there is no payment provider, so no money moves. Not built: the withdrawal waiver at checkout, because there is no checkout. Decide per market whether the statutory period replaces or stacks on the 72 hours, and the exact waiver wording, both marked in the `refunds` draft'
 where key = 'platform.withdrawal_right';
