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
| 2026-10-16 | **A payment dispute is an internal case record with a controlled, noted lifecycle.** Finance/platform admins open a case against a ledger transaction, for no more than the transaction amount and in the same currency. Status moves `open -> under_review -> evidence_submitted -> outcome`, with withdrawal before resolution. Every transition has a written note; won/lost/withdrawn are terminal. `/admin/disputes` records the staff case. It does not submit provider evidence, promise a provider outcome, reverse a payment, or transfer money; P12 provider integration remains separate. |
| 2026-10-16 | **Reconciliation compares signed statement rows to immutable ledger transactions.** Finance/platform admins start a provider-period run and enter signed integer minor-unit rows. Positive is credit, negative debit. Matching requires provider reference, currency, signed amount and period; unknown/ambiguous/mismatched rows are retained for staff resolution, never dropped. A run is balanced only if every line matches; otherwise it remains discrepant until a written review and close. `/admin/reconciliation` is generic on purpose: no provider statement format is guessed before P12. Reconciliation is accounting review; it does not confirm a new payment, mutate a transaction, or move money. |
| 2026-10-16 | **Financial adjustments add an append-only ledger fact; they never rewrite a transaction.** A finance or platform admin links the adjustment to an order and/or transaction, provides a nonzero signed minor-unit amount in the same currency and a written reason. Positive amounts add a credit/receivable; negative amounts record a debit/reduction. `record_earnings_clawback()` computes the exact negative total of already-paid instructor earnings on a fully refunded order and permits only one clawback per order. The paid earnings row remains paid; the new adjustment documents the recovery claim but does not move money. `/admin/financial-adjustments` exposes both generic adjustments and unresolved clawbacks. Provider execution, disputes and payout preconditions remain separate. |
| 2026-10-16 | **A plan is a stable identity; its saleable terms are versioned and complete.** Staff create a plan, append a draft version, add typed entitlements, set a recurring price, then activate. Activation refuses a version with no entitlement or no active price; one-time billing is refused because these are subscription plans. Repricing closes the previous active row rather than mutating history. `/admin/plans` configures offers; `/plans` starts checkout from an active plan price and selected learner. The database creates only a pending order/subscription; only the verified payment-confirmation writer activates it and creates grants ending at the paid period end. `/subscriptions` allocates additional household learners and allows a written-reason cancellation; cancellation preserves access through the already-paid period. Direct subscription state writes are trigger-blocked. **Live provider credentials (P12) and automatic renewal processing remain open** — no redirect or pending order is treated as payment. |
| 2026-10-16 | **An assessment must be activated, and publishing refuses a draft left behind.** `assessments` and `assessment_questions` had zero rows and no writer, so no teacher could create a quiz — which made `submit_attempt()` unreachable and left completion rules of type `assessment_submitted` / `assessment_passed` with no `target_assessment_id` to point at. `create_assessment()` writes a **draft**, because the learner reader (`fetchAssessmentsForVersion`) filters `status='active'`. **The trap closed here:** D5 freezes assessments at publication, so a draft left behind would be invisible forever with no way to fix it short of a new course version. `course_versions_guard_draft_assessments_at_publication` now refuses that transition and **names the assessment blocking it**, because "something is not ready" sends the teacher hunting. Activation requires at least one question, since an empty assessment could never be passed. Question positions are assigned, as with lesson resources, because `(assessment_id, position)` is unique. **The write policies on both tables already used `can_author_version()`** — the correct predicate, not the read-predicate mistake found in `course_version_subjects` and `lesson_resources`; nothing was corrected there. |
| 2026-10-16 | **A family is created with its owner, atomically.** `families` and `family_memberships` had zero rows and no writer, and `fm_write_owner` is gated on `is_family_owner()`, which looks for an active owner row — so inserting the first owner membership required already being an active owner. A bootstrap deadlock, measured: a plain INSERT into `families` is allowed, but `INSERT ... RETURNING id` is refused (RETURNING must satisfy the SELECT policy, and `families_read` needs an active membership the creator does not have), the owner insert is refused, and the creator then sees zero of their own families. `create_family()` writes both rows in one transaction, so **no family ever exists without an owner** — a family with no owner is invisible to its creator, unmanageable, and would strand its children. **This corrects an earlier claim that child enrolment was wired.** The enrolment path was; the family it depends on could not be created, and since D2 makes a family mandatory for a child (`lp_no_child_login_yet` + `lp_needs_family_or_login`), no child could exist. Invitations are `invited` until the person accepts, because being added to a household without agreeing would attach an account that never chose it. Removing a member is a soft revoke per D7 with a written reason, and **the last active owner cannot be removed** — the same lockout guard the privileged roles use. |
| 2026-10-16 | **A teacher owns the product; only staff set the price.** `products`, `prices` and `product_course_versions` all had zero rows and no writer, so the entire revenue path was dead — nothing could be bought, and `accrue_instructor_earnings()` was unreachable because it walks `order_items.product_id -> product_course_versions -> courses.created_by`. The existing row-level policies already settled the split and it is **not reversed here**: `products_insert` is `created_by = current_user_id()`, `pcv_write` is the product owner, and `prices_write` is `is_privileged(current_user_id())`. So a teacher creates the product and attaches their own **published** version, while pricing and going on sale are staff actions. **A draft cannot be sold** — it has never been reviewed, and selling one would put paid-for content on the platform the scholarly gate has not seen. `activate_product()` refuses a product with no course or no price, so nothing can be listed that has no content or no price. Re-pricing **supersedes** the old row rather than mutating it, because a price someone already bought at must stay readable as it was. Retirement is a soft delete per D7 and closes the price rather than deleting it, so existing orders still resolve. |
| 2026-10-16 | **An upload is available when staff say so, never when the uploader says so.** `media_assets` had a correct INSERT policy and an UPDATE policy with no column restriction, so an uploader could insert a row as `pending` and then set it to `available` with a plain UPDATE — verified by running it, not by reading the policy. The pending/available/quarantined machine exists to distinguish "we have the file" from "we do not", and the person with the most reason to bypass it could. Status now moves only through `confirm_media_upload()` (staff) and `quarantine_media_upload()` (staff, written reason). **The object key is derived from the new row's own id rather than supplied by the caller**, because a caller-chosen key means one teacher can register an asset pointing at another's object. **Not wired, deliberately:** the byte transfer (needs storage credentials and the D8 backend choice) and the confirmation trigger (belongs to a storage webhook or worker). An upload therefore stops at `pending`, and `attachMediaAsset()` refuses anything that is not `available` — the schema does not, and a lesson pointing at a file that was never uploaded is worse than a lesson with no file. |
| 2026-10-16 | **Lesson content is attached by URL for now, and uploads are not guessed at.** `add_lesson_resource()` writes only `external_url`; the other permitted source is `media_asset_id`, and `media_assets` has no writer either, so there is nothing to point at. Under D8 the masters belong in our own storage with Cloudflare Stream for delivery, and inventing an upload path here would have committed to a storage layout before that decision was made. The database already enforces https, and the API reports it as a sentence rather than a constraint name. The position is **assigned**, never chosen: `(lesson_id, position)` is unique, so a teacher guessing a free slot would collide. **`media_assets` is the next writer to build and it gates every video on the platform.** |
| 2026-10-16 | **Signing up creates the profile, in the database.** `user_profiles.user_id` is the primary key and essentially every other table points at it — `courses.created_by`, `billing_accounts.created_by`, `user_role_assignments.user_id`, `learner_profiles.linked_user_id`. Nothing created the row, and the sign-up page only calls `supabase.auth.signUp()`, so a new user could sign in and then fail every foreign key in the schema. A trigger on `auth.users` now creates it. It lives in the database rather than in the client **because the same signup will happen from the Expo app and anything else that talks to Supabase Auth** — in the client, every client has to remember, and the failure mode is an account that can sign in and do nothing. The display name is **derived**, not chosen: sign-up collects only an email or a phone. There is no settings screen yet, so that derived name is currently the only name a user has — a real gap, recorded rather than papered over. |
| 2026-10-16 | **A course is filed under subjects while it is a draft, and that mapping is then frozen.** `course_version_subjects` had zero rows and no writer, so the catalogue's subject filter narrowed against an empty set and returned nothing forever, and every subject badge was empty. Tagging now happens through `set_version_subjects()` on the teaching page. It is **draft-only**: `lock_subject_mapping_of_locked_version()` already froze this table at publication exactly as it does sections and lessons, and that is not overridden for one table. The consequence is accepted and stated: a mis-tagged published course cannot be corrected without cutting a new version. The write policies were also corrected from `can_read_version()` to `can_author_version()` — a read predicate had been standing in for a write gate. |
| 2026-10-16 | **Roles are assigned through the product, and the actor is never an argument.** `user_role_assignments` had zero rows and no writer, so the capability-based model underneath every check in the schema could not be staffed: no admin could appoint an instructor, a reviewer, or another admin. `assign_role()` and `revoke_role()` read the actor from the **session**, not from a parameter — an actor argument would let any signed-in user name an admin and satisfy the privilege check, which is the same hole closed in the earnings and entitlement writers. A privileged grant needs a written reason; a revocation always does, and is soft per D7. **The last privileged account cannot be revoked** — appoint someone else first, or the platform cannot be administered without direct database access. |
| 2026-10-16 | **Instructor earnings accrue on payment and reverse on a full refund.** A teacher's share is recorded when an order is paid and taken back when that order is refunded in full — the same trigger as access revocation. A **partial** refund leaves earnings intact, for the same reason it leaves access intact: the learner has still paid for what remains. The share is **snapshotted onto each entry**, so changing the rate later cannot rewrite money already accounted for. A teacher buying their own course accrues nothing. An entry already paid out is **not** silently rewritten on refund — a clawback event is raised instead, because money that has left the platform cannot be un-sent by editing a ledger row. The percentage is now configurable by a finance or platform admin through the dashboard, with a required written reason and an append-only audit record. **The value remains 0 and the business decision remains open** — no percentage was chosen on the user's behalf. Payouts remain unwired: the four operational preconditions still need answers before money can leave the platform. |
| 2026-10-16 | **Two governance channels, both wired.** A reader can report a lesson or a specific discussion post; a teacher can appeal a reviewer's rejection. Neither existed as a *path* before — the tables were there and nothing wrote to them. Two rules are load-bearing and enforced in SQL, not in TypeScript: reporting requires being able to *see* what you report, so filing a report cannot be used to probe unpublished drafts; and **the reviewer whose decision is appealed cannot decide that appeal**, the same independence rule that stops an author approving their own course and a requester approving their own refund. Closing a report and overturning an appeal each require a written note. |
| 2026-10-16 | **A refund revokes course access.** Settled directly: "refund revokes course access." Implemented as: a **full** refund revokes the entitlement the order paid for and withdraws the enrolment; a **partial** refund does not, because a learner who paid 40,000 and had 15,000 returned has still paid for what remains. Only the grant the order bought is revoked — access held through a family entitlement, scholarship or admin grant survives. Certificates and lesson progress are left intact per D7: a refund is a money event, not a claim the learning did not happen. |
| 2026-10-19 | **A teacher keeps 50% of a course sale.** Chosen by the owner, not inferred: `teaching.revenue_share_percent` moves from its seeded 0 to 50 in `20261205000100_revenue_share_decision.sql`, and the register carries the date so a reader knows a person decided it. 0 was never a neutral default — it was the platform keeping everything a teacher earned. Earnings accrue at whatever this says when an order is confirmed, and each entry snapshots the share it accrued under (`iee_split_agrees` ties net to that copy), so changing it later cannot rewrite money already booked. **This does not enable payouts**: `teaching.payouts` stays CODE-gated, and the terms around the percentage are still open — tax treatment per country, who bears processing fees, and whether the share is uniform or per teacher. |
| 2026-10-19 | **A course author may see individual learner progress only inside a cohort a learner or guardian opted into.** Self-paced learners stay private: RLS gives an author no read at all on `course_enrolments` or `lesson_progress`, and that does not change. The reasoning is that a dated cohort is a group somebody joined on purpose, where a teacher knowing who is falling behind is the point of the class — while a self-paced catalogue enrolment is a private purchase, and pace is data about a child nobody agreed to share. Aggregate-only was considered and rejected as the general rule, because a count with no learner attached cannot tell a teacher who to help. Governs `SCREENS.md` row 32. |
| 2026-10-19 | **The teacher decides when a cohort stops accepting joiners, per cohort.** A `join_closes_at` the teacher sets when creating the class, defaulting to the cohort's start date — so the default is the strict and fair one, and opening the window later is a deliberate act rather than something that happens by omission. This replaces the built behaviour, in which joining stayed open from before the start until the cohort ended and anyone could join in the final week. Settling it is the precondition `learning.cohorts` was held on. |
| 2026-10-19 | **D8 stays open, and the next step is costed research rather than a choice.** Where original media masters live is not decided; before it is, the options (Cloudflare R2, Supabase Storage, Backblaze B2, with Stream as delivery only) are to be compared with real numbers at 100, 1,000 and 50,000 users and brought back as a recommendation. Nothing in the media byte path is built on a guess in the meantime. |
| 2026-10-19 | **D8 research delivered: R2, at every tier.** Costed at `docs/decisions/media-storage-costing.md` from each provider's own price card read the same day. Monthly cost at 100 / 1,000 / 50,000 users: R2 $1.13 / $7.14 / $113.75; Supabase Storage $0.00 / $64.92 / $4,089.94; B2 direct egress $0.52 / $3.31 / $272.66; Stream as delivery $7.77 / $62.85 / $2,548.50 with masters still stored elsewhere. Two findings decide it beyond price: Cloudflare's CDN terms permit serving video only where the content is hosted by a Cloudflare service, which disqualifies the B2-plus-Cloudflare free-egress path on the plans a solo builder uses; and `register_media_upload()` already defaults to `'r2'` with the bucket derived, while `'b2'` is not a permitted backend at all. The recommendation is R2 for masters and delivery, Supabase Storage kept for avatars and receipts, Stream declined unless hardware DRM is ever required, and the ffmpeg worker accepted as the real cost of not buying Stream. The owner's choice is still outstanding. |
| 2026-10-20 | **D8 decided: Cloudflare R2, for masters and delivery.** Chosen from the costed comparison rather than from preference. R2 is $113.75 a month at 50,000 users where Supabase Storage is $4,089.94 and Stream is $2,548.50 for delivery alone; its free egress is permitted through Cloudflare's CDN rather than merely tolerated, and `register_media_upload()` already defaults to `'r2'`. Supabase Storage is kept for avatars and receipts inside its 100 GB quota, never for video. Stream is declined, with one live exception recorded below. What is chosen is where the bytes live — the byte path itself (signed upload, transcode worker, signed playback) is still not built. |
| 2026-10-20 | **Saved lessons are a requirement, not a convenience.** The owner added it while accepting D8: lessons must remain available so students can review them, and so other teachers can see them. Two consequences follow and neither is settled. First, masters are permanent by design — this requirement is already satisfied for recorded lessons, so what is actually new is the *access* rule, and "other teachers" is not yet defined: co-teachers of one course, reviewers checking quality, or any teacher on the platform are three different privacy boundaries. Second, if a live class is to be saved, that is live streaming with recording, which is the one case that would genuinely reopen the Stream decision, because self-hosting a media server is not a weekend of work — and a recording of a class containing children is a safeguarding question before it is a storage question. Recorded as open; see `NEXT.md`. |
| 2026-10-20 | **Offline download is a plan feature, not a consequence of enrolment.** A Plus-tier subscription carries it; a Basic-tier one does not, and buying a course outright never does — watching is not keeping. Expressed the way the catalogue already expresses capability: a `plan_entitlements` row with `scope_type='feature'` and `feature_code='offline_downloads'`, which fulfilment already propagates into per-learner `entitlement_grants` bounded by the paid period, so a lapsed subscription stops saving without anything being revoked by hand. Enforced by `may_download_lesson()`, which also requires verified first-party media — a hotlinked `external_url` belongs to somebody else's server and cannot be downloaded, and pending or quarantined media is never handed out. Two consequences were inferred rather than asked and are reversible: **a free preview may be watched but not kept** (otherwise any lesson an author marked as a preview could be saved by anyone and the paid feature would have a hole in it), and **access and the feature must belong to the same learner profile** (a guardian may save a child's lesson; a family may not combine one member's enrolment with another's plan). The vocabulary of sellable feature codes is now closed in SQL and mirrored by `plan_feature_codes()`, because a code nothing reads would take money and grant nothing. Device limits, download expiry and protected media remain open, and no byte is fetched or signed by any of this. |
| 2026-10-20 | **Saved lessons: the three open questions are answered.** (1) *Both* — live classes that are recorded and saved, and offline download of anything saved, with the download **gated to a Plus subscription, never Basic** (built the same day; see the row above). (2) "Other teachers" means **a reviewer checking quality, for a named period** — not co-teachers by default and not any teacher on the platform. That wakes the dormant peer-review path (P6) rather than opening a shared library, so a paid course's content is never readable by its competitors and no per-lesson licence is needed to make it safe. (3) A live class containing children is recorded as **teacher-only capture**: learners' video and audio are never recorded, so a child can take part live without appearing in a file that outlives the class. That is the strongest of the three options and it takes the recording of children off the safeguarding critical path entirely — nothing captured, nothing to withdraw. What remains is code, not decision: the reviewer-scoped read path for lesson media, and live capture with a recording that holds only the teacher's stream. |

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

## D8 · Where original media masters live  — **ADOPTED**

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
- [x] **PROVIDER CHOSEN 2026-10-20 — Cloudflare R2** for masters *and*
  delivery. Chosen from the costed comparison at
  `docs/decisions/media-storage-costing.md`: $1.13 / $7.14 / $113.75 a month
  at 100 / 1,000 / 50,000 users, against Supabase Storage's
  $0.00 / $64.92 / $4,089.94 and Stream's $7.77 / $62.85 / $2,548.50 as
  delivery only. Decided by two things beyond price: Cloudflare's CDN terms
  permit serving video only where the content is hosted by a Cloudflare
  service, which disqualifies the B2-plus-Cloudflare free-egress path on the
  plans a solo builder uses; and `register_media_upload()` already defaults
  to `'r2'` with the bucket derived, so choosing R2 agrees with code that
  shipped. Supabase Storage stays for avatars and receipts inside its 100 GB
  quota. Stream is declined — unless live classes or hardware DRM are wanted,
  either of which would reopen this. Reversible.

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
| D8 | Media masters | **ADOPTED** — Cloudflare R2 for masters and delivery, chosen 2026-10-20 from `docs/decisions/media-storage-costing.md` |
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

---

## Learning paths — implementation invariant

A learning path is an ordered catalogue guide, not a purchasable bundle and
not an entitlement. Each course continues to use its existing publication,
enrolment, price and access checks. Teacher-authored paths can be published
only with at least one active course that has a published version; changes to
an active path are made on a draft, and retirement requires a written reason.
The learner-facing `learning.paths` flag remains off until curated path content
is ready.

## Source provenance — implementation invariant

Citations are authored against a draft course version and a specific lesson.
They become readable with that published version and cannot be added, edited or
removed after publication. A correction belongs in a new draft version, so the
source record a learner sees stays tied to the reviewed material.

## Public teacher profiles — disclosure boundary

The public teacher page is separate from `reviewer_profiles` and other
confidential qualification records. It exposes only teacher-authored biography,
HTTPS links to the teacher's own social channels, and published courses; it does
not assert that credentials have been checked. Public reads require both the
`teaching.public_profile` flag and an active instructor role, enforced by RLS.

## Marked work — cohorts, deadlines and what a learner hands in

Decided 2026-10-19, answering the three questions `learning.assignments` was
blocked on.

**Both deadline models, not one.** Published courses stay self-paced, and a
teacher can also open a dated cohort of the same course. That is the reason the
flag said "separate from quizzes": assessments are version-scoped and locked at
publication (`lock_assessment_of_locked_version`), so a teacher cannot add work
to a course that is already live without cutting a new version and putting it
back through review. Marked work therefore needs its own home, scoped to the
course rather than to a version.

The consequence for the schema was concrete, and `course_assignments` now encodes
it: a deadline is either **absolute** (a cohort: due Friday) or **relative** to
enrolment (self-paced: due seven days after you start), never both, and the two
need different clocks and different late policies. One column with a check
constraint, not two nullable columns that can contradict each other. Late work is
refused by default and each task can explicitly opt into accepting it, because
"late" means something different to a cohort that met on Friday than it does to
someone who enrolled on Sunday.

**Submissions carry files, not only text.** Written answers, audio recitation and
photographs of workbook pages. Recitation is central to Qur'an teaching, so audio
is not an edge case. This creates two preconditions that did not exist before and
that must not be skipped:

1. *Media ingest stops short of bytes.* `media_assets` is a complete register —
   backend, bucket, key, sha256 checksum, mime, size, duration and a
   `quarantined` status that is the right home for scanning — and
   `create_media_asset()` will open a `pending` row and hand back the bucket and
   a derived key. What does not exist is anything that moves bytes, verifies the
   object arrived, scans it, or delivers it safely to the person marking it, and
   D8 (where original masters live) is still **PROPOSED**. A submission can
   therefore reference a verified asset, and `attach_assignment_asset()` enforces
   the type and size ceilings, but no learner can produce one yet. The screens do
   not claim otherwise.
2. *Files from children to adults are a safeguarding question before they are a
   feature.* Who may receive them, what is retained, who can see them after a
   guardian asks, and what happens to a recording of a child's voice when an
   account is deleted. `platform.safeguarding` is CODE-gated and unbuilt.

**Marking stays with the course author.** The existing manual-marking queue is
already restricted to the author and privileged staff, anonymised and audited. No
cohort-teacher marking relationship is introduced, which is also what keeps the
conflict-of-interest rules from having to grow a second case.

**Two marking surfaces, one idea of feedback.** Assignments carry `feedback` on
the submission. Quizzes carry `grading_feedback` on the marked response, because
`short_answer` questions are marked through the manual queue that already
existed, and that queue could award a score and a verdict and say nothing — the
whole answer for a multiple-choice question and none of it for a written one. The
two stay separate because the submissions are separate: an assignment is dated
work beside a frozen version, a quiz question belongs to the version itself. They
share one ceiling, 5000 characters, because a teacher marking work should meet
one limit rather than one per surface.

On the quiz side the comment is written in the same statement as the mark, inside
the window `lock_submitted_response()` opens, so it is immutable with the mark and
cannot be quietly rewritten afterwards — a comment a learner can rely on. The
audit records *that* a comment was given and not what it says: the words belong to
one learner about their own work, and an append-only log is the wrong place to
keep a copy.

The learner-facing results panel shows the score and the comments, and
deliberately does not list which automatically marked questions were right. Row
level security already lets a learner read their own responses, so this is not a
secrecy claim but a choice about what a results screen is for: a quiz that reports
every wrong answer becomes an answer key for the next attempt, and these
assessments are reusable by design.

**Feedback has to be actionable, or it is decoration.** A teacher who writes
"cite the verse" on a marked assignment has, until now, produced a sentence
nobody can answer: the submission was `graded`, the row was closed, and the only
way to change it was a second mark over the first. `20261204000100_assignment_revisions`
adds the loop — a learner reopens marked work, edits it, and hands it in again.

The shape of it was the real decision. A revision **reopens the submission as a
draft** rather than opening a second hand-in path. That is what lets the existing
functions stay the only ones that matter: `save_assignment_draft()` edits the
text, `attach_assignment_asset()` and `remove_assignment_asset()` already require
a draft, and `submit_assignment()` re-derives the deadline, the lateness verdict
and the asset-availability check for the new version. A parallel "resubmit"
function would have had to reimplement all three, and the two paths would drift
until one of them let late work through.

Two consequences follow, and both are load-bearing:

1. *Reopening destroys a mark, so the marked version is kept.* Each reopen
   snapshots the graded row into `assignment_submission_revisions` before the live
   row is cleared — text, score, feedback, who marked it and when, and the ids of
   the files that accompanied it. The table is append-only by trigger and reads
   through `can_read_assignment_submission()`, so a snapshot is exactly as private
   as the submission it came from. The learner's own words stay in the live row:
   a revision starts from what was marked, not from a blank page.
2. *A passed deadline keeps the mark instead of destroying it.* Reopening is
   refused once the deadline has gone by on a task that does not accept late work.
   Without that check a learner could trade a grade for a draft they can never
   hand back in — the refusal would arrive from `submit_assignment()`, after the
   mark was already gone. A task that accepts late work allows the revision, and
   the resubmission is recorded as late under the same rule as the first.

Revisions are **on by default with no platform-wide ceiling**. The flag this sits
behind ships off, so a loop nobody can reach is a loop nobody would find; and the
teacher who wants one-shot work — a final recitation, an exam — switches it off
on that task, which is a decision about their own work rather than a number
invented for everyone else's. Where a teacher does set a limit it counts versions
including the first, because "two attempts" means two things a learner hands in.

The policy is deliberately not part of `update_course_assignment_draft()`, and it
can be changed while a task is `open`. Content and deadlines freeze once learners
are relying on them; what happens *after* marking is a different question and a
teacher may legitimately change their mind about it mid-course. Switching
revisions off cannot trap anyone, because `submit_assignment()` does not consult
the policy — a learner already holding a reopened draft can still hand it in. For
the same reason the reopen is not flag-gated, matching submitting and marking:
turning `learning.assignments` off stops new tasks and new openings, while work in
flight keeps its whole lifecycle.

The audit records the transition and the score that was given up, and not the
feedback text, for the reason already settled on the quiz side.

## The flag register is the documentation, and a test holds them together

Decided 2026-10-19, when CI was added.

`FLAGS.md` is what a person reads before switching anything on, and
`platform_settings` is what the code consults. Two descriptions of one thing
drift, and the drift is invisible in exactly the case that matters: a flag the
docs call CODE-gated and unflippable while the table says `admin`, so the
dashboard offers a switch the docs promised would not exist. The parity is now a
database test rather than a habit — every documented key must exist, every
existing key must be documented, every gate must agree, and every flag must
still ship off.

The check reads the Markdown file. That is deliberate: a test that compared the
table against a second copy of itself in SQL would pass no matter how wrong the
documentation became, and the documentation is the artefact under protection.

What the test does *not* do is compare the prose. Preconditions and descriptions
are written twice — once for a reader, once for a trigger message — and forcing
them to be byte-identical would make every wording improvement a two-file
change for no safety gained. Keys, types, gates and shipped-off values are the
part that can hurt somebody.

## What a teacher may see about a learner — **DECIDED 2026-10-19**

Recorded while looking for the next buildable gap, and settled the same day.

"Learner analytics" (`SCREENS.md` row 32) is marked READY, and the teacher
dashboard names it as its missing piece. It was not buildable without a decision,
and the decision was not a technical one.

Today RLS gives a course author **no read at all** on `course_enrolments` or
`lesson_progress`: both are readable only where `can_access_learner()` is true,
which means the learner or their guardian. A teacher sees the work handed to
them — assignment submissions, marks, reviews — and cohort membership as counts
rather than as a roster. That boundary was drawn deliberately and has been
respected consistently.

So a progress analytics screen for teachers would widen it — for a platform that
teaches children, in a product whose dominant principle is ease of use for the
teacher. Both answers were defensible: a teacher who cannot see that half a class
stopped at lesson four cannot help them, and a teacher who can see every child's
pace holds data about children that no parent was told about. The options were
aggregate-only for the author (counts and distributions, no learner attached),
per-learner for the author, or per-learner only for cohort classes where a
guardian opted in to a dated group.

**Chosen 2026-10-19: per-learner, inside an opted-in cohort only.** The third
option. A dated cohort is a group somebody joined on purpose and where a teacher
knowing who is falling behind is the point of the class; a self-paced catalogue
enrolment is a private purchase, and pace is data about a child nobody agreed to
share. Aggregate-only was rejected as the general rule because a count with no
learner attached cannot tell a teacher who to help.

So the boundary to build is narrow and explicit: an author may read enrolment and
progress rows **only** for learners with an active membership of one of that
course's cohorts, and only for the pinned version the cohort teaches. Self-paced
learners keep exactly the access they have today, which is none. The predicate
belongs in SQL beside `can_read_assignment_submission()` rather than in a query
filter, so no second caller can forget it.

The late-join rule was settled in the same conversation and is what makes this
safe to build at all: **the teacher decides when a cohort stops accepting
joiners**, with `join_closes_at` defaulting to the cohort's start date. A
progress view over a class whose membership can still grow in its final week
would be a view over a moving target.

**Implemented 2026-10-20** in `20261212000100_cohort_learner_analytics.sql`.
`can_read_learner_course_progress(learner, version)` is the predicate, added as a
second branch to the existing read policies on `course_enrolments` and
`lesson_progress`, so the learner and guardian branches are unchanged and a
self-paced learner keeps exactly the access they had: none. The insert and update
policies were not widened — a teacher may read progress and may not write it.
Names come through `cohort_learner_progress(cohort)` rather than through a wider
`learner_profiles` policy: it returns four columns of a profile, so `family_id`
and `linked_user_id` are not reachable by a teacher through any query they could
write against it. `SCREENS.md` row 32 is built.

## Who may watch an uploaded master — **DECIDED 2026-10-20**

Found while building the media path, and settled the same day.

`may_play_rendition()` asked one question — is this caller a learner entitled to
this lesson, right now — which is the right question for a learner and the wrong
one for the two other people who need the same bytes. A teacher who uploaded a
lesson recording could not watch it: `can_access_lesson_now()` only ever looks at
learner profiles, and the test that pinned this said authors reach their own
media "by another path". There was no other path. `presignMasterDownload()` had
no caller outside its own tests. So a teacher could upload 8 GiB, watch a row
turn `available`, and never once see what they had made. A reviewer could read
the `lesson_resources` row naming a lesson's object key and could not be served a
byte of it.

**Chosen: three people may watch a master, and a reviewer is not one of them.**

The uploader may watch their own file in whatever state it is in. A `pending`
file has to be watchable by the person who uploaded it, because "look at it
before you confirm it" is the whole point of a pending state; a `quarantined` one
has to be watchable too, because a takedown whose subject you cannot see is a
takedown you cannot answer. Platform staff may watch any master, in any state,
because verifying an upload, judging an appeal and matching a rights complaint
are all acts of looking. The author of a version may watch a master attached to
one of its lessons **only while it is available**: a pending or quarantined file
belongs to its uploader and to moderation, not to the course.

A reviewer gets the **delivery copy and not the archive**. What is under review
is what a learner will see, and a master is up to 8 GiB of unedited footage the
job does not need. The rendition branch sits inside the same `exists` as the
learner branch, so quarantining a master withdraws it from the reviewer and the
teacher as well as from the learner, without a second rule.

**The period is the assignment's state, not its due date.** `accepted` or
`in_progress` and nothing else: somebody who declined never was entitled, and
somebody who completed or was cancelled stops being served at that moment. A past
`due_at` does not cut access, because a late review still has to watch the lesson
— the switch a person controls is the state, and staff cancel an assignment when
it should stop.

**Watching is not saving.** `may_download_lesson()` is untouched: offline copies
are an entitlement a Plus subscriber holds, and neither a reviewer nor an author
has one. Letting either keep an unpublished lesson on a device would undo the one
thing the entitlement exists to control.

**No new flag.** The gate is the predicate — an assignment, an upload, an
authorship — and a flag would be a second switch on a door that already has a
lock, which is a second way to be wrong. Implemented in
`20261213000100_reviewer_media_access.sql`, `/api/media/master`, and the player
on `/review/[assignmentId]`, `/teach/media` and `/admin/media`.

## Who may undo a failed encode — **DECIDED 2026-10-20**

Found while reading the transcode worker's own header, which described its
escape hatch as being for a profile "stuck `failed`, which nothing in the schema
can retry". That was accurate, and it meant a lesson could permanently lose one
of its rungs to a full disk.

`fail_media_rendition()` moved a row to `failed` and nothing moved it back.
`register_media_rendition()` could not open a second one: `(asset_id, profile)`
is unique, so the same profile a second time is refused. A row was therefore
retired by any error the worker judged to be a property of the file, and the only
repair was SQL against the production database — no screen, no function, no audit
entry, no record of who decided the file was worth another attempt.

**Chosen: a person retries it, in writing, and the worker never does.**

`retry_media_rendition(rendition, reason)` is staff-only, requires a reason that
survives trimming, and moves `failed` back to `pending`. It keeps the same row
and the same derived object key, so the next encode overwrites the file that was
never confirmed instead of orphaning an object nobody will ever list. It refuses
unless the master is `available` and not tombstoned, and says which of the two it
is — retrying a copy of a file that is under review would be encoding from
evidence that has been withdrawn. It writes `media.rendition_retried` with **both**
reasons: why the encode failed, and why somebody believed a second attempt would
work. Those answer different questions and only the second one is new.

The reason is required because the decision is the product. The commonest cause
of a failed encode is the master itself — a codec ffmpeg will not read, a file
that is not a video — and an automatic retry would spend encode time on it
forever while the reason went unread. A written reason is also what makes the
audit entry useful to the next person, who was not in the room.

**Rejected: making `register_media_rendition()` an upsert.** It would have solved
the stuck row in one line and quietly changed a documented contract: a duplicate
profile is today a bug worth hearing about, and as an upsert it becomes a silent
overwrite of a row that may be being served. Two writers with one meaning each
beat one writer with two.

**The second writer exists because of the first.** `record_media_rendition_encode()`
re-measures a `pending` row from the encode that is about to be uploaded. A
recovered row's numbers belong to the run that crashed and describe a file that
may never have arrived; `fetchPlayableRenditions()` sorts the quality picker by
`byte_size`, so a stale number there mis-orders the ladder and mis-states a
download size. It accepts `pending` only — an `available` row's measurements are
history, and changing them would rewrite what a learner was served, and a
`failed` row is waiting for a person rather than for a number.

**No new flag.** The gate is the role and the row's state. A flag would be a
second switch on a door that already has a lock, and it would let a deployment
turn off the ability to repair its own failures. Implemented in
`20261214000100_rendition_retry.sql`, `POST /api/admin/media` with
`action: 'retry_rendition'`, and the retry control on `/admin/media`.

## How large a file a teacher may upload from a browser — **DECIDED 2026-10-20**

Settled while lifting the ceiling, because the number that came out is not the
one that was written down before.

A browser could upload 512 MiB while the database accepted 8 GiB. That is not a
conservative limit; it is smaller than the most ordinary thing a teacher has. A
45-minute lesson recorded at the 1080p rung this platform encodes to is about
2 GiB, so the ingest path refused it, and the refusal named a checksum as the
reason — which was true, and fixable.

**The blocker was WebCrypto, not the network.** `register_media_upload()`
requires a SHA-256 digest of the file, and that requirement stays: the digest is
what proves the platform still holds the exact original somebody uploaded, and
what lets a rights request be matched to every copy of it. But `subtle.digest`
takes a whole `ArrayBuffer`, so hashing meant holding the entire file in memory,
and a large recording crashed the tab before it reached the network.

**Chosen: implement SHA-256 in the browser and feed it a slice at a time.**
`web/src/lib/digest.ts` reads `Blob.slice()` in 4 MiB chunks, so memory is
bounded by the chunk rather than by the file. It runs at about 84 MiB/s, which
makes a 5 GiB recording roughly a minute of hashing — reported per chunk, with a
progress bar, because a teacher watching a button that says only "Computing the
checksum…" for a minute closes the tab.

**Rejected: WebCrypto below a threshold, this above it.** It would be several
times faster on a small file, and it is the obvious design. It is refused
because the digest is a security property and two implementations means the one
exercised least — the large-file path, which is the rare one — is where a bug
hides. A wrong digest does not fail loudly: it fails months later, when somebody
tries to match a takedown request to the file. Every upload now goes through the
same code, so every upload tests it.

**The new ceiling is the transport's, not ours: 5 GiB less 5 MiB.** That is the
provider's own limit on a single request, verified against Cloudflare's R2 limits
documentation in October 2026, and the upload is one presigned PUT. The
remaining 3 GiB up to the database's ceiling needs a multipart upload — parts of
at least 5 MiB, all but the last the same size, at most 10,000 of them — which
does not exist yet.

Two consequences of staying on one request are recorded rather than discovered.
A single PUT cannot be resumed, so a failure at 90% of a 4 GiB recording starts
again from zero; Cloudflare recommends single PUT only below about 100 MB for
exactly that reason. And the presigned URL lives at most an hour
(`MAX_UPLOAD_SECONDS`), which at this ceiling means a sustained 1.5 MiB/s or the
URL expires mid-transfer. Both are arguments for building multipart next, not for
picking a smaller number here: a limit the provider set is a fact to design
around, and a limit invented to avoid a build is a product that refuses a
teacher's lesson.

## How full a class is, and who may know — **DECIDED 2026-10-20**

Found as dead code: `cohort_member_count()` was written, tested, granted to
`authenticated` and commented as existing "for the joiner-facing '3 of 12
places'", and nothing ever called it. Meanwhile the course page offered a Join
button next to "Up to 12 learners", so the way to find out a class was full was
to choose it, pick which child was joining, press the button, and be refused by
`join_cohort()` for spare capacity.

The reason it stayed unbuilt is the roster boundary, and the boundary is right:
`cohort_members_read` is deliberately narrower than `cohorts_read`, so a learner
sees their own membership and their family's and never a class list of other
people's children. That rules out the obvious implementation — counting rows
client-side, which is what the teacher's own cohort page does, because a teacher
may read the roster.

**Chosen: a joiner may know a number, and nothing the number is made of.**
`cohort_places(uuid[])` is SECURITY DEFINER and returns one row per cohort the
caller may already read, with `cohort_id` and `active_members` and no third
column. It has to read membership rows the caller cannot, which is exactly what a
definer function is for; what it gives back is an integer about a class the
caller can already see, which discloses nobody. Three of twelve places taken is
not personal data about the three.

**A cohort the caller cannot read is absent from the result, not zero.** Returning
a zero would make a draft class look like an open one with room in it — an
invitation to join something that is not accepting joiners. Absent means unknown,
and the caller renders unknown as silence: no count, and still a Join button. An
unknown count never fills a class, because refusing a joiner over a number that
could not be read is worse than letting them try.

**Rejected: letting the joiner count rows themselves.** It would need widening
`cohort_members_read`, and the narrowness of that policy is the thing protecting
a class list of children. A count that is computed where the rows are readable
and returned as an integer keeps both properties at once.

Also rejected: leaving the count to fail silently at the join. `join_cohort()`
still enforces capacity under a row lock, so the count is never the authority —
it is the courtesy. A class that fills between the page rendering and the button
being pressed still refuses, and now says why in words the page had already
prepared the reader for. Implemented in `20261215000100_cohort_places.sql`,
`fetchCohortPlaces()` in `lib/cohorts.ts`, and the class cards on
`/courses/[slug]`.

## Who may read a support case — implementation invariant

The help desk was built with `can_read_support_case()`, granted to
`authenticated`, tested, and commented as "used by the writer functions; reads
are handled by RLS". Both halves of that comment were false. No writer calls it —
each writer checks the row it is already holding — and the reads that were
"handled by RLS" each spelled the same rule out again, so the definition of who
may see a conversation existed in three places and the one written to be the
single copy was the one nothing read.

**The invariant: `can_read_support_case(uuid)` is the definition, and both read
policies ask it.** `support_cases_read` asks about the row;
`support_case_messages_read` asks about the message's case and then applies the
second, genuinely different question — which of that case's *messages* the reader
may see. An internal note stays inside the team even from the person who opened
the case, and a staff member who opens their own case still reads its internal
notes, because internal notes are staff information and they are staff. That rule
stays inline in the message policy, where a reader of it will look, rather than
moving into a function whose name is about cases.

This is not a style preference. The next change to who may see a case — an
assigned agent who is not otherwise privileged, say — has to be made in one place
now. A policy missed in the old arrangement does not fail loudly: it either shows
one person a conversation that was not theirs or hides one that was, and both
look like the system working.

No recursion, and the reason is worth recording because it is the objection that
stops this refactor being done: a definer function used inside a policy on the
table it reads would loop, except that `can_read_support_case()` is SECURITY
DEFINER, so its own lookup of `support_cases` runs as the function owner and is
not filtered by the policy that called it. `cohorts_read` has used
`can_read_cohort()` the same way since cohorts were built. Implemented in
`20261216000100_support_case_read_predicate.sql`; the behaviour is unchanged, and
the tests that pinned it — a case visible to its requester and to staff and to
nobody else, an internal note invisible to the requester and readable by staff —
pass either way, which is what made the change safe to make.

## How big a class is, and who decides — **DECIDED 2026-10-20**

A direct consequence of publishing the number. Once a learner reads "3 of 12
places taken" and sees a **Full** badge where the Join button was, the capacity
stops being an internal detail of `join_cohort()` and becomes a promise made to
the people it refuses. And it could only be set once, at `create_cohort()`: a
teacher with fourteen people who want in and a class opened for twelve had two
bad options — cancel a running class and open another, moving everybody's
membership and leaving the conversation behind, or turn learners away for a
number they typed once, before anybody had joined.

**Chosen: the teacher who opened the class sets its size, while it is a draft or
open, and the floor is the people already in the room.**

`set_cohort_capacity()` is the sibling of `set_cohort_join_window()` and keeps its
terms: the course author or staff, a draft or an open class, a row lock, an audit
entry. A closed or cancelled class has a size rather than a setting — it is not
taking anybody, so changing the number would edit history.

**A capacity below the current active membership is refused, naming the count.**
The two alternatives are both worse. Allowing it puts the class into a state its
own page cannot describe — "14 of 12 places taken" — and makes the published
number a lie in the direction that matters, since a learner reading it is being
told there is room. Enforcing it means removing a learner from a class because a
number changed, and for a child's class that is the most harmful thing this
feature could do: a parent would receive a withdrawal they did not ask for and
cannot see the cause of. Raising the limit is the act that needs no protection,
and it is the one a teacher actually wants; the refusal costs them nothing they
were entitled to.

**The lock is the same one `join_cohort()` takes, and that is not a detail.**
Both writers select the cohort row `for update` before counting anything, so
either a join lands first and the floor is computed with that learner in it, or
the limit lands first and the join is refused for spare capacity. Without that
ordering the floor could be checked against a count that is already stale, which
is precisely how a class ends up over its own limit — and the failure would be
silent, because both writers would have been individually correct.

**Null means no limit, and it is a choice rather than an omission.** "I will take
everybody" is a real position for a teacher to hold, and blank is how the create
form already spells it, so the writer takes it explicitly instead of defaulting
to it. A capacity of zero is refused: it would be a class nobody can join, which
is a cancelled class wearing a different hat.

**Not flag-gated**, like the join-window writer and unlike `create_cohort()`. The
flag governs arriving: with `learning.cohorts` off, `join_cohort()` refuses and an
open cohort is invisible to a bystander, so a size change publishes nothing.
Taking the control away when the platform switch flips would strand a teacher
mid-class over a decision that is not about them — the same reason closing and
cancelling stay possible with the flag off.

Implemented in `20261217000100_cohort_capacity.sql`, `setCohortCapacity()` and
`validateCapacity()` in `lib/cohorts.ts`, the `set_capacity` action on
`/api/cohorts`, and the size control on `/teach/[courseId]/cohorts`.


## How a large file gets to storage — **DECIDED 2026-10-21**

This supersedes the ceiling sentence in "How large a file a teacher may upload
from a browser" above. That entry was right about the constraint and honest about
the consequence: one presigned PUT carries at most 5 GiB less 5 MiB, it cannot be
resumed, and the browser therefore refused files the database would have taken.
The constraint is storage's and has not moved. What moved is that the browser no
longer uses one request for a large file.

**Chosen: the browser PUTs presigned parts; the server opens, assembles and
abandons the upload.**

Above 32 MiB a file travels in 16 MiB parts — 512 of them at the 8 GiB ceiling,
inside storage's 10 000-part budget with room to spare. `MAX_BROWSER_UPLOAD_BYTES`
is now `MAX_UPLOAD_BYTES`, so the browser and the row refuse the same file for the
same reason instead of the browser being the smaller number and having to explain
itself.

**The three calls that could finish or cancel an upload stay on the server, and
that is the decision rather than a detail.** Initiate, complete and abort are
signed with the deployment's own credentials in `lib/media-multipart.ts`. The
browser receives only URLs that can each write one slice of one key, for fifteen
minutes. Three things follow from it: the XML is never built or parsed in a tab;
the upload id is learned from storage's answer rather than accepted from a client,
so nothing downstream trusts the browser to name the upload it is writing into;
and no presigned complete or abort URL exists to be leaked, replayed or pointed at
another upload. A presigned complete URL is a credential that assembles whatever
parts it is told to, which is not something to hand out. `request_upload` takes a
`transport` for the same reason — registering for `multipart` mints no single-PUT
URL, because an unused presigned PUT is still a live credential for an hour that
can write the whole file to that key.

**Part URLs live 900 seconds and are signed eight at a time.** Signing the whole
plan at once would create hundreds of live credentials, most of which would expire
before they were used on any connection slower than the file is large. Batches also
solve the second half of the large-file problem: a single presigned PUT is limited
to an hour, which at gigabytes means a required sustained bitrate, while an upload
that renews its own URLs every few minutes has no such requirement.

**Retries re-sign.** A part that fails is tried up to three times, and each retry
asks for a fresh URL. The two common causes are a dropped connection and an
expired URL, and the second is not fixed by repeating the same request — it fails
identically three times and reports a network problem that was really a clock.

**Sequential, not parallel.** Storage allows several parts at once and a parallel
uploader would finish sooner on a good link. It would also fail worse on a bad
one: four parts in flight when a connection drops is four retries and a progress
bar that moves backwards, which reads as a broken upload to the person watching
it. One part at a time gives a number that only rises, on the connection profile
this platform is used on.

**Completing is not publishing.** The assembled object leaves the row `pending`; a
staff member still verifies the size in storage before it becomes `available`, on
the same path as a single PUT. Complete also refuses a part list shorter than the
plan, naming both numbers. Storage would accept it and produce a truncated object
whose row still declares the full size — a lesson that stops in the middle,
discovered later by somebody comparing two numbers, instead of now by a sentence.

**Not persisted, deliberately, and not quietly.** The upload id and the accepted
parts live in the page. A part that fails is retried, which is the common case and
the expensive one to get wrong; a tab closed mid-upload starts again from zero,
because a reload has no way to find the upload it was doing. Storage aborts an
incomplete multipart upload on its own lifecycle after seven days, and this asks
for an explicit abort when it gives up, so an abandoned upload costs a week of
storage at worst. Recording the in-flight upload on the row — resumable across a
reload, and an orphan an operator can find and delete — is the next unit, written
into `NEXT.md` rather than left as an implication.

**One new deployment requirement comes with it:** the masters bucket needs a CORS
rule allowing `PUT` from the app's origin and `Access-Control-Expose-Headers:
ETag`. Every part uploads without it and the assembly then fails, because a
browser may not read a response header the server did not expose. The failure
arrives at the end of a long transfer, so the error names the header.

**Rejected:** presigning initiate, complete and abort for the browser (puts the
XML, the upload id's provenance and a finish-or-cancel credential in a tab);
parallel parts (worse failure, worse progress, harder to test); XHR for byte-level
progress (16 MiB parts make part-level progress smooth enough, and `fetch` keeps
the uploader testable in node); persisting an upload id with no way to look it up
again (a stored id nobody can find on reload is storage for its own sake — the
lookup is the work, and it is the next unit); and lowering the browser ceiling to
match the transport, which was the previous state and the reason this one exists.

Implemented in `lib/media-r2.ts` (part planning, part signing, the complete body,
one XML element reader), `lib/media-multipart.ts` (the server's three calls),
`lib/multipart-upload.ts` (the browser's), four actions on `POST /api/media`,
`transport` on `request_upload`, and `shouldUploadInParts()` in
`lib/browser-upload.ts`.


## How an unfinished upload is found again — **DECIDED 2026-10-21**

Parts made an 8 GiB file possible and created a state the schema had no word for:
an upload nobody finished. A multipart upload stores its parts as they arrive, and
the object does not exist until the upload is completed, so a tab closed at part
300 of 512 left bytes in the bucket that no row mentioned. They were billed, they
could not be served, nothing in the platform could find them, and the teacher who
came back paid for the whole file again.

**Chosen: the bucket is the record. Nothing about an in-flight upload is written
to the database.**

The obvious alternative is a column — `media_assets.upload_id`, or a child table
of uploads and parts. It was rejected because a recorded id has to be kept true
against a transfer that is happening somewhere else, and every way of keeping it
true is worse than not having it: written by the browser, it is a client's claim
about state the server cannot check; written by the server at initiate, it goes
stale the moment storage completes or expires the upload, and the row then claims
an upload is in flight that does not exist. Storage is the only authority on what
it is holding, and asking it costs one Class A request at the moment somebody
actually asks — which is rare, and never on a path a learner touches.

**The lookup is by checksum and size.** A page cannot remember an upload id it no
longer has, and "which of your pending files did you mean?" is a question a
teacher cannot answer by looking at a library of files that all say `pending`. The
digest the browser computes before every upload and the size it reads from the
file are the two facts that survive a closed tab, a reload and a different device,
and `media_assets` is already indexed on the checksum because a rights request has
to be matched to every copy. So the second attempt finds the first one's row.

**Scoped to `uploaded_by`, not to what the policy happens to allow.** Staff may
read every row, so without the explicit filter a member of staff uploading a file
a teacher left half-sent would be handed the teacher's object key to write into —
a hole that RLS would not show, because RLS is exactly what lets staff read it.

**The parts are read back from storage.** Which parts arrived, and the ETags that
completing them needs, come from a parts listing rather than from anything the
browser remembers. Resuming from a client's account of what it sent would assemble
an object out of guesses, made by the one party that has already lost its state
once. The same rule refuses a listing that does not fit the plan this deployment
makes — a part of the wrong size means the upload was opened by different code —
and refuses a document that is not a listing at all, because an HTML error page
answered with a 200 parses as "nothing unfinished", and that wrong answer costs a
teacher a transfer they had already paid for.

**Reusing the row is part of the decision, not a side effect.** A second attempt
continues the first attempt's record, including for a file small enough to travel
in one request. The alternative — a new row every time — is what the platform did
before, and its cost is visible to the teacher: a library full of `pending` files
that will never have bytes behind them, each one indistinguishable from a file
somebody is about to verify.

**Staff can end one, and the decision is recorded before the deletion.**
`abandon_media_upload()` is staff-only, requires a reason in writing like every
other reversal here, and writes `media.upload_abandoned` with the key, the bucket,
the upload id, the declared size and the asset's state at the time. Then the caller
asks storage to delete the parts. That order is the point: if storage refuses, the
trail says what was decided and why and storage's own seven-day lifecycle finishes
the job, whereas the opposite order would leave a deletion with no audit entry
whenever the write failed — the one gap an audit trail may not have. The response
reports which of the two happened, because "recorded and deleted" and "recorded,
storage refused" are different facts and only one of them needs a second look.

**No row changes state.** An unfinished upload says nothing about the asset: it may
be `pending` and about to be resumed, or `available` because a later attempt
succeeded and these are the leftovers of an earlier one. Quarantining or
withdrawing as part of a cleanup would be a decision about the file dressed up as a
decision about the bytes, and `delete_media_asset()` already exists for that
decision, with its own reason and its own audit entry.

**Rejected:** a column or child table recording the in-flight upload (state to keep
true against a system that owns it, and a stale row that lies); a checksum lookup
that also trusted a client-reported part list (guesses from the party that lost its
state); resuming automatically without the file being chosen again (the browser
cannot produce the bytes, so there is nothing to resume into); completing an upload
whose parts do not fit the current plan (an object the row cannot describe); and
leaving unfinished uploads to storage's seven-day lifecycle alone, which is what
the platform did before and is still the backstop — the panel exists because a week
of paying for bytes nobody will assemble is a week too long, and because a list
nobody can read is a list nobody can act on.

Implemented in `20261218000100_media_upload_abandonment.sql`,
`findResumableUpload()`, `fetchMediaAssetsByIds()` and `abandonMediaUpload()` in
`lib/media.ts`, the listing readers in `lib/media-r2.ts`,
`resumeMasterMultipart()`, `listUnfinishedMasterUploads()` and
`abandonUnfinishedUpload()` in `lib/media-multipart.ts`, `resume_upload` on
`/api/media`, two actions on `/api/admin/media`, resume in `lib/multipart-upload.ts`
and the upload form, and `UnfinishedUploads` on `/admin/media`.

## What a support agent may see — **DECIDED 2026-10-21**

Six tables were written so that a person answering a support case could explain how
a state came about — `order_status_history`, `subscription_history`,
`entitlement_events`, `course_enrolment_version_history`, `publication_events` and
`adult_learning_shares` — and no screen, route or function read any of them. They
are append-only where it matters and indexed for recency, and together they hold the
only answer to the most common question a paid platform receives: "I paid and I still
cannot watch." Answering that means reading four of them at once — what the order
did, what the subscription did, what the access grant did, and whether the learner
was moved to another version of the course in between. The platform was instead
answering from the current state of those rows, which is exactly the state that has
already changed.

**Decided: one `SECURITY DEFINER` read model, `support_case_history(case)`,** which
returns the whole bundle as one `jsonb` document — who asked, which learners the
case is about, and the orders, subscriptions, access grants, enrolments, publication
events and progress shares behind them, each with the steps that produced it and the
name of whoever took each step. Staff only, refused to everybody else with a
sentence, and it writes nothing: reading history is not a decision about the case.

**No read policy was widened to get it.** That is the part worth recording, because
the obvious implementation is a panel that queries the tables, and it would have
needed two policies opened to staff: `subscription_history` is readable by the
billing account's members and not by staff at all, and `order_status_history` is
readable through the order. A widened policy answers one screen's question by giving
every future staff query path the same reach, permanently, with nowhere left to
write down what support may see. One definer function is one authority: it decides
the scope, it caps what comes back, and the six tables stay closed to everything
else — which is what makes the bundle a policy statement rather than a convenience.

**The scope is the requester's, never the reader's.** The bundle describes what the
person who asked could see: their own learner profiles, the learners in their family
other than a member who only pays the bills, the children of a guardian verified for
progress and not merely for identity, and the billing accounts they are an active
member of — plus the one order they named on the case, which is in scope even after
they left its account, because naming an order is the requester saying which payment
they mean. `can_access_learner()` cannot express this, and the reason is worth
stating as an invariant for every future definer function: **inside a
`SECURITY DEFINER` function the caller is the member of staff, so any predicate
keyed on `current_user_id()` answers for the reader and not for the subject.** Used
as a filter here it would have returned yes for every learner on the platform and
still looked correct from the staff seat. The rule is therefore written out against
the case's `requested_by`, and the tests ask every question from two seats — the
requester's and a stranger's — because a scope that returns too much passes every
assertion written from the side that is allowed to see too much.

**A cap is never silent.** Every section reports how many rows exist beside the rows
it returned, so a panel showing 50 publication events out of 63 says so. The
histories nested inside a row are deliberately uncapped: a state machine has a
handful of transitions, and a list that quietly dropped one of them would be worse
than no list.

**`access_checks` is excluded, and the panel says why.** Its table comment promises
"recorded so a support agent can explain a denial", and nothing in the schema, the
web layer or the worker has ever inserted a row into it — the diagnostic was designed
and never wired, presumably because keeping it would mean a write every time a
learner opens a lesson. Rendering an always-empty section would read as "no denial
happened", the one wrong answer a support agent cannot recover from, so the screen
states in words that refusals are not recorded and points at what to read instead: a
refusal is a missing, expired, suspended or revoked grant, or a retired version.
Recording the gap is the decision; quietly omitting the table would have left the
next reader to rediscover it.

**`adult_learning_shares` is included, and empty means empty.** Nobody has been given
sight of this adult's progress, which is a true and useful answer. What is not true
yet is that a person can create one: no screen or route writes that table, only SQL.
The console can therefore show a share that nothing in the product can make — a gap
in the adult privacy story, recorded in `NEXT.md`, not something this panel should
paper over by hiding the section.

**Rejected:** widening the five read policies to `is_privileged` (loses the single
authority on what support may see, and makes each table independently readable by
any staff query forever); a plain view over the six tables (a view reads as its
owner and bypasses the underlying RLS unless it is declared `security_invoker`,
which is a Supabase footgun that fails open); one function per section (five to seven
new RPCs for a single screen, and the scope recomputed six times with six chances to
differ); a client component fetching sections on demand (the scope would then be
decided by a request the browser can shape); and defaulting a missing section to an
empty list in the web layer, which is the same lie as the empty denial log, told one
layer up.

Implemented in `20261219000100_support_case_history.sql`, `readCaseHistory()` and
`fetchCaseHistory()` in `lib/support.ts`, and `CaseHistory` on
`/support/<caseNumber>`.

## Who may review, and who decides that — **DECIDED 2026-10-21**

Publication needs a scholarly approval; an approval needs an assignment; an assignment
needs a reviewer whose profile reads `active`. Nothing in the application could put a
profile in that state, so the question "who may review" had no answer the product could
give — only SQL could. This decides who answers it, and what each answer leaves behind.

**Governance staff means `governance_admin` or `platform_admin`, not `is_privileged`.**
`is_privileged` is the house gate for staff and it is right for most of what staff do.
It also admits a support agent, which is the least-privileged staff role and should stay
that way: somebody who can read a case and refund an order should not thereby be able to
appoint the scholars who sign off on what the platform teaches children. The same pair
guards the functions and the route, so the route is a courtesy and the database is the
defence, and a test pins the refusal from the support agent's seat.

**Applying is the only route to `applicant`, and no status may be set back to it.**
`set_reviewer_status` takes `active`, `suspended` or `inactive` and refuses the other
two. An admin who could write `pending_verification` could un-verify a reviewer while
leaving the record saying somebody had checked them — the same shape as an audit entry
that can be edited, which is the one kind of record worth nothing.

**Checking somebody is setting them `active`, and it is recorded once.** Activation
writes `verified_at` and `verified_by` only when they are empty. Reinstating a suspended
reviewer does not move either, because verification is a fact about a moment: who
checked this person, and when. A row that always pointed at whoever last touched it
would answer a different question and look like it answered this one.

**Suspending or retiring needs a written reason; checking somebody does not.** The
asymmetry is deliberate. Ending somebody's access is a decision about a person that
they may dispute, so the reason is part of the record. Verifying is the ordinary case
and asking for an essay each time would only produce "ok".

**A qualification is claimed by the reviewer and checked by staff, and the two are
different acts.** `record_reviewer_qualification` always writes `pending`, whoever calls
it, and the audit entry says whether staff recorded it for somebody else. Recording one
does not authorise a subject: a claim about a certificate and a decision to let somebody
judge a subject are separate, and collapsing them would let a reviewer grant themselves
the thing that actually matters.

**A validity window that has closed cannot be recorded, either way.** `verified_at` is
written on a rejection as well as a verification, and `rq_validity_window` requires it to
fall inside the window, so a past date would surface as a constraint violation rather
than a sentence. Refusing both is the honest reading: an expiry date in the past is not a
validity window.

**Revoking keeps the row, and granting again writes a new one beside it.** The partial
unique index allows one live (`pending` or `active`) authorisation per reviewer per
subject per scope, so a revocation has to stay as a row for the record to survive the
next grant. What a reviewer was allowed to judge, and when that ended, is the history
governance is asked about later.

**A declaration bars the assignment immediately, and only a written assessment lifts
it.** `declared`, `under_assessment` and `disqualifying` all bar; `accepted` and
`resolved` do not. The bar is not lifted by staff happening to read it, and the two
answers that let a conflicted reviewer work again both need the reason in writing,
because each one ends a protection that was standing between a course and a review by
somebody who could not judge it impartially. Only the reviewer may declare one — the
insert policy admits nobody else, and the function takes no reviewer parameter, because
a declaration about somebody else is not a declaration.

**Two columns were added to the client grant, and two were not.** `deleted_at` is
granted because a `WHERE` on an ungranted column is refused outright, and the shipped
`fetchAssignableReviewers()` filtered on it: the reviewer dropdown on `/admin/reviews`
could only ever fail, and the page with it. A closed profile is not a secret — the read
policy already hides the row from everybody but staff and the reviewer. `verified_by` is
granted on both tables because a governance screen that cannot say who checked a
reviewer, or who checked a qualification, asks to be trusted instead of showing its
record; the same fact is already freely readable on an authorisation (`approver`).
`internal_notes` and `evidence_reference` are not granted, and a test asserts they still
are not, so the fix cannot drift into an over-grant.

**The consequence of leaving `evidence_reference` alone is stated on the screen, not
hidden.** `reviewer_qualifications_read` admits every privileged role, a support agent
among them, and the storage key of an identity document is not something to hand out
beside a refund permission. So the register cannot show the document, which means
checking a qualification is a judgement made from evidence held outside the platform. The
card says exactly that in words. A signed evidence route for governance staff is the
missing piece, recorded in `NEXT.md`; implying the check saw something would have been
the worse choice.

**Not decided, and not implemented either way:** whether a scholarly authorisation should
require a verified qualification in that subject. It is a governance policy about who is
trusted with what the platform teaches, and guessing it would bury the answer in a
predicate nobody reads. The screen shows a reviewer's verified qualifications beside the
grant control instead, so the decision can be made with the evidence in front of whoever
makes it. Recorded as open in `NEXT.md`.

**Rejected:** gating the register on `is_privileged()` (a support agent could appoint a
scholar); letting staff set `applicant` or `pending_verification` (an editable
verification record); rewriting `verified_by` on reinstatement (verification stops being
a fact about a moment); requiring a verified qualification before granting a subject (an
undecided policy, implemented as though it were decided); letting staff insert a conflict
declaration for a reviewer (the insert policy is reviewer-only and the declaration would
then be somebody else's words); one bundle function returning the whole register as
`jsonb` (RLS already admits governance staff to every row except two columns, so the
bundle would only have hidden the column grants that were the actual problem); and
granting `evidence_reference` to make the check meaningful (it would hand an identity
document's storage key to every privileged role).

Implemented in `20261220000100_reviewer_register.sql` (seven functions and two grants),
the register section of `lib/review.ts`, `/api/review/profile` and
`/api/admin/reviewers`, `/admin/reviewers`, the register panel on `/review`, and the
conflict form on `/review/[assignmentId]`.

## What a version needs before it can publish — **DECIDED 2026-10-21**

`content_review_requirements` existed with two rules reading it and nothing writing it.
Publication refuses while one is open, and a reviewer who is not authorised for a required
subject cannot be assigned at all. With no writer, neither rule ever fired; with no way to
set `satisfied`, the first row anybody wrote would have locked that version forever. This
decides how a requirement is written, how it closes, and who may say it does not apply.

**Closing one is a recount, not an event.** A requirement is satisfied when enough
approvals exist, in its scope, from reviewers authorised for its subject, counting
distinct assignments so one reviewer approving twice is one approval. The count is stored
nowhere, and that is deliberate: a counter column would be a second fact to keep true, and
a counter that drifts from the decisions behind it is worse than no counter. Instead
`refresh_review_requirements()` computes it, and runs on every approved decision, whenever
a requirement is written or changed, and whenever a screen asks.

**The recount moves a requirement one way.** Open to satisfied, never back. Reopening is
something a person does — raising `required_approval_count` — and it is audited as an act
rather than appearing as a state change nobody asked for. The alternative is worse in both
directions: a reviewer whose authorisation expires next year would silently retract a
review they validly gave, and a version would become unpublishable for a reason no screen
could explain. So an approval counts while the authorisation is live and stays counted
afterwards; a revoked authorisation stops *new* approvals counting, which is a decision
about the future.

**The panel reads the recount, not the table.** Status and approval count come from the
recount; subjects, waivers and names come from the rows. That is not a preference for a
fresh read: the counting rule lives in SQL, and a TypeScript copy of it would be the
second implementation of one rule, which is how a rule ends up enforced in one of them.
When the recount itself fails the panel says so and shows the rows, because a panel
showing stale statuses tells a teacher their course can publish when it cannot.

**Waiving is governance-only and written.** It is the one act here that lets a course
publish without a review somebody asked for, so it carries the reason and the name, and
it is audited with the state it replaced. Waiving twice reports the state already there
rather than rewriting the first reason. Reopening a waived requirement clears both waiver
columns, because `crr_waiver_agrees` ties them to the status and a waiver that no longer
applies should not keep its paperwork attached. An author may not reopen one.

**A waiver does not replace the approval the gate always needs.** `governance.min_approvals`
is a separate dial, and waiving a requirement leaves it alone. The test pins this because
the opposite reading is easy to fall into: a governance admin who waives everything has not
turned peer review off, they have removed the subject-specific requirements on top of it.

**Who may write what, and the helper that lies.** Requirements and change classifications:
the version's author or governance staff. Technical checks: the author, a reviewer assigned
to that version whose assignment is accepted, in progress or completed, or governance staff.
The authorship test reads `course_versions.created_by` against the session and does not
call `can_author_version()`, which short-circuits on `is_privileged()` and therefore answers
"may act as the author" — a question whose answer is every member of staff, a support agent
included. That is fine for the `crr_write` policy, where the table's other rules are the
gate. It is not fine inside a function that *is* the gate: a support agent who could write
what a course needs reviewed could also write that it needs nothing.

**What is not enforced, on purpose.** A technical check does not touch the publication gate;
the table's own comment says it is never a substitute for scholarly approval, and a
self-check that gated publication would be a self-approval. A failed check is recorded and
shown, and a test publishes a version carrying one. A change assessment does not create
requirements either: it classifies, and the classification is what the next reader sees
first. The one thing the schema does enforce is that a doctrinal or source change cannot be
called low risk or exempt from re-review, and the form does not offer that combination.

**An author may be their own technical reviewer.** `validate_review_assignment()` refuses the
author as a *scholarly* reviewer only, so a technical requirement can be met by the person
who wrote the version. That is the recorded intent of the scope — "the limited check the
recorded decision allows an author to perform on their own course" — and it is why a
technical requirement is not a substitute for a scholarly one. Left alone deliberately;
changing it would be a governance decision about what a technical review is for.

**Rejected:** a staff "mark as satisfied" button (a human ticking a box the facts already
answer, and a satisfaction with no approvals behind it); a stored approval counter on the
requirement (a second fact to keep true); letting the recount reopen satisfied requirements
(silent retroactivity); computing the count in TypeScript as well (two implementations of
one rule); gating on `can_author_version()` (admits every privileged caller); creating
requirements automatically from the version's catalogue subject tags (tagging is how a
course is found, a requirement is a governance decision, and deriving one from the other
would have blocked every tagged course the day it shipped, with waivers as the only exit);
making a technical check part of the gate (a self-check that gates is a self-approval); and
requiring a change assessment before a version may be submitted (a new precondition on a
path teachers already use, decided by nobody).

Implemented in `20261221000100_review_requirements.sql` (five functions and a trigger),
`lib/review-requirements.ts`, `/api/review/requirements`, and the shared `RequirementPanel`
and `VersionChecks` components on `/teach/[courseId]`, `/admin/reviews` and
`/review/[assignmentId]`.

## Who may see an adult's learning — **DECIDED 2026-10-21**

Adult learning is private by default, including inside a family. That sentence was
written into the comment on `adult_learning_shares` in the first week, with the table
built to match it — three scopes, an expiry that has to be in the future, a revocation
timestamp the status is tied to by a CHECK, one active share per person per scope — and
nothing ever wrote a row. This decides what a share is worth, who may grant and end one,
and what the panel is allowed to say.

**A share is the only route in, and it names one account.** No "share with my family",
no "share with my teacher", no group. Family membership is a different relation with
different rules (a guardian sees a child's learning because of the child, not because of
a preference), and a group grant would make the answer to "who can see this?" depend on
membership of something else that changes without the learner being asked again. One
account, one scope, one row.

**A share is never edited.** Changing the terms means revoking and granting again, so the
record of what was granted, to whom, when, and when it ended is never rewritten. The
unique index allows one *active* share per person per scope, which is what makes this
possible: a revoked or expired row stays as history and a new grant sits beside it.

**`expires_at` is the fact; `status` is a copy of it, and readers correct it.** There is
no scheduler here, so without a correction a lapsed share would keep reading `active`
while granting nothing — the row a person reads would say access and the rule deciding
access would say otherwise. Both readers flip lapsed rows to `expired`, audited, before
returning anything. It is a write inside a read and it is deliberate; the alternative is
a table that lies until somebody runs a script. The correction never touches a
revocation, because who ended a share is part of the record.

**The predicate is stricter than the column.** `may_read_shared_learning()` requires an
active status *and* an unpassed expiry, and answers false for a kind that is neither
`progress` nor `achievements` rather than treating it as neither. A caller cannot typo
its way into a share it does not hold, and a scope of both covers both while a narrower
one covers one — the overview reports which of the two the reader holds, so no panel can
imply more than was granted.

**The flag gates granting, and does not gate reading or revoking.** `family.adult_shares`
ships off and the database refuses every writer while it is off, so the panel says so
instead of offering a form that cannot work. But a share granted while it was on has to
stay revocable after it is turned off: switching a feature off must not strand somebody's
privacy decision with no way to end it. The same rule the support history follows.

**Revoking belongs to the person who granted it, or to governance staff.** Not to the
person shared with — they did not grant it and their consent is not what is being
withdrawn — and not to every privileged caller. "Administrator" in the policy's own
comment is read as `governance_admin` or `platform_admin`, because a support agent who
can read a case and refund an order should not be able to end somebody's privacy
decision.

**Naming a person discloses that their account exists, and that is recorded rather than
hidden.** The form asks for an email address because nobody knows their friend's uuid,
and `resolve_share_grantee()` answers whether an account has it. `invite_family_member()`
has answered the same question the same way since the family tables were built. The
alternative — resolving nothing and granting nothing — leaves a person believing they
shared something they did not, which for a privacy control is the worse failure. Nothing
beyond existence is disclosed: no email comes back, no learner, no progress, and a
suspended or closed account is refused rather than resolved. Removing the disclosure
means an invite flow with a token and an expiry, recorded as open in `NEXT.md`.

**The panel says what it cannot know.** The name shown after a lookup is whatever that
account set, and this platform has no way to prove which account belongs to whom. So the
form prints the name it found, asks the person to check it, and offers the length of the
share beside its scope: a week is a cheaper mistake than forever.

**Rejected:** sharing with a family or a group (the answer to "who can see this?" would
depend on membership of something that changes without the learner being asked); letting
somebody request access (a request is pressure, and privacy by default means the grant
starts with the owner); editing a share in place (the record of what was granted would
stop being a record); a scheduler or cron to expire shares (a new moving part to keep
alive, when two readers can correct what they see); gating reads and revocations on the
flag (stranded privacy decisions); routing a child's progress through this table (the
trigger refuses it, and a child's visibility is a guardian question with its own rules);
and an email lookup that hides whether an account exists (a share that silently does
nothing).

Implemented in `20261222000100_adult_learning_shares.sql` (six functions),
`lib/sharing.ts`, `/api/account/sharing`, and `/account/sharing`.
