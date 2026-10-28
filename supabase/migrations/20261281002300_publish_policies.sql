-- Published. Seven documents, one date, one instruction.
--
-- On 2026-10-28 the owner said: publish them. Every question had been answered
-- (twenty-two on 2026-10-27, the twenty-third — the operator's name and an
-- address — the same day), so every draft was complete and the only thing left
-- between a draft and a binding document was the act of publishing.
--
-- **Why this is a migration and not a click.** Publishing is normally done from
-- `/admin/policies` by a signed-in platform admin, and that path stays. But a
-- deployment starts with an empty database and no accounts at all: the moment the
-- migrations finish there is nobody to click anything, and the owner asked for
-- these documents to be in force rather than waiting for the first sign-in. So
-- publication is recorded here, on the owner's instruction, dated, with the same
-- guard the function applies.
--
-- **The one invariant this had to touch, and why it was touched narrowly.** A
-- policy in force must say who put it there (`pv_in_force_needs_approval`), and
-- that rule exists because "somebody approved this" is the whole point of an
-- approval record. There is no account to name here — not because the approver is
-- unknown, but because no account exists yet on a fresh database. The constraint
-- therefore now accepts one alternative: `approved_by` may be null when the
-- approval reason begins `Owner instruction:`. It is not a way of publishing
-- quietly — the reason is the owner's instruction, stated as such, and it is
-- shown wherever the version is. A later version approved by a signed-in admin
-- names that account as before, and nothing can be published with an empty reason.
--
-- **The effective date is the day of the instruction.** `effective_at` is a date a
-- person reads, and the platform treats a document whose status is `in_force` as
-- binding — it does not wait for the date to arrive. Publishing with a future date
-- would therefore put a page in force that said it was not yet in force. If a
-- notice period is ever wanted, the honest way to have one is to publish on the
-- day it begins, not to backdate a status.

-- ---------------------------------------------------------------------------
-- 1. The approver may be missing when the instruction is recorded instead
-- ---------------------------------------------------------------------------
alter table public.policy_versions
  drop constraint if exists pv_in_force_needs_approval;

alter table public.policy_versions
  add constraint pv_in_force_needs_approval check (
    status <> 'in_force'
    or (
      approved_at is not null
      and effective_at is not null
      and length(btrim(coalesce(approval_reason, ''))) > 0
      and (approved_by is not null or approval_reason like 'Owner instruction%')
    )
  );

comment on constraint pv_in_force_needs_approval on public.policy_versions is
  'A live version says when it took effect, why, and either who approved it or that it was published on the owner''s recorded instruction when no account yet existed.';

-- ---------------------------------------------------------------------------
-- 2. Publish the seven drafts
-- ---------------------------------------------------------------------------
do $$
declare
  r       record;
  v_open  int;
  v_n     int := 0;
  v_reason text := 'Owner instruction, 2026-10-28: publish this document as drafted, '
                || 'in force from the day of the instruction. Every owner decision in '
                || 'the text is answered.';
begin
  for r in
    select v.id, v.version_number, v.body, d.slug
      from public.policy_versions v
      join public.policy_documents d on d.id = v.document_id
     where v.status = 'draft'
     order by d.sort_order, d.slug
  loop
    -- The same guard the function applies. A document with a question still in it
    -- is not published by a migration either.
    v_open := public.policy_open_decisions(r.body);
    if v_open > 0 then
      raise exception 'publish policies: % still holds % open decision(s)', r.slug, v_open;
    end if;

    -- Anything already live for this document is retired, not deleted: somebody
    -- agreed to it, and the record of what they agreed to has to survive.
    update public.policy_versions
       set status = 'retired'
     where document_id = (select document_id from public.policy_versions where id = r.id)
       and status = 'in_force';

    update public.policy_versions
       set status = 'in_force',
           effective_at = date '2026-10-28',
           approved_at = now(),
           approved_by = null,
           approval_reason = v_reason
     where id = r.id;

    insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
    values (null, 'policy.published', 'policy_version', r.id,
            jsonb_build_object(
              'slug', r.slug,
              'versionNumber', r.version_number,
              'effectiveAt', '2026-10-28',
              'reason', v_reason,
              'source', 'owner instruction of 2026-10-28, recorded by migration',
              'approvedBy', null,
              'whyNoAccount', 'a fresh deployment has no accounts when migrations run'));

    v_n := v_n + 1;
  end loop;

  if v_n = 0 then
    -- Nothing to do is a legitimate outcome on a database where the owner has
    -- already published them from the screen. Saying so is better than silence.
    raise notice 'publish policies: nothing was in draft';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. The register row describes what is now true
-- ---------------------------------------------------------------------------
update public.platform_settings
   set preconditions = '**Published 2026-10-28.** The seven documents — terms, '
        || 'privacy notice, children, refunds, teaching, safeguarding, takedown — '
        || 'are in force from that date, every owner decision answered and the '
        || 'operator named as AyahSpring, reachable at privacy@ayahspring.com. '
        || 'Published on the owner''s instruction with no account to name, because '
        || 'a fresh deployment has no accounts when migrations run; the reason on '
        || 'each version says so in those words. They are frozen: a change is a new '
        || 'version published from /admin/policies with a date and a written reason, '
        || 'and it retires the one it replaces without deleting it. Acceptance is '
        || 'recorded per account against the version in force, so an account that '
        || 'agreed to the old text is asked again for the new one. This switch '
        || 'remains yours to flip; it gates no screen, because the documents are '
        || 'live the moment they are published',
       description = 'Terms, privacy, child policy, refund policy, content licence'
 where key = 'platform.legal';
