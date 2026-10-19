# ROADMAP

The master checklist — all 53 tasks, reconciled against what already exists.

This replaces the raw 8-phase list. Nothing was removed; every task is here,
marked with its real state so we never redo finished work or build on sand.

- `[x]` **DONE** — already settled or designed. Evidence in brackets.
- `[~]` **PART** — started, incomplete. What's missing is named.
- `[ ]` **TODO** — ready to start now.
- `[!]` **BLOCKED** — cannot be finished without a fact or a decision.
- `[X]` **CONFLICT** — contradicts a recorded decision. Resolve before doing it.

**Progress: 11 done · 9 part · 16 todo · 13 blocked · 4 conflict  (53 total)**

Of the first 12 tasks — all of Phase 1 and Phase 2 — **7 are complete and 4 are
partly complete.** The roadmap starts where the project already is.

---

## Phase 1 — Define the project  (6/6 done)

- [x] Confirm the platform's purpose and target users — *DECISIONS.md: children and adults, Islamic faith, worldwide*
- [x] Define young learner and adult learner experiences — *project record `learner_type`, `courses.audience`; SCREENS.md §3–4*
- [x] List all user roles and permissions — *10 roles, matrix derived from the migrations and enforced by `supabase/tests/authorization.test.mjs`. See `docs/decisions/authorization-matrix.md`.*
- [x] Finalize the full feature requirements — *47 flags in FLAGS.md, each with a precondition*
- [x] Choose a distinctive platform name — *AyahSpring. Trademark/domain clearance still open.*
- [ ] **Define the first release scope and success criteria** ← **the only open Phase 1 task**

## Phase 2 — Design and technical planning  (5/6 done)

- [~] Create the visual identity and design system — **colour settled: white and green. Tokens in `web/src/app/globals.css`. Type, logo and illustration still open**
- [~] Design the key web and mobile screens — **50 screens inventoried, 0 designed.** 38 are unblocked.
- [x] Choose the programming languages and frameworks — *Next.js + TypeScript, Supabase/PostgreSQL, Expo/React Native*
- [x] Design the database and backend architecture — *85 tables, 121 endpoints, modular monolith*
- [~] Plan security, backups and child privacy — **RLS is complete: 88 tables, all covered, all ten of the record's required access tests enforced. Retention and RPO/RTO still open**
- [x] Set up the development environment and Git repository — **Node 22 workspaces (`npm ci` at the root installs the web app), PGlite for the database suite, and `.github/workflows/ci.yml` running the structural checks, both test suites, typecheck and the production build on every push. No secrets are needed: the suite runs in memory and the build succeeds with no Supabase project configured**

## Phase 3 — Core platform

- [x] Build the backend and database — **all five schema groups complete. 101 tables, RLS on every one, 229 policies, 132 user-defined triggers, 774 tests passing (`npm run test:db`).** The API and application layer follow.
- [~] Build registration, login and password recovery — *email/password sign-up, sign-in and recovery are live; phone OTP can now be requested and verified in-app. Live email/SMS delivery and callback allowlists still need a configured Supabase project.*
- [x] Implement user roles and permissions — *capability-based, not role-based. 10 roles, 4 privileged, 16 capability functions. Three real defects found and fixed in `20261021000100_authz_fixes.sql`.*
- [~] Build user profiles and account settings — *`/account` edits display name, preferred language and IANA time zone through the session-scoped RLS policy; email password recovery and phone OTP sign-in are available, while sign-in address changes and wider profile fields remain.*
- [x] Build the course catalogue, search and course pages — *`/catalogue` and `/courses/[slug]`. `subject_areas` seeded with 9 disciplines and 26 subdivisions. `supabase/tests/catalogue.test.mjs`.*
- [x] Build the help desk — *`/support` for the person asking, `/support/<caseNumber>` for the thread, `/admin/support` for the queue. `support_cases` and `support_case_messages` with session-bound writer functions, staff-only internal notes, and an audited state machine. `platform.support` ships off. `supabase/tests/support_cases.test.mjs`.*
- [!] Set up file storage, video delivery and deployment — **video provider not chosen.** Cloudflare Stream researched; see IDEAS.md for the lock-in caveat.

## Phase 4 — Learning systems

- [~] Build course sections and lessons — *teacher course/version/section/lesson authoring, ordering, and learner pages are live; secure media upload is pending storage setup.*
- [~] Build the video/audio lesson player — *native playback for direct HTTPS MP4/WebM/OGV and MP3/M4A/AAC/OGG/WAV/FLAC resources; first-party media needs the provider-backed signed delivery path, still undecided.*
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

## Phase 5 — Payments and revenue  (built to the provider boundary; blocked on one fact)

Re-audited 2026-10-19. These six rows all said blocked, and five of them were
wrong: the money code exists and is tested. What is missing is a merchant
account, so nothing below can be exercised against a live provider — which is a
business fact, not a build task.

- [x] Design the payment and order system — **38 money tables (schema Groups 4 and 5), all enforced in SQL: integer minor units with an explicit currency and no floating point anywhere (D4), order totals that must agree with their components, append-only status history, a `financial_transactions` ledger, and a provider-event inbox that dedupes on provider plus event id so one callback cannot confirm a payment twice. Not modelled: jurisdiction-specific tax**
- [~] Integrate and test MTN Mobile Money — **adapter complete against the documented Collections API: token, request-to-pay with a caller-generated reference, then poll or callback. Sandbox base URL and target environment come from the environment, and it refuses rather than guessing when unconfigured. The collection callback is unsigned, so `verifyWebhookSignature` returns false by design and the webhook falls back to re-querying the transaction — returning true would let anyone who knows an order id mark it paid. Refunds refuse until separate Disbursement credentials exist. Untested against a live sandbox: merchant registration and API terms unconfirmed**
- [~] Integrate and test Airtel Money — **adapter complete on the same boundary, with its own OAuth client credentials and country. Written separately rather than assumed to match MTN's terms. Untested against a live sandbox**
- [~] Build checkout, receipts and transaction history — **`/courses/[slug]/buy` → `POST /api/checkout` → `lib/checkout.ts` creates the order and records the attempt; `/orders` reads status from the table rather than from having been redirected, and carries the refund-request form. Missing: a receipt document, and transaction history is the order list rather than a ledger view**
- [~] Build subscriptions and access control — **`/plans`, `/subscriptions` (allocate a seat to a household learner, cancel with a reason), and entitlement grants/events that drive access. Missing: renewal and failed-payment retry**
- [~] Build refunds, reconciliation and payment administration — **`/api/refunds`, `/admin/refunds`, `/admin/reconciliation`, `/admin/disputes`, `/admin/financial-adjustments`. The database refuses a refund exceeding the captured amount net of prior refunds, and a requester may not approve their own refund. Anything that moves money waits on a provider**

*The note this phase carried — "build the `PaymentProvider` boundary now with no
implementation" — is done and was the right call. `lib/payments/provider.ts`
defines the boundary, `lib/payments/registry.ts` holds the adapters, and a
registered provider with no credentials reports `available === false` so checkout
is never offered against a provider that cannot run. Two adapters are now
registered, which is more than the note asked for; neither has been paid real
money through.*

## Phase 6 — Marketplace and governance

- [X] Build instructor applications and verification — **conflicts with the recorded decision:** a curated cohort of teachers I know, not open applications
- [~] Build course creation and curriculum tools — **`/teach` is live: create a course, build its outline, reorder sections/lessons/content, submit for review, and create a draft from a published version. Lesson media upload from our storage is still to build; the current form accepts HTTPS resources**
- [X] Build scholar/content reviewer workflows — **conflicts with P6:** scholarly panel replaced by light peer review. 9 tables of panel machinery are excess for a trusted cohort.
- [x] Build course approval and revision history — **`/review` is live: accept or decline an assignment, record a decision with a mandatory rationale, version transitions applied. `/admin/appeals` is live too — privileged staff read the queue and decide, and `decide_appeal()` refuses to let the original decision-maker resolve an appeal against their own decision. Review decisions are append-only, so the history is the record**
- [!] Build marketplace commissions and instructor earnings — **deferred; behind `teaching.payouts`**
- [!] Build payouts and instructor analytics — **3 tables with no fields and no endpoints**
- [~] Build admin dashboard and moderation tools — **`/admin` is live: all 87 flags seeded with gate type and precondition (plus the 3 governance and money controls in `platform_settings`), `code`-gated ones refused at runtime by trigger, and the register is now held against `FLAGS.md` by test — no ghost flags, no gate disagreement. Queues built: content reports, appeals, discussion, guardian verification, support cases and course reviews. Still to build: learner analytics, whose privacy boundary was decided on 2026-10-19 — a course author may read enrolment and progress only for learners in one of that course's cohorts, never for self-paced learners, who stay invisible to the author as they are today**
- [x] Build learner ratings and reviews — *`course_reviews` plus the ratings panel on `/courses/[slug]` and the held-text queue at `/admin/course-reviews`. Enrolled learners only, one review each, an account reviews as itself, the author cannot review their own course, and text is held until a person publishes it. A rating alone is counted immediately. Satisfaction only: nothing here is read by the publication workflow. `supabase/tests/course_reviews.test.mjs`.*

## Phase 7 — Mobile and advanced features

- [ ] Build the Android app experience — *one Expo codebase: this and iOS are the same build, not two tasks*
- [ ] Build the iOS app experience
- [ ] Implement notifications and reminders
- [!] Implement offline learning where supported — **entitlement rules, protected media, device storage limits all undecided**
- [!] Add analytics and reporting — **`delivery.analytics` is CODE; needs event instrumentation and a retention decision**
- [ ] Prepare international currencies, languages and payment expansion

## Phase 8 — Launch and scale

- [ ] Test all roles and complete user journeys
- [ ] Run security, privacy and performance checks
- [!] Test real payment flows and failure cases — **needs a provider sandbox**
- [!] Publish approved initial learning content — **who authors it is decided (me + teacher friends); what the first courses are is not**
- [ ] Deploy production website and backend
- [ ] Submit mobile apps for review and publication — *Apple $99/yr, fee waiver worth checking; Google $25 once*
- [X] Launch in Uganda and monitor feedback — **conflicts with the recorded decision:** worldwide ambition, Uganda important but not exclusive
- [X] Plan international expansion based on evidence — **already worldwide-first by design;** reframe as "activate paid features market by market"

---

## The four conflicts, stated plainly

1. **"Initial market: Uganda" / "Launch in Uganda."** Recorded decision is
   worldwide-first with providers activated market by market. This is the fourth
   time the source has narrowed the project to Uganda. The architecture is
   already country-agnostic — don't undo it in the launch plan.
2. **"Choose a distinctive platform name."** AyahSpring, decided. Reopening it
   burns a week for no gain.
3. **"Choose the programming languages and frameworks."** Decided. Next.js,
   Supabase, Expo.
4. **Phase 6 as written assumes an open marketplace and a scholarly panel.**
   Both were decided against. Building them costs ~9 tables and blocks
   publishing course one.

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
| 1.6 Complete feature list | **DONE** | 47 flags |
| 1.7 Free / paid / subscription / marketplace revenue | **DONE** | record `revenue_model` |
| 1.8 Launch requirements, Uganda and international | **OPEN** | and "Uganda-first" conflicts with the recorded worldwide decision |
| 1.9 Project folder, master checklist, decision log | **DONE** | the six files in this repo |

**The master plan says the next step is "choosing a distinctive platform name
and writing the final requirements document." Both already exist.** Following
it literally restarts work that finished today.
