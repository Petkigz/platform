-- Agreeing to a policy names the version that was read.
--
-- accept_policy(p_slug) agrees to whatever version of a document is in force
-- at the instant it runs. A page left open while the owner publishes a new
-- version then records an agreement to a text its reader was never shown.
-- The application has checked for that since 2026-11-23 by reading the live
-- version before asking, which leaves the moment between that read and this
-- write.
--
-- The owner's rule for a change of policy (2026-11-23) is that a person is
-- told at their next opening of the application or by a notification, and
-- that nothing is sprung on a page they already have open. This migration is
-- the other half of that rule: a page that is behind is never the reason an
-- agreement is recorded. The reader pressed a button under one text; if that
-- text is no longer the one in force, nothing is recorded and they are shown
-- the new one because they asked.
--
-- A second function of the same name, taking the version number the reader
-- was shown. It refuses with `policy:changed` when that is not the number in
-- force. The row it read is held until it has written, so a version cannot be
-- retired between the comparison and the record.
--
-- What does not change:
--   * accept_policy(p_slug) is left as it was, for anything that still calls
--     it. It records what is in force and compares nothing.
--   * What an agreement is: one row per person and version, written once,
--     with an audit event; a repeat is answered with the time of the first.
--   * A number is not an id. A caller cannot agree to a retired version by
--     naming it: the number is only compared with the one in force.

create or replace function public.accept_policy(p_slug text, p_version integer)
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

  if p_version is null then
    raise exception 'policy:version_required'
      using errcode = 'invalid_parameter_value';
  end if;

  select * into v_doc
    from public.policy_documents
   where slug = lower(btrim(coalesce(p_slug, '')));
  if not found then
    raise exception 'policy:not_found'
      using errcode = 'no_data_found';
  end if;

  -- Held until this transaction ends: approve_policy_version() retires this
  -- row with an update, which waits for it.
  select * into v_version
    from public.policy_versions
   where document_id = v_doc.id and status = 'in_force'
     for share;
  if not found then
    raise exception 'policy:not_in_force'
      using errcode = 'check_violation';
  end if;

  if v_version.version_number <> p_version then
    raise exception 'policy:changed'
      using errcode = 'check_violation',
            hint = 'the version in force is not the one that was read';
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

revoke all on function public.accept_policy(text, integer) from public, anon;
grant execute on function public.accept_policy(text, integer) to authenticated;

comment on function public.accept_policy(text, integer) is
  'Records the caller''s agreement to the version of a document in force, only when it is the version number the caller was shown. Refuses with policy:changed otherwise.';
