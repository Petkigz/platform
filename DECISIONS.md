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
