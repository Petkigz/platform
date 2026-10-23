-- ---------------------------------------------------------------------------
-- What is waiting for a human, on one screen.
--
-- Every queue in this platform is worked from its own page, and each page is
-- excellent at saying what is in it. None of them says *that there is anything
-- in it*. An owner who signs in on a Monday has thirteen places to look and no
-- way to know which of them has something in it without looking at all
-- thirteen.
--
-- `staff_attention()` answers that in one call: the count in each queue, the
-- page that drains it, and — the part that matters most — nothing at all about
-- the queues the caller may not work.
--
-- Three rules.
--
--   1. PERMISSION IS THE FILTER, NOT THE LABEL. A support agent does not get a
--      disabled refund card; they do not get a refund card. The count of
--      refunds is itself information about the business, and a definer function
--      that returned every count and trusted the screen to hide some would leak
--      it to anybody with a support login.
--
--   2. A QUEUE WHOSE FEATURE IS OFF IS MARKED, NOT HIDDEN. If guardian
--      verification is switched off with cases still pending, those cases did
--      not stop existing. The row says `dormant` so the screen can explain why
--      nothing new is arriving, rather than the reader concluding the queue is
--      somehow broken.
--
--   3. A COUNT OF ZERO IS STILL AN ANSWER. The function returns every queue the
--      caller may work, including the empty ones. "Refunds: 0" is a better
--      sentence than an absence the reader has to interpret.
-- ---------------------------------------------------------------------------

create or replace function public.staff_attention()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor      uuid := public.current_user_id();
  v_platform   boolean;
  v_finance    boolean;
  v_governance boolean;
  v_support    boolean;
  v_queues     jsonb := '[]'::jsonb;
  v_count      integer;
  v_total      integer := 0;
begin
  if v_actor is null then
    raise exception 'sign in to see what is waiting'
      using errcode = 'insufficient_privilege';
  end if;
  if not public.is_privileged(v_actor) then
    raise exception 'only platform staff have queues to work'
      using errcode = 'insufficient_privilege';
  end if;

  v_platform   := public.has_role(v_actor, 'platform_admin');
  v_finance    := v_platform or public.has_role(v_actor, 'finance_admin');
  v_governance := v_platform or public.has_role(v_actor, 'governance_admin');
  v_support    := v_platform or public.has_role(v_actor, 'support_agent');

  -- -------------------------------------------------------------------------
  -- Money
  -- -------------------------------------------------------------------------
  if v_finance then
    select count(*)::int into v_count
      from public.refund_requests where status = 'requested';
    v_queues := v_queues || public.attention_row(
      'refunds', 'Refund requests', v_count, '/admin/refunds',
      'Money waiting to go back to a customer.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.payment_disputes
     where status in ('open', 'under_review', 'evidence_submitted');
    v_queues := v_queues || public.attention_row(
      'disputes', 'Payment disputes', v_count, '/admin/disputes',
      'A chargeback has a deadline; the provider decides what happens if it passes.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.payment_reconciliations
     where status in ('open', 'in_progress', 'discrepancies_found');
    v_queues := v_queues || public.attention_row(
      'reconciliation', 'Reconciliation runs', v_count, '/admin/reconciliation',
      'An open run has rows that do not yet agree with the provider statement.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.instructor_payouts
     where status in ('scheduled', 'processing');
    v_queues := v_queues || public.attention_row(
      'payouts', 'Teacher payouts', v_count, '/admin/payouts',
      'A teacher has asked to be paid. Recording one is not sending one.',
      'teaching.payouts', not public.setting_bool('teaching.payouts', false));
    v_total := v_total + v_count;
  end if;

  -- -------------------------------------------------------------------------
  -- People
  -- -------------------------------------------------------------------------
  if v_support then
    select count(*)::int into v_count
      from public.support_cases where status in ('open', 'assigned');
    v_queues := v_queues || public.attention_row(
      'support', 'Support cases', v_count, '/admin/support',
      'Open or assigned, and not yet resolved.', 'platform.support',
      not public.setting_bool('platform.support', false));
    v_total := v_total + v_count;
  end if;

  if v_governance then
    select count(*)::int into v_count
      from public.governance_appeals where resolved_at is null;
    v_queues := v_queues || public.attention_row(
      'appeals', 'Governance appeals', v_count, '/admin/appeals',
      'Somebody is contesting a decision, and silence is itself a decision.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.reviewer_qualifications where verification_status = 'pending';
    v_queues := v_queues || public.attention_row(
      'credentials', 'Qualifications to check', v_count, '/admin/reviewers',
      'A reviewer cannot be authorised in a subject until their credential is checked.', null, false);
    v_total := v_total + v_count;

    select count(*)::int into v_count
      from public.guardian_verification_cases
     where status in ('pending', 'in_review', 'needs_information');
    v_queues := v_queues || public.attention_row(
      'guardians', 'Guardian verifications', v_count, '/admin/guardians',
      'An adult asking to be recognised as a child''s parent.',
      'family.guardian_verification',
      not public.setting_bool('family.guardian_verification', false));
    v_total := v_total + v_count;
  end if;

  -- -------------------------------------------------------------------------
  -- Content — any privileged role may work these
  -- -------------------------------------------------------------------------
  select count(*)::int into v_count
    from public.content_reports
   where status in ('submitted', 'triaged', 'under_review');
  v_queues := v_queues || public.attention_row(
    'reports', 'Reported content', v_count, '/admin/reports',
    'A reader flagged something. Closing one needs a written note.', null, false);
  v_total := v_total + v_count;

  select count(*)::int into v_count
    from public.course_reviews where visibility_state = 'pending';
  v_queues := v_queues || public.attention_row(
    'reviews', 'Reviews awaiting moderation', v_count, '/admin/course-reviews',
    'Words are held until somebody reads them; a rating alone is already counted.',
    'learning.reviews', not public.setting_bool('learning.reviews', false));
  v_total := v_total + v_count;

  select count(*)::int into v_count
    from public.media_assets where status in ('pending', 'quarantined');
  v_queues := v_queues || public.attention_row(
    'media', 'Media needing a look', v_count, '/admin/media',
    'An upload that has not been confirmed, or one held back for review.', null, false);
  v_total := v_total + v_count;

  return jsonb_build_object(
    'generatedAt', now(),
    'waitingCount', v_total,
    -- Only the queues this person may work. A hidden card is not a permission
    -- check; an absent one is.
    'queues', v_queues,
    'canSeeFinance',     v_finance,
    'canSeeGovernance',  v_governance,
    'canSeeSupport',     v_support
  );
end;
$$;

revoke all on function public.staff_attention() from public, anon;
grant execute on function public.staff_attention() to authenticated;

comment on function public.staff_attention() is
  'Every queue the signed-in staff member may work, with the count in it and the page that drains it. Filters by role rather than labelling: a count of refunds is information a support agent does not get.';

-- ---------------------------------------------------------------------------
-- One row, uniformly shaped
-- ---------------------------------------------------------------------------
create or replace function public.attention_row(
  p_code    text,
  p_label   text,
  p_count   integer,
  p_href    text,
  p_detail  text,
  p_feature text,
  p_dormant boolean
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'code',    p_code,
    'label',   p_label,
    'count',   coalesce(p_count, 0),
    'href',    p_href,
    'detail',  p_detail,
    'feature', p_feature,
    -- Dormant means the queue still holds rows but nothing new can arrive while
    -- the feature is off. It is not the same as empty, and it must not read as
    -- broken.
    'dormant', coalesce(p_dormant, false));
$$;

revoke all on function public.attention_row(text, text, integer, text, text, text, boolean) from public;

comment on function public.attention_row(text, text, integer, text, text, text, boolean) is
  'Shapes one attention row. Internal: the label and link are the screen''s copy, kept beside the count so they cannot drift apart.';
