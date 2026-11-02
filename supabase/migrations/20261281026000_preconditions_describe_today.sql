-- Ten preconditions that described a platform that no longer exists.
--
-- The 2026-11-02 rule — *a precondition is a description of the software as it is
-- today* — was applied to three rows that morning (promotions, the storage quota,
-- lesson search) and left ninety-odd unread. This migration reads ten of them
-- against the tree. It is the same work as `20261281024000`, which corrected the
-- two rows that had been caught by hand, and it is done in one file because the
-- defect is one defect.
--
-- The sentences below are shorter than the ones that were there. That is not
-- laziness: the old text was longer because it was guessing, and a guess has to
-- describe a design that does not exist. What replaced it names a table, a
-- function, a constraint or a route that a test now opens and checks.
--
-- Six rows are kept and re-said. Four are removed, because their true sentence is
-- "there is nothing here to switch": the feature shipped, it is on for everybody,
-- and a row that says otherwise tells the owner a control exists that does not.

-- ---------------------------------------------------------------------------
-- 1. `platform.admin_settings` — "Must be built **first**" — removed.
--
-- It was built first, in the week of 2026-10-24, and it is not a feature that can
-- be off: `/admin` is the switchboard every other row in this table is flipped
-- from, `/admin/settings` writes the controls, and `/api/admin/flags` writes this
-- table. A switch that could turn the switchboard off has no off state, and a row
-- describing one is a row that describes nothing.
--
-- This is the row `FLAGS.md` calls the critical path, and it is worth being plain
-- that the path is finished: the note it belongs to stays in `FLAGS.md`, and the
-- key does not.
delete from public.platform_settings where key = 'platform.admin_settings';

-- ---------------------------------------------------------------------------
-- 2. `learning.certificates.simple` — "Template chosen; certificate numbering
-- scheme" — removed.
--
-- Both were done: `certificate_number_seq` numbers every certificate
-- (`20261017000600_certificates.sql`), the template is `certificate_template_version`
-- on the course version, and certificates have been issuable since. But the real
-- gate was never this key — it is **per course**: `certificate_enabled` on
-- `course_completion_policies`, refused inside `issue_certificate()` when the
-- course does not offer one, with a database constraint that a course may not
-- enable certificates without naming a template. One platform-wide switch over a
-- per-course control is a second, weaker answer to a question already answered.
delete from public.platform_settings where key = 'learning.certificates.simple';

-- ---------------------------------------------------------------------------
-- 3. `learning.certificates.verification` — "Verification page deployed;
-- revocation policy written; token format fixed" — removed.
--
-- All three landed, and there is no token: the certificate number *is* the
-- capability. `/verify` is the front door for a stranger holding a printed
-- certificate, `/verify/[number]` is the canonical page, revocation is a status
-- with `revoked_at`, `revoked_by` and a required reason, and the page says so in
-- words rather than showing a bare "invalid". Nothing reads this key, and a
-- verification page that could be switched off is a claim the platform retracts.
delete from public.platform_settings where key = 'learning.certificates.verification';

-- ---------------------------------------------------------------------------
-- 4. `teaching.authoring` — "Authoring flow tested by a real teacher; media
-- upload limits" — removed.
--
-- The limits were the reason this row existed and both are enforced: 8 GiB per
-- file (`MAX_UPLOAD_BYTES`, which the browser refuses to exceed and the RPC
-- checks again) and 50 GB per account (`media.upload_quota_gb_per_teacher`,
-- enforced by `assert_media_upload_allowed()` before a byte moves). Authoring
-- itself ships — `/teach/new-course`, the curriculum editor, sections, lessons,
-- media — and is not something an owner should be able to withdraw from teachers
-- who already have courses. What remains of the old sentence is *"tested by a real
-- teacher"*, which is not a precondition for a switch; it is a fact about the
-- first courses, and it lives in `docs/remaining.md` where the first-release
-- scope is decided.
delete from public.platform_settings where key = 'teaching.authoring';

-- ---------------------------------------------------------------------------
-- 5. `learning.provenance` — "`content_sources` already exists — needs a UI".
update public.platform_settings
   set preconditions = 'None: the mechanism and the UI both exist. `content_sources` records where a lesson''s material came from, `/api/teach/provenance` adds and removes a source from a lesson, the curriculum editor on `/teach/[courseId]` is where an author enters it, and the learner''s lesson page shows the line when this is on. Off, the line is hidden and every record is kept, so this is a display switch over data that is already being written'
 where key = 'learning.provenance';

-- ---------------------------------------------------------------------------
-- 6. `learning.audience_sections` — "Learner switcher designed".
--
-- It was never the learner switcher, and the learner switcher does not exist. What
-- this key does is decide whether the shelf is presented **by audience**: `/adults`,
-- `/young` and the family and catalogue sections that link to them. All three are
-- built, and while this is off every one of them redirects to `/catalogue` rather
-- than showing a half-page. What a parent who also studies gets is a label on each
-- enrolment saying whose it is — `showLearner` on `/learn`, which is not this key
-- and does not need it — so the two things the old sentence ran together are one
-- built feature and one absent one.
update public.platform_settings
   set preconditions = 'None: the doors are built and ship off. `/adults`, `/young` and the family section of `/catalogue` all redirect to `/catalogue` while this is off, so turning it on is the whole change. It is not the learner switcher and never was — a parent who also studies sees a label on each enrolment saying whose it is, which needs no switch. What an owner is deciding by turning this on is whether the shelf is presented by audience at all'
 where key = 'learning.audience_sections';

-- ---------------------------------------------------------------------------
-- 7. `learning.age_bands` — "Bands chosen. Use `age_band`, **not** dates of birth".
--
-- Half of that was already the best sentence in the register. The other half did
-- not say where the bands were chosen, so it read as a decision still to take.
update public.platform_settings
   set preconditions = 'None: the bands are five and they are a check constraint — `5-7`, `8-10`, `11-13`, `14-17`, `18+` on `learner_profiles` (`20261015000500`), so a sixth is a migration rather than a typo, and a child cannot be stored without one. What the switch adds is the band chips on `/young`, which needs `learning.audience_sections` on first. No date of birth is stored anywhere: the band is the only age fact this platform keeps'
 where key = 'learning.age_bands';

-- ---------------------------------------------------------------------------
-- 8. `platform.data_export` — "GDPR right; cheaper to design than retrofit
-- across 85 tables".
--
-- The table count was the least wrong thing in it. An earlier unit already said
-- the export deliberately does *not* sit behind this switch — a right behind a
-- switch that ships off is not a right — but the precondition never caught up, and
-- two parts of it have since shipped.
update public.platform_settings
   set preconditions = 'What this gates is the part still unbuilt, not the right itself. Shipped and unconditional: the JSON export at `/api/account/export`, the same document as CSV at `?format=csv`, a print view, and `restore_my_data()`, which puts back the things a person wrote — preferences, notes, bookmarks — and says in the document what it left behind and why. What is left is a **PDF** rendering. Import of a stranger''s file stays refused on purpose: mapping somebody else''s rows into courses and enrolments is inventing records, and the one import that shipped is a teacher''s own outline, which is a draft they then own'
 where key = 'platform.data_export';

-- ---------------------------------------------------------------------------
-- 9. `delivery.analytics` — "Decide who reads the report. The vocabulary records
-- catalogue search terms".
--
-- Decided, built and enforced — and the second sentence was about a different
-- question that has its own row.
update public.platform_settings
   set preconditions = 'Decided and enforced: **platform staff** read it. `analytics_event_codes`, `record_analytics_event()` and the report functions refuse anyone else by name — "only platform staff may read analytics" — and `/admin/analytics` sends a non-privileged session home rather than showing counts. The cohort page reads it for a teacher''s own course through the same rule. Nothing is waiting on a decision; what a catalogue search term is recorded *for* is `learning.lesson_search`, a different row'
 where key = 'delivery.analytics';

-- ---------------------------------------------------------------------------
-- 10. `learning.ai_support` — "Safeguarding policy; provider chosen; cost
-- ceiling; **must refuse to issue rulings and refer to a teacher**".
--
-- The last clause was the whole design, and it was built: the answer is a lesson
-- to open, never a judgement. Everything else in the sentence is about a provider
-- this feature does not have and does not need.
update public.platform_settings
   set preconditions = 'Built, and it needs no provider. `ai_support_ask()` is retrieval-only: it cites a lesson the caller may open, refuses a ruling-shaped question by sending it to a teacher, answers nothing when no lesson matches, and never generates text — so there is no model, no key and no invoice. `ai_support_summary()` is what the owner reads, and `ai_support_questions` records every question. Still open, and it is a decision rather than a build: whether a model is ever added behind it (D8 in `docs/remaining.md`)'
 where key = 'learning.ai_support';

comment on table public.platform_settings is
  'Every feature, behind a switch, with the written precondition it is waiting for. One decision has one row, a row that claims it is ready must be read by code, and a precondition describes the software as it is today — a row that names a design nobody built sends the next reader to build it.';
