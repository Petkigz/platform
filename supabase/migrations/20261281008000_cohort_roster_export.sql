-- -----------------------------------------------------------------------------
-- A class list that leaves the platform leaves a trace
-- -----------------------------------------------------------------------------
--
-- A teacher can already read the roster: `cohort_learner_progress()` returns the
-- members of one class and how far through the version each of them is, and the
-- class page shows it. What the page cannot do is go into a spreadsheet, and a
-- teacher running three classes wants exactly that — a register they can sort, or
-- bring to a meeting.
--
-- **The moment that list becomes a file, it is a copy of children's names in
-- somebody's downloads folder.** That is not an argument against it: a teacher
-- who is trusted to see a child's progress is trusted to write it down, and
-- refusing the file only pushes the same data into a screenshot. It is an
-- argument for the copy being *recorded*, which is the same reasoning
-- `/account/export` already states about its own downloads — "that record is how
-- a surprise copy of somebody's data becomes traceable".
--
-- So the export writes one audit event before the file is handed over, and the
-- route refuses to hand over a file whose event could not be written. A copy
-- nobody can account for is worse than no copy.
--
-- **What this function does not do: decide who may export.**
-- `cohort_learner_progress()` is the authority, unchanged, and this function asks
-- it rather than restating its rule — the count below *is* the number of rows the
-- caller is allowed to see. A second copy of the permission is a second answer to
-- "who may see this child", and the two would eventually disagree.
--
-- The count in the audit row is therefore re-derived here rather than taken from
-- the caller: the record says how many people the database was willing to show,
-- not how many the client claims it wrote.

create or replace function public.log_cohort_roster_export(p_cohort_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_user_id();
  v_visible integer;
begin
  if v_actor is null then
    raise exception 'sign in to export a class list'
      using errcode = 'insufficient_privilege';
  end if;

  if p_cohort_id is null then
    raise exception 'a class is required'
      using errcode = 'invalid_parameter_value';
  end if;

  -- The roster answers "who may see this", including both flags. Asked here so
  -- that turning a switch off closes the export in the same breath as the page,
  -- without a deploy and without a second copy of the rule.
  select count(*)::integer into v_visible
    from public.cohort_learner_progress(p_cohort_id) r;

  if v_visible = 0 then
    -- One message for three situations — an empty class, a class this caller does
    -- not manage, and a feature somebody switched off — because telling them
    -- apart would tell a caller which classes exist.
    raise exception 'there is nothing in this class that you can see'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'cohort.roster_exported', 'cohort', p_cohort_id,
          jsonb_build_object('learners', v_visible, 'format', 'csv'));

  return jsonb_build_object('logged', true, 'learners', v_visible);
end;
$$;

revoke all on function public.log_cohort_roster_export(uuid) from public, anon;
grant execute on function public.log_cohort_roster_export(uuid) to authenticated;

comment on function public.log_cohort_roster_export(uuid) is
  'Records that a teacher took a class list off the platform, and answers with the number of learners the database was willing to show. Asks cohort_learner_progress() for that number rather than restating who may see whom.';
