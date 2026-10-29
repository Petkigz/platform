-- A teacher agrees to the licence before the first file is uploaded.
--
-- WHY THIS EXISTS
-- ---------------
-- `policy_documents` has carried a `teaching` document since 2026-10-27, and it
-- went in force on 2026-10-28 with the sentence that matters:
--
--   *"You keep the copyright in everything you write. By publishing a course you
--   give the platform a licence to store it, show it to learners entitled to it,
--   and keep offering it to them."*
--
-- What was missing was **the agreement**. Nobody was ever asked. The register
-- records an acceptance when somebody presses a button on `/policies/teaching`,
-- and nothing anywhere said a teacher had to. `register_media_upload()` took a
-- file from any signed-in account, which was harmless while the platform had no
-- teachers and becomes dishonest the moment it has one: the terms say what the
-- platform may do with a teacher's work, and a term nobody agreed to binds
-- nobody.
--
-- WHAT IS BUILT
-- -------------
--   * `my_teacher_terms()` — whether the live teacher terms have been accepted,
--     which version, and whether an upload would be allowed right now;
--   * a BEFORE INSERT trigger on `media_assets` that refuses an upload from a
--     teacher who has not accepted. A trigger rather than a check inside
--     `register_media_upload()` because that function already exists twice in
--     this history (2026-11-07 and 2026-12-11) and a third definition would
--     eventually be written without the rule;
--   * `teacher_licence_coverage()` — the gap, for whoever can fix it: how many
--     appointed teachers, how many have agreed, and who has not.
--
-- WHAT IT DELIBERATELY DOES NOT DO
-- --------------------------------
-- **It ships off** (`teaching.content_licence`). The owner's standing rule is
-- that any flag may be left off, and this one has a real cost when it is on:
-- it takes an ability away from a teacher who has not yet agreed. That is a
-- decision, not a default. With the flag off the screens still say the terms
-- exist and are not yet required — the same honesty as every other gate here.
--
-- It does not touch publishing. A licence is about the file a teacher hands
-- over; review and scholarly approval are a separate gate that already exists,
-- and folding the two together would let one excuse the other.

-- ---------------------------------------------------------------------------
-- The status of one account
-- ---------------------------------------------------------------------------
-- No permission check in this one, on purpose: it is called by the trigger,
-- which has to answer for the person a row was written for rather than for
-- whoever happens to be connected. Grants are therefore revoked from every
-- client role, and `my_teacher_terms()` is the door with a lock on it.
create or replace function public.teacher_terms_for(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_doc    public.policy_documents;
  v_live   public.policy_versions;
  v_when   timestamptz;
  v_on     boolean := public.setting_bool('teaching.content_licence', false);
  v_found  boolean := false;
begin
  select * into v_doc from public.policy_documents where slug = 'teaching';
  v_found := found;

  if v_found then
    select * into v_live
      from public.policy_versions
     where document_id = v_doc.id and status = 'in_force';
    if found and p_user is not null then
      select accepted_at into v_when
        from public.policy_acceptances
       where user_id = p_user and policy_version_id = v_live.id;
    end if;
  end if;

  return jsonb_build_object(
    'slug', coalesce(v_doc.slug, 'teaching'),
    'title', coalesce(v_doc.title, 'Terms for teachers'),
    'documentFound', v_found,
    -- Whether agreement is required of a teacher right now. The flag decides;
    -- the document being in force is a precondition for the flag doing anything.
    'enforced', v_on,
    'versionNumber', v_live.version_number,
    'effectiveAt', v_live.effective_at,
    'accepted', v_when is not null,
    'acceptedAt', v_when,
    -- Two different gaps, and they need different sentences: one is the
    -- teacher's to close in a click, the other is the owner's to publish.
    'blockedBy', case
                   when not v_on then null
                   when v_live.id is null then 'not_published'
                   when v_when is null then 'not_accepted'
                   else null end,
    'canUpload', (not v_on) or (v_live.id is not null and v_when is not null)
  );
end;
$$;

revoke all on function public.teacher_terms_for(uuid) from public, anon, authenticated;

comment on function public.teacher_terms_for(uuid) is
  'The teacher-licence status of one account, without a permission check. Internal: called by my_teacher_terms() and by the media_assets gate. Clients read my_teacher_terms().';

create or replace function public.my_teacher_terms()
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
    raise exception 'licence:not_signed_in'
      using errcode = 'insufficient_privilege';
  end if;

  return public.teacher_terms_for(v_actor);
end;
$$;

revoke all on function public.my_teacher_terms() from public, anon;
grant execute on function public.my_teacher_terms() to authenticated;

comment on function public.my_teacher_terms() is
  'Whether this account has agreed to the live teacher terms, and whether an upload is allowed right now.';

-- ---------------------------------------------------------------------------
-- The gate
-- ---------------------------------------------------------------------------
create or replace function public.media_assets_require_teacher_licence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status jsonb;
begin
  -- No uploader to ask about (a system row). Nothing to gate.
  if new.uploaded_by is null then
    return new;
  end if;

  if not public.setting_bool('teaching.content_licence', false) then
    return new;
  end if;

  v_status := public.teacher_terms_for(new.uploaded_by);
  if (v_status ->> 'canUpload')::boolean then
    return new;
  end if;

  -- Two refusals, because the person reading them has to do two different
  -- things. Both are named so the screen can turn them into a sentence.
  if v_status ->> 'blockedBy' = 'not_published' then
    raise exception 'licence:not_published'
      using errcode = 'check_violation',
            hint = 'the teacher terms are not published, so there is nothing to agree to yet';
  end if;

  raise exception 'licence:not_accepted'
    using errcode = 'check_violation',
          hint = 'agree to the teacher terms on the teaching page first';
end;
$$;

create trigger media_assets_require_teacher_licence
  before insert on public.media_assets
  for each row execute function public.media_assets_require_teacher_licence();

comment on function public.media_assets_require_teacher_licence() is
  'Refuses an upload whose uploader has not agreed to the live teacher terms, when teaching.content_licence is on.';

-- ---------------------------------------------------------------------------
-- The gap, for the person who can close it
-- ---------------------------------------------------------------------------
create or replace function public.teacher_licence_coverage()
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
    raise exception 'licence:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  return (
    with live as (
      select v.id, v.version_number
        from public.policy_versions v
        join public.policy_documents d on d.id = v.document_id
       where d.slug = 'teaching' and v.status = 'in_force'
       limit 1
    ),
    teachers as (
      select ura.user_id, up.display_name
        from public.user_role_assignments ura
        join public.roles r on r.id = ura.role_id and r.code = 'instructor'
        join public.user_profiles up on up.user_id = ura.user_id
    ),
    agreed as (
      select t.user_id
        from teachers t
        join public.policy_acceptances a
          on a.user_id = t.user_id
         and a.policy_version_id = (select id from live)
    )
    select jsonb_build_object(
      'enforced', public.setting_bool('teaching.content_licence', false),
      'versionNumber', (select version_number from live),
      'teachers', (select count(*)::int from teachers),
      'accepted', (select count(*)::int from agreed),
      'outstanding', coalesce((
        select jsonb_agg(jsonb_build_object('userId', t.user_id, 'name', t.display_name)
                         order by t.display_name)
          from teachers t
         where not exists (select 1 from agreed a where a.user_id = t.user_id)), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.teacher_licence_coverage() from public, anon;
grant execute on function public.teacher_licence_coverage() to authenticated;

comment on function public.teacher_licence_coverage() is
  'Appointed teachers, how many have agreed to the live teacher terms, and who has not. Staff only.';

-- ---------------------------------------------------------------------------
-- The flag says what is now true
-- ---------------------------------------------------------------------------
-- It becomes an admin toggle as well as a description: a CODE flag cannot be
-- turned on at runtime by design (a gate whose code does not exist yet is not a
-- switch), and this one now has its code. The owner turns it on from
-- `/admin/settings`, which is the only place a decision like this belongs.
update public.platform_settings
   set gate_type = 'admin'
 where key = 'teaching.content_licence';

update public.platform_settings
   set preconditions = '**Built 2026-10-28: the agreement, not just the text.** The `teaching` document '
        || 'went in force on 2026-10-28 and `/policies/teaching` records an acceptance against the '
        || 'version that is live at the moment it is given. What was missing was anybody being asked. '
        || 'This flag now switches on a refusal in the database: with it on, `media_assets` will not '
        || 'accept an upload whose uploader has not agreed to the live teacher terms, and the reason is '
        || 'readable — "agree on the teaching page first", or "the terms are not published yet" when there '
        || 'is nothing to agree to. Staff see the gap on `/admin/policies`: how many appointed teachers, '
        || 'how many have agreed, and who has not. **It ships off**, because taking an ability away from a '
        || 'teacher is a decision rather than a default; turn it on before the first teacher uploads. '
        || 'Publishing a new version of the terms asks everybody to agree again, which is why the '
        || 'acceptance is recorded against a version rather than a document',
       description = 'Who owns uploaded content and what licence the platform holds'
 where key = 'teaching.content_licence';
