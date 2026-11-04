-- D1: a separate, explicitly identified safeguarding owner. No role membership
-- alone identifies that person. The trusted DB operator bootstraps this once;
-- until then, the queue and acknowledgements are unavailable to everyone.
create table public.safeguarding_owner (
  singleton boolean primary key default true check (singleton),
  owner_user_id uuid not null references public.user_profiles(user_id) on delete restrict,
  configured_at timestamptz not null default now()
);
alter table public.safeguarding_owner enable row level security;
revoke all on public.safeguarding_owner from public, anon, authenticated;

create function public.bootstrap_safeguarding_owner(p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_owner is null or not public.has_role(p_owner, 'platform_admin') then
    raise exception 'the safeguarding owner must be an active platform admin' using errcode = 'check_violation';
  end if;
  insert into public.safeguarding_owner (singleton, owner_user_id) values (true, p_owner);
  insert into public.governance_audit_events(actor, action, target_type, target_id, detail)
    values (null, 'safeguarding.owner_bootstrapped', 'user_profile', p_owner,
            jsonb_build_object('method', 'database operator bootstrap'));
end;
$$;
revoke all on function public.bootstrap_safeguarding_owner(uuid) from public, anon, authenticated;

create table public.safeguarding_concern_acknowledgements (
  review_id uuid primary key references public.coursework_file_reviews(id) on delete restrict,
  acknowledged_by uuid not null references public.user_profiles(user_id) on delete restrict,
  acknowledged_at timestamptz not null default now()
);
alter table public.safeguarding_concern_acknowledgements enable row level security;
revoke all on public.safeguarding_concern_acknowledgements from public, anon, authenticated;

-- A transaction can record more than one review with the same now() timestamp.
-- Random UUIDs do not preserve their insertion order. The ordinal makes "latest"
-- deterministic, including multiple reviews of one file in one transaction.
alter table public.coursework_file_reviews
  add column review_order bigint generated always as identity;

create index coursework_concern_queue_idx on public.coursework_file_reviews (reviewed_at, id)
  where decision = 'concern';

-- This reveals no account identity. Staff can tell whether setup is missing;
-- only the named active owner receives is_owner=true.
create function public.safeguarding_owner_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_owner uuid;
begin
  if v_actor is null or not public.is_privileged(v_actor) then
    raise exception 'only staff may inspect safeguarding setup' using errcode = 'insufficient_privilege';
  end if;
  select owner_user_id into v_owner from public.safeguarding_owner where singleton;
  return jsonb_build_object('configured', v_owner is not null,
    'is_owner', coalesce(v_actor = v_owner and public.has_role(v_actor, 'platform_admin'), false));
end;
$$;
revoke all on function public.safeguarding_owner_status() from public, anon;
grant execute on function public.safeguarding_owner_status() to authenticated;

-- The existing immutable reviews themselves are the queue: no second write or
-- best-effort notification can be lost between recording and enqueueing. Existing
-- concerns are included. All coursework concerns are included: a learner's
-- current age/type can change, and an erased submission may no longer identify
-- the learner. Filtering by today's type could silently lose a child concern.
create function public.safeguarding_concern_queue(p_limit integer default 100)
returns table(review_id uuid, asset_id uuid, note text, reviewed_at timestamptz,
              reviewer_name text, learner_name text, course_title text, details_unavailable boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin')
     or not exists (select 1 from public.safeguarding_owner where singleton and owner_user_id=v_actor) then
    raise exception 'only the configured safeguarding owner may read the concern queue' using errcode = 'insufficient_privilege';
  end if;
  return query
    select r.id, r.asset_id, r.note, r.reviewed_at, up.display_name,
           lp.display_name, c.title, (s.id is null or lp.id is null)
      from public.coursework_file_reviews r
      left join public.safeguarding_concern_acknowledgements ack on ack.review_id=r.id
      left join public.assignment_submissions s on s.id=r.submission_id
      left join public.learner_profiles lp on lp.id=s.learner_profile_id
      left join public.course_assignments ca on ca.id=s.assignment_id
      left join public.courses c on c.id=ca.course_id
      left join public.user_profiles up on up.user_id=r.reviewed_by
     where r.decision='concern' and ack.review_id is null
     order by r.reviewed_at, r.id
     limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$$;
revoke all on function public.safeguarding_concern_queue(integer) from public, anon;
grant execute on function public.safeguarding_concern_queue(integer) to authenticated;

create function public.acknowledge_safeguarding_concern(p_review_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_id uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin')
     or not exists (select 1 from public.safeguarding_owner where singleton and owner_user_id=v_actor) then
    raise exception 'only the configured safeguarding owner may acknowledge a concern' using errcode = 'insufficient_privilege';
  end if;
  -- Serialize acknowledgement with another review of the same file. A fresh
  -- concern recorded after acknowledgement must not be mistaken for a retry.
  perform 1 from public.media_assets ma
    join public.coursework_file_reviews r on r.asset_id=ma.id
   where r.id=p_review_id and r.decision='concern' for update of ma;
  if not found then
    raise exception 'concern not found' using errcode = 'no_data_found';
  end if;
  insert into public.safeguarding_concern_acknowledgements(review_id, acknowledged_by)
    values (p_review_id, v_actor) on conflict (review_id) do nothing returning review_id into v_id;
  if v_id is null then return false; end if;
  insert into public.governance_audit_events(actor, action, target_type, target_id, detail)
    values (v_actor, 'safeguarding.concern_acknowledged', 'coursework_file_review', p_review_id, '{}'::jsonb);
  return true;
end;
$$;
revoke all on function public.acknowledge_safeguarding_concern(uuid) from public, anon;
grant execute on function public.acknowledge_safeguarding_concern(uuid) to authenticated;

-- Acknowledged concerns remain reviewable and can be reopened; a click is not
-- a deletion or an investigation. Cursor pagination keeps older items reachable.
create function public.safeguarding_concern_history(
  p_before timestamptz default null, p_before_id uuid default null, p_limit integer default 50
) returns table(review_id uuid, asset_id uuid, note text, reviewed_at timestamptz,
                reviewer_name text, learner_name text, course_title text,
                details_unavailable boolean, acknowledged_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id();
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin')
     or not exists (select 1 from public.safeguarding_owner where singleton and owner_user_id=v_actor) then
    raise exception 'only the configured safeguarding owner may read concern history' using errcode = 'insufficient_privilege';
  end if;
  if (p_before is null) <> (p_before_id is null) then
    raise exception 'both history cursor values are required' using errcode = 'invalid_parameter_value';
  end if;
  return query
    select r.id, r.asset_id, r.note, r.reviewed_at, up.display_name, lp.display_name,
           c.title, (s.id is null or lp.id is null), ack.acknowledged_at
      from public.safeguarding_concern_acknowledgements ack
      join public.coursework_file_reviews r on r.id=ack.review_id
      left join public.assignment_submissions s on s.id=r.submission_id
      left join public.learner_profiles lp on lp.id=s.learner_profile_id
      left join public.course_assignments ca on ca.id=s.assignment_id
      left join public.courses c on c.id=ca.course_id
      left join public.user_profiles up on up.user_id=r.reviewed_by
     where p_before is null or (ack.acknowledged_at, ack.review_id) < (p_before, p_before_id)
     order by ack.acknowledged_at desc, ack.review_id desc
     limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;
revoke all on function public.safeguarding_concern_history(timestamptz,uuid,integer) from public, anon;
grant execute on function public.safeguarding_concern_history(timestamptz,uuid,integer) to authenticated;

create function public.reopen_safeguarding_concern(p_review_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.current_user_id(); v_id uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin')
     or not exists (select 1 from public.safeguarding_owner where singleton and owner_user_id=v_actor) then
    raise exception 'only the configured safeguarding owner may reopen a concern' using errcode = 'insufficient_privilege';
  end if;
  delete from public.safeguarding_concern_acknowledgements where review_id=p_review_id returning review_id into v_id;
  if v_id is null then return false; end if;
  insert into public.governance_audit_events(actor, action, target_type, target_id, detail)
    values (v_actor, 'safeguarding.concern_reopened', 'coursework_file_review', p_review_id, '{}'::jsonb);
  return true;
end;
$$;
revoke all on function public.reopen_safeguarding_concern(uuid) from public, anon;
grant execute on function public.reopen_safeguarding_concern(uuid) to authenticated;

comment on function public.safeguarding_concern_queue(integer) is
  'Unacknowledged coursework concerns, accessible only to the explicitly configured safeguarding owner. Not an email, delivery guarantee, file-access fix, or safeguarding resolution.';

-- A repeated concern after acknowledgement is new information, not a double-click.
-- Lock the asset so concurrent reviews and acknowledgements serialize.
create or replace function public.record_coursework_review(
  p_asset_id uuid,
  p_decision text,
  p_note     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_note     text := nullif(btrim(coalesce(p_note, '')), '');
  v_asset        public.media_assets;
  v_submission   uuid;
  v_learner      uuid;
  v_author       uuid;
  v_last         public.coursework_file_reviews;
begin
  if v_actor is null then
    raise exception 'sign in to record a review'
      using errcode = 'insufficient_privilege';
  end if;

  if v_decision not in ('clear', 'concern') then
    raise exception 'a review is either clear or a concern'
      using errcode = 'invalid_parameter_value';
  end if;

  if v_decision = 'concern' and (v_note is null or length(v_note) < 3) then
    raise exception 'a concern needs a sentence saying what worried you'
      using errcode = 'check_violation';
  end if;

  select * into v_asset from public.media_assets where id = p_asset_id for update;
  if not found or v_asset.purpose <> 'coursework' then
    raise exception 'that file was not handed in as coursework'
      using errcode = 'no_data_found';
  end if;

  if v_asset.deleted_at is not null or v_asset.status = 'deleted' then
    raise exception 'that file has been deleted, so there is nothing to review'
      using errcode = 'check_violation';
  end if;

  -- Attached, or still being declared: both say which submission the file belongs
  -- to, and a file that says neither is not something anybody can review.
  select st.submission_id, st.learner_profile_id, st.author_id
    into v_submission, v_learner, v_author
    from public.coursework_file_state st
   where st.asset_id = p_asset_id;

  if v_submission is null then
    select d.submission_id into v_submission
      from public.coursework_upload_declarations d
     where d.asset_id = p_asset_id;

    select s.learner_profile_id, ca.created_by
      into v_learner, v_author
      from public.assignment_submissions s
      join public.course_assignments ca on ca.id = s.assignment_id
     where s.id = v_submission;
  end if;

  if v_submission is null then
    raise exception 'that file is not attached to an assignment, so there is nothing to review'
      using errcode = 'no_data_found';
  end if;

  -- The household first, so the family that sent the file is told the truth about
  -- why they cannot vouch for it rather than being handed the general refusal.
  -- `can_access_learner()` is deliberately not used: it is true for privileged
  -- staff, which would have refused the people this function exists for.
  if public.is_own_learner_profile(v_learner)
     or public.is_learner_family_member(v_learner) then
    raise exception 'the family that sent a file cannot vouch for it'
      using errcode = 'insufficient_privilege',
            hint = 'a review is a second pair of eyes. Ask the course author or staff.';
  end if;

  -- The two people who may review: the teacher the work was handed to, or staff.
  if not (public.is_privileged(v_actor) or v_author = v_actor) then
    raise exception 'only the teacher the work was handed to, or staff, may review it'
      using errcode = 'insufficient_privilege';
  end if;

  if v_asset.status <> 'available' then
    raise exception 'that file is %, so there is nothing to look at yet', v_asset.status
      using errcode = 'check_violation';
  end if;

  -- A duplicate before acknowledgement is a retry. A changed note, or a concern
  -- reported again after acknowledgement, is new information.
  select * into v_last
    from public.coursework_file_reviews r
   where r.asset_id = p_asset_id
   order by r.review_order desc
   limit 1;
  if found and v_last.reviewed_by = v_actor and v_last.decision = v_decision
     and v_last.note is not distinct from v_note
     and (v_decision <> 'concern' or not exists (
       select 1 from public.safeguarding_concern_acknowledgements a where a.review_id = v_last.id
     )) then
    return jsonb_build_object(
      'id', v_last.id, 'decision', v_last.decision,
      'reviewedAt', v_last.reviewed_at, 'recorded', false);
  end if;

  insert into public.coursework_file_reviews
    (asset_id, submission_id, decision, note, reviewed_by)
  values (p_asset_id, v_submission, v_decision, v_note, v_actor)
  returning * into v_last;

  -- What was decided and which file, never the sentence that was written about a
  -- child's photograph: the note belongs on the review, where the people who may
  -- read the file can read it.
  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'coursework.reviewed', 'media_asset', p_asset_id,
          jsonb_build_object('decision', v_decision, 'submissionId', v_submission));

  return jsonb_build_object(
    'id', v_last.id, 'decision', v_last.decision,
    'reviewedAt', v_last.reviewed_at, 'recorded', true);
end;
$$;


-- The marker and staff state use the same deterministic latest-review order.
create or replace view public.coursework_file_state as
  select asa.media_asset_id      as asset_id,
         asa.submission_id,
         ma.display_name         as file_name,
         ma.mime_type,
         ma.byte_size,
         ma.status,
         ma.deleted_at,
         asa.created_at          as attached_at,
         s.learner_profile_id,
         lp.display_name         as learner_name,
         ca.course_id,
         ca.created_by           as author_id,
         ca.course_version_id,
         c.title                 as course_title,
         r.decision,
         r.note,
         r.reviewed_at,
         r.reviewed_by,
         r.reviewer_name
    from public.assignment_submission_assets asa
    join public.media_assets ma
      on ma.id = asa.media_asset_id and ma.purpose = 'coursework'
    join public.assignment_submissions s on s.id = asa.submission_id
    join public.course_assignments ca    on ca.id = s.assignment_id
    join public.courses c                on c.id = ca.course_id
    join public.learner_profiles lp      on lp.id = s.learner_profile_id
    -- The monotonically assigned review order, not a random UUID, selects the
    -- latest review even when multiple reviews share a transaction timestamp.
    left join lateral (
      select r.decision, r.note, r.reviewed_at, r.reviewed_by,
             up.display_name as reviewer_name
        from public.coursework_file_reviews r
        join public.user_profiles up on up.user_id = r.reviewed_by
       where r.asset_id = asa.media_asset_id
       order by r.review_order desc
       limit 1
    ) r on true;

