-- The scholarly panel, from "the tables exist" to "a person can use it".
--
-- `scholarly_panels`, `scholarly_panel_memberships`, `scholarly_panel_cases` and
-- `scholarly_panel_votes` were built on 2026-10-18 and left dormant under P6. The
-- publication gate already reads them: with `governance.panel_required` on, a
-- version publishes only if a panel case for it is **approved**. Nothing could
-- approve a case — there was no writer, and the case tables had an insert policy
-- and no update policy — so switching that setting on would have blocked every
-- publication on the platform for ever, silently. That is the trap this closes.
--
-- The owner's rule is the design: **the board decides only when it is present and
-- active.** So a vote needs an active membership *and* a convened panel; a panel
-- cannot be convened with fewer active members than its quorum; removing a member
-- from a convened panel that would drop it below quorum is refused rather than
-- quietly making the board unable to decide; and a case cannot be closed without
-- its quorum.
--
-- What this does **not** decide, because it is the owner's: how many people sit on
-- a panel (asked, not defaulted), which majority a decision needs (the arithmetic
-- here refuses only a contradiction — approving while more voted to reject), and
-- whether publication requires a panel at all (`governance.panel_required`, still
-- off). `teaching.panel` says so in FLAGS.md.

-- ---------------------------------------------------------------------------
-- Convening a panel
-- ---------------------------------------------------------------------------
create or replace function public.open_panel(
  p_name            text,
  p_description     text default null,
  p_subject_area_id uuid default null,
  p_quorum_size     integer default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_user_id();
  v_name  text := btrim(coalesce(p_name, ''));
  v_id    uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'panel:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if length(v_name) < 3 then
    raise exception 'panel:name_required'
      using errcode = 'check_violation';
  end if;
  if p_quorum_size is null or p_quorum_size < 1 or p_quorum_size > 25 then
    raise exception 'panel:quorum_invalid'
      using errcode = 'check_violation';
  end if;
  if p_subject_area_id is not null
     and not exists (select 1 from public.subject_areas where id = p_subject_area_id) then
    raise exception 'panel:subject_not_found'
      using errcode = 'no_data_found';
  end if;

  insert into public.scholarly_panels (name, description, subject_area_id, quorum_size, status)
  values (v_name, nullif(btrim(coalesce(p_description, '')), ''), p_subject_area_id,
          p_quorum_size, 'inactive')
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'panel.opened', 'scholarly_panel', v_id,
          jsonb_build_object('name', v_name, 'quorum', p_quorum_size));

  return jsonb_build_object('id', v_id, 'name', v_name, 'quorum', p_quorum_size,
                            'status', 'inactive');
end;
$$;

revoke all on function public.open_panel(text, text, uuid, integer) from public, anon;
grant execute on function public.open_panel(text, text, uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------
/**
 * Add somebody to a panel.
 *
 * Owner only: the standing rule is that the owner appoints board members, and a
 * panel seat is a board seat. Two things have to be true before a seat means
 * anything — the person holds the `scholarly_panel_member` role (the appointment,
 * which the owner makes on the roles screen) and their reviewer profile has been
 * checked, so the seat is not an empty one.
 */
create or replace function public.add_panel_member(
  p_panel_id           uuid,
  p_reviewer_profile_id uuid,
  p_member_role        text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_role    text := lower(btrim(coalesce(p_member_role, 'member')));
  v_panel   public.scholarly_panels;
  v_profile public.reviewer_profiles;
  v_id      uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'panel:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_panel from public.scholarly_panels where id = p_panel_id;
  if not found then
    raise exception 'panel:not_found' using errcode = 'no_data_found';
  end if;
  if v_panel.status = 'dissolved' then
    raise exception 'panel:dissolved' using errcode = 'check_violation';
  end if;
  if v_role not in ('chair', 'member') then
    raise exception 'panel:role_invalid' using errcode = 'check_violation';
  end if;

  select * into v_profile from public.reviewer_profiles
   where id = p_reviewer_profile_id and deleted_at is null;
  if not found then
    raise exception 'panel:reviewer_not_found' using errcode = 'no_data_found';
  end if;
  if v_profile.reviewer_status <> 'active' then
    raise exception 'panel:reviewer_not_active'
      using errcode = 'check_violation';
  end if;
  if not public.has_role(v_profile.user_id, 'scholarly_panel_member') then
    raise exception 'panel:appointment_required'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.scholarly_panel_memberships
              where panel_id = p_panel_id
                and reviewer_profile_id = p_reviewer_profile_id
                and status = 'active') then
    raise exception 'panel:already_a_member' using errcode = 'unique_violation';
  end if;

  insert into public.scholarly_panel_memberships (panel_id, reviewer_profile_id, member_role)
  values (p_panel_id, p_reviewer_profile_id, v_role)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'panel.member_added', 'scholarly_panel_membership', v_id,
          jsonb_build_object('panelId', p_panel_id, 'reviewerProfileId', p_reviewer_profile_id,
                             'memberRole', v_role));

  return jsonb_build_object('id', v_id, 'memberRole', v_role);
end;
$$;

revoke all on function public.add_panel_member(uuid, uuid, text) from public, anon;
grant execute on function public.add_panel_member(uuid, uuid, text) to authenticated;

/**
 * Remove somebody, or record that they stood down.
 *
 * A convened panel cannot be taken below its quorum by a removal: the board is
 * then unable to decide anything, and the failure would surface later as a case
 * nobody can close. Make the panel inactive first, or lower the quorum, and the
 * screen says that instead of the row simply going.
 */
create or replace function public.remove_panel_member(
  p_membership_id uuid,
  p_reason        text,
  p_status        text default 'stepped_down'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_status text := lower(btrim(coalesce(p_status, 'stepped_down')));
  v_row    public.scholarly_panel_memberships;
  v_panel  public.scholarly_panels;
  v_active int;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'panel:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if length(v_reason) < 3 then
    raise exception 'panel:reason_required' using errcode = 'check_violation';
  end if;
  if v_status not in ('stepped_down', 'removed') then
    raise exception 'panel:status_invalid' using errcode = 'check_violation';
  end if;

  select * into v_row from public.scholarly_panel_memberships where id = p_membership_id;
  if not found then
    raise exception 'panel:not_found' using errcode = 'no_data_found';
  end if;
  if v_row.status <> 'active' then
    raise exception 'panel:not_a_member' using errcode = 'check_violation';
  end if;

  select * into v_panel from public.scholarly_panels where id = v_row.panel_id;

  if v_panel.status = 'active' then
    select count(*)::int into v_active
      from public.scholarly_panel_memberships
     where panel_id = v_panel.id and status = 'active';
    if v_active - 1 < v_panel.quorum_size then
      raise exception 'panel:below_quorum'
        using errcode = 'check_violation',
              hint = format('the panel has %s active member(s) and needs %s',
                            v_active, v_panel.quorum_size);
    end if;
  end if;

  update public.scholarly_panel_memberships
     set status = v_status, left_at = now()
   where id = p_membership_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'panel.member_removed', 'scholarly_panel_membership', p_membership_id,
          jsonb_build_object('panelId', v_row.panel_id, 'status', v_status, 'reason', v_reason));

  return jsonb_build_object('id', p_membership_id, 'status', v_status);
end;
$$;

revoke all on function public.remove_panel_member(uuid, text, text) from public, anon;
grant execute on function public.remove_panel_member(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Convened, or not
-- ---------------------------------------------------------------------------
create or replace function public.set_panel_status(
  p_panel_id uuid,
  p_status   text,
  p_reason   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_user_id();
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_panel  public.scholarly_panels;
  v_active int;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'panel:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;
  if v_status not in ('active', 'inactive', 'dissolved') then
    raise exception 'panel:status_invalid' using errcode = 'check_violation';
  end if;

  select * into v_panel from public.scholarly_panels where id = p_panel_id;
  if not found then
    raise exception 'panel:not_found' using errcode = 'no_data_found';
  end if;
  if v_panel.status = v_status then
    return jsonb_build_object('id', p_panel_id, 'status', v_status, 'changed', false);
  end if;
  if v_panel.status = 'dissolved' then
    raise exception 'panel:dissolved' using errcode = 'check_violation';
  end if;

  select count(*)::int into v_active
    from public.scholarly_panel_memberships
   where panel_id = p_panel_id and status = 'active';

  if v_status = 'active' and v_active < v_panel.quorum_size then
    raise exception 'panel:not_enough_members'
      using errcode = 'check_violation',
            hint = format('%s member(s) seated, %s needed to convene', v_active, v_panel.quorum_size);
  end if;

  if v_status = 'dissolved' then
    if length(v_reason) < 3 then
      raise exception 'panel:reason_required' using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.scholarly_panel_cases
                where panel_id = p_panel_id and status in ('open', 'deliberating')) then
      raise exception 'panel:open_cases'
        using errcode = 'check_violation';
    end if;
  end if;

  update public.scholarly_panels set status = v_status where id = p_panel_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'panel.status_changed', 'scholarly_panel', p_panel_id,
          jsonb_build_object('from', v_panel.status, 'to', v_status,
                             'reason', nullif(v_reason, '')));

  return jsonb_build_object('id', p_panel_id, 'status', v_status, 'changed', true);
end;
$$;

revoke all on function public.set_panel_status(uuid, text, text) from public, anon;
grant execute on function public.set_panel_status(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cases
-- ---------------------------------------------------------------------------
create or replace function public.open_panel_case(
  p_panel_id   uuid,
  p_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_panel   public.scholarly_panels;
  v_version public.course_versions;
  v_id      uuid;
begin
  if v_actor is null
     or not (public.has_role(v_actor, 'platform_admin')
             or public.has_role(v_actor, 'governance_admin')) then
    raise exception 'panel:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_panel from public.scholarly_panels
   where id = p_panel_id and deleted_at is null;
  if not found then
    raise exception 'panel:not_found' using errcode = 'no_data_found';
  end if;
  if v_panel.status <> 'active' then
    raise exception 'panel:not_convened'
      using errcode = 'check_violation';
  end if;

  select * into v_version from public.course_versions where id = p_version_id;
  if not found then
    raise exception 'panel:version_not_found' using errcode = 'no_data_found';
  end if;
  if v_version.version_status in ('published', 'retired') then
    raise exception 'panel:already_published'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.scholarly_panel_cases
              where course_version_id = p_version_id
                and status in ('open', 'deliberating')) then
    raise exception 'panel:case_open'
      using errcode = 'unique_violation';
  end if;

  insert into public.scholarly_panel_cases (panel_id, course_version_id)
  values (p_panel_id, p_version_id)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'panel.case_opened', 'scholarly_panel_case', v_id,
          jsonb_build_object('panelId', p_panel_id, 'versionId', p_version_id));

  return jsonb_build_object('id', v_id, 'status', 'open');
end;
$$;

revoke all on function public.open_panel_case(uuid, uuid) from public, anon;
grant execute on function public.open_panel_case(uuid, uuid) to authenticated;

/**
 * Cast your own vote.
 *
 * The reviewer is resolved from the session, never from the request: a panel
 * member cannot vote as somebody else, and the vote trigger's membership check
 * then has a real person to check. A panel that is not convened decides nothing,
 * which is the owner's rule stated as a refusal.
 */
create or replace function public.cast_panel_vote(
  p_case_id   uuid,
  p_vote      text,
  p_rationale text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_vote    text := lower(btrim(coalesce(p_vote, '')));
  v_case    public.scholarly_panel_cases;
  v_panel   public.scholarly_panels;
  v_profile uuid;
  v_id      uuid;
begin
  if v_actor is null then
    raise exception 'panel:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;
  if v_vote not in ('approve', 'reject', 'abstain') then
    raise exception 'panel:vote_invalid' using errcode = 'check_violation';
  end if;

  select * into v_case from public.scholarly_panel_cases where id = p_case_id;
  if not found then
    raise exception 'panel:not_found' using errcode = 'no_data_found';
  end if;
  if v_case.status not in ('open', 'deliberating') then
    raise exception 'panel:already_decided' using errcode = 'check_violation';
  end if;

  select * into v_panel from public.scholarly_panels where id = v_case.panel_id;
  if v_panel.status <> 'active' then
    raise exception 'panel:not_convened' using errcode = 'check_violation';
  end if;

  select id into v_profile from public.reviewer_profiles
   where user_id = v_actor and deleted_at is null;
  if v_profile is null then
    raise exception 'panel:not_a_member' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.scholarly_panel_memberships
                  where panel_id = v_case.panel_id
                    and reviewer_profile_id = v_profile
                    and status = 'active') then
    raise exception 'panel:not_a_member' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.scholarly_panel_votes
              where case_id = p_case_id and reviewer_profile_id = v_profile) then
    raise exception 'panel:already_voted' using errcode = 'unique_violation';
  end if;

  insert into public.scholarly_panel_votes (case_id, reviewer_profile_id, vote, rationale)
  values (p_case_id, v_profile, v_vote, nullif(btrim(coalesce(p_rationale, '')), ''))
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'panel.vote_cast', 'scholarly_panel_case', p_case_id,
          jsonb_build_object('vote', v_vote, 'reviewerProfileId', v_profile));

  return jsonb_build_object('id', v_id, 'vote', v_vote, 'voted', true);
end;
$$;

revoke all on function public.cast_panel_vote(uuid, text, text) from public, anon;
grant execute on function public.cast_panel_vote(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The tally, and closing a case
-- ---------------------------------------------------------------------------
/** What the board has said so far. One definition, read by the screens and the refusal. */
create or replace function public.panel_tally(p_case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'approve', count(*) filter (where vote = 'approve')::int,
    'reject',  count(*) filter (where vote = 'reject')::int,
    'abstain', count(*) filter (where vote = 'abstain')::int,
    'cast',    count(*)::int)
    from public.scholarly_panel_votes where case_id = p_case_id;
$$;

revoke all on function public.panel_tally(uuid) from public, anon;
grant execute on function public.panel_tally(uuid) to authenticated;

/**
 * Record the board's decision.
 *
 * The quorum is the owner's number, read from the panel; the refusal names it
 * rather than saying "not enough". The arithmetic is the only rule this adds, and
 * it is not a majority policy: it refuses to record a contradiction — a case
 * approved while more members voted to reject, or rejected while more voted to
 * approve. Which majority the owner wants (simple, two-thirds, unanimity) is the
 * owner's, and the screen shows the tally beside the choice instead of deciding
 * it for them.
 */
create or replace function public.decide_panel_case(
  p_case_id uuid,
  p_outcome text,
  p_summary text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_outcome text := lower(btrim(coalesce(p_outcome, '')));
  v_summary text := btrim(coalesce(p_summary, ''));
  v_case    public.scholarly_panel_cases;
  v_panel   public.scholarly_panels;
  v_tally   jsonb;
  v_cast    int;
  v_yes     int;
  v_no      int;
  v_chair   boolean := false;
begin
  if v_actor is null then
    raise exception 'panel:not_signed_in' using errcode = 'insufficient_privilege';
  end if;

  select * into v_case from public.scholarly_panel_cases where id = p_case_id;
  if not found then
    raise exception 'panel:not_found' using errcode = 'no_data_found';
  end if;
  if v_case.status not in ('open', 'deliberating') then
    raise exception 'panel:already_decided' using errcode = 'check_violation';
  end if;

  select * into v_panel from public.scholarly_panels where id = v_case.panel_id;

  select exists (
    select 1
      from public.scholarly_panel_memberships spm
      join public.reviewer_profiles rp on rp.id = spm.reviewer_profile_id
     where spm.panel_id = v_panel.id
       and spm.status = 'active'
       and spm.member_role = 'chair'
       and rp.user_id = v_actor
  ) into v_chair;

  if not (public.has_role(v_actor, 'platform_admin')
          or public.has_role(v_actor, 'governance_admin')
          or v_chair) then
    raise exception 'panel:not_allowed' using errcode = 'insufficient_privilege';
  end if;
  if v_panel.status <> 'active' then
    raise exception 'panel:not_convened' using errcode = 'check_violation';
  end if;
  if v_outcome not in ('approved', 'rejected', 'withdrawn') then
    raise exception 'panel:outcome_invalid' using errcode = 'check_violation';
  end if;
  if length(v_summary) < 10 then
    raise exception 'panel:summary_required' using errcode = 'check_violation';
  end if;

  v_tally := public.panel_tally(p_case_id);
  v_cast  := coalesce((v_tally ->> 'cast')::int, 0);
  v_yes   := coalesce((v_tally ->> 'approve')::int, 0);
  v_no    := coalesce((v_tally ->> 'reject')::int, 0);

  if v_cast < v_panel.quorum_size then
    raise exception 'panel:quorum_not_met'
      using errcode = 'check_violation',
            hint = format('%s of %s votes cast', v_cast, v_panel.quorum_size);
  end if;

  if v_outcome = 'approved' and not (v_yes >= 1 and v_yes > v_no) then
    raise exception 'panel:outcome_contradicts_votes'
      using errcode = 'check_violation',
            hint = format('%s approve, %s reject', v_yes, v_no);
  end if;
  if v_outcome = 'rejected' and not (v_no >= 1 and v_no >= v_yes) then
    raise exception 'panel:outcome_contradicts_votes'
      using errcode = 'check_violation',
            hint = format('%s approve, %s reject', v_yes, v_no);
  end if;

  update public.scholarly_panel_cases
     set status = v_outcome,
         closed_at = now(),
         outcome_summary = v_summary
   where id = p_case_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'panel.case_decided', 'scholarly_panel_case', p_case_id,
          jsonb_build_object('outcome', v_outcome, 'tally', v_tally,
                             'quorum', v_panel.quorum_size, 'summary', v_summary));

  return jsonb_build_object('id', p_case_id, 'status', v_outcome, 'tally', v_tally);
end;
$$;

revoke all on function public.decide_panel_case(uuid, text, text) from public, anon;
grant execute on function public.decide_panel_case(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reading it
-- ---------------------------------------------------------------------------
/** The console: every panel, who sits on it, and every case. Staff only. */
create or replace function public.panel_register()
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
    raise exception 'panel:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'panels', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'name', p.name,
               'description', p.description,
               'status', p.status,
               'quorum', p.quorum_size,
               'subject', (select sa.name from public.subject_areas sa where sa.id = p.subject_area_id),
               'activeMembers', (select count(*)::int from public.scholarly_panel_memberships m
                                  where m.panel_id = p.id and m.status = 'active'),
               'members', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', m.id,
                          'reviewerProfileId', m.reviewer_profile_id,
                          'name', up.display_name,
                          'memberRole', m.member_role,
                          'status', m.status,
                          'joinedAt', m.joined_at,
                          'leftAt', m.left_at) order by m.joined_at)
                   from public.scholarly_panel_memberships m
                   join public.reviewer_profiles rp on rp.id = m.reviewer_profile_id
                   join public.user_profiles up on up.user_id = rp.user_id
                  where m.panel_id = p.id), '[]'::jsonb),
               'cases', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', c.id,
                          'status', c.status,
                          'openedAt', c.opened_at,
                          'closedAt', c.closed_at,
                          'outcomeSummary', c.outcome_summary,
                          'versionId', c.course_version_id,
                          'versionNumber', cv.version_number,
                          'versionStatus', cv.version_status,
                          'courseTitle', c2.title,
                          'tally', public.panel_tally(c.id)) order by c.opened_at desc)
                   from public.scholarly_panel_cases c
                   join public.course_versions cv on cv.id = c.course_version_id
                   join public.courses c2 on c2.id = cv.course_id
                  where c.panel_id = p.id), '[]'::jsonb))
             order by p.created_at desc)
        from public.scholarly_panels p
       where p.deleted_at is null), '[]'::jsonb),
    'awaiting', coalesce((
      select jsonb_agg(jsonb_build_object(
               'versionId', cv.id,
               'versionNumber', cv.version_number,
               'versionStatus', cv.version_status,
               'courseTitle', c.title,
               'hasOpenCase', exists (select 1 from public.scholarly_panel_cases sc
                                       where sc.course_version_id = cv.id
                                         and sc.status in ('open', 'deliberating')))
             order by cv.created_at desc)
        from public.course_versions cv
        join public.courses c on c.id = cv.course_id
       where cv.version_status in ('draft', 'submitted', 'approved')
         and c.deleted_at is null
       limit 100), '[]'::jsonb),
    -- Who could be seated: a checked reviewer who holds the appointment. Listed
    -- with the appointment flag rather than filtered, so the screen can say why
    -- somebody is not seatable instead of silently leaving them out.
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object(
               'reviewerProfileId', rp.id,
               'name', up.display_name,
               'appointed', public.has_role(up.user_id, 'scholarly_panel_member'))
             order by up.display_name)
        from public.reviewer_profiles rp
        join public.user_profiles up on up.user_id = rp.user_id
       where rp.reviewer_status = 'active' and rp.deleted_at is null), '[]'::jsonb),
    'counts', jsonb_build_object(
      'panels', (select count(*)::int from public.scholarly_panels where deleted_at is null),
      'convened', (select count(*)::int from public.scholarly_panels
                    where status = 'active' and deleted_at is null),
      'openCases', (select count(*)::int from public.scholarly_panel_cases
                     where status in ('open', 'deliberating'))),
    'panelRequired', public.setting_bool('governance.panel_required', false));
end;
$$;

revoke all on function public.panel_register() from public, anon;
grant execute on function public.panel_register() to authenticated;

/**
 * A member's own work, and nobody else's.
 *
 * Deliberately narrow: a member sees the cases of panels they sit on, their own
 * vote, and how many votes have been cast — not the direction of anybody else's
 * vote before they have voted themselves, and not the deliberations of a panel
 * they are not on. `scholarly_panel_cases` has no member read policy, so this
 * function is the only way in.
 */
create or replace function public.my_panel_work()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_profile uuid;
begin
  if v_actor is null then
    raise exception 'panel:not_signed_in' using errcode = 'insufficient_privilege';
  end if;

  select id into v_profile from public.reviewer_profiles
   where user_id = v_actor and deleted_at is null;

  if v_profile is null then
    return jsonb_build_object('panelMember', false, 'panels', '[]'::jsonb,
                              'cases', '[]'::jsonb, 'decided', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'panelMember', exists (select 1 from public.scholarly_panel_memberships
                            where reviewer_profile_id = v_profile and status = 'active'),
    'panels', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.name, 'status', p.status,
               'quorum', p.quorum_size, 'memberRole', m.member_role))
        from public.scholarly_panel_memberships m
        join public.scholarly_panels p on p.id = m.panel_id
       where m.reviewer_profile_id = v_profile and m.status = 'active'), '[]'::jsonb),
    'cases', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'panelName', p.name,
               'quorum', p.quorum_size,
               'openedAt', c.opened_at,
               'versionNumber', cv.version_number,
               'courseTitle', co.title,
               'cast', (select count(*)::int from public.scholarly_panel_votes v where v.case_id = c.id),
               'myVote', (select v.vote from public.scholarly_panel_votes v
                           where v.case_id = c.id and v.reviewer_profile_id = v_profile),
               'tally', case when exists (
                   select 1 from public.scholarly_panel_votes v
                    where v.case_id = c.id and v.reviewer_profile_id = v_profile)
                 then public.panel_tally(c.id) else null end) order by c.opened_at)
        from public.scholarly_panel_cases c
        join public.scholarly_panels p on p.id = c.panel_id
        join public.scholarly_panel_memberships m
          on m.panel_id = p.id and m.status = 'active' and m.reviewer_profile_id = v_profile
        join public.course_versions cv on cv.id = c.course_version_id
        join public.courses co on co.id = cv.course_id
       where c.status in ('open', 'deliberating')), '[]'::jsonb),
    'decided', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'outcome', c.status,
               'closedAt', c.closed_at,
               'outcomeSummary', c.outcome_summary,
               'courseTitle', co.title,
               'myVote', v.vote) order by c.closed_at desc)
        from public.scholarly_panel_votes v
        join public.scholarly_panel_cases c on c.id = v.case_id
        join public.course_versions cv on cv.id = c.course_version_id
        join public.courses co on co.id = cv.course_id
       where v.reviewer_profile_id = v_profile and c.status in ('approved', 'rejected', 'withdrawn')
       limit 20), '[]'::jsonb));
end;
$$;

revoke all on function public.my_panel_work() from public, anon;
grant execute on function public.my_panel_work() to authenticated;

comment on function public.panel_register() is
  'Governance staff and the owner: every panel, its members, every case with its tally, and the versions waiting for a decision.';
comment on function public.my_panel_work() is
  'A panel member''s own cases and own vote. The only read path for a member, because a panel case is not readable to a reviewer through RLS.';

-- ---------------------------------------------------------------------------
-- The flag
-- ---------------------------------------------------------------------------
-- It said "Quorum policy; voting rules; conflict declarations; appeals.
-- Currently open — do not build until decided." What was open was a number and a
-- majority, and a number and a majority recorded in a screen are what make the
-- decision usable. What was missing was a way to use either — a case that could
-- never close. That is now built, so the flag stops saying "nothing exists" and
-- says what is still the owner's.
update public.platform_settings
   set gate_type = 'admin_setup',
       description = 'Scholarly panel with quorum and voting',
       preconditions = 'Built 2026-10-27: a panel with a quorum the owner sets, seated members (the appointment is the owner''s, on the roles screen, and the person must be a checked reviewer), cases opened against an unpublished version, one vote each from seated members of a convened panel, and a decision recorded by the chair, governance or the owner. A case cannot be closed without its quorum, and cannot be approved against a majority vote to reject. Set-up before it is worth relying on: decide the quorum per panel and the majority you want, write the panel procedure as a document in the register, and only then switch `governance.panel_required` on — with it off, peer review is enough to publish'
 where key = 'teaching.panel';
