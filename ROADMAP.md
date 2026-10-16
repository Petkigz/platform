# ROADMAP

The master checklist — all 53 tasks, reconciled against what already exists.

This replaces the raw 8-phase list. Nothing was removed; every task is here,
marked with its real state so we never redo finished work or build on sand.

- `[x]` **DONE** — already settled or designed. Evidence in brackets.
- `[~]` **PART** — started, incomplete. What's missing is named.
- `[ ]` **TODO** — ready to start now.
- `[!]` **BLOCKED** — cannot be finished without a fact or a decision.
- `[X]` **CONFLICT** — contradicts a recorded decision. Resolve before doing it.

**Progress: 8 done · 4 part · 24 todo · 13 blocked · 4 conflict  (53 total)**

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

- [ ] Create the visual identity and design system
- [~] Design the key web and mobile screens — **50 screens inventoried, 0 designed.** 38 are unblocked.
- [x] Choose the programming languages and frameworks — *Next.js + TypeScript, Supabase/PostgreSQL, Expo/React Native*
- [x] Design the database and backend architecture — *85 tables, 121 endpoints, modular monolith*
- [~] Plan security, backups and child privacy — **RLS is complete: 88 tables, all covered, all ten of the record's required access tests enforced. Retention and RPO/RTO still open**
- [~] Set up the development environment and Git repository — **repo exists with a README only; no toolchain, no CI**

## Phase 3 — Core platform

- [x] Build the backend and database — **all five schema groups complete. 88 tables, RLS on every one, 202 policies, 105 triggers, 190 tests passing (`npm run test:db`).** The API and application layer follow.
- [ ] Build registration, login and password recovery — *decide `auth.email_password` vs `auth.phone_otp` first*
- [x] Implement user roles and permissions — *capability-based, not role-based. 10 roles, 4 privileged, 16 capability functions. Three real defects found and fixed in `20261021000100_authz_fixes.sql`.*
- [ ] Build user profiles and account settings
- [ ] Build the course catalogue, search and course pages — *needs `subject_areas` populated*
- [!] Set up file storage, video delivery and deployment — **video provider not chosen.** Cloudflare Stream researched; see IDEAS.md for the lock-in caveat.

## Phase 4 — Learning systems

- [ ] Build course sections and lessons
- [ ] Build the video/audio lesson player
- [ ] Track lesson progress and course completion
- [ ] Build quizzes, assessments and results
- [~] Build young learner profiles and age-appropriate learning — **profiles designed; engagement mechanics are not** (`gamif: 0`, `badge: 0`, `streak: 0`)
- [ ] Build parent/guardian dashboard and controls
- [ ] Build the adult learning dashboard and learning paths
- [ ] Build certificates and certificate verification

## Phase 5 — Payments and revenue  (all blocked on one fact)

- [!] Design the payment and order system — **provider and jurisdiction undecided**
- [!] Integrate and test MTN Mobile Money — **merchant registration + API terms unconfirmed**
- [!] Integrate and test Airtel Money — **do not assume Airtel's terms match MTN's**
- [!] Build checkout, receipts and transaction history
- [!] Build subscriptions and access control
- [!] Build refunds, reconciliation and payment administration

*Build the `PaymentProvider` boundary now with no implementation. Do not guess a provider — this is money code.*

## Phase 6 — Marketplace and governance

- [X] Build instructor applications and verification — **conflicts with the recorded decision:** a curated cohort of teachers I know, not open applications
- [ ] Build course creation and curriculum tools
- [X] Build scholar/content reviewer workflows — **conflicts with P6:** scholarly panel replaced by light peer review. 9 tables of panel machinery are excess for a trusted cohort.
- [ ] Build course approval and revision history
- [!] Build marketplace commissions and instructor earnings — **deferred; behind `teaching.payouts`**
- [!] Build payouts and instructor analytics — **3 tables with no fields and no endpoints**
- [ ] Build admin dashboard and moderation tools — **`platform.admin_settings` is critical path and comes before every other flag**

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
