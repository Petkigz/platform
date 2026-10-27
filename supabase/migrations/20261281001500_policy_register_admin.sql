-- The owner can add a document, without SQL.
--
-- The register shipped with seven documents seeded by migration, and a screen
-- that edits and publishes them. That closed the loop for the seven and left a
-- hole for the eighth: an incident runbook, a screening standard, a panel
-- procedure — anything the owner decides must exist as a written document — had
-- no way onto the platform except an insert by hand. A register somebody cannot
-- add to is a register that will be out of date by the second decision.
--
-- So: one function, one form on `/admin/policies`, and the same rule as every
-- other write here — the owner adds the slot, and nothing reaches a reader until
-- a version is approved.

create or replace function public.create_policy_document(
  p_slug                text,
  p_title               text,
  p_summary             text,
  p_audience            text default 'everyone',
  p_acceptance_required boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_user_id();
  v_slug     text := lower(btrim(coalesce(p_slug, '')));
  v_title    text := btrim(coalesce(p_title, ''));
  v_summary  text := btrim(coalesce(p_summary, ''));
  v_audience text := lower(btrim(coalesce(p_audience, 'everyone')));
  v_id       uuid;
  v_order    int;
begin
  if v_actor is null or not public.has_role(v_actor, 'platform_admin') then
    raise exception 'policy:not_allowed'
      using errcode = 'insufficient_privilege';
  end if;

  -- The slug is an address: `/policies/<slug>`. It is minted here rather than in
  -- the screen, so every document is linkable and no two can collide.
  if v_slug !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' or length(v_slug) > 60 then
    raise exception 'policy:slug_invalid'
      using errcode = 'check_violation';
  end if;
  if length(v_title) < 3 or length(v_title) > 120 then
    raise exception 'policy:title_required'
      using errcode = 'check_violation';
  end if;
  if length(v_summary) < 10 or length(v_summary) > 400 then
    raise exception 'policy:summary_required'
      using errcode = 'check_violation';
  end if;
  if v_audience not in ('everyone', 'child', 'teacher', 'institution') then
    raise exception 'policy:audience_invalid'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.policy_documents where slug = v_slug) then
    raise exception 'policy:exists'
      using errcode = 'unique_violation';
  end if;

  -- New documents go to the end of the public list. Position is presentation,
  -- not authority, so a document added later cannot displace the terms.
  select coalesce(max(sort_order), 0) + 10 into v_order from public.policy_documents;

  insert into public.policy_documents
    (slug, title, summary, audience, acceptance_required, sort_order)
  values (v_slug, v_title, v_summary, v_audience, coalesce(p_acceptance_required, false), v_order)
  returning id into v_id;

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (v_actor, 'policy.document_created', 'policy_document', v_id,
          jsonb_build_object('slug', v_slug, 'audience', v_audience,
                             'acceptanceRequired', coalesce(p_acceptance_required, false)));

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'title', v_title);
end;
$$;

revoke all on function public.create_policy_document(text, text, text, text, boolean)
  from public, anon;
grant execute on function public.create_policy_document(text, text, text, text, boolean)
  to authenticated;

comment on function public.create_policy_document(text, text, text, text, boolean) is
  'Adds a document to the register, with no text yet. Owner only. The first version is written and approved on the same screen as every other one.';
