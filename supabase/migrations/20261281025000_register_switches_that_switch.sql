-- A switch that changes nothing is a lie in the one screen the owner trusts.
--
-- Seven rows in this register carried no written precondition. `FLAGS.md` states
-- its own rule in the plainest terms — a flag with no written precondition is a
-- bug waiting to be enabled — and `flags.test.mjs` holds the document and the
-- table to each other, so two rows could agree with each other and both be wrong.
-- Nothing ever compared either of them with the software. On 2026-11-02 each of
-- the seven was checked against the tree, one at a time, and the answers split
-- three ways: one gates something and needed the truth written down, one names
-- work that was never started, and five name work that shipped, under another
-- switch or with no switch at all.
--
-- The rule this migration adopts, and that `register_truth.test.mjs` now holds:
-- a flag may be unread only while its precondition says what is missing. A row
-- that claims it is ready — "None…", the register's own word — must be read by
-- code, because that is the row an owner flips first and the one that reads as a
-- broken platform when nothing happens. Six of the seven below failed that, and
-- the fix for each was to remove the row rather than reword it.

-- 1. One row stays, with the sentence it should always have had.
--
-- `learning.progress` is the only one of the seven that code reads. It is a
-- **UI gate and nothing more**: `record_lesson_position()` writes the position
-- whether or not the flag is on, and every learner's place is kept regardless.
-- What goes away when it is off is the continue-where-you-left-off card on
-- `/learn`, the progress bar and the "N of M lessons" line on a course card, and
-- the progress block on an enrolment page. So switching it off hides a screen
-- somebody was using while their data stays intact — which is a reasonable thing
-- for an owner to do, and a very unreasonable thing to do without knowing.
update public.platform_settings
   set preconditions = 'None for the data: `record_lesson_position()` stores where a learner stopped whether the flag is on or off, so no position is lost and switching it on shows progress that already exists. It is a UI gate only. Off hides the continue-where-you-left-off card on `/learn`, the progress bar and the lesson count on each course card, and the progress block on an enrolment page. Nothing in the database reads this key, and nothing refuses a learner because of it'
 where key = 'learning.progress';

-- 2. `commerce.free` — "Free courses, no payment".
--
-- Nothing to switch. `'free'` is already a value of an enrolment's `source`
-- (`20261017000100_enrolments.sql`), the enrolment code sets it when a course is
-- taken without money (`web/src/lib/enrolment.ts`), and a course's price is its
-- own column. A free course is a price, not a mode of the platform. An owner
-- flipping this in the dashboard would have found that courses were already free
-- when priced at zero, and the switch would have done nothing.
delete from public.platform_settings where key = 'commerce.free';

-- 3. `family.profiles` — "Parent creates child profiles".
--
-- Shipped, and always on. `20261281003400_child_login.sql` lets a guardian
-- reserve a login for a child, `may_manage_child_profile()` decides who may
-- manage one, and the guardian screen at `/guardian` is where it happens. It is
-- also the wrong kind of thing to be behind a switch: the 2026-10-30 decision
-- (children have guardian-created logins) means a parent must be able to do this,
-- and a switch that could take it away is not a feature gate but a custody
-- question. No code has ever read this key.
delete from public.platform_settings where key = 'family.profiles';

-- 4. `teaching.dashboard` — "Teacher sees their courses and learners".
--
-- `/teach` is that dashboard and has been for weeks: `fetchMyCourses()`, the
-- screening sentence, the takedown answer, the conduct card, the ijazah card, the
-- media, earnings, payouts, promotions and paths screens all hang off it. A
-- teacher who lost their own course list would not have a product. No code has
-- ever read this key, and the two flags that do gate the teacher's view of
-- learners — `delivery.analytics` and `teaching.panel` — are the ones with rows
-- worth keeping.
delete from public.platform_settings where key = 'teaching.dashboard';

-- 5. `teaching.invites` — "You invite a teacher".
--
-- The second name for a decision that already has one. `teaching.invite_links`
-- is the switch for invitations and is the one the invitation table, the refusal
-- rules and `/teach/promotions` were built against. Two keys for one decision is
-- the defect `20261281003300_retire_screening_flag.sql` removed for screening:
-- the owner reads both, they disagree, and neither can be trusted. This is the
-- duplicate, so this is the row that goes.
delete from public.platform_settings where key = 'teaching.invites';

-- 6. `platform.audit` — "Audit log of privileged actions".
--
-- Not built, at any layer: there is no audit table in the schema, no writer on
-- any privileged mutation, and no screen. The register's purpose is to record
-- what is waiting, and that argument would keep the row — except that the row
-- carried no precondition, so it said nothing about what was waiting. A switch
-- that reads as a control an owner can reach for during an incident, and that
-- would write nothing and change nothing, is worse than an absence. The intent is
-- recorded where intents belong (`docs/remaining.md`) and the row is removed.
delete from public.platform_settings where key = 'platform.audit';

-- 7. `platform.maintenance_mode` — "Read-only mode".
--
-- Same reasoning, with one difference worth writing down: the operator genuinely
-- wants this — a read-only mode you can turn on *before* a migration rather than
-- after it — and it still does not exist. Every write in this platform goes
-- through PostgREST and RPC, so the only place a real read-only mode could be
-- enforced is in the database, by revoking insert/update/delete across the schema
-- for the duration and putting it back afterwards, or by a session setting every
-- policy consults; and it needs a way to turn it off that does not depend on the
-- database being writable. That is a design, not a toggle, and it is written up
-- in `docs/remaining.md` so it is not lost. Until then the row is a promise the
-- dashboard cannot keep.
delete from public.platform_settings where key = 'platform.maintenance_mode';

-- 8. `platform.terms_versioning` — "Versioned terms, with recorded acceptance".
--
-- Not one of the seven, and found by the new check rather than by reading. Its
-- precondition said "None for the mechanism: built 2026-10-27", which is true —
-- `policy_versions`, `policy_acceptances`, `accept_policy()` and the refusal in
-- `approve_policy_version()` all ship and are all unconditional — but no line of
-- code reads the key. So it is the same defect in its most dangerous form: a row
-- that tells the owner the feature is ready, is correct about the feature, and
-- still does nothing when flipped. The mechanism is on for everybody; there is no
-- gate to hold. If a future decision needs terms acceptance to be switchable, it
-- will be a new key with a new row.
delete from public.platform_settings where key = 'platform.terms_versioning';

comment on table public.platform_settings is
  'Every feature, behind a switch, with the written precondition it is waiting for. One decision has one row, and a row that claims it is ready must be read by code: a switch that changes nothing is worse than a missing one, because the owner flips it and believes the platform is broken.';
