-- The subject vocabulary: who may change it, and what retiring one does.
--
-- WHY THIS EXISTS
-- ---------------
-- subject_areas is seeded with 37 entries and is read by the catalogue filter,
-- the subject badges and every course card. It had no screen: the only way to
-- add, rename or retire a subject was SQL against production.
--
-- The write policies were also wider than anything the platform means. Both used
-- is_privileged(), which is any staff role — so a support agent reading a ticket
-- could add a subject, and the page that will now offer the buttons would have
-- been narrower than the table it edits. This migration makes the policy match
-- the screen: governance_admin or platform_admin, the pair that already owns
-- publication.
--
-- AND WHAT RETIRING A SUBJECT WOULD HAVE DONE
-- -------------------------------------------
-- subject_areas_read hides retired rows from every reader. A course badge is a
-- join through course_version_subjects to that row, so retiring a subject a
-- published course is tagged with would have removed the badge from a live
-- course — silently, with no way to put it back, because D5 freezes subject
-- mapping at publication and the tag can no longer be edited.
--
-- So retirement is refused while any version that is or could still be visible
-- carries the tag: draft, submitted, approved or published. Draft and approved
-- are included because the alternative is a trap that springs later, at
-- publication, when the author can no longer fix what went wrong.

-- ---------------------------------------------------------------------------
-- Who may change the vocabulary
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_subjects()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.user_role_assignments ura
      join public.roles r on r.id = ura.role_id
     where ura.user_id = public.current_user_id()
       and ura.revoked_at is null
       and r.code in ('governance_admin', 'platform_admin')
  );
$$;

comment on function public.can_manage_subjects() is
  'Governance or platform admin: may add, rename and retire subject areas.';

revoke all on function public.can_manage_subjects() from public;
grant execute on function public.can_manage_subjects() to authenticated;

drop policy if exists subject_areas_write  on public.subject_areas;
drop policy if exists subject_areas_update on public.subject_areas;

create policy subject_areas_write on public.subject_areas
  for insert to authenticated
  with check (public.can_manage_subjects());

create policy subject_areas_update on public.subject_areas
  for update to authenticated
  using (public.can_manage_subjects())
  with check (public.can_manage_subjects());

-- Readers see active subjects. The people who maintain the vocabulary must also
-- see the retired ones — otherwise the screen that retires a subject could not
-- list what it retired, and (in PostgreSQL, where an updated row is checked
-- against the SELECT policies) an admin could not retire anything at all: the
-- new row would be invisible to them the instant it changed. Both were verified
-- by attempting the update as a governance admin and reading the refusal.

create policy subject_areas_read_staff on public.subject_areas
  for select to authenticated
  using (public.can_manage_subjects());

-- ---------------------------------------------------------------------------
-- Retirement is refused while anything visible is filed under it
-- ---------------------------------------------------------------------------

create or replace function public.guard_subject_retirement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_live integer;
begin
  if new.status = 'retired' and old.status is distinct from 'retired' then
    select count(*) into v_live
      from public.course_version_subjects cvs
      join public.course_versions cv on cv.id = cvs.course_version_id
     where cvs.subject_area_id = new.id
       and cv.version_status in ('draft', 'submitted', 'approved', 'published');

    if v_live > 0 then
      raise exception
        'this subject is filed under % course version(s) that are live or still being written; '
        'a retired subject is hidden from readers, so retiring it would blank their badges and '
        'the tags on a published version can no longer be changed',
        v_live
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end $$;

comment on function public.guard_subject_retirement() is
  'A subject with live or in-flight course tags cannot be retired: its badge would disappear.';

drop trigger if exists subject_areas_retire_guard on public.subject_areas;
create trigger subject_areas_retire_guard
  before update on public.subject_areas
  for each row execute function public.guard_subject_retirement();

-- ---------------------------------------------------------------------------
-- Every change to the vocabulary is recorded
-- ---------------------------------------------------------------------------

create or replace function public.record_subject_area_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'subject.created';
  elsif new.status is distinct from old.status then
    v_action := case when new.status = 'retired' then 'subject.retired' else 'subject.reactivated' end;
  elsif new.code is distinct from old.code then
    v_action := 'subject.recoded';
  elsif new.name is distinct from old.name then
    v_action := 'subject.renamed';
  else
    v_action := 'subject.updated';
  end if;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (
    public.current_user_id(),
    v_action,
    'subject_area',
    new.id,
    jsonb_build_object(
      'code', new.code,
      'name', new.name,
      'status', new.status,
      'parent_subject_id', new.parent_subject_id,
      'before', case when tg_op = 'INSERT' then null else jsonb_build_object(
        'code', old.code,
        'name', old.name,
        'status', old.status,
        'parent_subject_id', old.parent_subject_id
      ) end
    )
  );

  return new;
end $$;

comment on function public.record_subject_area_change() is
  'Writes every subject_areas insert or update to the governance audit log.';

drop trigger if exists subject_areas_audit on public.subject_areas;
create trigger subject_areas_audit
  after insert or update on public.subject_areas
  for each row execute function public.record_subject_area_change();
