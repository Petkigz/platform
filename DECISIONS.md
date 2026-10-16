# DECISIONS

Only what is actually settled. One line each. When you're unsure whether you
already decided something, look here first.

Anything marked **PROPOSED** is not decided — it's a recommendation waiting on
you. Do not treat it as settled, and do not build on it until it moves up.

---

## Decided — product

| Date | Decision |
|---|---|
| 2026-10-15 | Name is **AyahSpring**. Ayah = Qur'anic verse/sign, Spring = renewal and growth. Trademark and domain clearance not done. |
| 2026-10-15 | Teaches young children **and** adults the Islamic faith. |
| 2026-10-15 | Worldwide ambition; Uganda is important but not exclusive. |
| 2026-10-15 | "Coursera" was a reference for the **learner-facing format** only — catalogue, enrol, watch, quiz, progress, certificate. Not the business model. |
| 2026-10-15 | On-demand learning is the point. Live classes are not core. |
| 2026-10-15 | The platform **complements** social media; it does not replace it. Teachers keep their existing channels. |
| 2026-10-15 | Teachers: me, plus teacher friends I know who want to teach here. A curated cohort, not an open marketplace. |
| 2026-10-15 | Forum and discussion are wanted, and belong **on the lesson**. |
| 2026-10-15 | **Ease of use is the primary design constraint.** If a flow grows a form with eight fields, it is wrong. |
| 2026-10-16 | **Visual identity is white and green.** Stated directly: "this is a moslem site so the theme is white and green." White for surfaces, green for identity. Settles the colour question behind P11; typography, logo and illustration are still open. |
| 2026-10-16 | **Two governance channels, both wired.** A reader can report a lesson or a specific discussion post; a teacher can appeal a reviewer's rejection. Neither existed as a *path* before — the tables were there and nothing wrote to them. Two rules are load-bearing and enforced in SQL, not in TypeScript: reporting requires being able to *see* what you report, so filing a report cannot be used to probe unpublished drafts; and **the reviewer whose decision is appealed cannot decide that appeal**, the same independence rule that stops an author approving their own course and a requester approving their own refund. Closing a report and overturning an appeal each require a written note. |
| 2026-10-16 | **A refund revokes course access.** Settled directly: "refund revokes course access." Implemented as: a **full** refund revokes the entitlement the order paid for and withdraws the enrolment; a **partial** refund does not, because a learner who paid 40,000 and had 15,000 returned has still paid for what remains. Only the grant the order bought is revoked — access held through a family entitlement, scholarship or admin grant survives. Certificates and lesson progress are left intact per D7: a refund is a money event, not a claim the learning did not happen. |

## Decided — from the project record

| Date | Decision |
|---|---|
| — | Adult learning is private by default, including inside a family. |
| — | Multiple guardians per learner. |
| — | Child login comes later, via a trusted linking workflow. Children are not users in v1. |
| — | Course enrolments pin an exact course version; new versions don't mutate existing enrolments. |
| — | Completion requirements are configurable per course version. |
| — | Grading is mixed automatic and manual. |
| — | Certificates are configurable per course. |
| — | Architecture is a modular monolith with a shared backend. No microservices initially. |
| — | Candidate stack: Next.js + TypeScript, Supabase + PostgreSQL, Expo/React Native, GitHub, Vercel where suitable. |
| — | Money is never floating-point; original transaction currency is authoritative and settlement is tracked separately. |
| — | Published course versions are immutable. |

## Decided — how this project is run

| Date | Decision |
|---|---|
| 2026-10-15 | Built solo, with AI tooling. Near-zero upfront cost. |
| 2026-10-15 | Not started yet. Still planning. |
| 2026-10-15 | Three files run the project: **IDEAS.md** (parking lot), **DECISIONS.md** (this file), **NEXT.md** (one current milestone, one page max). |
| 2026-10-15 | The 14-phase roadmap in the project record is **reference material**, not the thing followed day to day. |
| 2026-10-15 | The test of whether the plan is working: can I answer "what am I doing today?" in one sentence? If not, NEXT.md has grown too big. |
| 2026-10-15 | Build-vs-buy is now **decided: build**. Open-source LMS foundations rejected — they fight the child/guardian model, per-lesson discussion, phone sign-in and the ease-of-use goal. Recorded so it stops resurfacing. |
| 2026-10-15 | **No phasing. The architecture is built to completion with all features, shipped disabled, enabled later — preferably from the admin dashboard.** Rejected the stage-gated approach (see P1). Feature list and toggle preconditions live in `FLAGS.md`. |
| 2026-10-15 | The admin dashboard and its settings/flag layer are **critical path, not a later feature**. Everything else depends on being switchable. Currently absent from the plan: 0 settings endpoints, no settings table, no flag table. |
| 2026-10-15 | **An investor proposal is in play.** New context — the project had been treated as self-funded, near-zero budget. Screen mockups are being prepared for it. See `SCREENS.md`. |
| 2026-10-15 | **Never use "Noor Academy" as a placeholder brand.** It is a live competitor operating in the same market — `nooracademy.com` (Quran/Arabic/Islamic Studies, kids 5–18, K–12 curriculum), plus `noor-academy.org`, `nooracademypakistan.com` and `noorislamicacademy.com`. Several appeared in my own earlier competitor research. **AyahSpring is already a decided name; no placeholder is needed.** |
| 2026-10-15 | Mockups and marketing use **AyahSpring** with one consistent identity: name, logo, typography, navigation. That part of the source's advice is right — a coherent product reads as a product. |
| 2026-10-15 | Web, Android and iOS are **one design**, not three. Expo/React Native means one codebase, so platform-specific screens are responsive states. Do not mock them separately. |

---

## PROPOSED — waiting on a yes or no

These are recommendations, not decisions. Each one changes what gets built.

| # | Proposal | Why |
|---|---|---|
| ~~P1~~ | ~~Stage-gate the build: web only, free, one or two courses.~~ | **REJECTED 2026-10-15.** Full architecture is built to completion and shipped disabled instead. |
| P2 | **Write a precondition for every flag before building the feature it gates.** | Unreleased code rots. A flag switched on after a year will be broken unless what it depends on was recorded. `FLAGS.md` is the start. |
| P3 | **Phone number + OTP sign-in.** No passwords. | Authentication is entirely unspecified, and a phone number is more universal than email worldwide. |
| P4 | **Drop guardian verification from v1.** | Children aren't users in v1, so there's nothing to verify. Manual review is a human queue sitting in a parent's first five minutes. |
| P5 | **Three roles, not ten:** student, parent, teacher. | The other seven are internal and should never surface in the product. |
| P6 | **Replace the scholarly panel with light peer review** — one other teacher reads it, I approve. | Panel-required-for-all-courses currently blocks publishing course one, and the quorum policy is open. 9 tables of machinery for a cohort of friends. |
| P7 | **Build the admin settings and flag layer first.** | 0 settings endpoints, no settings table, no flag table. Without it, "enable later from admin" has no mechanism at all. |
| P8 | **Split certificates:** simple completion certificate early, public verification and revocation later. | Cheap, already designed, strong motivator for children. Full verification is over-building for v1. |
| P9 | **Narrow the first cohort by teacher and subject**, not by country. | The plan says global-first with generic audiences. Still true even with everything built — someone has to be first. |
| P10 | **Design child engagement deliberately** — short bursts, visible progress, a reason to come back tomorrow. | It's the stated goal for half the audience and it is completely undesigned. |
| P11 | **Build interfaces, not guesses, for anything blocked on a fact.** *(Colour settled 2026-10-16: white and green. Type, logo and illustration still open.)* Payments, video delivery, retention, panel policy. A `PaymentProvider` boundary with no implementation beats an adapter for a provider you haven't chosen. | Six features cannot be completed without facts you don't have: provider, jurisdiction, tax, panel policy, retention. Coding them now means coding against guesses and rewriting later. |
| P12 | **Decide the seven external facts as their own work item.** Business jurisdiction, payment provider, video delivery, retention by jurisdiction, panel policy, trademark clearance, pricing. | These are the true blockers. No amount of building finishes them, and several gate whole flag groups. **Payment provider partially settled:** MTN MoMo and Airtel Money adapters are built and switch on by credentials; the remaining six are unchanged. |

---

# THE NINE IRREVERSIBLE DECISIONS — ADOPTED 2026-10-15

All nine adopted on the agent's recommendation at the builder's instruction
("let's fix these"). **Each remains reversible by saying so** — nothing is
built on them yet. Two carry external validation items that block nothing
today:

- **D6** — `docs/legal/content-licence.md` is a draft and needs a lawyer's
  review in the operating jurisdiction before the first teacher accepts it.
- **D7** — `docs/decisions/retention-schedule.md` has four periods marked
  **(confirm)** that depend on jurisdiction. Facts to obtain, not choices.

## Original draft follows

Each has a recommended answer, the reasoning, the cost of doing it now, and
what breaks if it is deferred. **All nine are PROPOSED.** Approve them one at a
time; move each into the Decided table above with a date as you go.

Where a decision depends on a fact I cannot look up, it says so.

---

## D1 · Multi-tenancy  — **PROPOSED**

**Recommendation:** single-tenant schema with a nullable `institution_id`, plus
an `institutions` table seeded with one `default` row.

Add `institution_id` to: `learner_profiles`, `courses`, `course_enrolments`,
`billing_accounts`, `certificates`, support cases.
Do **not** add it to `user_profiles` or auth — a person is the same person
across institutions.

**Why not full multi-tenancy (separate schemas or databases):** it complicates
every migration, multiplies backup and monitoring, and buys isolation you do
not need for a curated set of partner madrasahs.

**Cost now:** one table, one column on six tables, one index, one filter in
authorization.
**Cost if deferred:** a scoping column retrofitted across most tables, every
query rewritten, every authorization path re-tested — with live data in them.

- [x] **ADOPTED 2026-10-15** — reversible

---

## D2 · Child identity model  — **PROPOSED: confirm the existing decision**

**Recommendation:** keep exactly what the record already says. A child is a
`learner_profile` under a `family`, not a `user` with a login.

The schema already contains the escape hatch: `learner_profiles.linked_user_id
nullable unique`. When child login is introduced later, the profile gains a
linked user — **the profile's identity never changes**, so no migration of
children's data is needed.

**This is already future-proof. Do not reopen it.**

- [x] **ADOPTED 2026-10-15** — reversible

---

## D3 · Authentication  — **PROPOSED**

**Recommendation:** Supabase Auth with **both** email+password and phone OTP
enabled. Long-lived refresh tokens, so OTP is used at **registration and
recovery only, never per login** — that is what keeps SMS cost near zero.

- Store phone numbers in **E.164** (`+2567…`), never as typed.
- `user_profiles.user_id` already matches the auth provider ID — no change needed.
- Recovery uses whichever channel exists: OTP if a phone, magic link if only an email.
- You store no passwords. Supabase handles hashing, rotation and rate limits.
- Default sign-in method per market, behind `auth.phone_otp` / `auth.email_password`.

**Cost now:** configuration, not code.
**Cost if deferred:** migrating real accounts between identity models, with
users locked out mid-flight.

- [x] **ADOPTED 2026-10-15** — reversible

---

## D4 · Money and currency  — **PROPOSED: lock it, do not redesign**

**Recommendation:** adopt the record's design verbatim and mark it frozen.

Original transaction amount and currency authoritative · settlement amount and
currency tracked separately · fees recorded · FX rate, source and timestamp
recorded · integer minor units, never floating point · provider callbacks
verified and idempotently processed · a refund request is not a completed refund.

Several external plans would have this redesigned. **Do not.** It is one of the
strongest parts of the design and money bugs are the ones you cannot undo.

- [x] **FROZEN 2026-10-15** — do not redesign

---

## D5 · Course versioning and enrolment pinning  — **PROPOSED: lock it**

**Recommendation:** adopt verbatim and freeze. Published course versions
immutable; enrolments pin an exact version; new versions never mutate existing
enrolments; certificates snapshot course title, version and criteria at issue.

Already correct. Cannot be retrofitted once real enrolments exist.

- [x] **FROZEN 2026-10-15** — do not redesign

---

## D6 · Content ownership and licence  — **PROPOSED**

**Recommendation:** teacher retains copyright and grants AyahSpring a
worldwide, non-exclusive, royalty-free licence to:

- host, transcode, caption, thumbnail and otherwise prepare the content for delivery
- display and distribute it to enrolled learners
- retain archival copies
- **continue serving learners who already enrolled**, even if the teacher unpublishes

Teacher may unpublish at any time — that stops **new** enrolments only.
No editorial derivatives (re-cutting, re-voicing, translating) without written consent.
Teacher warrants they hold rights to everything uploaded, including quoted material.

Present as a versioned click-through at first upload; store the accepted version
and timestamp (this is the same mechanism as `platform.terms_versioning`).

**Cost now:** one document, one checkbox, two columns.
**Cost if deferred:** renegotiating with every teacher who already contributed,
from a weaker position, after they have an audience on your platform.

- [x] **ADOPTED 2026-10-15** — reversible

---

## D7 · Deletion semantics and retention  — **PROPOSED**

**Recommendation:** soft delete by default, hard delete only where law requires it.

- Add `deleted_at` to user-facing tables now.
- **Never delete** financial, governance, grading, publication or certificate
  history — anonymise the personal fields instead.
- Retention by category (shortest first):
  - **Guardian verification evidence** — delete after the decision, unless disputed
  - **Child data** — shortest period; delete on guardian request or account closure
  - **Profiles** — anonymise on request; keep financial records for the statutory period
  - **Financial** — statutory minimum for the operating jurisdiction *(a fact to confirm)*
  - **Audit** — long, immutable, never user-editable

**Cost now:** one column per table.
**Cost if deferred:** a migration plus data archaeology across 85 tables, with
a regulator's deadline attached.

- [x] **ADOPTED 2026-10-15** — reversible

---

## D8 · Where original media masters live  — **PROPOSED**

**Recommendation:** originals go to object storage **you control**; the delivery
provider is never the archive.

- Masters in **Cloudflare R2** (zero egress fees, which matters for video) or Supabase Storage.
- Delivery via the video CDN. **Cloudflare Stream cannot return your original file.**
- Add a `media_assets` table: master location, checksum, duration, transcode targets, owning lesson resource.

`lesson_resources` exists but records nothing about where the original lives.
That is the gap.

**Cost now:** one table, one bucket, one upload path.
**Cost if deferred:** discovering your only copy of a course is a re-encoded
MP4 you cannot replace.

- [x] **ADOPTED 2026-10-15** — reversible

---

## D9 · How translations are modelled  — **PROPOSED**

**Recommendation:** one `course`, many `course_versions`, with a new `language`
column on `course_versions`.

So a course keeps one identity — reviews, subject, instructor, search result —
while each language has independent content, publication and review. Enrolment
already pins a version, so a learner's language is stable for the life of the
enrolment.

**Rejected alternative:** a separate course per language. Simpler today, but it
fragments reviews, duplicates search results and splits instructor attribution.

**Cost now:** one column.
**Cost if deferred:** merging or splitting courses after learners are enrolled
in them.

- [x] **ADOPTED 2026-10-15** — reversible

---

## Summary

| | Decision | Status |
|---|---|---|
| D1 | Multi-tenancy | **ADOPTED** |
| D2 | Child identity model | **CONFIRMED** |
| D3 | Authentication | **ADOPTED** |
| D4 | Money and currency | **FROZEN** |
| D5 | Version pinning | **FROZEN** |
| D6 | Content licence | **ADOPTED** — draft at `docs/legal/content-licence.md`, needs legal review |
| D7 | Deletion and retention | **ADOPTED** — schedule at `docs/decisions/retention-schedule.md`, 4 periods to confirm |
| D8 | Media masters | **ADOPTED** |
| D9 | Translations | **ADOPTED** |

**All nine settled. Nothing blocks the first migration.**


---

## P6 — ADOPTED 2026-10-15: peer review now, scholarly panel dormant

**Decision.** Content is approved by an authorised reviewer with the right
subject authorisation. The four scholarly-panel tables are built but dormant,
enabled later from the admin dashboard.

**This amends a recorded decision, and the amendment is deliberate.** The
project record's Group 3 `approval_threshold` reads *"Scholarly panel required
for all courses; quorum/voting policy open."* That stays true as the
end-state; what changes is the order. The panel is not abandoned, it is
deferred, because there are no panel members yet and a quorum policy has not
been chosen.

**Consequence to remember.** When the panel is enabled, every published course
must have gone through it. Anything published under peer review alone before
that point will need retroactive panel review or an explicit grandfathering
decision. That is a real cost and should be decided before the panel is
switched on, not after.

**Unaffected by the amendment.** These recorded Group 3 decisions stand
unchanged and are enforced in the schema:

- *Author may do limited technical checks but cannot be the required
  scholarly approver of their own course.*
- *Disagreement escalates to an independent senior reviewer or panel; the
  owner cannot override.*
- *Material changes trigger risk-based re-review.*
- *A designated governance administrator may suspend with reason and audit;
  restoration requires scholarly clearance.*

**Enforcement.** `panel_required` is a row in `platform_settings`, not a
constant in code. The publication gate reads it, so switching the panel on is
a settings change, not a migration.
