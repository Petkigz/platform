-- The last switch before a certificate, and there was no handle on it.
--
-- WHAT WAS FOUND
-- --------------
-- The certificate machinery is complete: numbering (`AS-<year>-<8 digits>`),
-- eligibility evaluated from recorded facts, a criteria snapshot taken at issue,
-- revocation that is permanent and reasoned, and a public verification page that
-- discloses only what a verifier needs.
--
-- And nothing could produce one. `issue_certificate()` refuses unless the
-- enrolment's version has a `course_completion_policies` row with
-- `certificate_enabled` — and **no screen writes that table**. The read policy
-- exists, the insert policy exists, and the only writer in the product is a
-- human with the SQL editor. So `/admin/certificates` said, truthfully and
-- uselessly, "No eligible learners are waiting for a certificate", on a platform
-- where no course could ever make a learner eligible.
--
-- That is the defect a journey finds and a feature test cannot: every door was
-- tested, and the corridor between two of them was a wall.
--
-- WHY A FUNCTION RATHER THAN THE INSERT POLICY THAT ALREADY EXISTS
-- ----------------------------------------------------------------
-- `course_completion_policies` has an insert policy and **no update policy**, so
-- a row written directly could never be changed — the switch would be a
-- one-way door on a decision an owner will revisit. And a raw insert cannot say
-- anything useful about *why* it was refused: the table's own constraint reports
-- `ccp_certificate_needs_template`, which is not a sentence.
--
-- So one writer, in the shape every other writer here has: SECURITY DEFINER,
-- the actor from the session, the governing policy restated inside it, a written
-- audit row.
--
-- WHAT THE SWITCH MEANS, SAID PRECISELY
-- -------------------------------------
-- On: a learner who finishes every lesson in this version **may be given** a
-- certificate. Not "is given one" — issuing is a person at `/admin/certificates`,
-- idempotent, and the certificate stores the completion rules as they stood at
-- that moment. The card on the course page says this, because the alternative is
-- an author who believes a PDF arrives by itself.
--
-- Off: nobody new becomes eligible. Certificates already issued stay valid; they
-- are snapshots, and a promise kept is not undone by a later decision.
--
-- WHEN IT MAY CHANGE
-- ------------------
-- A retired version cannot change what it promises. A published version can gain
-- the switch — adding a certificate only ever gives learners something — but
-- cannot lose it once somebody holds one, because that would be withdrawing a
-- promise from a person who already earned it. Both refusals are sentences.

-- ---------------------------------------------------------------------------
-- The writer
-- ---------------------------------------------------------------------------

create or replace function public.set_course_certificate_policy(
  p_version_id       uuid,
  p_enabled          boolean,
  p_template_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_version  public.course_versions;
  v_template text := nullif(btrim(coalesce(p_template_version, '')), '');
  v_before   public.course_completion_policies;
  v_held     integer;
  v_changed  boolean := false;
begin
  if v_actor is null then
    raise exception 'sign in to decide what a course finishes with'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_version from public.course_versions where id = p_version_id;
  if not found then
    raise exception 'course version % not found', p_version_id
      using errcode = 'no_data_found';
  end if;

  -- The governing policy, restated: `course_completion_policies_write` admits
  -- `can_author_version(course_version_id)`, which is the version's author or a
  -- privileged person. A definer function bypasses the policy that would
  -- otherwise decide this, so the same rule is written out here.
  if v_version.created_by <> v_actor and not public.is_privileged(v_actor) then
    raise exception 'only the author of this version may decide what it finishes with'
      using errcode = 'insufficient_privilege';
  end if;

  if v_version.version_status = 'retired' then
    raise exception 'course version % is retired; it cannot change what it promises', p_version_id
      using errcode = 'check_violation';
  end if;

  select * into v_before from public.course_completion_policies
   where course_version_id = p_version_id;

  -- Enabling needs a name for the certificate's design. `...` is deliberately
  -- free text rather than a foreign key to a templates table that does not
  -- exist: the certificate stores the string, and a template that changes later
  -- must not silently rewrite certificates already issued.
  if coalesce(p_enabled, false) then
    -- A design already chosen is not asked for twice: an author who turned the
    -- switch off for a term and turns it back on should not have to remember
    -- what they called it.
    v_template := coalesce(v_template, v_before.certificate_template_version);

    if v_template is null then
      raise exception 'a certificate needs the name of the design it was made from'
        using errcode = 'invalid_parameter_value';
    end if;
    if length(v_template) > 80 then
      raise exception 'a certificate template name is at most 80 characters'
        using errcode = 'invalid_parameter_value';
    end if;
  end if;

  -- Turning it off after somebody holds one withdraws a promise already kept.
  if not coalesce(p_enabled, false) and v_before.certificate_enabled then
    select count(*)::int into v_held
      from public.certificates c
      join public.course_enrolments ce on ce.id = c.course_enrolment_id
     where ce.course_version_id = p_version_id
       and c.status = 'issued';

    if v_held > 0 then
      raise exception
        '% % already holding a certificate from this version; turning it off would withdraw what they were given',
        v_held, case when v_held = 1 then 'learner is' else 'learners are' end
        using errcode = 'check_violation';
    end if;
  end if;

  insert into public.course_completion_policies
    (course_version_id, completion_mode, certificate_enabled, certificate_template_version)
  values
    (p_version_id, 'all_lessons', coalesce(p_enabled, false), v_template)
  on conflict (course_version_id) do update
    set certificate_enabled          = excluded.certificate_enabled,
        -- Kept rather than cleared when turning it off: re-enabling a design
        -- somebody already chose should not ask them to spell it again.
        certificate_template_version = coalesce(excluded.certificate_template_version,
                                                public.course_completion_policies.certificate_template_version),
        updated_at                   = now();

  v_changed := v_before.id is null
               or v_before.certificate_enabled is distinct from coalesce(p_enabled, false)
               or (coalesce(p_enabled, false)
                   and v_before.certificate_template_version is distinct from v_template);

  if v_changed then
    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (v_actor, 'certificate.policy_changed', 'course_version', p_version_id,
            jsonb_build_object('enabled', coalesce(p_enabled, false),
                               'template', v_template,
                               'was_enabled', coalesce(v_before.certificate_enabled, false)));
  end if;

  select * into v_before from public.course_completion_policies
   where course_version_id = p_version_id;

  return jsonb_build_object(
    'enabled',         v_before.certificate_enabled,
    'templateVersion', v_before.certificate_template_version,
    'changed',         v_changed);
end;
$$;

revoke all on function public.set_course_certificate_policy(uuid, boolean, text) from public, anon;
grant execute on function public.set_course_certificate_policy(uuid, boolean, text) to authenticated;

comment on function public.set_course_certificate_policy(uuid, boolean, text) is
  'The version''s author, or privileged staff: says whether finishing this version can lead to a certificate, and from which design. Refuses a retired version, refuses a template name it was not given, and refuses to switch off while somebody holds a certificate from it.';

-- ---------------------------------------------------------------------------
-- What the certificates screen can see
-- ---------------------------------------------------------------------------
-- `/admin/certificates` had one empty state — "No eligible learners are waiting
-- for a certificate" — which is true of an empty platform, true of a platform
-- where nobody has finished, and true of a platform where no course issues them.
-- Three different situations, one sentence, and the person reading it is the one
-- who could fix the third.
--
-- So one call returns the whole picture, and the screen can say which of the
-- three it is looking at. It walks every enrolment, like
-- `list_certificate_issuance_candidates()` does, because it is a staff screen
-- opened on purpose rather than a page a learner loads.

create or replace function public.certificate_shelf_standing()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_versions   integer;
  v_issuing    integer;
  v_waiting    integer;
  v_finished   integer;
  v_issued     integer;
  v_revoked    integer;
begin
  if v_actor is null then
    raise exception 'sign in to read the certificate shelf' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_privileged(v_actor) and not public.has_role(v_actor, 'support_agent') then
    raise exception 'only platform staff may read the certificate shelf'
      using errcode = 'insufficient_privilege';
  end if;

  select count(*)::int into v_versions
    from public.course_versions cv
    join public.courses c on c.id = cv.course_id
   where cv.version_status = 'published'
     and c.deleted_at is null;

  select count(*)::int into v_issuing
    from public.course_versions cv
    join public.courses c on c.id = cv.course_id
    join public.course_completion_policies p on p.course_version_id = cv.id
   where cv.version_status = 'published'
     and c.deleted_at is null
     and p.certificate_enabled;

  select count(*)::int into v_waiting
    from public.list_certificate_issuance_candidates();

  -- Finished a course that does not issue certificates. The number that turns a
  -- dead end into a task: somebody did the work and there is nothing to give
  -- them until the author turns the switch on.
  select count(*)::int into v_finished
    from public.course_enrolments ce
    join public.course_versions cv on cv.id = ce.course_version_id
    cross join lateral public.evaluate_completion(ce.id) done
   where ce.deleted_at is null
     and ce.status in ('active', 'completed')
     and done.is_complete
     and not exists (
       select 1 from public.course_completion_policies p
        where p.course_version_id = ce.course_version_id
          and p.certificate_enabled)
     and not exists (
       select 1 from public.certificates c where c.course_enrolment_id = ce.id);

  select count(*)::int into v_issued
    from public.certificates where status = 'issued';

  select count(*)::int into v_revoked
    from public.certificates where status = 'revoked';

  return jsonb_build_object(
    'publishedVersions',  v_versions,
    'issuingVersions',    v_issuing,
    'waiting',            v_waiting,
    'finishedWithout',    v_finished,
    'issued',             v_issued,
    'revoked',            v_revoked);
end;
$$;

revoke all on function public.certificate_shelf_standing() from public, anon;
grant execute on function public.certificate_shelf_standing() to authenticated;

comment on function public.certificate_shelf_standing() is
  'For /admin/certificates: how many published versions there are, how many of them issue certificates, how many completions are waiting to be issued, how many people finished a course that issues nothing, and the issue/revoke counts. Three empty states, told apart.';
