-- The feature-flag register, made machine-readable.
--
-- `platform_settings` already existed as the "enable it later" layer, but two
-- things stopped it from being an admin dashboard:
--
--   1. It had no SELECT policy. Writes were privileged; reads were impossible
--      for anyone, so nothing could render the list.
--   2. It carried a value and a description, but not the gate type or the
--      precondition. FLAGS.md held both, in prose, where no code could read
--      them — so "do not promise CODE flags to the admin dashboard" was a
--      sentence rather than a rule.
--
-- Both are fixed here. The 86 flags from FLAGS.md are seeded as reference
-- data, each with its gate type and its written precondition, so the dashboard
-- can show *why* a flag is off rather than only that it is.
--
-- The important consequence: a `code`-gated flag cannot be enabled through the
-- application. That is enforced by a trigger, not by the UI hiding the button,
-- because a UI that hides something is not a control. A migration can still do
-- it by setting the bypass GUC below, which is the same pattern the version
-- lock and the enrolment pin already use.
--
-- Two duplicate keys were merged in FLAGS.md to make this seed possible:
-- `learning.wishlist` and `teaching.applications` each appeared twice with
-- different preconditions. Both rows' preconditions are preserved.

alter table public.platform_settings
  add column if not exists gate_type text
    check (gate_type is null or gate_type in ('admin', 'admin_setup', 'code'));

alter table public.platform_settings
  add column if not exists preconditions text;

alter table public.platform_settings
  add column if not exists flag_group text;

comment on column public.platform_settings.gate_type is
  'admin = pure runtime toggle. admin_setup = toggle exists but external setup must finish first. code = needs a deploy; not a runtime toggle.';
comment on column public.platform_settings.preconditions is
  'What must be true before this may be turned on. Null means none.';

-- ---------------------------------------------------------------------------
-- Reads. Privileged only: the flag list describes unreleased features, which
-- is not something to publish to every signed-in user.
-- ---------------------------------------------------------------------------
drop policy if exists platform_settings_read on public.platform_settings;
create policy platform_settings_read on public.platform_settings
  for select to authenticated
  using (public.is_privileged(public.current_user_id()));

-- ---------------------------------------------------------------------------
-- A CODE-gated flag is not a runtime toggle
-- ---------------------------------------------------------------------------
create or replace function public.reject_code_flag_enablement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.gate_type, 'admin') <> 'code' then
    return new;
  end if;

  if new.value_text is distinct from 'true' then
    return new;
  end if;

  if coalesce(current_setting('app.bypassing_code_flag', true), '') = 'on' then
    return new;
  end if;

  raise exception
    'flag % is CODE-gated and cannot be enabled at runtime. It needs a deploy. See FLAGS.md: %',
    new.key, coalesce(new.preconditions, 'no precondition recorded')
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists platform_settings_code_flag_guard on public.platform_settings;
create trigger platform_settings_code_flag_guard
  before insert or update on public.platform_settings
  for each row execute function public.reject_code_flag_enablement();

comment on function public.reject_code_flag_enablement() is
  'A CODE-gated flag needs a deploy. Refuses to enable one through the application; migrations set app.bypassing_code_flag.';

-- ---------------------------------------------------------------------------
-- Seed. Idempotent, and it never overwrites a value an admin has already set.
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, description, value_type, value_text, gate_type, preconditions, flag_group)
values
  ('learning.progress', 'Progress tracking and resume', 'boolean', 'false', 'admin', null, 'Learner features'),
  ('learning.assessments', 'Quizzes, attempts, grading', 'boolean', 'false', 'admin', 'Question bank seeded; grading types supported', 'Learner features'),
  ('learning.certificates.simple', 'Completion certificate for a learner', 'boolean', 'false', 'admin', 'Template chosen; certificate numbering scheme', 'Learner features'),
  ('learning.certificates.verification', 'Public verify-a-certificate page', 'boolean', 'false', 'admin_setup', 'Verification page deployed; revocation policy written; token format fixed', 'Learner features'),
  ('learning.discussion', 'Per-lesson questions and replies', 'boolean', 'false', 'admin', 'Moderation policy; who answers (teacher vs. peers); abuse handling', 'Learner features'),
  ('learning.offline', 'Download lessons for offline use', 'boolean', 'false', 'code', 'Download entitlement rules; protected media decision; device storage limits; expiry', 'Learner features'),
  ('learning.paths', 'Structured multi-course learning paths', 'boolean', 'false', 'admin', 'Path content authored', 'Learner features'),
  ('learning.audience_sections', 'Separate Young Learners and Adult Learner entry experiences', 'boolean', 'false', 'admin', 'Learner switcher designed — a parent who also studies must move between their own learning and a child''s', 'Learner features'),
  ('learning.age_bands', 'Age-band navigation inside Young Learners', 'boolean', 'false', 'admin', 'Bands chosen. Use `age_band`, **not** dates of birth', 'Learner features'),
  ('learning.subject_nav', 'Hierarchical subject browsing in the catalogue', 'boolean', 'false', 'admin', '`subject_areas` taxonomy populated — this is catalogue infrastructure, not governance', 'Learner features'),
  ('learning.reviews', 'Learner ratings and reviews on courses', 'boolean', 'false', 'admin', '**Table does not exist.** Satisfaction signal only — **never a substitute for scholarly review**. Needs a moderation policy', 'Learner features'),
  ('learning.previews', 'Free preview lessons before enrolment', 'boolean', 'false', 'admin', 'Which lessons are free is per course version; interacts with entitlement checks', 'Learner features'),
  ('learning.badges', 'Bestseller and rating badges in the catalogue', 'boolean', 'false', 'admin', 'Threshold rules; must not imply scholarly endorsement', 'Learner features'),
  ('learning.notes_bookmarks', 'Notes, bookmarks, transcripts', 'boolean', 'false', 'admin', '**Tables do not exist yet** — listed as a feature, never designed', 'Learner features'),
  ('learning.assignments', 'Marked homework separate from quizzes', 'boolean', 'false', 'admin', '**Table does not exist yet** — grading workflow for assignments undesigned', 'Learner features'),
  ('learning.wishlist', 'Saved courses to buy later', 'boolean', 'false', 'admin', '**Table does not exist.** Only meaningful once `commerce.checkout` is on', 'Learner features'),
  ('learning.multi_language', 'Interface and content in more languages', 'boolean', 'false', 'code', 'Translation workflow; per-locale content; RTL support; who translates', 'Learner features'),
  ('learning.ai_support', 'Safeguarded AI study help', 'boolean', 'false', 'code', 'Safeguarding policy; provider chosen; cost ceiling; **must refuse to issue rulings and refer to a teacher**', 'Learner features'),
  ('learning.ai_quiz_gen', 'Generate quiz questions from lesson transcripts', 'boolean', 'false', 'admin_setup', 'Provider and cost ceiling; teacher reviews every generated question before use', 'Learner features'),
  ('learning.recitation', 'Qur''an recitation feedback', 'boolean', 'false', 'code', 'Quranic ASR accuracy validated; **start with letter-level makharij on short surahs only** — a wrong correction on religious content is worse than none', 'Learner features'),
  ('learning.hifz', 'Memorisation tracker with spaced repetition', 'boolean', 'false', 'admin', 'Revision schedule and decay model designed. Best value on the premium list', 'Learner features'),
  ('learning.ijazah', 'Verified chain of transmission', 'boolean', 'false', 'code', 'Extends `certificates`; needs teacher authorisation rules and a public chain view', 'Learner features'),
  ('learning.provenance', 'Source citations shown on every lesson', 'boolean', 'false', 'admin', '`content_sources` **already exists** — needs a UI, not a schema', 'Learner features'),
  ('learning.quran_sync', 'Ayah-synchronised audio and text', 'boolean', 'false', 'admin', 'Timing dataset licensed or generated', 'Learner features'),
  ('companion.prayer_tools', 'Prayer times, qibla, dhikr counter, adhkar', 'boolean', 'false', 'admin', 'Location handling and privacy; calculation method choice', 'Learner features'),
  ('companion.ayah_daily', 'Ayah of the day with audio and tafsir', 'boolean', 'false', 'admin', 'Content sourcing and translation licensing', 'Learner features'),
  ('companion.parent_report', 'Weekly parent progress report', 'boolean', 'false', 'admin_setup', 'Channel chosen — **WhatsApp, not email, for East Africa**; consent and frequency rules', 'Learner features'),
  ('companion.tracing', 'Arabic letter tracing for young learners', 'boolean', 'false', 'admin', 'Interaction design for the 5–8 bracket', 'Learner features'),
  ('platform.calendar', 'Hijri dates, Ramadan mode, regional prayer calculation', 'boolean', 'false', 'admin', 'Calculation method per region; Hijri date source; Ramadan content collections', 'Learner features'),
  ('platform.safeguarding', 'Child protection: conduct policy, screening, reporting route', 'boolean', 'false', 'code', '**Nothing exists.** Named responsible person; screening policy; reporting workflow; teacher-learner contact rules', 'Learner features'),
  ('platform.legal', 'Terms, privacy, child policy, refund policy, content licence', 'boolean', 'false', 'code', '**Nothing exists.** GDPR/UK GDPR, COPPA, Uganda DPA 2019, Kenya DPA, Nigeria NDPR', 'Learner features'),
  ('platform.incident', 'Breach detection, response and notification', 'boolean', 'false', 'code', '72-hour GDPR notification; owner; runbook; templates', 'Learner features'),
  ('platform.takedown', 'Copyright and content takedown notices', 'boolean', 'false', 'code', 'Notice process; counter-notice; repeat-infringer policy', 'Learner features'),
  ('platform.search', 'Course and lesson search', 'boolean', 'false', 'admin', '**No search infrastructure designed.** Postgres FTS or a dedicated index — `LIKE` will not survive a real catalogue', 'Learner features'),
  ('platform.terms_versioning', 'Versioned terms with recorded acceptance', 'boolean', 'false', 'code', '**Nothing exists.** Must store which version each user accepted, with a timestamp', 'Learner features'),
  ('platform.age_assurance', 'Age checks gating the child model and COPPA', 'boolean', 'false', 'code', '**Nothing exists.** Method undecided', 'Learner features'),
  ('platform.data_export', 'Learner data portability / export', 'boolean', 'false', 'code', 'GDPR right; cheaper to design than retrofit across 85 tables', 'Learner features'),
  ('platform.account_merge', 'Merge duplicate accounts', 'boolean', 'false', 'code', 'A parent will create two accounts', 'Learner features'),
  ('platform.withdrawal_right', 'EU 14-day withdrawal handling at checkout', 'boolean', 'false', 'code', 'Statutory right on digital content; needs explicit waiver wording for content started immediately', 'Learner features'),
  ('platform.email_auth', 'SPF / DKIM / DMARC and deliverability', 'boolean', 'false', 'admin_setup', '**Nothing exists.** Resets and receipts land in spam without it', 'Learner features'),
  ('platform.phone_format', 'E.164 storage and per-country formatting', 'boolean', 'false', 'code', '**Nothing exists.** International OTP breaks without normalisation', 'Learner features'),
  ('platform.cost_controls', 'Storage quotas per teacher and spend alerts', 'boolean', 'false', 'admin', '**Nothing exists.** Unlimited teacher uploads is how $250/month becomes $3,000', 'Learner features'),
  ('platform.moderation', 'Moderation of per-lesson discussion', 'boolean', 'false', 'admin_setup', '**Policy before feature.** Sectarian/contentious threads on fiqh topics; who reviews; escalation', 'Learner features'),
  ('platform.accessibility', 'RTL, Arabic typography, screen readers, dyslexia-friendly fonts', 'boolean', 'false', 'code', '`rtl: 0` today; font licensing (Uthmani/naskh)', 'Learner features'),
  ('family.profiles', 'Parent creates child profiles', 'boolean', 'false', 'admin', null, 'Children and families'),
  ('family.guardian_verification', 'Manual review of guardians', 'boolean', 'false', 'admin_setup', 'Evidence handling defined; retention policy; **your own review capacity** — this is a human queue', 'Children and families'),
  ('family.child_login', 'Child has their own login', 'boolean', 'false', 'code', 'Trusted linking workflow; safeguarding; age assurance; retention for child data', 'Children and families'),
  ('family.plans', 'Family plan with included child slots', 'boolean', 'false', 'admin_setup', 'Slot pricing; reduction rules; payments on', 'Children and families'),
  ('family.adult_shares', 'Adult learner shares progress with someone', 'boolean', 'false', 'admin', 'Scope model; revocation UI; privacy disclosure text', 'Children and families'),
  ('family.engagement', 'Badges, streaks, visible progress for children', 'boolean', 'false', 'admin', 'Mechanics actually designed — currently `gamif: 0`, `badge: 0`, `streak: 0`', 'Children and families'),
  ('teaching.invites', 'You invite a teacher', 'boolean', 'false', 'admin', null, 'Teaching'),
  ('teaching.authoring', 'Teacher builds and publishes a course', 'boolean', 'false', 'admin', 'Authoring flow tested by a real teacher; media upload limits', 'Teaching'),
  ('teaching.dashboard', 'Teacher sees their courses and learners', 'boolean', 'false', 'admin', null, 'Teaching'),
  ('teaching.qa_capacity', 'Limits or queueing on per-lesson questions', 'boolean', 'false', 'admin', 'A teacher with an audience behind them will be overwhelmed without it', 'Teaching'),
  ('teaching.public_profile', 'Public instructor page with bio, qualifications and courses', 'boolean', 'false', 'admin', '**Does not exist.** `reviewer_profiles` is internal, not public. This is where a teacher sends their own audience', 'Teaching'),
  ('teaching.set_pricing', 'Instructor sets price within a platform floor and ceiling', 'boolean', 'false', 'admin_setup', 'Floor/ceiling per market; interacts with `prices`; blocked on the same facts as checkout', 'Teaching'),
  ('teaching.invite_links', 'Shareable link with attribution to the teacher', 'boolean', 'false', 'admin', 'Attribution model; UTM handling; abuse limits. **The growth engine — teachers already have audiences**', 'Teaching'),
  ('teaching.content_licence', 'Who owns uploaded content and what licence the platform holds', 'boolean', 'false', 'code', '**Nothing exists.** Written agreement needed before the first teacher uploads', 'Teaching'),
  ('teaching.screening', 'Teacher screening and conduct acknowledgement', 'boolean', 'false', 'code', 'Screening policy; record retention; who verifies', 'Teaching'),
  ('teaching.peer_review', 'One other teacher reviews before publish', 'boolean', 'false', 'admin', 'Who reviews; what happens on disagreement', 'Teaching'),
  ('teaching.panel', 'Scholarly panel with quorum and voting', 'boolean', 'false', 'code', 'Quorum policy; voting rules; conflict declarations; appeals. **Currently open — do not build until decided**', 'Teaching'),
  ('teaching.applications', 'Open applications to teach — unknown teachers apply', 'boolean', 'false', 'code', 'Currently a curated cohort by decision. **Build the queue, keep it closed** — cheapest way to preserve the option. Needs a vetting process, terms for teachers, and rejection handling', 'Teaching'),
  ('teaching.payouts', 'Teachers earn and get paid', 'boolean', 'false', 'code', 'Revenue share decided; payout provider; tax treatment; minimum thresholds; dispute process', 'Teaching'),
  ('commerce.free', 'Free courses, no payment', 'boolean', 'false', 'admin', null, 'Money'),
  ('commerce.checkout', 'Paid enrolment', 'boolean', 'false', 'admin_setup', '**Provider chosen and account approved**; sandbox passing; jurisdiction decided; tax/invoicing decided; refund policy written', 'Money'),
  ('commerce.mobile_money', 'MTN MoMo / Airtel Money', 'boolean', 'false', 'admin_setup', 'Provider agreement; sandbox tests; callback verification; settlement terms', 'Money'),
  ('commerce.subscriptions', 'Monthly and annual plans', 'boolean', 'false', 'admin_setup', 'Plan terms; grace period by market; renewal and proration policy; dunning', 'Money'),
  ('commerce.promotions', 'Discount campaigns', 'boolean', 'false', 'admin', 'Eligibility rules; stacking rules; abuse limits', 'Money'),
  ('commerce.refunds', 'Refund requests and decisions', 'boolean', 'false', 'admin_setup', 'Approval authority limits; escalation path; entitlement effect of a refund', 'Money'),
  ('commerce.referrals', 'Referral rewards', 'boolean', 'false', 'code', 'Fraud rules; reward accounting; payout of rewards', 'Money'),
  ('commerce.institutions', 'Madrasahs, Islamic schools and organisations buying seats', 'boolean', 'false', 'code', 'Invoicing; bulk enrolment; B2B terms; purchase orders. **Not in the project record at all**', 'Money'),
  ('commerce.sponsorship', 'Zakat / sadaqah sponsoring a learner''s seat', 'boolean', 'false', 'code', 'Eligibility rules; donor receipts; whether it counts as zakat needs a scholar''s ruling', 'Money'),
  ('commerce.scholarships', 'Funded and free seats', 'boolean', 'false', 'admin', 'Allocation rules; who approves; renewal', 'Money'),
  ('institution.branding', 'Co-branded or white-label for a partner institution', 'boolean', 'false', 'code', 'Trademark permission; theming; separate domain', 'Money'),
  ('institution.reporting', 'Per-institution progress reporting', 'boolean', 'false', 'code', 'Aggregation and privacy rules for minors', 'Money'),
  ('institution.api', 'Public API and webhooks for institutional integrations', 'boolean', 'false', 'code', 'API keys, rate limits, versioning, documentation', 'Money'),
  ('institution.sso', 'SAML / OIDC for institutional staff', 'boolean', 'false', 'code', 'Identity provider support; account linking', 'Money'),
  ('delivery.live_classes', 'Live teaching sessions', 'boolean', 'false', 'code', 'RTC provider; scheduling and timezones; recording policy; moderation', 'Delivery'),
  ('delivery.analytics', 'Reporting beyond basics', 'boolean', 'false', 'code', 'Event instrumentation; storage and retention; privacy review', 'Delivery'),
  ('delivery.notifications', 'Email / push / SMS', 'boolean', 'false', 'admin_setup', 'Sender domains verified; provider chosen; consent and frequency rules', 'Delivery'),
  ('auth.email_password', 'Email + password sign-in', 'boolean', 'false', 'admin', 'Email sender verified; reset flow', 'Platform'),
  ('auth.phone_otp', 'Phone number + OTP sign-in', 'boolean', 'false', 'admin_setup', 'SMS provider chosen; **cost per message confirmed for each launch market**; OTP used at registration and recovery only, never per login', 'Platform'),
  ('platform.support', 'Support cases and replies', 'boolean', 'false', 'admin', '**`support_cases` table does not exist** — 7 endpoints reference it', 'Platform'),
  ('platform.admin_settings', 'The admin dashboard itself', 'boolean', 'false', 'admin', 'Must be built **first** — everything else depends on it', 'Platform'),
  ('platform.audit', 'Audit log of privileged actions', 'boolean', 'false', 'admin', null, 'Platform'),
  ('platform.maintenance_mode', 'Read-only mode', 'boolean', 'false', 'admin', null, 'Platform')
on conflict (key) do update
  set description   = excluded.description,
      gate_type     = excluded.gate_type,
      preconditions = excluded.preconditions,
      flag_group    = excluded.flag_group;

comment on table public.platform_settings is
  'The enable-it-later layer. value_text is the switch; gate_type and preconditions come from FLAGS.md and say whether flipping it is even allowed.';
