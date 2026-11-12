# ROADMAP

The master checklist — all **59** tasks, reconciled against what already exists.

This replaces the raw 8-phase list. Nothing was removed; every task is here,
marked with its real state so we never redo finished work or build on sand.

- `[x]` **DONE** — already settled or designed. Evidence in brackets.
- `[~]` **PART** — started, incomplete. What's missing is named.
- `[ ]` **TODO** — ready to start now.
- `[!]` **BLOCKED** — cannot be finished without a fact or a decision.
- `[X]` **CONFLICT** — contradicts a recorded decision. Resolve before doing it.

**Progress: 25 done · 21 part · 7 todo · 6 blocked · 0 conflict  (59 total)**

Every count above was re-measured on 2026-11-02 from the marks in this file, and
every technical figure from the tree — the migrations, the running schema, the
App Router and the two test suites. The previous line said *11 done · 9 part ·
16 todo · 13 blocked · 4 conflict (53 total)*, which was wrong about the total
before it was wrong about the split: the checklist had grown to 59 rows and the
header had not. The five conflict rows are resolved below, each with the date of
the decision that ended it and where that decision is recorded.

**A number in this file is a measurement with a date, not a memory.** Where a
figure appears without a date it is the 2026-11-03 reading: 164 ordinary public
tables, 283 policies, 80 flags and 18 controls, 128 page routes and 117 route
handlers. The current tree has 340 migrations. Before migration 600,
the database suite passed 2 598 assertions in 170 suites; after migrations 600–650,
58 focused child-login, handover, flag and RPC-contract checks passed. The full database rerun was invalidated by concurrent source changes and remains pending.
The web suite passed 2 072 tests.

---

## Phase 1 — Define the project  (5/6 done)

- [x] Confirm the platform's purpose and target users — *DECISIONS.md: children and adults, Islamic faith, worldwide*
- [x] Define young learner and adult learner experiences — *project record `learner_type`, `courses.audience`; SCREENS.md §3–4*
- [x] List all user roles and permissions — *10 roles, matrix derived from the migrations and enforced by `supabase/tests/authorization.test.mjs`. See `docs/decisions/authorization-matrix.md`.*
- [x] Finalize the full feature requirements — **80 flags and 18 controls in FLAGS.md, each with a precondition that describes the software as it is today** (measured 2026-11-02; the row said 47, which was the count on 2026-10-15). Eleven were retired on 2026-11-02 — seven with no written precondition, four whose features had shipped — because a switch nothing reads is a promise rather than a feature
- [x] Choose a distinctive platform name — *AyahSpring. Trademark/domain clearance still open.*
- [ ] **Define the first release scope and success criteria** ← **the only open Phase 1 task**

## Phase 2 — Design and technical planning  (3/6 done)

- [~] Create the visual identity and design system — **colour settled: white and green. Tokens in `web/src/app/globals.css`. The mark is one eight-pointed star in `web/src/lib/brand.ts`, used by the header, favicon, app icon, share card, certificate and receipt. Type and illustration still open**
- [~] Design the key web and mobile screens — **every screen in the plan is now built, and the inventory is the app.** `SCREENS.md` holds the rows, the routed count and the four screens still unbuilt (1 ready to design, 4 blocked). The row said *50 screens inventoried, 0 designed; 38 are unblocked*, which describes a plan made before the pages existed
- [x] Choose the programming languages and frameworks — *Next.js + TypeScript, Supabase/PostgreSQL, Expo/React Native*
- [x] Design the database and backend architecture — **159 tables in `public`, row-level security on every one, 282 policies, 610 functions, modular monolith** (measured 2026-11-02). The row said *85 tables, 121 endpoints*: the table count was the day-one plan, and 121 was **app routes** — pages and route handlers together — measured on 2026-10-22, not the page count it was later quoted as
- [~] Plan security, backups and child privacy — **RLS is complete: 159 tables, all covered, all ten of the record's required access tests enforced. Retention and RPO/RTO still open**
- [x] Set up the development environment and Git repository — **Node 22 workspaces (`npm ci` at the root installs the web app), PGlite for the database suite, and `.github/workflows/ci.yml` running the structural checks, both test suites, typecheck and the production build on every push. No secrets are needed: the suite runs in memory and the build succeeds with no Supabase project configured**

## Phase 3 — Core platform  (4/7 done)

- [x] Build the backend and database — **all five schema groups complete. 159 tables, RLS on every one, 282 policies, 610 functions, 2 530 assertions in 168 suites passing (`npm run test:db`).** Measured 2026-11-02; the figures in the original row were the reading on the day it was written. The API and application layer follow.
- [~] Build registration, login and password recovery — *email/password sign-up, sign-in and recovery are live; phone OTP can now be requested and verified in-app. Live email/SMS delivery and callback allowlists still need a configured Supabase project.*
- [x] Implement user roles and permissions — *capability-based, not role-based. 10 roles, 4 privileged, 16 capability functions. Three real defects found and fixed in `20261021000100_authz_fixes.sql`.*
- [~] Build user profiles and account settings — *`/account` edits display name, preferred language and IANA time zone through the session-scoped RLS policy; email password recovery and phone OTP sign-in are available, while sign-in address changes and wider profile fields remain.*
- [x] Build the course catalogue, search and course pages — *`/catalogue` and `/courses/[slug]`. `subject_areas` seeded with 9 disciplines and 26 subdivisions. `supabase/tests/catalogue.test.mjs`.*
- [x] Build the help desk — *`/support` for the person asking, `/support/<caseNumber>` for the thread, `/admin/support` for the queue. `support_cases` and `support_case_messages` with session-bound writer functions, staff-only internal notes, and an audited state machine. `platform.support` ships off. `supabase/tests/support_cases.test.mjs`.*
- [!] Set up file storage, video delivery and deployment — *storage is chosen: Cloudflare R2 for masters and delivery (D8, 2026-10-20), costed at `docs/decisions/media-storage-costing.md`; Stream is declined because it cannot return an original upload. The software is now all here: a teacher uploads at `/teach/media` straight to R2 with a browser-computed checksum, a transcode worker exists at `web/src/worker/transcode-worker.ts` behind `delivery.transcode`, and `/api/media/playback` and `/api/media/download` serve a learner from the lesson page. **Deployment is what is missing**, not code: no R2 credentials, no host running the worker with ffmpeg, and no staff account for it — so nothing has run and no rendition exists yet. The staff actions are built: verify an upload at `/admin/media`, which asks storage whether the bytes arrived before anything is confirmed, and retry a copy that failed to encode from the same screen. See the half-built ledger in `NEXT.md`.*

## Phase 4 — Learning systems  (5/12 done)

- [~] Build course sections and lessons — *teacher course/version/section/lesson authoring, ordering, and learner pages are live; the provider is decided (Cloudflare R2, 2026-10-20, costed at `docs/decisions/media-storage-costing.md`) and the ingest half is built: `/api/media` registers an upload and returns a signed direct-to-R2 URL, with the object `pending` until a privileged confirmation. Transcode, playback and a teacher upload screen are not.*
- [~] Build the video/audio lesson player — *native playback for direct HTTPS MP4/WebM/OGV and MP3/M4A/AAC/OGG/WAV/FLAC resources; first-party media now has the worker that encodes a master — `web/src/worker/transcode-worker.ts`, gated by `delivery.transcode`, planning a ladder from what ffprobe actually finds and writing through `register_media_rendition()`/`confirm_media_rendition()` — and a learner-facing player now exists — `/api/media/playback` signs a short-lived rendition URL, the lesson page plays it with a quality selector that defaults to 480p, and `/api/media/download` saves one behind `learning.offline` — but no rendition exists to serve until the worker is deployed, and masters are never served directly.*
- [x] Track lesson progress and course completion — *`/learn` and `/learn/[enrolmentId]`, `POST /api/progress`. Progress pinned to the enrolled version; completion derived, never stored. `supabase/tests/progress.test.mjs`.*
- [x] Build quizzes, assessments and results — *`/learn/[enrolmentId]/assessment/[assessmentId]`, `POST /api/assessment`, and authoring tools in `/teach/<courseId>`. Automatic single/multiple-choice and true/false, attempt limits; identity-checked submission and server-side auto-grading; anonymized, course-author/staff manual-answer queue with audited marking and final scoring. Answer keys unreadable by clients; low-level actor-argument grading RPCs revoked. `supabase/tests/assessment.test.mjs`, `supabase/tests/assessment_grading_workflow.test.mjs`.*
- [x] Build marked homework feedback — *`assessment_responses.grading_feedback`, written with the mark and immutable with it; a comment field in the marking queue at `/teach/[courseId]`, and the learner's comments on the assessment page. The audit records that a comment was given, not what it says. `supabase/tests/marking_feedback.test.mjs`.*
- [~] Build dated cohorts and marked assignments — *the user confirmed both self-paced catalogue learning and dated cohorts; cohort tables, version pinning, opt-in join/leave functions, private roster policies, teacher management and learner join/leave screens are built behind `learning.cohorts`, and the late-join rule is settled — each class carries a teacher-set `join_closes_at` defaulting to its start date, movable while the class is a draft or open. Standalone assignments are built beside frozen versions with per-enrolment or absolute cohort deadlines, one private submission per learner, text drafts/hand-in, a late-work choice per task, private scoring/feedback by the author or privileged staff, and a revision loop: a learner reopens marked work, the marked version is snapshotted append-only, and the teacher sets the policy per task (on by default, optional version limit, refused past a deadline unless late work is accepted). File references require verified media, and accepted types/caps are encoded, but transfer, scanning and secure delivery/retention are not built — the remaining precondition for both flags. `learning.assignments` and `learning.cohorts` stay off.*
- [~] Build young learner profiles and age-appropriate learning — **profiles designed; engagement mechanics are not** (`gamif: 0`, `badge: 0`, `streak: 0`)
- [~] Build parent/guardian dashboard and controls — *`/family` creates the family, adds child profiles and shows course progress. When `family.guardian_verification` is enabled, the database blocks a child's enrolment until the session guardian is verified with learning permission; evidence handling and review-capacity preconditions still keep the flag off. `supabase/tests/learner_switcher.test.mjs`.*
- [~] Build the adult learning dashboard and learning paths — *`/learn` is the shared learner dashboard; `/paths` and `/paths/[slug]` provide the guided catalogue and personalized required-course progress. Child-profile path progress and adult-specific dashboard refinement remain.*
- [x] Build certificates and certificate verification — *`/admin/certificates` lists eligible completions and supports staff-only issuance and reasoned revocation; client calls are session-bound. Holders can print/save their certificate as PDF from `/certificates/<number>`, and `/verify/<number>` remains public. `supabase/tests/certificates.test.mjs`.*
- [x] Build saved courses — *`course_wishlist` plus `/saved`, a save button on the course page and `POST /api/wishlist`. One row per account per course, owner taken from the session rather than supplied, an optional private note that carries the "who is this for" question so saving stays one tap, a 100-row ceiling, and removal that is not flag-gated so switching the feature off cannot trap a list. `supabase/tests/course_wishlist.test.mjs`.*
- [~] Build lesson notes and bookmarks — *`lesson_notes`/`lesson_bookmarks` plus a private study-tools panel on the lesson page and `POST /api/lesson-study-tools`; the `learning.notes_bookmarks` flag is checked in the database, ownership comes from the session, and a row must match the enrolment's pinned version. Transcripts, which the flag description used to bundle in, are not built. `supabase/tests/lesson_study_tools.test.mjs`.*

## Phase 5 — Payments and revenue  (1/6 done; the rest is built to the provider boundary and blocked on one fact)

Re-audited 2026-10-19. These six rows all said blocked, and five of them were
wrong: the money code exists and is tested. What is missing is a merchant
account, so nothing below can be exercised against a live provider — which is a
business fact, not a build task.

- [x] Design the payment and order system — **38 money tables (schema Groups 4 and 5), all enforced in SQL: integer minor units with an explicit currency and no floating point anywhere (D4), order totals that must agree with their components, append-only status history, a `financial_transactions` ledger, and a provider-event inbox that dedupes on provider plus event id so one callback cannot confirm a payment twice. Not modelled: jurisdiction-specific tax**
- [~] Integrate and test MTN Mobile Money — **adapter complete against the documented Collections API: token, request-to-pay with a caller-generated reference, then poll or callback. Sandbox base URL and target environment come from the environment, and it refuses rather than guessing when unconfigured. The collection callback is unsigned, so `verifyWebhookSignature` returns false by design and the webhook falls back to re-querying the transaction — returning true would let anyone who knows an order id mark it paid. Refunds refuse until separate Disbursement credentials exist. Untested against a live sandbox: merchant registration and API terms unconfirmed**
- [~] Integrate and test Airtel Money — **adapter complete on the same boundary, with its own OAuth client credentials and country. Written separately rather than assumed to match MTN's terms. Untested against a live sandbox**
- [~] Build checkout, receipts and transaction history — **`/courses/[slug]/buy` → `POST /api/checkout` → `create_course_order()` in the database creates the order (the client sends a course id and nothing else — since 2026-10-22 the price follows the buyer's country rather than a posted price id, which is no longer accepted at all; the two insert policies that let a payer write the total and the product themselves were dropped 2026-10-21, and a purchase that would grant nothing new is refused 2026-10-22) and the route records the attempt; `/orders` reads status from the table rather than from having been redirected, and carries the refund-request form. Missing: a receipt document, and transaction history is the order list rather than a ledger view. Order adjustments are recorded on `/admin/orders` (finance/platform admin, unpaid orders only, written reason, withdrawn rather than deleted) and are visible to the payer on `/orders`**
- [~] Build subscriptions and access control — **`/plans`, `/subscriptions` (allocate a seat to a household learner, cancel with a reason), and entitlement grants/events that drive access. Missing: renewal and failed-payment retry**
- [~] Build refunds, reconciliation and payment administration — **`/api/refunds`, `/admin/refunds`, `/admin/reconciliation`, `/admin/disputes`, `/admin/financial-adjustments`. The database refuses a refund exceeding the captured amount net of prior refunds, and a requester may not approve their own refund. **Anything that moves money waits on a provider — and by hand it is finance's alone** *(2026-11-01)*: `record_payment_success()` and `complete_refund()` ask the session for a finance admin or the owner rather than merely a privileged account, on both the manual and the provider-event door, and a person can no longer type `signature_verified = true` — only the service that verifies a signature may write one**

*The note this phase carried — "build the `PaymentProvider` boundary now with no
implementation" — is done and was the right call. `lib/payments/provider.ts`
defines the boundary, `lib/payments/registry.ts` holds the adapters, and a
registered provider with no credentials reports `available === false` so checkout
is never offered against a provider that cannot run. Two adapters are now
registered, which is more than the note asked for; neither has been paid real
money through.*

## Phase 6 — Marketplace and governance  (2/8 done)

- [x] Build instructor applications and verification — **RESOLVED 2026-10-26** (*DECISIONS.md: "Applying is not appointing"*), and not by removing the screen. The curated cohort stayed and the queue was built: anyone may apply with their qualifications and a sample lesson, `submit_teaching_application()` creates one row and **no role**, and `decide_teaching_application()` — owner or governance, never a support agent — is the only code that ever creates an `instructor` automatically. A decline carries a written reason because the applicant reads it. "Curated" turned out to mean *decided*, not *closed*
- [~] Build course creation and curriculum tools — **`/teach` is live: create a course, build its outline, reorder sections/lessons/content, submit for review, and create a draft from a published version. Lesson media upload from our storage is still to build; the current form accepts HTTPS resources**
- [x] Build scholar/content reviewer workflows — **RESOLVED 2026-10-27.** P6 (2026-10-15) deferred the panel rather than deleting it, and the machinery was then built and left dormant: `teaching.panel` and `governance.panel_required` both ship off, and publication in the meantime runs through the reviewer register at `/admin/reviewers` and `enforce_publication_gate()`. The nine tables were not excess — they are the deferred end-state, and building them is what turned a trap into a decision: with `governance.panel_required` on and no way to approve a case, every publication on the platform would have waited for ever
- [x] Build course approval and revision history — **`/review` is live: accept or decline an assignment, record a decision with a mandatory rationale, version transitions applied. `/admin/appeals` is live too — privileged staff read the queue and decide, and `decide_appeal()` refuses to let the original decision-maker resolve an appeal against their own decision. Review decisions are append-only, so the history is the record. A reviewer can now watch the lessons they are judging: while an assignment is accepted or in progress, its version's delivery copies play on the assignment page, and stop the moment it is completed, declined or cancelled**
- [!] Build marketplace commissions and instructor earnings — **accrual is built, payout is deferred behind `teaching.payouts`**. A sale accrues a teacher's share (50%), snapshots the share it accrued under, and since 2026-10-22 **bears its share of any order-level discount** rather than leaving the platform to absorb it. What does not exist is the money leaving: no provider, no payout policy, no tax treatment
- [!] Build payouts and instructor analytics — **3 tables with no fields and no endpoints**
- [~] Build admin dashboard and moderation tools — **`/admin` is live: all 88 flags seeded with gate type and precondition (plus the 6 governance and money controls in `platform_settings`), `code`-gated ones refused at runtime by trigger, and the register is now held against `FLAGS.md` by test — no ghost flags, no gate disagreement. Queues built: content reports, appeals, discussion, guardian verification, support cases and course reviews. Learner analytics is now built on that boundary: `/teach/[courseId]/cohorts/[cohortId]` reads `cohort_learner_progress()`, and `can_read_learner_course_progress()` in SQL is what lets a course author read enrolment and progress for learners in one of that course's cohorts only — never for self-paced learners, who stay invisible to the author as they were**
- [x] Build learner ratings and reviews — *`course_reviews` plus the ratings panel on `/courses/[slug]` and the held-text queue at `/admin/course-reviews`. Enrolled learners only, one review each, an account reviews as itself, the author cannot review their own course, and text is held until a person publishes it. A rating alone is counted immediately. Satisfaction only: nothing here is read by the publication workflow. `supabase/tests/course_reviews.test.mjs`.*

## Phase 7 — Mobile and advanced features  (0/6 done)

- [ ] Build the Android app experience — *one Expo codebase: this and iOS are the same build, not two tasks*
- [ ] Build the iOS app experience
- [ ] Implement notifications and reminders
- [!] Implement offline learning where supported — *the entitlement rule is decided and enforced in SQL: saving requires a plan carrying the `offline_downloads` feature (Plus, not Basic), entitlement to the version, and verified first-party media; a free preview may be watched but not kept. Protected media, device storage limits, download expiry and the byte path are all still open*
- [~] Add analytics and reporting — **`delivery.analytics` is CODE and now carries cohort-scoped learner progress (`SCREENS.md` row 32, `20261212000100_cohort_learner_analytics.sql`); it still needs event instrumentation beyond lesson progress and a retention decision**
- [ ] Prepare international currencies, languages and payment expansion

## Phase 8 — Launch and scale  (0/8 done)

- [x] Test all roles and complete user journeys — *two suites, both against the real schema with no fixtures standing in for people: `first_day.test.mjs` walks the four customer journeys (owner appoints and publishes, teacher authors to publication past a reviewer, stranger becomes a learner and finishes to a verified certificate, parent adds a child and watches them learn) and ends by running `docs/deploy/verify.sql` on the platform they just used; `staff_day.test.mjs` walks the three staff roles through one day and pins who may appoint, refund, verify and decide. Between them they found three defects no feature suite could see, all fixed: a new teacher could not read back the version they had just created, certificates could be issued but never asked for, and the least-privileged staff role could appoint a platform admin and revoke the owner's. **Not covered, and deliberately:** the scholarly panel (dormant per P6, so there is no role journey to walk until it is switched on) and the paid journey (needs a provider, P12)* **Mis-marked until 2026-11-02:** the row described finished work and the conflict mark had never been removed, which is why the header counted five conflicts while this section listed four
- [ ] Run security, privacy and performance checks
- [!] Test real payment flows and failure cases — **needs a provider sandbox**
- [!] Publish approved initial learning content — **who authors it is decided (me + teacher friends); what the first courses are is not**
- [~] Deploy production website and backend — *the runbook is written and half of it executes itself: `docs/deploy/README.md` covers the project, the migrations, the first owner role, the environment, R2, the encoder, email and Google sign-in in order, with the output each step should produce; `docs/deploy/verify.sql` answers "did the schema land" in twelve rows; and both pieces of SQL a person pastes are executed by `supabase/tests/deploy_runbook.test.mjs`, so the instructions cannot quietly stop working. `check:repo` refuses a deployment variable the runbook never names. **What is left is accounts and credentials, not code**: no Supabase project, no R2 bucket, no ffmpeg host, no provider key*
- [ ] Submit mobile apps for review and publication — *Apple $99/yr, fee waiver worth checking; Google $25 once*
- [x] Launch in Uganda and monitor feedback — **RESOLVED 2026-10-15**, the day the recorded decision was taken: worldwide ambition, Uganda important and not exclusive. What is left of this row is not a decision but a deployment, which the blocked storage row and D9 in `docs/remaining.md` both describe. The operator is AyahSpring, operated from Uganda — and the platform does not narrow to it
- [x] Plan international expansion based on evidence — **RESOLVED 2026-10-22**, in the shape this row asked for. Expansion is not a second launch; it is **the buyer's country choosing the price**: an exact match on the payer's country, then the price's declared default for its currency, then a refusal rather than a guess — resolved inside `create_course_order()`, so a posted price id is no longer trusted

---

## The conflicts, and how each one ended

The list here used to be four *warnings* — things a reader must not do — written
when the source plan still contradicted the recorded decisions. Every one of them
is now closed, and the difference between a warning and a record is that a record
carries a date. The five rows above marked `[X]` are resolved; this is the same
five, in order of the decision that ended them.

1. **"Initial market: Uganda" / "Launch in Uganda."** Closed **2026-10-15** —
   worldwide ambition, Uganda important but not exclusive. The architecture is
   country-agnostic, and the operator being *AyahSpring, operated from Uganda* is a
   fact about who runs the platform, not a limit on who may buy from it.
2. **"Choose a distinctive platform name."** Closed **2026-10-15** — AyahSpring.
   Trademark and domain clearance remain open, and they are a task, not a conflict.
   ("Noor Academy" is a live competitor and is not this platform's name.)
3. **"Choose the programming languages and frameworks."** Closed **2026-10-15** —
   Next.js, Supabase, Expo.
4. **Phase 6 as written assumes an open marketplace and a scholarly panel.** Closed
   in two halves: **2026-10-15** for the panel (P6 — deferred, then built dormant on
   2026-10-27) and **2026-10-26** for applications (a queue with a decision, not an
   open marketplace). Both halves were resolved by keeping the machinery and taking
   the decision out of the code.
5. **The fifth conflict was not a conflict.** *Test all roles and complete user
   journeys* described finished work and had been marked `[X]` by mistake. It is
   closed **2026-11-02** by correcting the mark.

## The real critical path

Not Phase 1. It's:

> **First release scope → visual identity → Group 1 backend → auth → catalogue →
> one real course with real learners.**

Everything else is either already done or blocked on a fact.

---

# Before anything is built

**Read `IRREVERSIBLE.md` first.** Nine decisions are expensive to reverse and
must be settled before code. Everything else can change later, cheaply and on
purpose. The most urgent is **multi-tenancy** — `tenant: 0` in the project
record, and retrofitting it touches nearly every table.

---

# Completion gates

Adopted from the 14-phase master plan. These are the strongest thing in it: a
phase is not finished because its tasks are ticked, it is finished when the
gate statement is **true and tested**.

| Phase | Gate — must be true before moving on |
|---|---|
| 1 | A written requirements document defines every major module and user role. **MET** — project record + these six files |
| 2 | Architecture, database plan, design system and key screen designs are documented and consistent. **NOT MET** — design system and screen designs missing |
| 3 | Users can securely register, log in, access permitted areas and manage their profiles |
| 4 | A learner can discover a course, study its lessons, complete assessments and receive a certificate when eligible |
| 5 | Children can learn in their own environment; guardians can safely manage profiles and view appropriate progress |
| 6 | Adult learners can follow structured learning paths and track progress across subjects |
| 7 | Payments correctly grant and revoke access; transactions can be reconciled and audited |
| 8 | Qualified instructors can submit courses, get them approved, sell them and track earnings — **deferred; conflicts with the curated-cohort decision** |
| 9 | Religious courses cannot bypass review, and every decision is traceable — **replace panel with light peer review per P6** |
| 10 | The platform can be operated without editing production database records directly |
| 11 | Web and mobile clients use the same account, course, progress and payment systems |
| 12 | New countries can be introduced through configuration, not a rewrite |
| 13 | Secure enough for launch, critical journeys work, backups tested, incident procedures in place |
| 14 | Growth is based on measured demand, sustainable operating costs and verified educational quality |

# Rules for not getting lost

Adopted verbatim from the master plan. These are correct and worth keeping
where they can be seen every session.

1. **One active task at a time.** Don't start five modules because a tool suggests them.
2. **Test before ticking.** A feature is complete only when it works and its edge cases are tested.
3. **Commit working code to Git.** Never end a long session with no recoverable version.
4. **Record decisions.** Document *why*, in `DECISIONS.md`.
5. **Don't postpone security.** Auth, permissions, child privacy and payment integrity belong in the original design.
6. **Comprehensive architecture, staged releases.** Design for the whole system; don't require every feature before the first release.
7. **Never put live secrets or production credentials into AI prompts or source control.**

---

# Phase 1 — true state (7 of 9 complete)

| Task | State | Evidence |
|---|---|---|
| 1.1 Choose and verify the final platform name | **PART** | AyahSpring chosen; trademark/domain clearance open |
| 1.2 Mission, audience, value proposition | **DONE** | record: mission, vision, 6 values |
| 1.3 Young learner experience | **DONE** | record + `SCREENS.md` §3 |
| 1.4 Adult learner experience | **DONE** | record + `SCREENS.md` §4 |
| 1.5 List all user roles | **DONE** | 10 roles |
| 1.6 Complete feature list | **DONE** | 80 flags and 18 controls |
| 1.7 Free / paid / subscription / marketplace revenue | **DONE** | record `revenue_model` |
| 1.8 Launch requirements, Uganda and international | **OPEN** | and "Uganda-first" conflicts with the recorded worldwide decision |
| 1.9 Project folder, master checklist, decision log | **DONE** | the six files in this repo |

**The master plan says the next step is "choosing a distinctive platform name
and writing the final requirements document." Both already exist.** Following
it literally restarts work that finished today.
