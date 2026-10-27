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
   account is deleted. `platform.safeguarding` is CODE-gated, and what is
   unbuilt is the screening record; the conduct policy itself is now a draft in
   the register with those questions marked.

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

## What a total in more than one currency means — **DECIDED 2026-10-21**

The platform charges in whatever currency a family has and the owner reads one figure,
in USD. "USD reporting currency" was in the project record before any code existed, and
`currency_exchange_rates` was built in the payments migration with an index shaped for
exactly the question it answers — the newest rate for a pair at a moment. Nothing could
write to it, `financial_transactions.fx_rate` and its two provenance columns were
required by a constraint and never set by any function, and every money screen summed
mixed currencies together. This decides what a converted total is allowed to be.

**The reporting currency is a dial, not a constant.** `finance.reporting_currency`
lives in the register beside the revenue share, because a number that changes what every
total says is a business decision an admin makes and `FLAGS.md` records. D4 is untouched:
the original amount and currency stay authoritative and stored, and conversion happens
on the way to being read. The same order read tomorrow at a different rate is still the
same order.

**A rate is a fact a person looked up, and says where.** There is no rate feed in this
environment and no credential to call one with, so `source` is a sentence — "Bank of
Uganda, mid rate" — and not a dropdown of integrations that would imply an automatic
feed. A rate with no source is refused: when a total looks wrong, the source is the only
thing that makes it checkable. A provider integration later is a second writer of the
same table under the same requirement, not a replacement for the field.

**An implausible move needs a written reason.** A new rate more than
`finance.rate_sanity_factor` times the previous one for that pair is refused unless the
person entering it says why, and the reason is kept in the audit row beside the rate it
overrides. A slipped decimal is a hundredfold error in the only number the owner reads
and it looks perfectly reasonable on screen. The guard is a refusal with a way through
rather than a hard limit, because a currency does sometimes move that far and the person
entering the rate is the one who knows. Setting the factor to 0 turns the check off, and
the report still shows the move beside the total it produced.

**A pair nobody recorded converts to nothing.** NULL, never 1, never the last rate on
the shelf for some other pair. Guessing that an unknown currency is worth a dollar is
the one mistake here that would be invisible: the total would still look like a total.
Unconverted money is its own row in the report, the missing pairs are named, and the
warning says the total is smaller than the truth until a rate exists.

**An inverted rate says it was inverted.** When only the other direction was ever
recorded, `1/rate` is arithmetic and not a guess, so it is used — flagged `derived`, and
sourced as derived from the published rate it came from. A total resting on a rate
nobody ever quoted should say so on the same line as the figure.

**Minor units are per currency, on both sides of the conversion.** 5 000 minor units of
UGX is 5 000 shillings and 5 000 minor units of USD is 50 dollars, so applying a
major-unit rate without dividing by one divisor and multiplying by the other is 100x
either way. The exponents live in `currency_minor_divisor()` and, independently, in
`lib/money.ts`, because a browser has to display an amount and cannot call a function
for it. Both copies grew to the full ISO lists — 17 zero-decimal codes and the 7
three-decimal dinars, neither of which the web copy had — and both are pinned by a test
on their own side asserting the same codes.

**FX provenance has one source.** `record_transaction_settlement()` refuses a
cross-currency settlement when no rate is recorded, rather than accepting a rate typed
in beside it. A settlement cites a row from the shelf or nothing, which is what makes
`fx_rate`, `fx_source` and `fx_observed_at` mean something. Re-recording is allowed,
because a provider restates, and the earlier figure stays in the audit row.

**The report does not net.** Credits and debits are totalled separately and no single
figure is produced, because whether a chargeback offsets the capture it came from, and
whether a provider fee comes off revenue here or the teacher's payout there, are
decisions about the business rather than about arithmetic. Recorded as open in
`NEXT.md`; the report says on its face that it does not net.

**Rejected:** converting stored amounts into USD (D4 — the original currency is
authoritative, and a ledger that changes when a rate does is not a ledger); defaulting a
missing rate to 1 or to the last known pair (invisible in a total); a rate feed with no
credential to call it (a stub that pretends to be automatic is worse than a form); typing
an FX rate in beside a settlement (two places a rate can come from, and only one of them
audited); netting debits against credits to produce one revenue figure (an undecided
policy buried in a sum); and keeping the minor-unit exponents in one language only (the
browser cannot call the database, so both copies exist and both are tested).

Implemented in `20261223000100_currency_reporting.sql` (eight functions, two controls),
`lib/currency.ts`, `lib/money.ts`, `/api/admin/exchange-rates`, `/api/admin/money-report`,
a `settle` action on `/api/admin/reconciliation`, and the screens `/admin/exchange-rates`
and `/admin/money-report`.

## Who may write an order — **DECIDED 2026-10-21**

`orders_insert` and `order_items_insert` asked one question: is the writer a member of
the billing account? A payer is. So a payer could write the money rows directly — a
total of their choosing, and a line naming any product in the catalogue at a unit price
of zero with no price behind it — and `record_payment_success()` would fulfil from
`order_items.product_id`, which the payer had written. Both CHECKs on the tables are
satisfied by that pair of rows, because they hold an order internally consistent and
say nothing about whether the platform agreed to sell it. The validation existed in
`createOrder()` in TypeScript, which was one of two paths to the table. This decides
who writes a money row, and with what.

**A money row is written by a function or by nobody.** Row-level security answers "may
this person touch this row", which is the right instrument for reading an invoice and
the wrong one for creating one, because the interesting question about a new order is
not *who* but *what*: what is being sold, at which price, for how much. That is a
derivation from rows the platform already owns, and a derivation belongs in one place
that every order passes through. `create_course_order(course_id, price_id)` is that
place for a course, as `create_plan_order()` already was for a subscription.

**The insert policies are dropped, not narrowed to staff.** A staff-only insert would
still write a line that fulfilment trusts with no price behind it, and would leave two
ways to make an order — one audited and one not — which is how the two drift apart
again. With no insert policy at all, a definer writer is the only way an order or an
order line comes into existence, and "who created this order" has one answer. Reading
is untouched: a payer still sees their own orders and lines and nobody else's.

**The amount is a fact about a price row, so the caller cannot send one.** The writer
takes a course and a price and derives everything else: the published version, the
product that links that version to that price, the currency, the total, the single line,
the snapshot. There is no amount parameter to validate, no product parameter to
cross-check and no status parameter to refuse — the surface a caller can influence is
two ids, and an id that does not describe a real offer is a refusal. `amountMinor`
comes back as a decimal integer string, because money in this codebase is a bigint all
the way to the wire and a JSON number is where it would stop being exact.

**Who pays is derived from the session, not from the request.** The writer takes the
actor from the JWT claims and resolves the billing account from that actor's own
memberships, requiring `can_manage_payment_methods` — the same test
`create_plan_order()` applies — and matching the account's `billing_currency` to the
price's, opening an account only when the payer has none in that currency. D4 says the
account currency is authoritative for the original amount, and an order in one currency
hanging off an account billed in another is a contradiction that no screen can render
honestly. `createOrder()` lost its `userId` argument for the same reason: a user id in
the request is a value the caller chooses.

**A closed platform says it is closed.** `commerce.checkout` is enforced inside the
writer, which makes the flag load-bearing for the first time — it was registered and
read by nothing, so "ships off, enabled from the dashboard" was untrue for checkout
specifically. The buy page reads it too and says so instead of offering a form that
fails after the payer has chosen a provider and typed a phone number. Refusals are keys
(`checkout:price_window`) mapped to sentences in TypeScript, matched exactly rather than
by regex over English prose, because prose matching breaks the moment somebody rewords a
`RAISE`. An unmapped key becomes a 500 rather than a friendly guess: a refusal nobody
anticipated should be loud.

**Not decided here, and asked rather than assumed.** Whether buying a course the account
already owns should be refused (entitlements are granted account-wide, so a second
purchase is redundant rather than per-child); and how `prices.market` is meant to choose
a price, since nothing enforces it today and the buy page lists every market's price to
every visitor. Both are in `NEXT.md` under open decisions.

**Rejected:** validating in TypeScript and writing through RLS, which is what existed —
a rule in one of two paths is a suggestion to whoever uses that path; narrowing the
insert policies to privileged roles (a second, unaudited way to make an order); a
`BEFORE INSERT` trigger that re-checked the amount (it would have to re-derive the offer
from the product to know the right answer, which is the writer's job, and a trigger that
refuses still leaves the client writing rows); an amount parameter "because the provider
needs to be told" (the provider is told from the order, never the reverse); gating
checkout in the route only (the route is one of the paths, which is the whole problem);
and dropping `order_adjustments_insert` in the same step, because it needs its audited
writer first and that is the next unit rather than this one.

Implemented in `20261224000100_course_order_writer.sql` (one function, two policies
dropped), `web/src/lib/checkout.ts`, `web/src/app/api/checkout/route.ts`,
`/courses/[slug]/buy`, `supabase/tests/course_order.test.mjs` and one inverted
assertion in `supabase/tests/fulfilment.test.mjs`.

## What an order's total is made of — **DECIDED 2026-10-21**

`orders_totals_agree` held an order to itself — total = subtotal − discount + tax — and
nothing held it to the rows behind it. The subtotal was not the sum of the lines.
`order_adjustments` could be written by any member of the billing account, which is to
say by the customer, and was read by nothing, so a discount changed no total and an
invoice could not show one. There was no column for a fee, so a provider charge was
either folded into the tax column or into the total, which the CHECK refuses. This
decides what the parts of a total are, who may change them, and when they stop being
changeable.

**A total has five numbers and they come from rows.** `subtotal_minor` is the sum of the
order's lines, `discount_minor` the sum of its live credits, `tax_minor` the sum of its
live tax debits, `fee_minor` the sum of its other live debits, and `total_minor` is
subtotal − discount + tax + fee, which is now the constraint. A fee gets its own column
because a charge that cannot be shown is a charge nobody can check, and because tax is
the one part of a total that may have to be remitted to somebody — hiding a provider fee
inside it is not a rounding convenience, it is a wrong filing.

**One function derives them.** `recompute_order_totals()` reads the items and the live
adjustments and writes all five columns. It is not callable by a client: a recompute
nobody asked for is a total that changed with no row to explain it, and the only callers
that need it are the two writers, which call it after every change they make.

**Adjustments happen before payment, and after payment they do not happen at all.** Once
an order is paid its total is history — a capture was written for exactly that amount and
a teacher's earnings were accrued from it — so both writers refuse a paid order and point
at `record_financial_adjustment()` or a refund, which are separate rows that leave the
original amount intact. That is D4 applied to a correction: the way to change what a paid
order means is to add a row beside it, never to edit it.

**A wrong adjustment is voided, not deleted.** It keeps its type, amount and reason, gains
who withdrew it and why, and stops counting. The payer can still see it on `/orders`,
marked withdrawn. A total that cannot be reconstructed from what the person paying can see
is a total that looks arbitrary, and "the discount disappeared" is not an explanation
anybody can audit.

**Direction follows from type, except where it genuinely cannot.** `manual_discount` is a
credit; `tax`, `fee` and `shipping` are debits; a contradiction is refused rather than
stored, because a discount that adds money is not a discount and a tax that removes it is
not a tax. `rounding` is the one type that can go either way — 12 347 UGX down to 12 300 is
a credit, up to 12 400 a debit — so it is the one that asks, and refuses to guess.
`promotion` is refused outright: the constraint requires a redemption id, nothing can write
one, and accepting a hand-typed id would manufacture the row the constraint exists to
guarantee.

**Only finance may adjust an order.** An explicit `platform_admin` or `finance_admin` pair,
not `is_privileged()`, which includes `support_agent` — the least-privileged role in the
platform, whose job is to read an order and answer a question about it. Changing what an
order costs is not that job, and a test pins the refusal so a future "staff only" shortcut
fails loudly.

**The invariant fires when the numbers become history.** A BEFORE UPDATE trigger on
`orders.status` refuses to let an order become paid, partially refunded or refunded while
any of its four columns disagrees with the rows behind it, naming both figures in the
error. That is the moment a capture and an earnings entry are written from the total, so it
is the last point at which a wrong number is cheap. It does not fire on INSERT: an order is
always born `pending_payment` with its line written next, and on INSERT the sum of its
lines is necessarily zero.

**Left open, and asked.** Who funds an order-level discount. A teacher's gross is computed
from the order's lines, so a discount comes out of the platform's margin and the teacher
still earns a share of the pre-discount price — right for a scholarship the platform chose
to give, questionable for a promotion a teacher asked for, and at the extreme it accrues
more than the order collected. Every candidate guard is a different answer to that
question, so the behaviour is pinned by a test and recorded in `NEXT.md` instead of being
decided by whoever wrote the migration.

**Rejected:** leaving the totals un-derived and validating them in a route (two paths, one
rule); deleting a wrong adjustment (an unexplainable total); allowing an adjustment after
payment and re-deriving the ledger row (the ledger is the record of what happened, and D4
says the original amount stays); a CHECK constraint for the parts invariant (whether an
order's columns describe its rows is a question about other tables, and a CHECK cannot ask
it); accepting a currency on an adjustment (it could not be added to the total); accepting
a direction for every type (a discount that adds money); narrowing
`order_adjustments_insert` to staff instead of dropping it (a second, unaudited way to
change a total); and gating the writers behind a new flag (finance correcting an unpaid
order is not a feature to be switched on, and the promotions part of it is already refused
by the undecided policy rather than by a switch).

Implemented in `20261225000100_order_adjustment_writer.sql` (one column, three functions,
one trigger function and trigger, one policy dropped, three constraints added and one
widened), `web/src/lib/checkout.ts` (`describeOrderBreakdown`, `describeOrderAdjustment`),
`/orders`, `supabase/tests/order_adjustments.test.mjs` and one rewritten test in
`supabase/tests/course_order.test.mjs`.

## Who may read every order — **DECIDED 2026-10-21**

`orders_read` is `is_billing_member(billing_account_id)`. A payer sees their own invoice
and nobody else's, which is right, and it also meant a finance admin could not read a
single order — so `add_order_adjustment()` and `void_order_adjustment()` had no screen,
because there was no way to find the order to adjust. This decides how finance sees
orders, and it is not by widening that policy.

**A reader is a function.** `admin_orders_overview(limit)` is `SECURITY DEFINER`, gated on
`platform_admin` or `finance_admin` — the same pair the two writers require, so a screen
never shows an order whose buttons would refuse — and it returns shaped data: the five
totals as decimal integer strings, the lines with their snapshot titles, and every
adjustment including withdrawn ones. A policy returns a table and cannot be shaped,
limited, ordered or narrowed to the rows that mean something.

**Not `staff_only()`.** `is_privileged()` includes `support_agent`, whose job is to answer
a question about one order that already has a case open. Widening the policy would have
handed every order on the platform to every privileged role, including the one with the
least privilege, and would have done it in a predicate on a table rather than in a
function that can be reasoned about, tested and changed. The refusal for a support agent
is pinned by a test that first asserts the agent *is* privileged, so the test cannot pass
by ceasing to test the trap.

**Only orders whose total can still change.** The queue is unpaid orders and excludes
deleted ones. A paid order's total is history — a capture and a teacher's earnings were
written from it — so a paid row on this screen would be a row whose every button refuses,
and the instruments that do apply to it live on `/admin/reconciliation` and
`/admin/financial-adjustments`, which the page links to. The reader is limited, defaults
to 50 and caps at 200: a query that returns every unpaid order on the platform gets
slower every week and is not what anybody opening the screen wants.

**One figure per currency, never one number.** The queue header totals the orders it
shows per currency code. Orders on this platform are in whatever currency a family has,
and a sum across currencies looks like money and is not — the same mistake the money
report exists to avoid, in a much smaller place.

**Rejected:** widening `orders_read` to privileged roles (every order to every privileged
role, including support); a view (a view is still governed by the policy underneath it, so
it would have needed the same widening); reading orders client-side and filtering in the
browser (the read would fail before the filter ran); listing paid orders with disabled
controls (teaches people to click and read errors); asking for an order id on a form
instead of showing a queue (a finance admin cannot know an id they cannot look up); and a
new flag for the screen (reading the queue is not a feature to be switched on, and the
writers it feeds are already gated by role and by the state of the order).

Implemented in `20261226000100_admin_order_queue.sql`, `/admin/orders` with
`order-queue.tsx`, `/api/admin/orders`, `lib/order-adjustments.ts` and
`supabase/tests/admin_order_queue.test.mjs`.

## Who pays for an order-level discount — **DECIDED 2026-10-22**

Asked because `accrue_instructor_earnings()` computes a teacher's gross from the order's
*lines*, so a discount recorded with `add_order_adjustment()` came out of the platform's
margin while the teacher still earned a share of the pre-discount price — and at the
extreme accrued more than the order collected.

**Decided: the discount is split at the revenue-share rate.** With a 50% share, a 10 000
UGX discount costs the teacher 5 000 and the platform 5 000. Arithmetically that is the
teacher's share of the *discounted* line total: gross becomes the line's total less its
pro-rata portion of the order's live credits, and `net = round(gross × share / 100)` is
unchanged in form, so `iee_split_agrees` still holds the row to it. Worked example at a
50% share, subtotal 50 000, discount 10 000, fee 1 250: gross was 50 000 and net 25 000;
gross becomes 40 000 and net 20 000; the platform collects 41 250 and keeps 21 250 instead
of 26 250. Each side loses exactly half the discount.

Only **credits** are shared. A fee is the platform's cost and stays the platform's; tax is
remitted and is nobody's revenue; a rounding credit is shared like any other credit because
it reduces what was collected.

Two consequences to honour when this is built. The apportionment has to sum exactly to the
order's credits — with several lines, integer division leaves a residual, and the residual
goes to the largest line rather than being dropped, because a rounding error in a split is
money that quietly disappears. And with several teachers on one order the apportionment is
per teacher's lines, which the accrual already groups by, so the shape of the loop does not
change.

The test in `order_adjustments.test.mjs` that pins today's behaviour is the thing that
changes, and it should change to assert the split rather than be deleted: the pinned
behaviour was recorded so this decision could be made against a fact.

## What a promotion is, and who may use one — **DECIDED 2026-10-22**

Asked because three promotion tables are dormant with no writer, and
`add_order_adjustment()` refuses the `promotion` type outright: `oa_promotion_agrees`
requires a `promotion_redemption_id` and nothing can write one.

**Decided: build the full thing — codes plus eligibility rules, stacking and a floor.**
Not the minimal code-only version. That means: who may use a code (new customers only, a
named course or plan, a defined audience), whether a promotion may combine with another
promotion or with a manual discount and in what order, and a floor below which a discount
cannot take an order.

It will be built in stages, because the first stage is what unblocks code and the rest are
policy surfaces that can be added without re-cutting it:

1. **Codes and redemptions.** A promotion, its codes, a redemption per use, and
   `add_order_adjustment()` accepting `promotion` when it is given a redemption id it can
   verify. Percent or fixed, a validity window, a global cap and a per-account cap. This
   stage alone makes the refused adjustment type real.
2. **Eligibility.** New-customer-only, per course or per plan, and an audience. Each rule
   is evaluated inside the writer, not in the browser, so the answer is the same for every
   caller.
3. **Stacking and the floor.** What may combine with what, in what order, and the lowest
   total a promotion may produce.

One design rule carried into all three stages, because ease of use is the dominant
principle and every eligibility rule is a way to tell a family no at checkout: a refusal
says *why* in a sentence a parent can act on — "this code is for families who have not
bought before", "this code applies to Quran Foundations, not to this course", "this code
expired on 1 March" — and never just "not eligible". A rule that cannot explain itself
should not be a rule.

## Buying a course the family already owns — **DECIDED 2026-10-22**

Asked because `create_course_order()` does not look at entitlements, so an account that
already has active access can pay again for access it has.

**Decided: refuse a purchase that would grant nothing new.** The check is per billing
account and per course version, against a live `purchase` entitlement — not per learner
profile — because that is the grain the fulfilment actually uses: `record_payment_success()`
grants to every learner profile linked to every active member of the account that paid, and
skips what already exists. So one course purchase already covers every child on a family
account, including twins, and a second purchase of the same version cannot grant anything.

That is the answer to the twin case, and it inverts the worry. Twins are two learner
profiles on one billing account, so the first purchase enrols both; nothing about a second
child is ever refused, because no second purchase is needed. The refusal that does happen —
the same account buying the same version while access is live — is a double-tap or a
mistake, and its message has to read as reassurance rather than rejection: name who already
has access and until when, so a guardian with two children is told they are both covered
instead of being told no.

Renewals are unaffected: an expired entitlement is not live, so buying again after it lapses
works. A different course version works, since entitlements are per version. A different
billing account works — a grandparent paying for the same course is not the same account.

If the grain ever becomes per-learner (a seat per child, the way
`allocate_subscription_learner()` already works for plans), this rule becomes per-profile
and twins still never collide, because they are different profiles — but a family would then
pay per child, which is a pricing decision rather than a duplicate-purchase one, and it is
asked separately rather than assumed here.

## How a price's market is chosen — **DECIDED 2026-10-22**

Asked because `prices.market` is a two-letter country code inside the uniqueness key
(target + currency + market + interval), and nothing anywhere chooses between markets:
`resolveOffering()` lists every market's price to every visitor and `create_course_order()`
accepts any price id it is handed, so localised pricing is display-only and a payer in
Kampala can buy at a price set for Nairobi by posting that price id.

**Decided: the buyer's country chooses the price.** A resolution chain, evaluated in the
writer: an exact match on the payer's country, then a fallback the price itself declares as
the default for its currency, then a refusal rather than a guess. Two prices a buyer is
entitled to is an ambiguity in a money path, so it resolves deterministically or it does not
resolve at all.

The consequence that matters: `create_course_order()` can no longer trust a posted price id.
It has to derive the price from the course and the buyer's country, and treat an id it is
given as a hint to check rather than an instruction to follow — otherwise the rule is
display-only again and the cheapest market becomes everyone's. `billing_accounts.billing_country`
is the column that carries it, and it is nullable and set by nothing today, so establishing
it is part of the work and is asked separately.

Rejected: leaving `market` as a reporting label with currency as the only regional signal
(the cheapest answer, and the one that makes `market` honest about being decorative —
declined because genuine per-country pricing is wanted), and a country selector on the buy
page (it puts the choice in the buyer's hands, which is how the cheapest market becomes
everyone's).

## Authorising a reviewer needs a verified qualification in that subject — **DECIDED 2026-10-22**

Asked because a reviewer must already be an active profile — which requires a recorded
verification of the person by a named staff member — plus an in-window subject authorisation
at the scope being assigned, no unresolved conflict, and not be the version's own author.
What was not required, and was written into the reviewer register as deliberately undecided,
is a verified *qualification* in the subject being authorised.

**Decided: a verified qualification in that subject is required for every scope, technical
as well as scholarly.** No authorisation without one. The claim this platform wants to be
able to defend is that its content is checked by people whose credentials a named person
looked at, and a rule that holds only for religious subjects leaves the rest resting on
trust that nothing records.

Three consequences to honour when this is built. `reviewer_qualifications.subject_area_id`
is nullable, so a qualification recorded without a subject cannot authorise anything — the
register screen has to make the subject mandatory at the point of recording, or the
qualification is unusable and the reason should be visible beside it. The check belongs in
`set_reviewer_authorization()`, where the mistake is being made and the reason can be given,
and *also* in `is_authorised_reviewer()`, because a qualification can expire or be rejected
after an authorisation was granted and an authorisation resting on a lapsed credential
should stop working when the credential does. And verification stays what it is: a named
person looked at a document held outside the platform, recorded with who and when, because
the platform cannot read the document itself and must not imply that it did.

## How much a teacher may upload — **DECIDED 2026-10-22**

Asked because `platform.cost_controls` is registered, ships off, and its own note says
nothing exists — unlimited teacher uploads is how $250/month becomes $3,000. Per-file limits
are built (an 8 GiB ceiling, multipart above 32 MiB); nothing limited the total.

**Decided: 50 GB per teacher, counted on master bytes.** About a day of 1080p video, which
removes the quota as a practical limit for almost anybody while still stopping one account
from consuming the whole storage budget unnoticed.

Counted on masters, not on what is stored, because the rendition ladder — 1080p, 720p, 480p,
360p plus audio — stores roughly 2.1 times the master and is the platform's choice, not the
teacher's. Charging a teacher for copies they never asked for would make the quota a
surprise. The real cost is still the stored figure: 50 GB of masters is about 107 GB in R2,
which at $0.015/GB-month with free egress is about $1.60 per teacher per month at full
utilisation, and the costing document's monthly figures assume far less than full
utilisation.

Shipped as an admin-editable setting rather than a constant, consistent with building
everything and enabling it from the dashboard, and enforced at initiate — the point where a
teacher can still be told, rather than at the end of a transfer that already happened. The
refusal names the space left, because "quota exceeded" without a number is a dead end.

**Settled 2026-10-22: the quota has a meter.** A limit a person cannot see is felt as an
outage — the first news of 50 GB would have been an upload that bounced. `/teach/media` now
shows masters used, the space left and a breakdown by file status; `/admin/media` shows who is
storing what, biggest first. Both read `my_media_storage()` and `media_storage_overview()`,
which take their figures from `media_upload_allowance()` — the same function the route refuses
with — so the meter and the refusal cannot disagree. With `platform.cost_controls` off, both
say there is no cap rather than reporting zero percent, because "0% of nothing" reads as a
quota that has been reached.
Multipart uploads in flight count against the quota from the moment they are initiated, so
a stalled 40 GB upload cannot be used to slip past it, and abandoning one gives the space
back.

## Who decides that a reviewer's credential is real — **DECIDED 2026-10-22**

The register let any governance admin verify a qualification, which makes the claim "a
governance admin saw a document" rather than "the person who answers for this platform saw
it". The owner's answer is direct: they are the final authorisation as platform owner and
decide whether a credential passes; later, when a scholarly board is present and active, it
can make those decisions; and they appoint and remove the board's members themselves.

**Decided: the platform owner decides a reviewer credential, alone, unless a scholarly board
is convened.** `verify_reviewer_qualification()` now requires `platform_admin`, or a holder
of `scholarly_panel_member` while `governance.scholar_board_active` is on. Everything else
in the reviewer register stays with governance staff — checking the person, granting and
withdrawing the scopes somebody may review, hearing conflicts — because those are staffing
decisions and the owner should not be the bottleneck for them.

Convening a board is not creating one. `governance.scholar_board_active` grants nothing by
itself: only a `scholarly_panel_member` gains the power, and a trigger on
`user_role_assignments` refuses to appoint or remove one unless the actor is the platform
owner. So the switch cannot be used by staff to manufacture an authority that decides in the
owner's place, and dissolving the board leaves no member able to decide. Each verification
already records who made it and when, so a decision taken by a properly constituted authority
is not undone by a later change to who holds that authority — the same reasoning that makes
an earning snapshot the revenue share it accrued under.

This is a delegation the owner can withdraw and cannot be forced into. It is also why the
board is a role plus a switch rather than an approvals counter: a threshold says "enough
people agreed", and the question here is "who is authorised to answer for this platform".

**And a qualification must name its subject.** `reviewer_qualifications.subject_area_id` was
nullable, so a credential could be recorded with no subject and could never authorise
anything — a row that looks like evidence and is not. It is now mandatory where it is
recorded, and the register screen will not submit without it. `set_reviewer_authorization()`
refuses an active authorisation without a verified, unexpired qualification in that exact
subject, technical scope included, and `is_authorised_reviewer()` checks again so an expiry
or a rejection ends the authorisation that rested on it.

## What one course purchase buys — **DECIDED 2026-10-22**

Asked because the duplicate-purchase refusal was scoped to the billing account: one purchase
granted every learner profile on the account. That is right for twins and wrong for a
household of six, and the owner's answer is neither extreme — **one purchase covers up to a
set number of learners.**

Counted on learner profiles, not on accounts and not on adults. An adult who buys a course
for themselves is one learner; a parent with four children may cover all four with one
purchase if the number allows it, and must buy again beyond it. The number is a setting
(`commerce.family_learner_cap`) rather than a constant, because the owner has not named it
yet and a number that decides what a family pays is a business decision, not a deploy. The
value the platform ships with is provisional and changing it is a dashboard change.

**A purchase holds places, not just grants.** A family may buy before the second child is
added to the account, so fulfilment cannot simply grant the profiles that exist at the
moment of payment and forget the rest. Each order creates a place per covered learner; a
profile on the account claims a place when that learner first opens the course, and an
unclaimed place not expiring is what makes "up to" true rather than "the children you had
at checkout". A refund takes back the places that order created and the grants they produced,
and no others — which is why a place names its order.

Still open: **what happens at the cap** — refuse the extra learner, or charge again in the
same flow. The writer refuses when no place remains and offers the purchase path, because
that is the reversible reading; if the answer is to charge automatically, the refusal becomes
a prompt and nothing else in the model changes.

## Sharing with an address that has no account — **DECIDED 2026-10-22**

Asked because `/account/sharing` resolves an email address to an account and says so when
there is none, like `invite_family_member()` always has. Both easy options are wrong: a
silent no-op leaves the sharer believing something was shared, and a disclosure lets anyone
test whether an address is registered here.

**Decided: send an invitation carrying a token.** The screen says an invitation was sent and
nothing about whether the address is registered. The token is single-use, expires, is bound
to the invited address and to the resource being shared, and is accepted only while signed
in as that address — so possession of the mail is not enough on its own. The response has the
same shape whether or not an account exists, which is what makes the non-disclosure real
rather than cosmetic.

Parked behind the email provider. An invitation nobody receives is a worse no-op than the
one being fixed, so the flow ships with the sending surface, not before it.

## Plan checkout is gated like course checkout — **DECIDED 2026-10-22**

`create_plan_order()` is reachable while `commerce.subscriptions` is off: the catalogue and
the screens hide plans, but the writer does not refuse one. A flag that hides a surface and
not the writer is decoration, and the course path already does this correctly
(`create_course_order()` refuses while `commerce.checkout` is off).

**Decided: the plan writer refuses while the flag is off, and the read path does not offer a
plan the writer would refuse.** Same shape as the course path, same refusal vocabulary, so a
caller sees one behaviour rather than two. Built in the unit after this record.

## The first external blocker to prepare for is email/SMS — **DECIDED 2026-10-22**

Among the things that cannot be finished without somebody outside the platform — a payment
merchant, R2 credentials, an ffmpeg host, an email/SMS provider — the provider is first.

Three built things are already waiting on it: the invite above, purchase receipts, and the
password-recovery mail Supabase currently sends through its own default sender. Preparing
for it is the cheapest work that does not guess a vendor: one sending function with a
recorded outbox, templates that name what they are for, and a configuration point a provider
plugs into. Until a provider is chosen the outbox records what would have been sent and the
screens say so, rather than pretending a message arrived.

## One course purchase covers one learner — **DECIDED 2026-10-22**, superseding the record above

Asked the first time as "does a purchase cover the family or one child", the answer was a
middle one: up to a set number. Asked the second time with the three shapes and what each
costs, the answer was **each learner separately**. The later answer wins; nothing had been
built on the family model, so there is nothing to unwind, and the record above stays as the
history of how the question was put.

What this settles:

- **An order names the learner it is for.** The price is per learner, so "who is this for" is
  asked before payment rather than inferred afterwards. An order without a learner cannot be
  fulfilled under this rule, which is why the column belongs on the order and not in a note.
- **The duplicate refusal is per learner and per course version**, not per account: the same
  child cannot be sold access they already hold, a sibling may buy the same course, a
  renewal after expiry is allowed, and a new version is its own purchase.
- **Fulfilment grants one profile.** `record_payment_success()` no longer walks every active
  member of the account; it grants the learner the order names. This is the piece that
  changes money behaviour, so it ships with the order column rather than before it.
- **A family is not a discount unit.** Two children on one account pay twice. The account is
  still the payer, the guardian and the place the cards live — it is simply no longer the
  thing a purchase covers.

Unchanged: subscriptions already carry `child_allowance`/`adult_allowance` slots and are a
different product; a plan covering several learners is a plan, not a course purchase.

## The other three answers, 2026-10-22 — recorded, and two already built

- **Sharing with an address that has no account sends an invitation with a token.** Written up
  above; the flow is the next unit after the per-learner purchase, and the outbox it needs
  now exists.
- **Plan checkout is gated on `commerce.subscriptions`.** Built in
  `20261232000100_plan_checkout_gate.sql` the same day, with the course writer's
  `checkout:disabled` key.
- **The email/SMS provider is the first external blocker to prepare for.** The preparation is
  built: `20261233000100_outbound_messages.sql` records what would be sent, renders named
  templates, refuses an unfilled placeholder, and ships every row as `queued` because nothing
  can send. Choosing and configuring a provider remains the owner's.

## Promotions belong to the platform, or to the teacher whose course they discount — **DECIDED 2026-10-22**

The owner's rule: promotions are managed by them and sometimes by teachers; different
promotions run in different regions and countries; and prices already differ between them
because currencies do not carry the same weight and living costs differ.

**Who.** The platform owner may run a campaign on any course and across any set of markets.
A teacher may run one on their own courses only, and must name them — an empty course list
means "every course", which is a platform privilege. Nobody else creates a campaign, and a
teacher's campaign records the teacher as its owner so a later dispute has an answer. The
writer derives the owner from the actor rather than accepting it, and the direct write
policies on `promotion_campaigns` were dropped so there is no second path that skips the
checks.

**Where.** A campaign names any number of markets, as ISO country codes — the same grain as
`prices.market`. No markets means every market the course is sold in. A "region" is several
rows, so a West-Africa campaign is a list, not a new concept. A market the course has no
live price in is refused when the campaign is created, because a promotion aimed at a place
where nothing is sold can only disappoint somebody who was told about it.

**What it is worth.** A percentage applies to the local price: ten percent off is ten
percent in Kampala and in Nairobi, and nothing is converted. A fixed amount carries its own
currency, and every market it names must price that course in it — a 5 000 shilling discount
aimed at a dollar market is a different gift, so it is refused at creation rather than at
checkout, where it would look to a family like a broken code.

**Still open, and next:** how a buyer redeems a code. That unit applies a campaign to a
pending order (window, usage limits, per-person limit, new-customer rule, market and course
match), writes a `promotion` adjustment and a redemption snapshot, and makes the existing
`promotion` adjustment type reachable. Stacking is decided there: one code per order, and
the code the buyer types is the one applied rather than the best of several, because a
discount that changes silently is worse than one that is refused.

## A promotion's per-family limit is the campaign's to choose — **DECIDED 2026-10-22**

A promotion on family accounts may be limited to two redemptions per family, or three,
"dependingly". The unit is the **billing account**, not the person who typed the code: one
guardian buys for several children, and since a purchase covers one learner, a per-person
limit would let a household redeem the same offer once per child. That is precisely what the
cap exists to prevent.

So the number lives on the campaign, beside the total and per-person limits, with null
meaning no limit. It is **editable after creation** by the platform owner or the teacher who
owns the campaign, because an offer that turns out too generous is a business decision rather
than a migration — but a total limit below the redemptions that have already happened is
refused with both numbers instead of being quietly applied. Every change is audited with the
before and after values.

`promotion_redemptions.billing_account_id` is added now, before the redemption writer exists,
so that "two per family" can actually be counted when it lands. Counting the redeeming user
would answer a different question and would over-count a guardian paying for two children
from one account.

## Every control is a screen, and each role's power ends at its own work — **DECIDED 2026-10-22**

The people who will use this platform do not write code. That is a requirement on the
product, not a preference about the UI: **anything routine has to be a field or a button on
the screen of the person who is allowed to do it.** A writer that only a SQL prompt can
reach is an unfinished feature, and so is a policy whose only explanation is a migration.

The roles are the owner's words: a teacher signs in as a teacher, a scholar as a scholar, the
platform owner as the admin with every control, and a learner as a learner — and each one's
power ends exactly where their work does. Written out in
`docs/decisions/role-surfaces.md`, which names for every person what they land on, what they
may do, what they may not, and — the part that matters — **which policy or function enforces
it**. A hidden button is a convenience; the policy is the control.

Three consequences, applied the same day:

- **A learner could open a course.** `courses_insert` allowed any signed-in person to insert
  one attributed to themselves, and `/teach` did not ask for a role. Teaching is an
  appointment — `teaching.applications` ships off and the cohort is curated — so the policy
  now requires `instructor` or `platform_admin`, and the page explains the area instead of
  offering a form that cannot work.
- **Promotions were writers without screens**, which is exactly the failure this decision
  names. `/admin/promotions` and `/teach/promotions` now create, switch on, pause, archive
  and re-limit a campaign with form fields, and the validation speaks in sentences.
- **A campaign owner could not see their own usage**, so a per-family limit was invisible to
  the person who set it. Campaign owners can now read their own redemptions and nobody else's.

**The next piece of UI, not this one: a role landing page.** Today the masthead is the same
for everyone and `/` is the landing for a signed-in owner as much as for a visitor. The
better arrangement — a learner to `/learn`, a teacher to `/teach`, a scholar to `/review`, the
owner to `/admin` — is a page that reads the session once and is worth doing with the role
chrome together, rather than by making every page dynamic to hide a link that already
explains itself.

## How a code is redeemed — **DECIDED 2026-10-22** (build, not a new choice)

The six decisions of 2026-10-22 left promotions with an open question: how a buyer uses a
code, and what "stacking" means. Both are settled by the rule that was already recorded — the
code the buyer types is the one applied, **one code per order** — and by three money rules
that follow from the rest of the system rather than from taste:

- **Applied inside the order transaction.** A code that cannot be used creates no order at
  all. A stray pending order is a support conversation about money that never moved.
- **A percentage rounds once, in the charged currency.** It follows the local price, so
  nothing is converted; a fixed amount must match the order's currency, because a discount
  written in shillings aimed at a market priced in dollars is a different gift.
- **A code cannot make an order free.** The ledger refuses a zero capture, so a 100% discount
  would create an order that can never settle. Refused, with a sentence pointing at support
  rather than at the checkout.

The three limits are checked in the same statement as the redemption, under a row lock on
the campaign, so two checkouts racing for the last use cannot both win.

**Still open, deliberately:** showing the discounted total *before* the payment handoff. It
needs a quote function that creates nothing, and the buy form currently applies the code at
the moment the order is made. A family therefore learns the final price at the order rather
than on the page — acceptable while the only live provider is a sandbox, and the next piece
of this feature.

## Sharing an address is an invitation, and both answers are the same — **DECIDED 2026-10-22**

`/account/sharing` used to share with an *account*: the form resolved an email address and said
"no account has that email address" when there was none. Both alternatives are wrong — a silent
no-op leaves the sharer believing something was shared, and a disclosure lets anybody test an
address and learn whether it is registered here. So the answer is an **invitation**, created
whether or not an account exists, with a reply identical in both cases. There is no branch to
leak.

Four things follow, and each is a decision rather than an implementation detail:

- **A token, stored as a hash.** `share_invitations.token_hash` holds `md5` of 122 random bits
  from `gen_random_uuid()`. The hash is not the secret's protection — the entropy is — it is
  what stops a reader of the table from using what they find. Reading `share_invitations` grants
  nobody access, and the invitee cannot read the table at all: a token is looked up by a
  function, never by a select, so a leaked hash cannot be probed.
- **Bound to the address, not to the mail.** A forwarded message is not enough on its own;
  accepting requires being signed in as the address the token was sent to. The refusal says
  which address it was sent to in effect ("a different address"), not what it contains.
- **Expiring and single-use.** An invitation lasts 1–90 days and accepting it once is all it can
  do. The screen offers a week, a month, three months — never "until I end it", which is a
  reasonable choice for a share granted to a known person and not for a link sitting in a
  mailbox. The length chosen carries into the share it creates, so the invitation's promise is
  the share's term.
- **`resolve_share_grantee()` is revoked, not abandoned.** Leaving it callable while the screen
  stopped calling it would leave the disclosure behind a different door. It is closed to `anon`
  and to `authenticated`; a service-role tool can still call it.

The message is written directly to `outbound_messages` rather than through `queue_message()`,
which is staff-only. An invitation is sent by the person sharing, and opening that function to
every signed-in caller would let anybody post arbitrary mail through a named template.
`invite_learning_share()` is itself the check — it knows the sharer, the scope and the address —
and it renders the same `invite_email` template and writes the same row, so the outbox and the
dispatcher see nothing new. Nothing is delivered while `delivery.notifications` has no provider,
and `/account/sharing` says so on the form instead of claiming that an email went out.

Accepting is a **button, not a page load**. Mail clients and security scanners open links before
a person does; a GET that granted access would let them accept on somebody else's behalf. The
landing page therefore shows the signed-in address, and the accept is a POST whose answer — the
share, or the sentence explaining why not — comes from the database.

**Still open:** delivery. The invitation is queued and cannot leave until an email provider
exists; that is the first external blocker and the only thing standing between this flow and a
stranger being able to accept.
## A price is quoted from the same two functions that charge it — **DECIDED 2026-10-22**

When the code was first redeemed at checkout, showing the discounted total before the payment
handoff was recorded as open, because it needed a quote that creates nothing. It is built now,
and the decision that mattered was not "add a preview" but **where the preview gets its
answer**:

- **One resolution.** `resolve_course_checkout()` is the only place that decides which course
  version, market, price, currency and payer account a purchase means. `create_course_order()`
  was rebuilt on it rather than left alongside it. A second pricing path would eventually
  disagree, and the disagreement would show up as a family quoted one number and charged
  another.
- **One valuation.** `promotion_quote()` holds every eligibility rule and the discount
  arithmetic. `apply_promotion_to_order()` calls it and writes; `quote_course_order()` calls it
  and returns. Neither decides what a code is worth.
- **A quote writes nothing and locks nothing.** No order, no billing account, no redemption, no
  order audit row — and no `for update` on the campaign, because holding a row lock for a
  question would let anybody freeze a promotion by typing its code. Previewing a campaign with
  one use left must not spend it, and that is a test rather than a promise.
- **A quote is not a reservation.** Between the quote and the order a campaign can be switched
  off, a limit can be taken, or the learner's access can arrive. The order is refused then, in
  the same words the preview would have used: the preview is a prediction, the order is the
  decision. The screen says so instead of implying the price is held.
- **The screen forgets.** Any change to the learner or the code clears the shown total. A figure
  displayed against a code that has since been edited is a wrong number that looks right.

**Still open:** taking a code off a pending order. The writer to apply one already exists and
has no screen; nothing removes one.
## A redemption is append-only, and a void is not an edit — **DECIDED 2026-10-22**

Taking a code off a pending order was the last open item of the promotions chain. It could
have been built by deleting the redemption row, and that was rejected: `promotion_redemptions`
has refused every update and delete since it existed, and that refusal is why the row can be
trusted as the record of what was applied at checkout.

So a removal is a **void**: three new columns (`voided_at`, `voided_by`, `voided_reason`), a
CHECK that is satisfied only when all three agree, and a trigger that permits exactly one
transition — a live row voided once, with a person and a reason — while still refusing every
other column, a second void, and a delete. The redemption stays; the discount does not.

Three consequences follow, and each is deliberate:

- **A voided redemption does not count against a limit.** The three checks in
  `promotion_quote()` and the "already been redeemed N times" check in `set_promotion_limits()`
  count live rows only. A typo corrected is not a use spent.
- **Only while unpaid.** Once money has moved the discount is part of what was charged and of
  what the teacher's share was computed from. Changing it then is a refund, which is a money
  decision with its own record. The order page therefore shows the control only on
  `pending_payment` orders — the buttons disappear rather than failing.
- **The screen names no code it has not been told.** The adjustment's description is prose and
  the redemption is not readable by a payer, so the page asks the writer for the code and shows
  the sentence it returns, rather than parsing a code out of a string to put in a button.

**Open, but not a decision:** whether a paid order should ever accept a *backdated* code — a
family who bought at full price and then finds the code. That is a refund or a goodwill
credit, and both already exist; it is not a re-price of the past.
## An adult becomes a learner on their own account — **DECIDED 2026-10-22**

Nothing in the application created an adult `learner_profile`. `/family` creates children, and
enrolment, checkout, progress, certificates, reviews and sharing all start from a profile — so
a new adult met "there is nobody to buy this for yet" and a link to a screen that only adds a
child. `claim_own_learner_profile()` is the writer, and the decisions around it are:

- **One writer, and it takes no arguments.** There is nothing to point at somebody else with;
  the profile is always the caller's. A screen that inserted the row directly would be a second
  path to the same outcome, which is the failure this repository keeps finding.
- **Idempotent, deliberately.** The second call returns the existing profile with
  `created: false` rather than raising. Pages therefore do not have to ask whether the button is
  needed before offering it, and a double-click reads "you are ready" rather than a unique
  violation. The unique index on `linked_user_id` is the real guarantee; idempotency is the
  courtesy.
- **A removed profile is not revived by a button.** Archiving or soft-deleting was a decision,
  and self-service is not the place to overturn moderation. The refusal says to contact support
  instead.
- **No flag.** Being able to learn is not an experiment: it is the first step of every learner
  flow, and a feature flag on it would mean a platform where nothing can be enrolled in.

**Open, not built:** an adult may have a family of their own *and* learn themselves — the two
are independent rows, and this writer does not create or join a family. Nothing prevents it;
nothing has asked for it yet.
## A learner profile has one writer, and identity is not editable — **DECIDED 2026-10-22**

`add_child_to_family()` existed and was called by nobody in the product: `/family` inserted
into `learner_profiles` directly, and `lp_insert` admitted **any active family member**. So a
child added through the screen left no audit row, a billing manager could create a profile they
could not then read, and the owner-only rule lived in a function the application never called.
Two paths to one outcome is how a rule gets enforced in one of them.

`lp_insert` now admits **staff only**. A child is created by `add_child_to_family()`, an adult
by `claim_own_learner_profile()`; both are definer functions and neither needs a table-level
insert policy to work.

The same argument applies to **editing**, and there it was worse than a missing audit row.
`lp_update` lets a family member edit the row, which a rename needs — but it also allowed
changing `learner_type`, `linked_user_id` and `family_id`. An owner could therefore turn a
child's profile into an adult profile linked to an account of their choosing, and with it hand
that child's progress and certificates to somebody else. A trigger now refuses those three
columns for anybody but staff, in writing, while a display name or an age band can still be
corrected — a child grows, and a name gets typed wrong.

**Not decided, and worth recording:** there is still no self-service way to *delete* a learner
profile, and no way to move a child between families. Both are moderation actions today, done
by staff, and both would need an audit trail of their own before they became buttons.
## Search is one function, and it is not a flag — **DECIDED 2026-10-22**

The catalogue had a search box before this, and it was thinner than it looked: `ilike` over
a course's title and description, ordered alphabetically. A course **filed under Fiqh** was
unfindable unless the word also appeared in its blurb, and a **teacher could not be found by
name at all** — which is a strange gap on a platform built by a teacher with an audience.

`search_catalogue()` is now the only definition of a match: title, then subject, then a
public teacher's name, then the description, with every word required. `strpos()` rather
than `like`, so a typed `%` matches nothing rather than everything.

Two decisions inside it are worth stating separately, because both were tempting to do the
other way:

**It is `security invoker`, not `definer.`** A definer function could have searched every
course and every teacher profile and been faster to write. It would also have shown a
visitor a course that is suspended, retired, or not yet published, and the name of a teacher
whose profile they have not made public. The dependency is deliberate: **a teacher is
findable by name exactly when they are findable at all.** Their search visibility follows
the same policy as their public page, so there is one answer to "is this teacher listed".
The price is that a teacher who is public but whose flag is off is not searchable — which
is correct, because in that state they have no public page either.

**It is not behind `platform.search`.** Search is navigation. The catalogue already
filtered before any flag existed, and putting the index of the shelf behind a switch that
ships off hides the shelf. `platform.search` stays in the register as the promise it was —
search across *lesson bodies* — which is genuinely a different feature: it needs an index,
and it needs a decision about whether the words inside a paid lesson may be searched by
someone who has not bought it. Recorded, not built.

**Not decided:** whether relevance should eventually weigh price, language or the learner's
age band, or whether results should be personalised. Today the order is explainable in one
sentence, which is the property I would not trade for a better click-through rate yet.
## A receipt is a document, so it has a number — **DECIDED 2026-10-22**

There was no receipt. `/orders` showed a status, a total and a refund form, and the only
identifier for an order was a UUID — which nobody reads down a phone to a bank, an employer
or their own memory of a transaction.

`orders.order_number` is `AS-` plus eight digits, matching the certificate numbering already
in use so that a support conversation about either document sounds the same. It is assigned
by the database, unique, in creation order, and **cannot be rewritten** — a trigger refuses
any change. The number is what a receipt cites, so a rewritable number would let two
documents claim one order.

Two things it deliberately is not. It is **not a secret and not a key**: every read goes
through the order's own row-level policy, so only somebody who may see the order sees its
number, and no lookup is built on it. And it is **not a tax invoice**: the document says so
in one sentence, because claiming otherwise in a market we have not registered in would be a
lie in writing.

An unpaid order opens the same page and says **"This is not a receipt"** before anything
else. That is the same principle as the payment confirmation banner: the page reports the
state of the record, never the state the reader hopes for.
## Taking your data out is a right, not a feature — **DECIDED 2026-10-22**

`platform.data_export` was an empty flag. The platform held a name, a language, a time
zone, the learners somebody is responsible for, their progress and certificates, the orders
and receipts, and the notes written during lessons — and no way to ask for any of it back.

`export_my_data()` returns one JSON document. It is `security definer` and takes **no
argument**: inside it every `where` clause is the boundary, so each is written against the
session's user id and there is nothing a caller could pass to point it at another person.
The scopes are the predicates the screens already use — `is_learner_family_member()` for a
child, and **not** for a billing-only member, because paying for a family is still not
parenting it.

It is **not behind a flag.** A right behind a switch that ships off is not a right. The
register entry stays because it promises something different that is still unbuilt: more
than one format, and an import path.

**Not decided here: erasure.** Export says what we hold; it does not let anybody delete
it. Erasure needs one policy answer before it needs code — what survives deletion. The
default I would propose: financial rows survive, because they are the ledger and the basis
of a refund; personal fields are stripped; the account is closed rather than erased where
the law allows. That is a decision for the owner, not for this migration.
## A streak is a memory, not a record — **DECIDED 2026-10-22**

Every learning product counts streaks, and the obvious build is a table with a row per
learner per day filled by a job. That build has to be kept true: a midnight rollover that
can miss, a counter that can drift from the progress it summarises, and a run of days that
survives after the lessons it counted were removed. For a child, it is also a record of
when somebody was sitting in front of a screen, held forever, for the sake of a sentence
on a dashboard.

So the streak is **derived on read** from `lesson_progress.completed_at`. There is no
`streaks` table, no nightly job, and nothing to migrate when the underlying history
changes. The consequences are deliberate:

- **A day is local.** The boundary is the learner's `user_profiles.timezone`; for a child
  with no account it is the reader's; `UTC` is the last resort, and each candidate is
  checked against `pg_timezone_names` so a bad value falls back rather than raising.
- **One quiet day does not end it.** The run counts back from today *or* yesterday, so a
  learner who finished at 23:50 and opens the app at 00:10 has not lapsed.
- **Badges are thresholds, not awards.** `first_lesson`, `ten_lessons`, `first_course`,
  `first_certificate` are computed from the same figures, and each carries the day it was
  earned, taken from the completion that crossed the line rather than from when somebody
  looked. Nothing can be granted to the wrong learner, and a badge cannot outlive the work
  that earned it.
- **Erasure is free.** Deleting progress deletes the streak, because the streak was never
  stored anywhere else.

The display is one component, used on `/learn` and on each child's card at `/family`. The
guardian sees the child's name instead of "you", because a strip that says "you" on a
child's card is a lie about who did the work. It is behind `learning.streaks`, ships off,
and an unreadable reply renders nothing rather than an empty box — the same rule as the
export and the receipt.

**Not decided here:** anything social. No leaderboards, no comparison between children,
no notifications to prompt a return. A streak that shames a six-year-old is not
encouragement, and nothing in this build asks the platform to hold a reason to return.
## Closing an account is not deleting the ledger — **DECIDED 2026-10-22**

This answers the question the export entry above deliberately left open. D7 had already
committed to the shape in a column comment — *financial, governance and certificate history
is never deleted; personal fields are anonymised instead* — so what was missing was not a
policy but a runnable act.

The policy, in one line: **what the person wrote is deleted; what the platform recorded is
kept and de-identified.**

- **Deleted:** notes, bookmarks, saved courses, reviews, the words of discussion posts (the
  thread stays, because other people's replies are not theirs to erase), the text of
  assignment work, support messages they wrote, live sharing grants, invitations carrying
  their address, guardian relationships naming them.
- **Kept, de-identified:** enrolments, progress, certificates. A certificate keeps its number
  and its course snapshot because a third party may still be checking it; the holder becomes
  "Deleted learner".
- **Kept untouched:** orders, payments, refunds, ledger entries, audit events. An order that
  loses its payer cannot be refunded, and a ledger with holes is not a ledger.

Three consequences worth stating, because each was a fork:

1. **It is not a hard delete.** A hard delete here would cascade into the money. Erasure in
   this schema means the person stops being reachable as a person while the record stays
   auditable. Where a market's law demands the bytes go, that is a per-market legal step with
   its own retention clock — not a button.
2. **Children go with the last adult, not the first.** A child belongs to the family. If
   another adult is still an active member, the child stays with them; closing the last
   adult's account tombstones the children too.
3. **Two people cannot close an account for work in flight.** A teacher with a course in
   review or published, and an active board member, are refused: both are the owner's to end,
   and closing the account would strand work other people rely on.

**Not built, and named on purpose:** the sign-in identity. The address lives with the auth
provider; deleting it there cascades through `user_profiles.user_id` into the ledger, so that
removal is staff work through the provider and the page says so in one sentence rather than
implying the address is gone.

**Not decided here:** a cooling-off period. Closure is immediate and there is no undo, which
is the honest version when nothing is retained to restore from. If a grace window is ever
wanted, it needs a scheduled job — and this platform has deliberately avoided needing one.
## Tax and the cost of moving money are the buyer's, and follow their country — **DECIDED 2026-10-22**

Confirmed by the owner: **taxes and transfer fees are paid by the user, depending on their
location.** Neither is absorbed by the platform.

That settles a gap the schema had carried from the start: `orders.tax_minor`,
`orders.fee_minor` and the `tax`/`fee` adjustment types existed and nothing ever wrote them,
so every order was effectively untaxed and every payment cost was silently eaten.

- **The buyer pays both.** The price is what the course costs; tax and the transfer fee are
  added on top, shown as their own lines before payment.
- **The amount follows the buyer's country** — the same country that already decides the
  price: the billing account's once recorded, otherwise the connection's. It is never a value
  the browser can assert.
- **The register is data, not code.** `market_charges` holds the rates; the owner edits them
  at `/admin/tax`. A rate is a fact about a jurisdiction, and a hard-coded rate is a change
  waiting for a deploy.
- **No rule means no charge.** This platform is registered for tax nowhere today, and
  inventing a levy to look thorough would be fraud in the other direction. The absence is
  stated on the screen.
- **Tax is on what is paid, not on the list price,** so a promotion reduces it. The transfer
  fee is on what moves, so it includes the tax.
- **A computed line is not a discount.** It carries `rule_id`, cannot be edited or voided by
  hand, and is re-derived when the payable amount changes.
- **A paid order never moves.** The charges on it are history, and a correction after payment
  is a financial adjustment or a refund, in writing.

**Not decided here:** which countries this platform is actually registered in, and at what
rate. That is a legal fact per market and it belongs to the owner, entered as rows. Also open:
whether a refund returns the tax and fee as well — currently a refund is against the order's
total, and a partial refund policy for charges has not been written.
## Live classes are built here, and only the teacher is recorded — **DECIDED 2026-10-22**

The owner: **"live classes we build them because I want the system more intact."** So the
RTC sweep — scheduling, time zones, recording policy, moderation — is ours rather than a
provider's, and the platform stops being a catalogue with a video link bolted on.

- **Scheduling is ours.** `live_sessions` stores the instant in UTC *and* the zone the
  teacher typed. A teacher setting "Tuesday 19:00" in Kampala should never convert anything,
  and a learner in London is shown both hours.
- **The door is ours**, and it is three checks in order: are you responsible for this
  learner, are they enrolled in this course, is the window open. A room address is handed
  out one person at a time and never sits on a listable row.
- **The window is per session** (15 minutes before, 30 after, both editable) rather than a
  global rule, because a 20-minute halaqah and a two-hour workshop do not want the same one.
- **Moderation is server-side.** You cannot schedule on a course you do not teach, you
  cannot join somebody else's learner, and the roll is readable only by the host, the course
  author or staff.
- **Teacher-only recording** stands, as decided 2026-10-20. Learners are never captured. A
  live class with children on camera is a safeguarding incident with a retention period, and
  no feature is worth that.
- **The video itself is somebody else's product.** `delivery.live_room_base` names the host;
  empty means not connected, and joining says so rather than returning a URL that carries no
  class. The platform owns the schedule, the door, the clock and the roll — which is the
  part a school actually administers.

**Not decided here:** which provider hosts the room. That is an account, a price and a data
processing agreement, and it is the one part of live classes that cannot be built.

**Also open:** whether a recording is offered to learners who missed the class, and how long
it is kept. Nothing produces a recording yet, so nothing has to decide that today — but the
moment a provider is connected, it is the next question.
## The ages are said where the decision is made — **DECIDED 2026-10-24**

A course has known who it is for since U72, and until now that fact was only used to filter two shelves.
The person who actually chooses — a parent enrolling a child, an adult enrolling themselves — met the
course page and was told nothing.

**The course page says the ages in words**, under the badges, in the order the author ticked them, and
nothing at all when the author left every band open. Silence is the correct rendering of "every age":
a line that says "suitable for all ages" on every course would train the eye to skip the one that matters.

**A mismatch is a sentence, not a refusal.** When the person selected in the enrol control is outside the
course's stated ages, the page says so — *"Written for Ages 11–13 — Ages 8–10 is outside that. You can
still enrol — this is a note, not a refusal."* The platform does not know whether that child reads ahead,
whether the guardian is choosing deliberately, or whether the teacher would welcome them; refusing would
be a safeguarding policy, and that decision belongs to the owner, not to a column.

**Nothing is said when nothing is known.** No band on the course means every age. No band on the learner
means nobody made a claim that could be contradicted. Both are silence, and `bandMismatch()` returns null
for both — a warning that fires on missing data is a warning people learn to ignore.

**Not decided here:** whether enrolment should ever be blocked or require a guardian's confirmation, and
whether a teacher should be told that a learner outside the band has joined. Both are policy; both would
need the owner.

## Progress had a strip and no record — **DECIDED 2026-10-24**

Screen 18 was the last numbered screen still marked BLOCKED, and the stated reason was honest if unhelpful:
*"engagement mechanics undesigned"*. What existed was `learner_engagement()` and a strip on `/learn`: a streak, four
totals, and whichever badges had already been earned. Two things were missing, and only one of them was a page.

**A badge nobody has earned was invisible.** The strip drew the earned ones and said nothing about the rest, so a
learner could not see what was ahead — a milestone you cannot see is a surprise that arrives or does not, which is
not a mechanic. The catalogue is now fixed and small (eight badges: 1, 10 and 50 lessons; 1 and 3 courses; a
certificate; a 7- and a 30-day run), and every one of them is drawn, earned or not, with what it still needs said as
*"Two more lessons"* rather than *"2/10"*. The page is for a seven-year-old as well as an adult, and the
seven-year-old is the one who needs the sentence.

**Nothing is stored, and that is the design.** A badge is a threshold over rows the platform already writes, so it
cannot drift from the progress it describes, cannot be lost to a bug, and does not need a nightly job to keep it
honest. The cost is a computation per view; at this size that is nothing, and it buys the guarantee.

**`20261247` declined to date streak badges,** on the grounds that the data could not support "you earned a 7-day
streak on Tuesday" without a table that exists only to say so. That was too pessimistic: a run of consecutive days has
a start, so the day the run reached seven has a date — and this page reads it back. A streak badge is measured on the
**longest** run ever, so a streak that later breaks does not un-earn it; nothing recorded can be un-recorded.

**Days are the learner's days.** The calendar and the streak are computed in the learner's own time zone, and in the
reader's for a child with no account — the same rule `learner_engagement()` already used. Two different answers to
"which day was that" would be worse than one, so the second implementation of that rule was extracted into
`learner_study_runs()` and both call it.

**Three nothings, told apart.** The page distinguishes the feature being off (and says progress is still being
recorded), a learner the reader may not read ("Not your record", not a refusal that confirms they exist), and the
record failing to load. Showing "nothing yet" for any of those would be lying about at least two.

**Days after today are never marked.** A future square could only be "not studied", which is a small daily accusation
about a day nobody has lived through yet.

Behind `learning.streaks`, which already meant "daily streaks and milestone badges" — no new flag, because turning
this on turns on nothing that flag was not already about.

## What the VIP package contains was a constant in SQL — **DECIDED 2026-10-24**

`plan_feature_requires_tier()` was a closed CASE with one entry: `offline_downloads` needs Plus. The gate was real — a
Basic plan could not be granted downloads — but the *decision* lived in a migration, so "what is in the VIP package?"
needed a developer, a pull request and a deploy. Every other plan decision was already a form on `/admin/plans`: create
a plan, move it to Plus, grant the feature, price it. One rule staying in code made the screen a half-truth, and it is
the same defect the plan screen itself was built to fix: **a rule nobody can edit from a screen is not a policy, it is
a constant.**

**The map is a table.** `feature_tier_requirements` holds one row per code that needs more than Basic — seeded with
`offline_downloads → plus`, so nothing changed on the day it landed. Absence means Basic, which keeps the old safe
default: a code nobody has restricted is available on any shelf, because an unknown code must not accidentally become
restricted to a shelf nobody is on. `plan_feature_requires_tier()` reads it, and had to stop claiming `immutable` — a
function that reads a table cannot promise to return the same answer forever, and the marker would have let the planner
serve a stale one.

**Raising a requirement is guarded; lowering it is not.** A Basic plan that already carries the feature would become a
catalogue that says "Plus only" while the plan kept handing it out. So moving a feature up is refused while any Basic
plan's terms still carry it, naming the plan. Moving one down is always allowed: nothing promises a feature is
*exclusive* to Plus, only that a Basic plan may hold it. The screen shows the blocker **before** the click.

**Table, not a free-text setting.** The code has to be in the closed vocabulary (`plan_feature_codes()`), so a typo
cannot quietly create a restriction on a code no plan will ever carry — the same discipline the entitlement form already
follows. Staff only, audited as `plan_feature.requirement_changed` with the shelf it moved from, and the table has RLS
on with a staff read policy and **no write policy at all**: the definer writer is the only door.

## A parent could not learn in their own family — **DECIDED 2026-10-24**

A family held children and nothing else. `claim_own_learner_profile()` creates the signed-in adult's own profile
with `family_id` null, and `add_child_to_family()` writes `learner_type = 'child'` unconditionally — so the adult who
ran a family account had two disconnected identities: the family with the plan and the seats, and their own learner
outside it, invisible on /family. The gap showed up in a function that already assumed the other world:
`allocate_subscription_learner()` has an `'adult'` slot type and the rule *"an adult slot may only be assigned to your
own learner profile"* — a seat no screen could fill.

**It could not be an update, because the guard is right.** `guard_learner_profile_identity()` freezes `family_id` for
everybody but staff, and that stops an owner turning a child's profile into an adult linked to an account of their
choosing. The fix is one exception written in **rows, not intent**, because a trigger cannot see intent: an *adult*
profile whose `linked_user_id` is the actor may move to `null` or to a family the actor is an active member of.
`learner_type` and `linked_user_id` stay frozen, a child's `family_id` stays frozen, and a profile still cannot move
into a family it does not belong to — all four refusals are tested.

**One more condition, in the same guard so it holds on every path:** a profile may not leave a family while it holds
an active seat on the family plan. Otherwise the family keeps paying for a learner it can no longer see, and the
allocation row names a person outside it. The screen says this before the click; the refusal is not the first the
person hears of it.

**Joining moves the profile, never copies it.** Same id, same enrolments, same progress, same certificates — the
thing an adult with three half-finished courses is actually afraid of. A learner already in another family is refused
with a sentence rather than silently moved.

**Four states, two buttons.** *No learner yet* and *alone* get the join control; *in this family* gets leave;
*in another family* gets an explanation and no button. A control that cannot work is a trap, not a safeguard.

The writers are `claim_family_adult_learner()` and `release_family_adult_learner()`, both audited
(`family.adult_learner_joined` / `_released`), and `/family` reads them back through `family_adult_learners()`, whose
visibility filter is written out because a definer function reads the table as its owner and RLS does not apply
inside it. A billing-only member may learn here as themselves and still cannot add a child.

## The catalogue only ever searched the cover — **DECIDED 2026-10-24**

`search_catalogue()` matches a course's title, its subjects, its teacher and its description. A lesson called
"The conditions of prayer" inside "Fiqh for adults" was unfindable, and the words a learner remembers are usually
the words in the lesson.

**The lesson had to be searched without opening the course up.** A lesson has a title and an introduction, and the
two are not equally public: the course page prints the whole outline — titles, sections, previews — to anybody.
The introduction is the lesson's own text, and echoing a snippet of it in a search result would show somebody who
has not bought the course something the product never showed them.

So `search_lessons()` matches **titles for anyone who may read the version** and **introductions only where
`can_access_lesson_now()` says the caller may study the lesson** (or they authored or review it). The snippet is
built from the *visible* text — title for a stranger, title and introduction for a learner — so the rule holds by
construction rather than by a filter somebody has to remember to add.

**Previews are a switch, and the search found that out.** The `lessons_read` policy allows an anonymous visitor a
lesson only when it is a preview **and** `learning.previews` is on. With the flag off — its default — an anonymous
search returns nothing at all, including preview lessons. That is the honest behaviour rather than a bug, and the
suite now asserts both sides, restoring the flag afterwards.

**Only published versions, and only active courses.** A draft is a teacher's working copy; a search box is not a
way to read one.

**The parser is `websearch_to_tsquery`.** What people type includes quotes, `-`, `(`, `&` and apostrophes, and
`to_tsquery` turns a harmless em dash into a 42601. Six of those are in the tests, and the assertion is that the
call returns rather than that it finds anything.

**Ranking is weighted, not alphabetical.** A title match outranks an introduction that mentions the word in
passing, because somebody typing "tayammum" wants the lesson named after it.

**A result has to open somewhere.** The first version linked every lesson hit to its course, which is right for a lesson
behind a paywall and wrong for a preview: a preview opens on its own address, and sending a visitor to the outline to hunt
for the lesson a search just found is a worse answer than the search. `search_lessons()` therefore returns `is_preview`,
and the link follows it — preview to the lesson, anything else to the course. The return type had to be dropped and
recreated; the grants are re-issued identically, including for `anon`, so the door stays the same width.

**The snippet is parsed, not injected.** `<mark>` comes back from the database and is split into parts by
`/lib/lesson-search.ts` and rendered as elements. A lesson title is author-supplied text; a title containing
`<img onerror=…>` becomes a lesson with that name, and the page shows the characters.

**Three nothings became four.** The catalogue's empty state already distinguished *past the end of the shelf*,
*nothing matched anywhere* and *no courses yet*. There is now a fourth — no course matched but lessons did — and
saying "Nothing matched" over a list of matches would be the page contradicting itself.

**Behind `learning.lesson_search`,** an ADMIN flag with no precondition: the index and the function ship with it,
and the switch decides only whether the catalogue shows the second list.

## A saved lesson could not be played — **DECIDED 2026-10-24**

The offline feature shipped two halves and one of them was missing. `save_offline_lesson()` booked a save, the
player fetched the bytes and wrote them into this origin's IndexedDB — and **nothing could open them**. `/downloads`
listed the saves with a *Ready offline* badge; `lessonBlobUrl()` existed and had no caller. The bytes were there and
unreachable, which made "saved for offline" a promise the product did not keep. And what sat in storage was the
lesson itself, in the clear.

**Both are fixed in the same place.** What is written is now AES-256-GCM ciphertext under a fixed header
(`AFP1` + nonce + ciphertext-with-tag), sealed with a key derived per save by HKDF-SHA256 from a server-only secret
and the save's id. The key is minted by `/api/offline/key` only while the save row says the copy is still the
learner's — not removed, not past its clock — so a lapsed save on disk is unreadable *through the app* even though
its bytes are still there.

**Per save, not per account.** Two lessons on one device are sealed with two keys: losing one does not open the
other, and revoking one does not require re-downloading the rest.

**This is not DRM and the screen says so.** A client that keeps the key it was handed keeps its copy; no browser
technology prevents that. What is gained is narrower and true: nothing durable on disk is plaintext, and nothing out
of date opens. Claiming more would be the kind of lie this codebase has spent a hundred units removing.

**It fails closed.** With `OFFLINE_VAULT_SECRET` unset the key route refuses, the save fails with the reason, and
nothing is written. A development fallback would have meant every saved lesson on every deployment sealed with a
key in this repository — the same as plaintext with extra steps. The flag is ADMIN and off, so no deployment loses
a working feature to this.

**The old format is deleted, not migrated.** Version 1 of the store held plain blobs. They cannot be sealed without
a key that was never minted for them, and keeping them would preserve exactly what this change exists to remove.
Opening the database at version 2 drops the store; a learner loses a save and re-downloads once.

**Refusals are named.** A file that is not ours says it was written by an older version; a truncated one says so; a
failed tag says it was altered *or* the key is no longer issued, because GCM genuinely cannot tell those apart and
picking one would be wrong half the time.

**And a saved lesson can be watched.** `/downloads` plays it in the page, in an `<audio>` or `<video>` whose blob URL
is revoked when the player closes; a lapsed copy is disabled with the reason on the button, and the server's
sentence — not the device's — is what a failure shows.

## A search engine was told nothing about the courses — **DECIDED 2026-10-24**

Every page had a title and a description; none of them had structure. A crawler reading the course page saw a
heading, some prose and an outline, and had to guess that it was looking at a course — so a course could not appear
in the one place people look for courses. The page also announced itself as the slug with its dashes removed
("the pillars of islam"): the URL, not the course.

**Structured data is a claim, and the page has to make it.** Every field emitted is derived from a row the page
renders:

* `offers` only when `offering.kind === 'paid'` — the case where a price was actually shown to this reader. A course
  with no price for somebody carries no offer. An offer of `0` would say "free", which is a different course.
* `aggregateRating` only when reviews are on **and** somebody has rated. Ratings are real rows; `0` is a claim that
  nobody has rated, which is not the same statement as "ratings are not open yet".
* `hasPart` carries the **real lesson titles**. The first draft emitted "Lesson 1", "Lesson 2" — filler that reads
  as data. A placeholder name in structured data is a lie with a schema behind it.
* Deliberately absent: `hasCourseInstance` (a live class is scheduled per cohort and this page promises none),
  `coursePrerequisites` (nothing enforces them), `educationalCredentialAwarded` (a completion certificate is not a
  recognised credential), `timeRequired` (the platform never says how long a course takes).

**The escaping is the dangerous part.** JSON-LD is injected inside a `<script>` element, so a course called
`</script><img onerror=…>` would close the element and become markup — course titles are author-supplied text.
`serialise()` escapes `<`, `>`, `&`, U+2028 and U+2029 to `\uXXXX`, which is still valid JSON and still parses back
to exactly the original string. Verified end to end: a hostile title renders inert in the HTML and round-trips
unchanged through a JSON parser.

**With no configured origin, no absolute URL is invented.** `NEXT_PUBLIC_SITE_URL` is the same variable the printed
certificate depends on; without it the graph carries paths and no `logo`, because a relative logo is a broken image
to every consumer. Same reasoning as the share card, same answer.

**The page's own metadata was fixed at the same time** — a real title, the author's summary, and a canonical URL
without the query string, so shared links carrying tracking parameters do not split one page's standing across
copies of itself.

## The catalogue's own vocabulary had no screen — **DECIDED 2026-10-24**

`subject_areas` is what the catalogue filter, every subject badge and every course card read. It is seeded with
37 entries and, until this unit, the only way to add, rename or retire one was SQL against production. The owner
could not maintain the vocabulary of their own catalogue: a power with no screen is not a power, and this was the
one first-run step the setup checklist could not offer a button for.

**The write policy was wider than any screen it has.** Both existing policies used `is_privileged()` — any staff
role — so a support agent reading a ticket could have added a subject. The page is now gated on `governance_admin`
or `platform_admin`, and `can_manage_subjects()` enforces the same pair in the database. A screen narrower than
the table it edits is a screen whose ownership claim is false.

**Retiring a subject would have quietly blanked live badges.** `subject_areas_read` hides retired rows from every
reader, and a badge is a join through `course_version_subjects` to that row. So retiring a subject a published
course is tagged with would have removed the badge from a live course — and the tag could not be put back, because
D5 freezes subject mapping at publication. `guard_subject_retirement()` refuses retirement while any version in
`draft`, `submitted`, `approved` or `published` carries the tag, and its refusal names how many block it. Drafts
and approved versions are included on purpose: the alternative is a trap that springs later, at publication, when
the author can no longer fix what went wrong.

**The people who maintain the vocabulary can see retired subjects.** A second read policy for
`can_manage_subjects()`. Two facts forced it: the screen that retires a subject must list what it retired, and
— verified by attempting it — a governance admin could not retire anything at all before this, because PostgreSQL
checks the updated row against the SELECT policies and the new row is retired, therefore invisible, therefore
refused.

**A code is an identifier, not a label.** The add form takes one; the row does not offer to change it. Fixing a
typo in what a learner reads is a rename, and the audit records both names so the log can reconstruct what changed.
A typed capital or space is corrected rather than refused — the constraint is about the identifier's shape, not
about the typist.

**Every change is audited**, by trigger, into `governance_audit_events`: created, renamed, retired, reactivated,
recoded, with the actor and the before/after. Retirement and reactivation are separate actions rather than one
"updated", because "who hid this from learners" is the question a log like this gets asked.

**The setup checklist gained its missing step.** U97 wrote that the subject gap had no surface, so a subject-less
deployment was a note rather than a task. `/admin/subjects` exists now, so it is a step — first in the list, and
only when there are none, because a deployment with 37 subjects has nothing to do here.

**Not done here:** recoding through the screen. The API leaves no path to change a code, because every migration,
import and tag refers to it by value; a recode is a migration-shaped act and should be treated as one when a
reason to want it appears.

## An empty platform said nothing was waiting — **DECIDED 2026-10-24**

The admin home is a queue screen. It calls `staff_attention()` and counts the work waiting inside features that
already exist. On a fresh deployment every queue reads zero, so the first thing the owner ever saw was:

> **Nothing is waiting.** Every queue you can work was checked, and every one reads zero.

Both sentences are true and the pair is useless. Nothing is waiting *because nothing exists yet*, and the person
reading it is the one person who could create the first thing. A page that reports no work while the platform is
empty is not neutral — it reads as done.

**So the page now knows two kinds of nothing.** `emptyQueueLede()` distinguishes *no work* from *no platform*: with
nothing waiting but steps outstanding it says "Nothing is waiting, because nothing is here yet — the platform
still needs three things before anybody can study", and with everything in place it falls back to the original
sentence, which is then accurate.

**The three things are read, not assumed.** `fetchSetupFacts()` counts four things with `head: true` and
`count: 'exact'` — no rows fetched: active subject areas, courses, published versions, active reviewers. A reviewer
cannot be active without a verification row (the schema refuses it), so counting active reviewers is the same
question as counting verified ones.

**The order is a dependency, not a preference.** Reviewer, then a course, then something published: a course cannot
publish without a verified reviewer for its subject, so a list that began with "publish something" would send the
owner to a screen whose action refuses. Each step says what it unlocks rather than what it is.

**Subjects are a note, not a step.** Courses are filed under subject areas that arrive from the seed migration, and
there is no screen that adds one — so a fourth checklist item whose only instruction would be "run SQL" is not a
step, it is an instruction the reader cannot follow. When there are none the sentence says the deployment has not
finished migrating instead of inviting an action that does not exist.

**A failed count shows the panel rather than hiding it.** Erring towards "you have none" costs a checklist item
that turns out to be done; erring the other way reproduces the defect this exists to fix.

**It disappears when the list is empty,** and only the platform admin sees it — they are the only role that can
create the first reviewer or publish the first course. A support agent shown three things they cannot do is three
more reasons to believe the page is broken.

**Not done here:** a subject-area admin screen. It is the one first-run step with no surface, and it should exist
before the platform is handed to anyone who is not comfortable in SQL — but it is a screen, with its own rules
about renaming a code that courses are already filed under, and it is not this unit.

## The dashboard did not lead where it said it led — **DECIDED 2026-10-24**

Screen 20 is described in the inventory as *"Adult home, led by 'continue where you stopped'"*. It opened with a
greeting, then live classes, then every enrolment as an equal card. A learner with six courses, one of them two
lessons from the end, was shown six identical invitations and left to work out which one was warm.

**`enrolled_at` is the wrong signal, and it is the obvious one.** Newest enrolment first would put a course bought
last month and never opened above the course the learner was inside yesterday. Ordering by *activity* — the newest
`lesson_progress.last_seen_at` among a course's lessons — is a fact about the learner; enrolment date is a fact
about a purchase. So: touched beats untouched whatever the dates say, then the newest activity, and only then the
newest enrolment for courses that have never been opened.

**Null is not activity.** A progress row can carry `last_seen_at` null, and it means nothing at all; treating it as
"very old" instead of "absent" would rank a course with a meaningless row below one with no row, which is a
distinction the learner never made. It falls back to the enrolment date like any untouched course. The first test
I wrote asserted the opposite and failed, which is how the rule got pinned down.

**Three candidates, then stop.** The warmest course is usually the answer, but not always: somebody who finished
their newest course yesterday should be offered the one before it, not a finished course whose "carry on" leads
nowhere. `CANDIDATES = 3` covers that in a fixed, small number of reads — one query for every progress row of
every enrolment, one for the outlines of at most three versions — rather than a query per course, which would
make a large library slow in order to decide whether to show a card.

**All finished means no card.** If every candidate has nothing left to do, `fetchCarryOn()` returns null and no
card is rendered. A "carry on" button that opens a course with nothing left in it is worse than the absence of
one, and the completed courses are still listed underneath.

**A failed read is no card, not a broken page.** The dashboard is where a learner lands; losing the accelerator
must not lose the enrolments, their progress or their links.

**Not done here:** the per-course "Continue" on each card further down. The lead card answers the question once;
repeating the query for every row is the cost this design exists to avoid, and a learner who wants a different
course can still open it and find the carrying-on card there.

## The course page never said where you were — **DECIDED 2026-10-24**

A learner opened a course they had started last week. The page showed a progress bar, "3 of 40 lessons complete
· 8%", and a list of forty lessons. The question they arrived with — *where was I?* — was answered by scanning
the list for the one without a tick. On a phone, that is twenty rows down.

**The rule is not "the last lesson you touched".** A learner who watched the end of lesson three and marked it
complete last night has touched lesson three, and a button that takes them back to it does nothing. Carrying on
means *unfinished* work, in this order:

1. the most recently touched lesson that is **not finished** — a resume, whether they stopped two minutes in or
   two minutes from the end;
2. otherwise the **first unfinished lesson in the course's reading order** — they finished what they were doing
   and the next thing is next;
3. otherwise nothing. Every lesson they can see is done, and a "carry on" button on a finished course is a lie.

**`skipped` counts as finished.** It was a decision, not a place — the database already refuses to turn a skipped
lesson back into `in_progress` behind the learner's back — so pointing somebody at a lesson they deliberately
passed over would be the product arguing with them.

**The order needs a tie-break, and the data does not have one.** `lesson_progress.last_seen_at` is written by
every status change and by the resume writer, so it is a real "when", but two rows can share a millisecond — a
marks-complete and a resume save in the same request, or a seeded fixture. The sort breaks the tie on lesson id,
so the same course answers the same twice; without it the answer depends on the order PostgREST returned rows in,
which is a fact about a query plan.

**A row for a lesson outside this version is ignored, not offered.** Re-pinning a course leaves progress rows for
lessons the learner can no longer open. `continuePoint()` measures every candidate against the outline it is
given, so a stale row cannot become a button that 404s.

**The words are three states, because the learner is in one of three.** "Start the course · Open lesson 1" for
somebody who has never opened it; "Carry on where you stopped · Continue lesson 3" for somebody inside one; "Next
up · Open lesson 2" for somebody who finished one and has not met the next. The same card saying "Continue" to a
first-time visitor is the kind of small wrongness that makes a product feel automated.

**It costs no extra query.** The course page already reads the sections and every progress row; the outline is
flattened from what is in hand and the rule runs on it. The card sits above the progress bar because it is the
only thing on the page that is an action — a percentage is a report, and a report should not come first.

**Not done here:** the same button on `/learn`, where the list of enrolments could carry one per course. That
belongs with the dashboard's own layout, and the course page is where a learner already is when they need it.

## A lesson had no next one — **DECIDED 2026-10-24**

At the foot of a lesson there was one button: "Back to course". A learner who finished lesson three of forty
returned to the course page, found the list, scrolled to lesson four and clicked it — on a phone, on a metered
connection, which is the shape of most of this product's use. Every other decision here has been about honesty
in small print; this one is about the loop the product exists for.

**The hard part is the order, so the order is a module.** A course is sections, and lessons inside sections, each
with its own `position`. The next lesson is the next in that flat reading order — not the next in the section,
not the next by id — and the two position columns have to be combined. `flattenOutline()` sorts sections, then
lessons inside each, and breaks a tie by id so the same course offers the same next lesson on every request;
without that, PostgREST's row order is the order, and "next" becomes a fact about a query plan.
`lessonNeighbours()` returns the pair plus a one-based index. Ten tests, and the ones that matter are the edges:
the last lesson of a section has a next in the following section, a single-lesson course has neither neighbour,
an untitled lesson keeps its place in the order instead of being dropped, and a lesson that is not in the
outline gets no neighbours rather than a neighbour picked from a list that does not contain it.

**It reads the pinned version, and only for a reader who may open the lessons.** `fetchOutline()` is scoped by
`course_version_id` — the same version `fetchLesson()` has just confirmed the lesson belongs to — because a
learner on v1 must not be pointed at a v2 lesson they cannot open. It is only called when `canAccessLesson()`
says yes: a preview viewer is entitled to a handful of previews, and a "next" for them would walk into a lesson
the database refuses.

**The button names the lesson.** "Next: Wudu in practice →" tells a learner what is coming; "Next" pushes them
through. The previous button names its lesson too, because somebody who clicked Next by mistake needs to
recognise where they were. When there is no previous lesson the left button becomes "Course contents", and when
there is no next the right one becomes "Back to course" — so the row always has two working buttons and never a
dead one.

**The counter is text, not a control.** "Lesson 3 of 4" sits between the buttons as plain tabular figures; on a
phone it takes its own line instead of squeezing two titles into two letters.

**A failed outline read loses the navigation, not the lesson.** `fetchOutline()` returns an empty list on error
rather than throwing: the page already has the video, the thread and the sources on it, and a convenience that
fails should be absent rather than fatal.

**Not done here:** the course page's lesson list still does not mark which lesson you last opened, which is the
other half of "carry on where you stopped". Progress and resume positions exist per lesson; what is missing is
the one-line answer above the list.

## The front door greeted a member like a visitor — **DECIDED 2026-10-24**

The landing page offered "Create a free account" to everybody, twice: in the hero and again in the closing call.
Somebody who had just signed in, or who had been using the product for a year, arrived at `/` and was invited to
join it. The masthead had the same defect and was fixed first, because it is on every page; this is the page
everybody sees first, which makes it the worse of the two.

**It is fixed on the server, not after hydration.** The landing page is `force-dynamic` and already reads the
database for the subjects and two flags, so `getUser()` joins that `Promise.all` — one call beside three that
were happening anyway. The front door renders the right button the first time, with no moment where a member is
shown a sign-up form that then changes.

**The two paths are different on purpose.** The masthead cannot read the session server-side without making
every route dynamic — including the About page, whose whole point is that it renders on a deployment with no
data — so it asks `/api/session` after hydration and starts from the signed-out pair. The landing page has no
such constraint. Two mechanisms, two reasons, both written down where they are used; the rule is not "ask the
API", it is "do not make a page dynamic to learn a name you could have been told".

**The copy changed too, not only the link.** "Create an account when you find one you want to keep" is an
instruction to somebody who has already done it. The signed-in version says what is true for them — their
enrolments, progress and certificates are already in one place — because a front door that addresses a member
like a visitor is how a product starts to feel like a brochure. `closingCopy()` and `frontDoorCta()` are in
`lib/session.ts` so the two branches are tested rather than described, and the test asserts the signed-in button
never points at `/sign-up`.

**Both branches were rendered, not reasoned about.** With the session forced present the page shows "Continue
learning" twice and the member sentence; with it absent, "Create a free account" four times (two buttons, each
appearing again in the RSC payload). The revert was checked afterwards.

**The About page keeps its "Create a free account", deliberately.** It is written for the stranger who arrived
from a search result or a footer link, it stays static, and the masthead on top of it already tells a member who
they are. That was an oversight when the masthead was fixed; it is a decision now.

**Not done here:** what a signed-in *teacher* or administrator should get as a second button. `/learn` is right
for a learner and merely harmless for the others — their work is one click away in the masthead — and choosing
per role would mean the front door branching on a role list, which is a different screen's job.

## Nobody could find this site — **DECIDED 2026-10-24**

There was no `robots.txt` and no `sitemap.xml`. A search engine had nothing but links to follow, and the links
include `/admin`, `/learn`, `/teach`, `/account`, `/orders` and `/api/…` — every one of which redirects to
sign-in, and every one of which is crawled before the redirect is discovered. For a site with no inbound links,
"not in the index" is the difference between existing and not existing.

**Three distinctions decide everything below, and they are not interchangeable.**

`robots.txt` stops a crawler *requesting* a URL. It does not stop a URL being *indexed* if it is found another
way. A `noindex` meta tag stops it being kept, but only if the page is fetched — which a `Disallow` prevents.
So the private surfaces get a `Disallow`; the one public page that must not be kept gets a `noindex`; and where
both matter, both are used.

**The verification page prints a learner's name, and it was indexable.** `/verify/<number>` is public on
purpose — the number is the capability, and an employer holding a certificate must be able to check it without
an account. But "anybody with the number may look" is a different promise from "a search engine may keep a
copy". It now sends `noindex, nofollow`. It is deliberately **not** in `robots.txt`: a disallowed URL is never
fetched, so the directive would never be read, and an employer's own link checker would be blocked for no
benefit. The number is unguessable, so nothing is exposed by being crawlable — the exposure is in being kept.

**A search result is a query, not a page.** `?q=anything` is an unbounded set of addresses a crawler can
generate for itself, each holding a thin and different list. Those are `noindex, follow` — not indexed, links
still followed, so a course found through a search is still discoverable. A *filtered* shelf (`?subject=quran`)
is a real landing page and stays indexable, but under a canonical address that keeps only the parameters that
change what is on the shelf, in a fixed order, never writing `page=1` — the same rule `pageHref()` already
applies to the links, so the canonical and the pager cannot disagree about what page one is called.

**A sitemap is a promise, so it never lists a redirect.** `/young` and `/adults` redirect to the catalogue while
`learning.audience_sections` is off. `GATED_ROUTES` carries the flag each optional page depends on, and the
sitemap includes them only when the switch is on — otherwise a crawler follows the entry, lands somewhere else,
and reports the listed address as "page with redirect". `/plans` and `/paths` do not redirect but say "not open
yet" with their switches off, which is true and useful to a reader and worthless in an index; they are gated the
same way.

**No origin, no sitemap.** Every URL in one must be absolute. Inventing an origin from the `Host` header would
publish a sitemap pointing wherever the requester typed — the defect the printed certificate already avoids.
With no `NEXT_PUBLIC_SITE_URL` the sitemap is empty (a valid file that claims nothing), `robots.txt` omits its
`Sitemap:` line rather than writing a relative one, and `metadataBase` is absent so no `og:image` is emitted.

**It degrades instead of failing.** No Supabase, a timeout, a function that has moved — each produces the static
pages rather than a 500. A sitemap that throws is worse than a short one: a crawler that gets an error gives up
on the whole file, including the parts that were fine.

**`robots.txt` is a route handler, not Next's `robots.ts` convention.** The rules live in `lib/crawl.ts` and
`robotsTxt()` renders them, and the tests assert on the text a crawler actually receives. The typed convention
would mean writing the same list a second time as data and trusting the two to agree.

**`check:repo` #10 keeps the lists honest.** They are a claim about the application, and they keep describing
yesterday: a sitemap entry for a renamed route, a `Disallow` protecting a page that no longer exists, a gated
route whose page never reads a flag, a page that is both public and disallowed. The check reads the three lists
out of `crawl.ts` and resolves them against the real route tree. Verified by renaming `/about` to `/about-us` and
adding a `/helpdesk` disallow — both were caught, both were undone.

**Not done here:** structured data (`Course`, `Organization` JSON-LD) — worth doing when there are courses and a
review policy to describe; `hreflang`, which belongs with `learning.multi_language`; and a sitemap index, which
would be dead weight before the catalogue holds five thousand courses.

## The muted voice of the site was not readable enough — **DECIDED 2026-10-24**

`--muted` was `#6b7f75`. Measured against the surfaces it is actually used on, it is **3.98:1 on the page
background, 4.27:1 on a card, 4.13:1 on the tinted card and 3.96:1 on the pale green** — under the 4.5:1 that
WCAG AA asks of normal text, on all four. `--muted` is the colour of every secondary sentence in the product:
the description under a course title, the note under a form, the footer, the certificate's small print, the
pager's "Showing 25–48 of 137".

**Nothing looked wrong, which is the point.** A colour that is 0.4 of a ratio point short of a threshold is
invisible to a designer's eye and to a review; the only thing that catches it is arithmetic. It is now
`#5c6f65`: **5.00:1 on the page background**, 5.36 on white, 5.19 on the tinted card, 4.64 on pale green. The
hue is the same green-grey, four steps darker; nothing about the design language moved, and every screen that
uses secondary text got slightly easier to read.

**`check:repo` #9 measures it rather than trusting the eye.** It parses the `:root` block out of `globals.css`
and computes WCAG's ratio — sRGB linearised, weighted .2126/.7152/.0722, `(L1 + .05) / (L2 + .05)` — over the
twenty foreground/background pairs the stylesheet actually puts together. The lowest is now `green-600` on the
page background at 4.85:1. Setting `--muted` back to the old value fails four pairs, which is how the change
was proved.

**Rules for the check, so it stays honest.** A pair that names a token that does not exist fails — it does not
silently skip, because a rename would otherwise retire the test without anyone noticing. `white` is supplied by
the check itself, because the stylesheet writes it as a literal rather than a token. And 3:1 is not accepted
for anything: every pair in the list is normal-sized text, so the threshold is 4.5 everywhere.

**Found while measuring, and deliberately not changed:** large-text colour pairs already pass, `--danger` on its
pale background is 5.35:1, white on `--green-600` is 5.20:1, and the `--warn-border` hairline is 1.32:1 — a
border, not text. WCAG's 3:1 for meaningful boundaries applies to it, but the warning is carried by the words
inside the box and by an icon-free label, so the border is decoration and is left alone.

## The chrome says where you are — **DECIDED 2026-10-24**

Two things the frame of every page never said.

**Which section you are in.** The masthead is eight identical links. A sighted reader works it out from the
heading underneath; a screen-reader user worked it out from nothing, because `aria-current` appeared nowhere in
the chrome. It does now, in `lib/nav.ts` and `_shared/nav-link.tsx`, and it is in the HTML the server sends —
verified by building the app and reading `aria-current="page"` out of the prerendered document, not by trusting
that it would appear after hydration.

**The rule has an edge case, which is why it is a module and not a `startsWith`.** `/learn` is the current
section on `/learn` and on `/learn/abc/lesson/xyz`; it is *not* the current section on `/learned` or on
`/learn-paths`, and a bare `startsWith` says it is on both. `/` is only ever itself, because every path begins
with a slash. Trailing slashes, queries and fragments are stripped first. Six tests, and the ones that matter
are the negatives — a prefix is not a segment.

**Whether every form control has a name.** Three did not: the discussion reply box, the question box beside it,
and the file input in the media uploader. All three relied on a placeholder, which disappears on the first
keystroke, is not what a screen reader announces as the field's name, and is not what a voice-control user has
to say to reach it. They have `aria-label`s now.

**The useful part is that this was measured rather than assumed.** The first scan said 107 unnamed controls;
the second said 42; both were wrong, because a naive `[^>]*` regex stops at the `>` inside an arrow function in
an attribute, and a `htmlFor` built from a template literal (`htmlFor={`quality-${id}`}`) is invisible to a
string match. The scanner now walks each tag tracking brace and quote depth, and matches `id={`x-${y}`}` against
`htmlFor={`x-${y}`}`. The answer is **316 named, 0 unnamed** — so the finding is that the app is in good shape
and three controls had slipped, which is a different and better sentence than the one the first scan suggested.

**`check:repo` #8 keeps it at zero.** Any `<input>`, `<select>` or `<textarea>` without `aria-label`,
`aria-labelledby`, a matching `htmlFor`, or a wrapping `<label>` fails the gate. Proved with a probe that had
only a placeholder.

**Not done here:** heading order. A source-level count of `<h1>` per file is useless — several pages return
different branches, each with its own heading, so two `<h1>`s in a file is usually exactly one on screen — and
the pages with none are redirects or render their heading in a shared component. Checking that properly needs
the rendered page, which is a different kind of check to the ones in `repo-check.mjs`, and is left alone rather
than approximated into false positives.

## A phone shakes this site apart — **DECIDED 2026-10-24**

Everything below the header reflows: the grids collapse at 46rem, the hero stacks, the certificate has its own
rule at 600px. The header never had one. It was a single flex row — the mark, eight navigation links and two
buttons, gap 1.5rem — and at 390 pixels the links squeezed and wrapped inside themselves. The page then scrolled
sideways, so the whole site could be dragged left and right under a thumb.

**The arithmetic, because "it looked fine on my screen" is how this happens.** A label with `flex: 0 0 6.5rem`
does not shrink (104px), an `<input>` has an intrinsic width of about twenty characters and `width: 100%` does
not change that floor (~170px), a `<select>` is as wide as its longest option, a `.btn` has 1rem of padding each
side, and there are three gaps of 8px between them. On a 360-pixel screen that is 478 pixels of content in 320
pixels of space. Nothing errors; the document is simply wider than the phone.

**The header is two rows below 54rem.** Who you are — mark and the two buttons — then a shelf of destinations
that scrolls sideways instead of squeezing. Not a hamburger menu: a menu needs a button, a focus trap, an
Escape handler and a state that has to survive hydration, and this product's header is the one piece of chrome
on every page. A scrollable shelf keeps all eight links in the DOM (so a crawler sees the same navigation a
reader does), needs no script, and cannot flash. A link cut off at the right edge is the affordance.

**The header also stops being sticky on a phone.** Two rows pinned to the top cost about a tenth of the screen
on every scroll, and the thing a phone reader needs is the page. On a desktop the one-row header stays sticky
because it earns its 60 pixels.

**`input { min-width: 0 }` is the fix underneath all of it.** A flex item will not shrink below its intrinsic
width unless it is told to, and for a form control that intrinsic width is a whole line of text. Setting the
floor to zero lets the row decide, which is what a row is for. With that, the sign-in form's country-code and
number pair fits on a 360-pixel screen instead of overflowing, and the admin search form wraps its extra
controls onto a second line.

**A row wraps at 40rem, tabs scroll, the pager wraps, and a table gets its own box.** A `.tabs` strip of five
labels was shrinking each to two letters; it now scrolls with the labels intact. `.pager` was squeezing
"Showing 25–48 of 137" between two buttons; it wraps. And a table is the one thing that cannot reflow — it has
columns — so the billing statement and the receipt line items now sit inside `.scroll-x`, which scrolls in its
own box. `check:repo` #7 refuses a page with a `<table>` and no wrapper, because the next table will be written
by somebody looking at a desktop.

**Not done here:** the app is not a mobile app. This is the web product at 360 pixels; the Expo client is still
unbuilt, and the offline download surface (`/downloads`) is the only part designed for a device.

## The header did not know you were signed in — **DECIDED 2026-10-24**

The masthead is in the root layout and it offered every visitor "Sign in" and "Get started". A learner who had
just signed in saw the same two buttons, on every screen, for the rest of the session; the way to their own area
was a footer link they had to know about. The comment above `<main id="main">` explains why: the layout is
deliberately auth-agnostic so pages stay statically renderable.

**That reason is real, so it is not the thing that changed.** Reading the session in the layout — `cookies()`,
`getUser()`, a middleware header — makes every route dynamic, including the About page whose whole point is that
it renders on a deployment with no data. Paying for a header button with the property that a first visitor can
always load the site is a bad trade.

**So the header asks after it has rendered.** `MastheadActions` is a client component that renders the
signed-out pair (exactly what the server sent, so hydration agrees) and calls `GET /api/session` once on mount.
Signed in, it swaps to "Your area" and "Sign out". If the request fails, is aborted, or comes back with anything
but `signedIn: true`, the pair stays as it was — the failure mode is a stale header, never a signed-in learner
being asked to sign in again.

**The endpoint returns a boolean and a first name, and nothing else.** No user id, no email, no role list: the
header is on every page and is not the place to enumerate who somebody is. `cache-control: no-store`, because a
cached "signed in" answer after a sign-out offers a button that redirects to sign-in, and a cached "signed out"
answer does the reverse.

**Signing out is a form POST.** `/sign-out` is a route handler that accepts POST only — it calls
`supabase.auth.signOut()` and redirects — so a `<Link href="/sign-out">` would be a 405. `mastheadActions()`
carries the method, and a test asserts it, because that is exactly the kind of detail that gets "simplified" back
into a link.

**The name is in the accessible name, not on the screen.** On a shared family device — the ordinary case here,
since a parent's account holds a child's learning — who is signed in matters. The visible header has no room for
it next to eight nav links on a phone; the "Your area" button's `aria-label` says "Your area — signed in as
Amina".

**The rule the tests pin:** a signed-in header may never offer `/sign-in` or `/sign-up`, and a signed-out header
may never offer `/dashboard`. That is the defect stated as a property rather than as a screenshot.

**Not fixed here, deliberately:** the landing page's hero still says "Create a free account" to a signed-in
reader, and so does the About page. Fixing those means either making those pages dynamic or repeating this
client-component pattern in a marketing block; the header is the surface that is on every screen, and the hero
is a call to action aimed at strangers who are, in fact, the people who see it.

## A mark with no file behind it — **DECIDED 2026-10-24**

The brand mark was a CSS `clip-path` on an empty `<span>`. That is a real shape and it rendered correctly, in the
one place it was written: the masthead. It could not become a favicon, an app icon, a share card, or anything on
paper, because none of those can read a `<span>`.

**And the certificate had quietly grown a different mark.** `.certificate-mark` — used on the certificate and the
receipt, the two documents that leave the building — was a rotated rounded square outline. Same green, different
shape. Two surfaces that both say "AyahSpring" did not show the same thing, and nobody had noticed because they
are never on screen together.

**The sixteen points are the source of truth.** They are in `web/src/lib/brand.ts` — unchanged from the CSS
version, so the masthead looks exactly as it did — and four things read them: the `<BrandMark>` React component
(header, certificate, receipt), `app/icon.svg` (favicon), `app/apple-icon.png` (iOS, rendered from the same
points by `scripts/make-apple-icon.mjs`, which is committed because a PNG with no generator is a file nobody
can change), and `app/opengraph-image.tsx` (the share card, which draws the star as an SVG data URI because it
is rendered by a layout engine rather than a browser).

**The duplication is tested rather than trusted.** The component is TypeScript and the favicon is a static file,
so the same polygon is written twice. `brand.test.ts` parses both and fails if they disagree, and asserts the
shape itself: sixteen vertices alternating between two radii on eight spokes — the star is two squares rotated
through each other, which is also why the axial outer points sit at 50 and the diagonal ones at 49.5.

**The card is a claim, so it claims only what is settled.** 1200×630, white, a hairline of green down the left
edge, the star, the name, the sentence the landing page already makes, the three steps, and two true lines at
the foot: the subjects, and that browsing needs no account. No price, no learner count, no testimonial — the
same rule as the About page, for the same reason.

**A share card needs an absolute address, and this one does not invent it.** `metadataBase` comes from
`siteOrigin()` — the configured `NEXT_PUBLIC_SITE_URL`, never the `Host` header — and with no origin configured
the metadata emits **no** `og:image` rather than one pointing at `localhost`, which a chat client would fetch
and then show as a broken box. The build warns; the warning is the reminder to set the variable the printed
certificate already needs.

**`manifest.webmanifest` does not claim offline.** It gives Android the icon, the name and the theme colour, and
`display: 'standalone'` opens without browser chrome — with no service worker, a lost connection shows the
browser's own offline page. Same rule as the About page: describe what exists.

**Also fixed here:** `check:repo` #4 now strips CSS comments before reading selectors, because this change's own
commentary mentioned `brand.ts` and `page.tsx` and the check counted both as defined classes.

**Not decided here:** typography (still the system stack, and the certificate's serif is Georgia), illustration,
and whether the star should get a wordmark lock-up of its own. The owner has not chosen a typeface, and choosing
one is a decision about the brand rather than a gap in the build.

## An About page describes rules, not switches — **DECIDED 2026-10-24**

The About page exists to answer the question a parent asks before trusting a site with a child, and its own
doc comment promised that every sentence on it was "checkable against the product rather than a promise about
the future". Three sentences were not.

**The doors were the sharp one.** The page said children and adults "are two shelves from the start: the young
learners' door and the adults' door are separate pages rather than a filter on one list". That is true only
while `learning.audience_sections` is on — and it ships off. With the flag off, `/young` and `/adults` redirect
to `/catalogue?audience=…`, which is precisely *the filter on one list* the page said did not exist. The page
that could not be wrong was wrong, on the one subject it was written about.

**The cause is structural, not editorial.** The page reads no database and no flag, on purpose: it has to
render on a deployment where the catalogue is still empty, because a first visitor reading a blank page would
conclude the site is broken. But a page that cannot see a switch cannot describe one — and the earlier version
did, by writing about an optional surface in the present tense.

**The rule: every sentence is either enforced for everybody, or written in the conditional.** "A course
declares who it is for" is a column. "The catalogue can be narrowed to one audience" is a function that exists
either way. "When a teacher publishes a page, the course page names them; when they have not, it says the
course was written by an appointed teacher and approved by a reviewer" is exactly what the course page does in
both states. "A published version is frozen", "a child has no login", "there is no date of birth anywhere" are
enforcements and hold regardless of every switch. Nothing on the page asserts what is on *today* — not the
doors, not reviews, not public profiles, not guardian verification. If a claim cannot be written that way, it
does not go on the page.

**Two claims were also too strong for the schema and are now exactly as strong as it is.** "Each teacher has a
public page" is false twice — `teaching.public_profile` gates the route and a profile has to be published — so
it became the conditional above, which is what `WhoTeaches` already renders. "A reviewer whose qualification
has not been checked cannot approve anything" became the two things the database actually refuses: an
assignment in a subject the reviewer holds no live authorisation for, and an author giving their own course
the scholarly approval that publishes it.

**Guardian verification is described as a gate, not as a feature.** The COPPA-shaped machinery exists — a
guardian relationship, a verification step, a record of consent — and it is off pending legal review. The page
says the platform *can hold* those three and that turning the requirement on for a country is the owner's
decision with legal advice; it does not claim the switch is on, and it does not promise when it will be.

**Every claim worth checking is one click from the claim.** `/verify` exists now (U82), so "a certificate
carries a number anyone can look up" links to the page that looks it up, with no account. The page also states
the one commercial rule a parent needs: looking costs nothing, and one purchase covers one learner.

**A second check came out of this.** `check:repo` #6 reads every route out of the App Router — `page.tsx` and
`route.ts`, group folders removed, `[param]` matching one segment — and refuses a literal internal link,
`redirect()`, `router.push()` or `router.replace()` that lands on nothing. A link to a 404 is a string
TypeScript has no opinion about, and the drift this page suffered from is the same shape: a sentence on one
side of the app describing a page that is not there on the other. It found none today, which is the point of
adding it while that is true.

**Not decided here:** whether the About page should name the people who run the platform, and whether it
should say which features are currently on for the visitor's own account. The first needs a governance answer;
the second would mean the page reads a session, which would cost it the property that makes it render on an
empty deployment.

## A class a screen asks for does not exist — **DECIDED 2026-10-24**

Three class names were used on twenty-five to twenty-eight screens each and were never written down:
`.page`, `.page-head` and `.crumbs`. A fourth, `.narrow`, did exist — it meant *a 26rem column*, and it was
there for a card of prose. Fifteen screens wrote `className="page narrow"`, reading it as *a page, a little
narrower*, and got the 26rem column. The lesson page was one of them: a video, a discussion thread and a
sources list, laid out in 416 pixels. Nothing failed. TypeScript does not read class names, the build does not
read them, and every test passed — the page was simply laid out by accident, on the screen where a learner
spends the most time.

**A width is decided by what the screen holds, not by how the author felt.** Three, and only three:
`.page` is **46rem**, `.page.wide` is **68rem** for a screen that is a table of other things — the twelve
`/admin` pages and teacher media, where the content is a list to scan and each row has its own action —
and `.page.narrow` is **34rem**, kept for the two screens that genuinely are one column of prose
(`/account/export`, the buy form). Everything else is `.page`. The lesson page is `.page`: a transcript, a
thread and a source list are read, not scanned, and 46rem holds a line of text at a readable measure.

**`.page-head` and `.crumbs` now exist because twenty-five screens had already agreed on them.** That is the
tell for a missing primitive: when the same invented class name appears in page after page, the pages are not
wrong, the stylesheet is. A crumb separator is a `span[aria-hidden]`, so a screen reader says "Courses,
Introduction to Tajweed" rather than "Courses slash Introduction".

**Twelve smaller classes were also missing** — `.section-sm`, `.field`, `.radio`, `.info`, `.success`,
`.outline`, `.linklike`, `.print-revocation`, `.sr-only`, `.ok` — and are now defined for the same reason.
`.radio` is a card that shows its own selection with `:has(input:checked)`, so the control's state is visible
without a script; `.sr-only` is the standard clipping, written once.

**`check:repo` now refuses a class one side does not know about.** It reads every literal `className` token in
`web/src/**/*.tsx` — including the static parts of template literals — and every selector in `globals.css`,
and fails on a token with no definition. This is deliberately a *token* check, not a CSS engine: it catches
the name that was invented at the call site, which is the failure that happened. It was proved by writing a
page with `brand-new-thing` in it and watching the check fail, then deleting the page.

**The same audit found a second, invisible defect: the app rendered two `<main>` landmarks on twenty-five
pages.** `layout.tsx` renders `<main id="main">` and the skip link targets it; twenty-five page components then
wrapped their own content in another `<main>`. Nothing looks wrong, because a landmark has no visual effect —
it is a map for assistive technology, and the map said there were two main regions. Pages now open a `<div>`.
`global-error.tsx` is the one exception: it replaces the whole document, so it renders its own landmark, and
the check lists it as allowed by name rather than by pattern.

**Not decided here:** whether `.page` should ever be full-bleed for a media screen, and whether the admin
tables want a horizontal scroll region rather than a wider page. Both would be answered by a screen that
needs them, and neither has been built.

## A shelf says how many it holds — **DECIDED 2026-10-24**

The catalogue had two read paths pretending to be one. Browsing was a PostgREST select with `limit 60`; searching went through
`search_catalogue()`, which built its own shelf. Three defects lived in the gap, and all three were measured rather than reasoned about.

**A suspended course stayed browsable.** The browse query filtered `status`, `deleted_at` and nothing else; search filtered
`suspended_at`. Suspension is how the platform takes something down, so the one screen a visitor actually browses was the one screen
that ignored it. That is the worst possible place for the two paths to disagree.

**Sixty was silent.** A catalogue of 137 courses showed the first sixty alphabetically and said nothing — no count, no paging, no
truncation flag. The tail of the alphabet was simply unreachable, and a visitor had no way to know it existed.

**The subject filter ran after the limit.** It was applied in TypeScript to the sixty rows that had already been chosen, so a subject
whose courses sort past the sixtieth title returned *nothing at all* — not "no courses in this subject", an empty page for a subject
that exists.

**One function now answers both.** `catalogue_page(query, subject, audience, band, limit, offset)` decides what is on the shelf, what
matches, the order and the true total, and returns a page of ranked ids with that total in an envelope. Subject, audience and age band
are filtered in SQL, so the count cannot disagree with the list; filtering a page after it has been chosen is exactly how the third
defect happened.

**Filtering in SQL is what makes a band honest too.** `/young` used to fetch sixty courses and drop the ones outside the chosen band
in TypeScript, so its total would have been the number of courses fetched, not the number it holds. The band rule moved into the
function with the same semantics: a course that states no band is open to every age, and asking for a band a course does not state
excludes it.

**`search_catalogue()` survives, and delegates.** It is the ranking primitive the search suite holds, and a caller that wants only ids
and scores should not have to read a page envelope. It no longer decides anything — everything comes from `catalogue_page()` — so
there is one definition of what matches, in one place.

**A page of twenty-four, and it says so.** Each shelf renders either `5 courses` (everything fits; there is no limit to disclose) or
`Showing 25–48 of 137`. A limit that is not disclosed is read as the whole shelf, and "we have twenty-four courses" is a sentence
somebody repeats to a colleague.

**Page numbers are requests, not facts.** `?page=-4`, `?page=abc`, `?page=1e9` arrive from stale links, hand-typed addresses and
crawlers. They clamp to a real page — never throw, never wrap to a negative offset, never ask the database for a billion rows — and the
clamp lives in `paging.ts` so the URL and the SQL cannot disagree about what page one means.

**A paging link keeps every filter.** Page two of "tafsir, children" is still "tafsir, children", because a Next link that quietly
drops the subject is the most common way a paged list starts showing the wrong thing from page two onward. `page=1` is never written
into a URL, so the first page has exactly one address.

**A filter change returns to page one.** Otherwise subject chips and audience filters would keep the reader on page four of a
different shelf, which looks broken rather than empty.

**The front page stops offering doors that are shut.** `/young` and `/adults` redirect to the catalogue while
`learning.audience_sections` is off, and the landing page was linking to both anyway — a link that refuses, on the one page a stranger
sees first. With the flag off the two cards link to `/catalogue?audience=…` instead, which lands where the click was always going to
end up.

**Not decided here:** a default order other than alphabetical. Newest, most-enrolled and "recommended" are all defensible and all
imply a ranking signal the platform does not have yet; alphabetical is at least explainable.

## A course says who teaches it — **DECIDED 2026-10-24**

The course page named nobody. Not the author, not a link, nothing — so a course that had passed review and been
taught for a year looked exactly like content somebody had uploaded. For a platform whose claim is *taught, not just
hosted*, and whose owner is a teacher arriving with an audience, that was the wrong hole to leave.

**The disclosure boundary is not re-decided here.** A public profile is readable only while
`teaching.public_profile` is on, the teacher holds the instructor role, and the profile is published — the policy
already says so (2026-11-19) and this page does not add a second, softer rule beside it. The course page asks for the
profile by `user_id` and lets row level security answer. A draft profile, a flag that is off, or an author who is not
a teacher all come back as no row.

**So the page has an honest thing to say when nobody is named**, and it is not an apology: the course was written by
a teacher appointed by the platform and approved by a reviewer before publication — an author cannot approve their
own course, which the status machine enforces — and *this teacher has not published a public page*. The absence is a
privacy choice, not a lesser course.

**Never a blank attribution.** A profile whose display name is only spaces is treated as no profile at all.
"Taught by " with nothing after it is worse than the sentence above.

**Never a link the database would not serve.** The slug is checked against the same shape as the table's check
constraint before an href is built, because an address assembled from an unvalidated string is how a redirect gets
introduced later. A bad slug still shows the name — it only loses the link.

**A failure to look does not take the page down.** The profile read is wrapped: if it throws, the course renders with
the unnamed sentence. A course is readable whether or not its teacher can be named.

**The loop closes at the teacher's end too.** `/teach/profile` used to print the public address as inert code. It is
now a link, with one sentence saying whether it is live or waiting for the platform setting — because a teacher who
shares an address that 404s has been let down by the product, not by their audience.

**Not decided here:** whether the catalogue card should carry the teacher's name. It cannot until
`teaching.public_profile` is on, and the card is already carrying price and content; the course page is where the
buying decision is made and where the name belongs first.

## A certificate number needs somewhere to put it — **DECIDED 2026-10-24**

Screen 48 was already built: `/verify/AS-2026-00000001` answers anybody, without a session, and `verify_certificate()`
is executable by `anon` precisely so that it can. What did not exist was `/verify`.

That one missing route undid the platform's loudest claim. *A certificate you can still check years later* was
reachable only through a link from inside the product — fine for the holder, useless to the employer, the school or
the parent holding a printed certificate with a number in the corner. The address a person would actually try was a
404.

**A number is not typed the way it is stored.** `certificates.certificate_number` is `AS-2026-00000001` and is
compared as exact text, which is right for a unique key and wrong for a human being. `normaliseCertificateNumber()`
accepts any case, missing or extra separators, the en and em dashes a PDF substitutes, and a whole pasted URL, taking
the last path segment. It then **refuses anything that does not map exactly** — seven digits, nine digits, another
prefix — because a lookup that lands on the wrong certificate is worse than one that asks the person to try again.
There is exactly one normaliser; the page, the segment route and `verifyCertificate()` all use it, so a link cannot
work in one place and fail in another.

**A typed number becomes a link.** A parseable number is redirected to its canonical `/verify/AS-…`, so the answer has
an address somebody can keep, print or email. The segment page normalises too, which is what makes a lower-cased link
from a chat app still resolve.

**The printed certificate carries an address, and never the `Host` header.** A PDF has no clickable link, so the sheet
prints the address under the number. It comes from `NEXT_PUBLIC_SITE_URL`; with the variable unset it prints the path
alone. It is deliberately **not** derived from the request: `Host` is the one part of a request a visitor chooses, and
an attacker's host printed onto a downloadable certificate turns a verification page into a phishing page. A path that
is slightly less convenient is still exact for anybody who received the certificate from its holder.

**The door is in the footer.** The person who needs verification has never heard of the platform and is not browsing a
catalogue. The footer is auth-agnostic and on every page, which is exactly the right shelf for it.

**Refusing is a 404, and that is deliberate.** `/verify/nonsense` renders the not-found page rather than a
certificate-shaped error, because a URL segment that is not a number is not a failed lookup — it is not a lookup. The
form at `/verify` is where a mistyped number gets a sentence that quotes the shape.

**Not decided here:** whether a certificate should carry a QR code. It would help the employer, and it needs an image
pipeline and a decision about what the code encodes; the printed address is the cheap version of the same thing.

## A shelf card says what is in it and what it costs — **DECIDED 2026-10-24**

The catalogue showed a title, a description and four badges. Two questions a buyer asks before opening anything —
**how much is in it** and **what would it cost me** — were answered only on the course page, so a shelf of forty
courses was forty clicks to find out whether anything on it was a two-hour introduction or a thirty-lesson course,
and whether it was free.

**One call for the whole shelf.** `catalogue_cards(ids, country)` answers per card; a page that asked
`course_price_for_me()` sixty times would be sixty round trips, and the first slow catalogue would be the reason
somebody rewrote it badly.

**The price comes from the resolver the order uses.** The function calls `course_price_for_me()` rather than
reimplementing the market lookup, because a shelf that computes its own price is a shelf that can disagree with the
button on the next page — and the person who discovers the disagreement is the buyer. The cost is one small lookup
per card, which is the price of never being wrong about money.

**The lesson count needs the definer's privileges, so it may only answer about the public shelf.** An anonymous
visitor may read only preview lessons, so an invoker function would report "1 lesson" for a twenty-lesson course.
Reading it with the definer's rights would make the function an oracle for drafts, so a course that is not active,
not deleted, not suspended, or has no published version is **not answered at all** — the id is skipped, exactly as
`search_catalogue()` declines to rank a course it will not show.

**A duration is a floor or it is nothing.** A lesson's length is optional and often absent for text and interactive
lessons, so the reply carries `minutes` *and* `timedLessons`; the card writes `1h 35m+` when the two disagree, and
stays silent when no lesson declares a length. "20 min" for a course where one of three lessons has no stated length
is a claim the data does not support.

**Three price states, three styles.** A figure is a charge; **Free** is the platform's own; **Included in your
access** is access the reader already holds; *Not available in your country yet* is not dressed as a price at all,
because a pill that looks like a charge for a course nobody here can buy becomes a support case.

**Nothing is summed.** Each card carries one offering in one currency. There is no total, no "from", and no
cross-currency figure anywhere in the reply or on the page.

**One card, three shelves.** The catalogue, the children's door and the adults' door had three near-identical
card bodies. They are now one server component (`_shared/course-shelf-card.tsx`) with no client JavaScript.

**Not decided here:** whether a card should show a teacher's name. It cannot yet — `instructor_public_profiles_read`
requires `teaching.public_profile`, which ships off, so most courses would render an empty line. When that flag is
on, the name belongs on the card and this is the place to add it.

## The front door says only what is true — **DECIDED 2026-10-24**

Screen 1. The landing page was a hero, a chip row and three cards. It is the only page a stranger reads before
deciding whether this is for them, so it is where "as premium as possible" has to start — and where the
temptation to sound bigger than the product is strongest.

**Nothing on it is invented.** No learner counter, no testimonial, no logo of an institution that has not
endorsed anything. The platform is young, and a front page that invents its own size is the first thing a
careful parent catches; once caught, every other sentence on the site is discounted. The panel that replaces
social proof makes four claims the database already enforces — an author cannot approve their own course, a
child has no login, a certificate number stays checkable after the course is withdrawn, and progress belongs
to one named learner.

**The two limits are said on the page, not in a footnote.** Teaching is by appointment, and no provider moves
money yet. Both sit in the teacher band beside the 50% share, because a band that advertises the share and
omits the limits is a promise the next screen breaks.

**One display face, and only here.** `.display` is the certificate's serif — system fonts, nothing downloaded,
so there is no flash of unstyled text and no font request to block on — used on the landing page and nowhere
inside the application. Lessons are read for an hour; marketing is read for ten seconds, and they should not
sound the same.

**The unconfigured notice is furniture, not content.** It sits below the closing call rather than in the hero,
so a deployment with no database still shows a front door instead of an error dressed as marketing.

**Not decided here:** photography or illustration. The page is CSS-only geometry today; imagery is a brand
decision with real cost — art direction, a photographer, hosting — and nothing on the page depends on it.

## You choose what you are told — **DECIDED 2026-10-24**

Screen 49. The in-app centre already existed: three stored kinds written by the payout functions, two
reminders computed at read time, a badge, and mark-as-read. What a person could not do was change any of it.

**Two kinds cannot be silenced.** `payout_failed` and `payout_cancelled` are how somebody finds out their money
did not arrive, and a preference screen is exactly where that switch gets flipped by accident — "off" is often
the first option in a list, and a person tidying their messages switches all of them off. A platform that lets
someone silence the only message telling them a payout failed has built a switch whose sole effect is to hide a
problem. `set_notification_preference()` refuses with a sentence rather than a greyed control, and
`notification_enabled()` returns true for both whatever the table says — the check does not live only in the
writer, because the table is writable: a hand-written `enabled = false` row was tested, not assumed.

**A muted message is kept and not counted.** The row is the record of what the platform did; deleting it
because somebody does not want to be interrupted rewrites the history the page is for. `my_notifications()` and
`notification_badge()` filter on the preference instead, so a muted message disappears from the feed and from
the count, the row stays, and unmuting brings it back still unread.

**Muting a reminder is not the same as answering it.** A reminder is not a row — it is computed from
`live_sessions` and `subscriptions`, which is what stops it going stale. Muting one therefore has to stop it
being computed, not mark it dismissed; there is nothing to delete and nothing to acknowledge.

**`locked` and `available` say different things.** Locked is a rule that cannot change — *you may not*. Available
is a fact about this deployment — *not yet*. Both reminders depend on features that ship off
(`delivery.live_classes`, `commerce.subscriptions`), so the reply carries availability from those same flags and
the screen says so in the row rather than implying that something arrives either way. The switch still works: a
choice made in advance is a choice, not an error.

**Every kind is listed, always.** A screen that only shows what has already been changed cannot be used to change
anything back. The vocabulary is closed in a CHECK constraint, and `parsePreferences()` throws on a kind this
screen cannot label instead of rendering an unlabelled switch.

**The two helpers are granted to nobody.** `notification_enabled(user, kind)` takes a person's id; granting it
would let anybody who knows a user id ask whether that person silenced their class reminders. It is only ever
called from SECURITY DEFINER functions, so the grant was removed rather than reasoned about.

**Where it is.** The switches sit under the feed at `/notifications#preferences`, and `/account` carries a card
with the unread count — the masthead is deliberately auth-agnostic, and a badge there would make every page
depend on the session. `POST /api/notifications/preferences` is the only writer route.

**Not decided here:** whether a teacher may send an announcement to a class. That is not a notification kind, and
no table for it exists. **Also open:** whether any of these should also go by email or push once a provider is
configured — today the screen says no provider is configured, rather than implying one is.

## A lesson can check you without grading you — **DECIDED 2026-10-24**

Screen 15 — "interactive lesson" — was the last unblocked screen in the inventory, and the platform had
almost all of it: sections, lessons, video, audio, sources, notes, discussion. The missing half was the
one that makes a lesson interactive rather than a page with a video on it.

An assessment could already hang off a single lesson and could already be a `practice` assessment. What
could not be done was **check an answer**: the only route was `start_attempt()` → `submit()` →
`grade_response()`, which creates an attempt, consumes one of the attempt limit, records a score and can
move a completion rule. Doing that to somebody reading a paragraph and wondering whether they followed it
is absurd.

**A check is not an attempt.** `check_lesson_answer()` writes nothing at all — no attempt, no response, no
score, no progress — and it is `stable` because it must be.

**It is the second function ever allowed to read `answer_key`**, after `grade_response()`, and the key never
appears in the reply: only the verdict and, when it is fair to show it, the explanation.

**It compares the way the marker compares.** A practice check that is more forgiving than the graded quiz
would teach a learner their answer was right when the exam will say otherwise. Multiple choice is sorted
on both sides — the quiz client already sends sorted arrays — and a short answer is trimmed, because a
trailing space is not a second answer. Nothing else is normalised.

**The explanation is a reward for being wrong as much as for being right** — but only on a practice
assessment. On a graded one it waits until the answer is right, so an inline check cannot leak the quiz.

**Entitlement is the materials' entitlement**: a live enrolment pinned to the version the question belongs
to, whose learner the caller may act for, so a parent checking a child's practice and an adult checking
their own pass for the same reason.

**Not decided here:** whether a practice check should ever be recorded (a "you have answered 4 of 6" for
the teacher). Today it leaves no trace, which is the point.

## A shelf the doors are decided from — **DECIDED 2026-10-24**

U72 let a course say who it is for, and gave the author a picker on their own course page. The database
also admitted the platform admin and a governance admin — the safety hatch for a course behind the wrong
door whose author is unreachable. That power existed as a function in a migration and nothing else, and
the owner's rule says every routine change is done on a screen by whoever may make it. A function is not
a screen.

**`course_shelf()` gates on the two roles that may change an audience, not on `is_privileged`.** A support
agent is privileged: they can refund an order and answer a question about an account. Repointing a
children's course is not that, and "staff" is not one permission.

**It counts learners and names none.** How many live enrolments a course holds is a fact about the
course, and it is the difference between a course somebody studies and one nobody opened. Who they are is
a fact about people; the payload carries no learner identifier at all, and a test asserts it.

**It carries no money.** Not a price, not revenue, not a lifetime value. Earnings are per currency and
have their own screens; a shelf with an amount column is the third place two currencies get added by eye.

**Retired courses stay on the list.** The course nobody can find by browsing the catalogue is exactly the
one whose audience is wrong, and the catalogue does not show retired courses.

**A LIMIT says it is a limit**, in the payload (`total`, `shown`, `truncated`) and in the sentence above
the list, because a list of fifty that stays quiet becomes "we have fifty courses" by the end of the week.

**The page refuses to render a row it does not understand.** `parseShelf()` throws on a column the screen
does not show and on a lifecycle it has not been taught, rather than defaulting an unknown status to
"draft" — on a page whose job is being right about who may see what, a guess is worse than an error.

**Not decided here:** whether a governance admin may also unpublish or retire a course from this shelf.
Today it changes the audience and nothing else; the lifecycle belongs to the author and the review trail.

## A course says who it is for — **DECIDED 2026-10-24**

`courses.audience` (child, adult, both) and `learner_profiles.age_band` have both existed since the
first schema, and nothing ever joined them. A six-year-old and a fifteen-year-old were shown the
same shelf, and the only way to narrow it was a dropdown on the catalogue — which helps the person
who already knows the platform has two audiences, and nobody else.

**Empty bands mean every band the audience allows.** `courses.age_bands` defaults to `{}`, and an
empty array is not "no ages": it is "all of them, inside the audience". That is what every course
already on the platform means, so the migration changes the meaning of nothing, and the reader
(`bandFits`) returns true for a course with no bands rather than hiding the back catalogue behind a
question nobody was asked.

**An audience and its bands cannot disagree.** A `child` course may claim 5-7, 8-10, 11-13 and
14-17 and never 18+; an `adult` course may claim only 18+. The constraint is checked in
`set_course_audience()`, not in the form, because the audience is a safeguarding signal: a row that
says "child" and "18+" together is useless exactly at the moment somebody relies on it. The refusal
names the band — *"18+ is not a band the child audience may claim"* — because "invalid value" sends
an author to read SQL to find out what they did wrong.

**It is an editorial decision, and the author owns it.** The author, the platform admin or a
governance admin may set it; every real change is audited as `course.audience_changed` with the
audience *and* the bands on both sides, and an identical write returns `changed: false` and records
nothing. The author is the person who knows what they wrote; governance is the second pair of eyes.

**The audience lives on the course, not the version.** D5 freezes a published version and its whole
subtree — sections, lessons, assessments. Who a course is for is not part of what was published: it
decides which door the course stands behind, and getting a band wrong must not require cutting a new
version. That is why `set_course_audience()` takes a course id.

**The two doors are pages, not a filter.** `/young` and `/adults` are the same shelf with the
decision already made, because a parent choosing for a child and an adult choosing for themselves
arrive with different questions — one needs to be told that a child is a learner and not an account,
the other needs to see depth rather than a children's catalogue with the children taken out. Both
ship behind `learning.audience_sections`, which is off and is the owner's to flip in the dashboard;
`learning.age_bands` adds the chips on `/young`. While the switch is off both routes redirect to the
catalogue, because one door without the other would be worse than no doors, and while it is on the
catalogue links to both so a door is reachable from where everybody arrives.

**Not decided here:** whether the age chips become a remembered preference, and whether a teacher's
enrolment should warn when a child is enrolled in a course outside their band. Neither is needed for
the shelf to be honest.

## A lesson remembers where you were, and that is not progress — **DECIDED 2026-10-24**

`lesson_progress.last_video_position` has existed since the first progress migration, documented as
"resume position, in seconds, only meaningful for timed media", and no code has ever written it. Every
player in the product starts at zero. A learner who closes a forty-minute recitation at minute
thirty-one finds minute one the next evening — for a Qur'an course that is the difference between
memorising a passage and never getting past its opening.

The column was already the right shape, so this is a writer, a reader, and one decision that is easy
to get wrong.

**A position is not a percentage.** Moving a player does not complete a lesson, and a completed
lesson does not become unfinished because somebody reopened it and listened to the first minute
again. `record_lesson_position()` touches `last_video_position` and the timestamps, moves `not_started`
to `in_progress`, and refuses to move anything that is `completed` or `skipped` — a progress bar that
drops to 40% because the introduction was rewatched is a bug report waiting to happen.

**Whose place it is comes from the same helper the policy uses.** The function is `security definer`,
so it does not run under RLS; it calls `can_access_learner()` explicitly, which is what the table's
policy calls. A parent keeping a child's place, and a child's own account once child login exists,
therefore pass for the same reason rather than by a second rule that could disagree.

**The lesson must be in the pinned version.** D5 pins an enrolment to one course version, and a
position against a lesson that version does not contain is a row nobody can explain later. The
lesson's version is reached through its section, which is where the pin actually lives.

**One read for the whole enrolment.** A lesson list wants "resume at 12:31" beside twenty rows, and
a call per row would be twenty round trips to paint a sidebar. `lesson_positions()` returns the map
in one.

**The player's rules are where the judgement lives, and they are pure functions.** Resume only past
fifteen seconds, and not within twenty seconds of the end: ten seconds in is not "where you were",
and resuming at the end starts, finishes and looks broken. Save on a ten-second drift, and forcibly
on pause, on end and on `pagehide` — `timeupdate` fires four times a second, which would be 14 000
writes for an hour of recitation. Resume once per mount, because a quality switch re-fires
`loadedmetadata` and resuming again would throw the learner backwards.

**Screen 23 is the same idea with a passage in it.** A recitation is not a podcast: the learner
repeats after the reciter and returns to one passage. The player adds slower speeds (0.5×–1.5×),
two buttons that mark the passage and loop it, and the saved place — and keeps the native controls,
because media keys, the lock screen and screen readers come free and a custom transport bar would
give them up for a nicer play button.

## A directory is about people, and holds no money — **DECIDED 2026-10-24**

Screens 36 and 37 — Users and Teachers — have been `READY` since the inventory was written and
have never had a page. Neither is a queue: everything else in the console is about work waiting
for a person, and these two answer a question about people. `staff_directory()` returns them as
one call with a `kind`, so the shape, the search and the refusals are declared once.

**An account is not a child.** A child is a `learner_profiles` row inside a family, with no login
while `child_login` is off. The Users list is accounts, so the children of the platform are not in
it by name — not because a filter was applied, but because the schema says they are not accounts.
The useful number beside an adult is how many learner profiles hang off their account, which is
the answer to "is this family here" without being a list of children.

**A directory holds no money.** No balance, no lifetime value, no total spent, no currency. The
money screens exist and are gated; a directory with an amount in it is the one screen where two
currencies get added together by eye. The reader enforces this in the other direction too: the
fields a row may carry are an **allowlist** in `web/src/lib/directory.ts`, so a column added to
the database makes the page fail until somebody deliberately admits it.

**Who may look is two different questions.** Finding an account is support's job, so every staff
role may search accounts by name or by email — the email because "find the account for this
address" is what a support message actually asks, and a directory that cannot be searched by the
thing the person quotes is useless. Who teaches, what they have published and how many learners
they hold is a platform decision, and the roster is the owner's and governance's: `instructor` is
granted by appointment, governance checks a teacher's qualification, and a support agent does not
need either.

**The roster counts published, not written.** A course counts as published once one of its
versions is, once however many versions it has — the wrapper's own `status` is a lifecycle, not a
publication. Learners are distinct people across everything a teacher wrote: a number, never a
list, because who is enrolled is the cohort screen behind its own flag.

**A limited list says it is limited.** `Showing 50 of 120`, and the parser derives truncation from
the arithmetic as well as the flag, because silence about a LIMIT is how a list of fifty becomes
"we have fifty accounts" in somebody's head.

## A switch belongs to the platform admin, and the table says so — **DECIDED 2026-10-24**

`platform_settings` holds two kinds of row. Reading it is staff work: knowing that
`commerce.checkout` is off is part of being staff, and code asks through `setting_bool()`.
Writing it was also `is_privileged()` — not a decision, just the policy that was written
before there was more than one kind of staff member. The consequence was concrete: a
support agent, whose job is other people's cases and who cannot approve a refund, could
issue one UPDATE and turn checkout on, or `platform.support` off.

**The register now says which kind each row is.** `setting_kind` is `flag` (90 rows, the
feature switches) or `control` (13 rows, the dials with their own writers). That column
is the distinction FLAGS.md has always made in prose and the schema never made in a form
a trigger could read.

**A flag needs the platform admin.** Not "staff" — the owner. A support agent reading the
register is a staff member being informed; a support agent flipping it is staff making a
product decision. Enforced by a BEFORE trigger on the table (`enforce_setting_authority`),
so it holds whichever door the write comes through: the dashboard, PostgREST, or a
hand-written UPDATE. The refusal says the key and what may be done with it — `may be read,
not flipped`.

**A control goes to its own writer's gate.** The guard calls `may_write_setting()`, which
asks `may_change_control()` for the ten in the allowlist and names the three bespoke ones
with the role each writer actually checks (the revenue share and the payout hold are
finance-or-owner; the refund window is any staff, because it bounds asking rather than
deciding). A direct table write that its writer would have refused is refused, so a
control cannot be changed by skipping its bounds, its written reason and its audit.

**The comparison covers every column, not just the value.** Changing `gate_type` from
`code` to `admin` and then flipping the flag is two writes that each look harmless alone;
the first one is the hole. Only `updated_at` and `updated_by` are set aside, so a writer
that touched the row to record who did it is not asked twice.

**The screen had to change with it.** `/admin` was offering a revenue-share field, ninety
toggles and a wall of money links to every staff role. The queues at the top were already
filtered in the database — a count that is not sent cannot be read — but the links were
not. The console now groups its links by whose work they are, from the three booleans
`staff_attention()` already returned, and renders the switchboard only for the owner. A
link that refuses is worse than no link; it teaches the reader that the page cannot be
trusted to know what they may do.

**And a finance-only or support-only login landed on `/learn`** — a learner page, shown to
the staff member who most needs a "what is waiting" list. `homeFor()` now sends every staff
role to the console.

## The outbox is a state machine, and it sends nothing — **DECIDED 2026-10-24**

`outbound_messages` has existed since 2026-10-19 and has never had a state machine. A row was
`queued`, and then somebody claimed it was `sent`. That is not a delivery system, it is a table
where a hopeful agent writes a word, and the word cannot be checked: the constraint that `sent`
names a provider proves somebody typed a provider, not that a provider answered.

**Five things were missing, and each is a separate decision.**

1. **A claim has to be a lease.** `claim_outbound_messages()` hands out the next eligible rows
   for **five minutes** with `for update skip locked`, recording `claimed_at`, `claimed_until`
   and `claimed_by`. Two dispatchers running at once cannot both take the same row — the second
   steps over the locked one rather than queueing behind it — and a dispatcher that dies holding
   a row has its lease expire back into the queue. Without the expiry, one crash strands a
   receipt in flight forever and nobody finds out.
2. **A failure has to be a clock, not a status.** A retryable error sets `next_attempt_at` 5
   minutes out, then 15, an hour, four hours, twelve. The row stays `queued` and is simply not
   eligible; `delivery_backoff_minutes()` is the single place the schedule lives, so the queue
   cannot disagree with itself about how long to wait. The point is not politeness to the
   provider: an outage that gets worse because our retry loop hammers it is an outage we caused.
3. **A ceiling has to end it.** At `delivery.max_attempts` (default **5**, bounds 1–10) the row
   becomes `failed`, keeps `dead_lettered_at`, and is audited as `delivery.dead_lettered` with
   the error it died on. The constraint `om_dead_letter_agrees` makes the moment part of the
   state: a row cannot be `failed` without saying when, and cannot carry a moment without being
   failed. This is the only state a person has to act on, and it is the only state the screen
   offers a button for.
4. **A bad address has to be remembered, not just marked.** `message_suppressions` holds a
   normalised address per channel. A bounce writes there in the same statement that suppresses
   the message, because a bounce that only marks one row leaves the next row to bounce too. The
   list is checked **inside `queue_message()`**, so the message that would have gone out tomorrow
   is written as `suppressed` with the reason — the platform still records that it owed somebody
   a message and chose not to send it. And it is deliberately **not an exception**: `queue_message()`
   runs inside payment confirmation, and refusing a payment already taken because the receipt
   could not be emailed would trade a family's money for our tidiness.
5. **There has to be a way back.** `retry_outbound_message()` puts a dead letter back in the
   queue, resets the attempts, needs a written reason, and audits the error it died on — and it
   **refuses while the address is suppressed**, because sending to it again is the one thing the
   list exists to prevent. Lifting a suppression is a separate, deliberate act.

**What is not decided, and must not be implied:** nothing sends. There is no provider, no
credential, and no HTTP call in this repository — `claim_outbound_messages()` refuses outright
while `delivery.notifications` is off, which it ships as. A dispatcher will be a worker that
signs in as a staff account, because there is no `service_role` in this schema; the transcode
worker does the same, and the consequence is the one worth having: a machine writer is subject
to the same refusals as a person and its sends are attributable. When the provider is chosen,
the work is an adapter that calls `claim` → send → `record_delivery_outcome`, and every rule
above already holds. **The email/SMS provider remains the first external blocker.**

**A control came with it.** `delivery.max_attempts` is the thirteenth control because the number
that decides when to give up is a policy, not a deploy — and it is bounded in
`platform_control_rules()` like the rest (1–10, because 0 would mean a message nobody ever tries
and 11 is a wait longer than the day it is trying to cross).

## A control writer is an allowlist, not a settings hole — **DECIDED 2026-10-23**

`platform_settings` holds two kinds of row. Ninety are feature switches, and they have a dashboard.
The rest are **controls**: the numbers and words that decide how a feature behaves once it is on —
the reporting currency, the rate sanity factor, the teacher upload quota, the device cap, the
saved-lesson lifetime, the live-room host, and three governance numbers.

Nine of them could only be changed with an UPDATE against a table nobody outside this repository can
see. That is the shape the standing role rule rejects.

**The obvious fix is the wrong one.** A function that takes a key and a value and writes whatever it
is given would be the same hole with a friendlier name: any privileged account could rewrite the
revenue share, the reporting currency and every feature switch under cover of "settings". So this is
an **allowlist of nine named controls**, each with its own type, its own bounds and its own owning
role:

| Control | Type | Bounds | Owned by |
|---|---|---|---|
| `finance.reporting_currency` | text | ISO 4217 | finance |
| `finance.rate_sanity_factor` | integer | 0–1000 | finance |
| `media.upload_quota_gb_per_teacher` | integer | 1–10 000 | platform |
| `learning.offline_max_devices` | integer | 1–10 | platform |
| `learning.offline_expiry_days` | integer | 1–365 | platform |
| `delivery.live_room_base` | text | empty or `https://` | platform |
| `governance.min_approvals` | integer | 1–5 | governance |
| `governance.panel_required` | boolean | on/off | governance |
| `governance.scholar_board_active` | boolean | on/off | platform |

The bounds live in **one** function, `platform_control_rules()`, and both the reader and the writer
consult it. Two copies would drift, and the way a drift shows up is a screen offering a value the
writer refuses.

**Three refusals that make it an allowlist.** A key not on the list is refused with a sentence saying
where it does belong. A feature switch is refused **by name** and pointed at the dashboard. And a
control that already has its own writer — the revenue share, the payout hold, the refund window — is
refused and named, because each of those writers does more than store a number: the revenue share
snapshots into every future earning, and routing it through a plain value write would bypass that.

**The gate is per control, not per screen.** `platform_controls()` returns only what the caller may
change — the same rule `staff_attention()` follows. A finance admin sees two money controls, a
governance admin sees two publication controls, a support agent sees none, and the platform admin
sees all nine. A control returned but not editable would be a permission question dressed as a layout
question, and several of these numbers (what a teacher may store, how many people must agree before a
course teaches) are not values to hand every role. The page says how many others exist and who owns
them, without naming a value.

**Every change carries a reason and is audited** with the old value beside the new one. A no-op writes
nothing: an audit trail full of saves that changed nothing is a trail nobody reads.

## A refund can be asked for for 72 hours, and the clock is the payment's — **DECIDED 2026-10-23**

The owner: *"a customer can only get a refund between the 72 hours that happen after the payment."*
Until now there was no clock at all — a family could ask a year later, and the only limits were the
refundable balance and somebody's judgement.

Four things the rule has to get right, and they are all about *what* is bounded.

**The clock runs from the payment, not from the request.** `orders.paid_at` is the only moment that
matters, and it is written by `record_payment_success()` from a verified confirmation — never by a
browser coming back. The comparison happens in the database, so a client cannot ask early or late by
moving its own clock.

**It bounds asking, not deciding.** A request made in the last minute of the seventy-second hour is
valid, and it can be approved tomorrow, next week, or after a provider has been down a fortnight. A
rule that expired requests in flight would punish the customer for the platform's speed, and would
turn a refund into a silent decline.

**Staff are exempt, and that is a decision rather than an oversight.** The window is a customer
policy, not a lock on the business: a course sold wrong, a duplicate charge, a family who could not
get to a phone inside three days. Support opens a request from `/admin/refunds`, by order number,
and it refunds whatever is still refundable — the amount is read from the database rather than typed,
because a mistyped figure on a goodwill refund is money somebody has to chase. The request is
attributed to the member of staff, `rr_not_self_approved` still stops them approving their own, and
the audit records `refund.requested_by_staff` with **no window**, because the window did not apply. A
year from now, "was this inside the policy" is answerable from the trail.

The alternative — no escape hatch — is how a rule gets worked around by editing the database, after
which nothing is audited at all.

**A closed window is said, not hidden.** A refund button that disappears three days after a purchase
is a support ticket: the customer cannot tell a missed deadline from a broken page from never being
eligible. `refund_standing()` decomposes the writer's own predicate — not paid, nothing left, window
closed, allowed — and carries the moment the window shut, so `/orders` prints the sentence and the
date. A test holds the two together: `allowed` is false exactly when `request_refund()` refuses.

**It is a setting, and it ships at 72.** `commerce.refund_window_hours` is an ADMIN control in
`FLAGS.md`, because the length of a policy is a business decision and this platform's decisions live
where the owner can change them. `0` means no self-serve refunds; a negative value is clamped to 0
rather than opening a window that starts before the payment.

**Changing it has a writer and a screen.** The setting arrived by migration, which means the owner could
move it with an UPDATE against a table they cannot see — the exact shape the role rule rejects. So
`set_refund_window()` takes a reason, refuses anything outside 0–8760 hours with a sentence naming the bound,
writes an audit row with the old value beside the new one, and is reachable from a field on `/admin/refunds`,
next to the queue it governs. It is deliberately not a general settings writer: one of those would let any
privileged account rewrite the revenue share or the reporting currency under cover of refunds, and a test
asserts it cannot.

**Known gap, recorded rather than papered over:** the staff form refunds the whole remaining amount.
A *partial* goodwill refund is still a database action with no screen — the customer's own form has
the same shape (it asks for the order total), and letting a person type an arbitrary amount on a
support call is how a refund becomes a typo.

## A payer's balance is money that moved, and nothing else — **DECIDED 2026-10-23**

The platform could say what an order was (`/orders`, and a receipt with a number a person can
read out loud) and what the business took in (`/admin/money-report`, for staff). It could not
answer the question a parent asks two days after requesting a refund: **what has gone out of my
account, and what has come back?**

`my_statement()` answers it: per billing account, per currency, a charge for every paid order and a
refund for every completed one, in date order, each carrying the running total after it. Three
rules, and the first is the whole decision.

**Only money that moved is in the balance.** A refund *asked for* is not a refund. An *approved*
one is not either — approval creates a pending transaction, and a refund is a transfer. One *sent
to the provider* is not a refund until the provider confirms it, which is the change that writes
the ledger and reverses the teacher's earning. Every one of those states is listed under
`notYetMoney` with a sentence saying where it has got to, and none of them moves `netMinor`. This
is the same distinction the money path keeps everywhere else, and a statement is precisely where a
customer would notice if it were fudged: a platform that showed a pending refund in the balance
has told them they have their money back.

**Currencies are never added together.** A family that paid in shillings gets a section in
shillings. Converting would require an exchange rate; the money report does that for staff, with
the rate beside every figure and the gaps listed. One page inventing a rate would be the only
screen in the product that did.

**It is the caller's own money, and staff get no shortcut.** The function is `security definer`
because it must read `payment_disputes`, which is staff-only, so membership is checked explicitly
inside it rather than left to RLS. That is the mistake that once made `my_plan_summary()` return
every subscription on the platform. Staff who need the whole picture have the ledger and the money
report; this answers "what did I pay", and it is the same answer for the owner as for anybody else.

**Why not the ledger itself.** `financial_transactions` is the authority on what moved, and it is
staff-only on purpose: it carries provider references, provider fees and the settlement figures,
which are the platform's business rather than a payer's. The statement is a projection over the
three things a payer may already read — their orders, their refund requests, their refund
transactions — and a test pins it to the ledger: whatever the statement calls a completed refund is
exactly the refund the ledger recorded. If the two ever disagree, one of them is lying to somebody.

**What the customer reads is the outcome, not the staff's working notes.** A declined request
shows as declined with a pointer to Help; the decider's `decision_notes` — whose form invites "what
you checked" — is a note to colleagues and is not carried by the projection. The same line
separates internal support notes from the case thread the person who opened it reads. Their own
words (the reason they gave) do come back to them.

**Two things it says out loud rather than hiding.** A decided dispute does not move the balance,
because nothing posts the outcome of a dispute to the ledger yet — a case is listed with its state
and a sentence saying this record has no entry for it. And the page says it is the platform's
record, not a bank statement: a completed refund may take days to appear, and a bank's own fee
never appears at all.

**No flag.** Reading what you have paid is not a feature to be switched on; `FLAGS.md` settled the
same question for the data export — a right behind a switch that ships off is not a right.

## `can_view_invoices` is a column no policy reads — **FOUND 2026-10-23, OPEN**

Every `billing_account_memberships` row carries `can_view_invoices` (default true) and nothing
reads it: not `orders_read`, not the receipt, not any function or screen. It is not a control, it is
a default. The statement deliberately does **not** honour it, because honouring it in one place
while `/orders` ignores it would give the platform two answers to one question, and the weaker one
would be the one people saw.

Either a writer that sets it arrives with a policy that enforces it (`orders_read`, the receipt,
`my_statement()`) in the same change, or the column is dropped. Half of that is worse than neither.

## Nothing says that something is waiting, so one screen says all of it — **DECIDED 2026-10-23**

Every queue on this platform has a page that is good at saying *what* is in it: refund requests,
disputes, reconciliation runs, support cases, appeals, qualifications to check, guardian
verifications, reported content, held reviews, media needing a look. Not one of them says **that
there is anything in it**. An owner signing in on a Monday had no way to learn that a chargeback
was waiting without opening every page in turn, and the page `homeFor()` sends a platform or
governance admin to on sign-in was a wall of feature switches.

`staff_attention()` answers the question in one call, and `/admin` now opens with it. Three rules.

**Permission is the filter, not the label.** The function is `security definer` and builds only the
queues the caller may work: money for `finance_admin` and `platform_admin`, governance for
`governance_admin` and `platform_admin`, support for `support_agent` and `platform_admin`, and the
content queues for anyone privileged. A support agent does not receive a refund card with the
number hidden — they receive no refund card. **The count of refunds is itself information about the
business**, and a function that returned every count and trusted the screen to hide some would hand
it to anybody who could open a support account. This is the same rule as everywhere else here: a
permission check in the database, not a CSS class.

**A count of zero is an answer.** Every queue the reader may work is returned, empty or not, with
the page that drains it. A card that vanished at zero is indistinguishable from a queue that does
not exist, and the reader would have to remember which ones were missing. The total is the sum of
the cards that were returned, so the headline cannot disagree with the list under it.

**A queue whose feature is switched off is marked, not hidden.** Guardian verification, support,
reviews and payouts each sit behind a flag that ships off. Turning one off stops **new** work
arriving; it does not empty what is already there, and those cases still need a person. The row
carries `dormant` with the feature's name, and the screen says "paused by a feature switch" rather
than letting the reader conclude the queue is broken or the zero is real.

**What it deliberately does not do.** It does not send anything: the first external blocker is
still an email/SMS provider, so this is a screen a person visits rather than a digest that arrives.
It does not triage or assign. And it does not invent a home route for a finance or support login —
`homeFor()` knows six role facts and those two are not among them, so such a person reaches `/admin`
and sees their own shorter list, but signing in does not yet take them there. That is recorded as
an open item rather than half-built.

## An export must say what it left out, and when it stopped — **DECIDED 2026-10-22**

`export_my_data()` was built with its boundaries documented and tested, and it carried the young half
of a record: account, families, learners, orders, notes, bookmarks, shares. What it did not carry was
most of what a person did here — discussion, reviews, submitted work and the marks and feedback that
came back, quiz answers, support cases, messages, earnings, payouts, devices, activity.

Three rules now surround the fuller document.

**A list stops at 1,000 rows and says so.** `meta.truncated` names the cut lists and `meta.counts`
gives the true totals. A document that silently drops half of somebody's history is worse than one
that admits it stopped.

**What is not included is named.** `notIncluded` says in words why another person's words, the
sign-in address, internal staff notes, uploaded bytes and credential tokens are absent. Somebody
reading their own export should not have to infer from an absence — and an absence is exactly what a
reader cannot distinguish from a bug.

**Every copy is recorded, and ten an hour is the limit.** The export writes one audit event with
section counts, and that event doubles as the rate limiter's counter. An export is the most personal
document the platform produces; a script hammering it is either a bug or an attack.

And the export is **not** behind a flag, which `FLAGS.md` had already settled before this migration
existed: a right behind a switch that ships off is not a right. `platform.data_export` continues to
gate only the part that is unbuilt — CSV and PDF renderings, and an import path.

## Google sign-in is configuration, so its flag is not CODE-gated — **DECIDED 2026-10-22**

Every other provider-shaped feature here ships `code`-gated, because the missing piece is code. This
one is different: Supabase Auth already implements the flow, and what is missing is a Google OAuth
client and a provider setting. So `auth.google_sign_in` is `admin_setup` — the owner configures it
once and flips it from `/admin`, with no deploy. The flag still ships **off**, because a button that
cannot work is worse than no button, and the sign-in screen would rather show two methods that do
work than three where one throws.

Three smaller rules. The name Google supplies is used, **capped at 80 characters**: a claim is not a
verified fact about a person, but it is the name they use, and an uncapped one is a way to write a
kilobyte into every screen that greets them. The callback's destination is **sanitised**, never
forwarded, because an open redirect on a sign-in callback is the classic phishing component. And
`/account` asks `my_sign_in_methods()` before offering a password reset: a Google account has no
password, so a reset form is a dead end that looks like a broken product.

Account linking is Supabase's: if the address already has a password account, Google's verified
address links the two. That behaviour is why the address must be verified first, and verifying it
is Google's job.

## A renewal projection is committed terms, not forecast income — **DECIDED 2026-10-22**

A subscription pins the plan version it bought, and the price attaches to that version. So the
renewal amount for an existing subscriber is readable from the row rather than inferred from
today's shelf price — and raising the price is a new version, which cannot move a subscriber
already on the old one. A test raises it and asserts the projection does not move.

What the projection is **not** is income. No renewal engine exists, no merchant account exists, and
`commerce.checkout` is off: nothing charges any of these. `/admin/renewals` therefore says that
above the table, and the function returns `automaticRenewal: false` so the screen cannot decide to
sound more confident than the system is. The number answers "what have we committed to, and when".

Two smaller rules. A past-due subscription is **projected and counted as at risk** rather than
dropped, because money owed by somebody who has not paid is the most important row on a cash-flow
page. And where a version carries several market prices the default is used, because a subscription
does not record its market; the screen names that limitation rather than producing a number that
looks exact.

## A message that is about to happen is computed, not stored — **DECIDED 2026-10-22**

With no delivery provider, the platform said nothing to anybody. `/notifications` fixes the half
that never needed a vendor, and splits it in two on a rule worth writing down.

**Something that happened is stored.** A payout sent, a payout that failed, a request staff
cancelled: each is written by the function that did it, in the same transaction, with a dedupe key
so a retried event is one message. It has a read state because a person dismisses it.

**Something about to happen is derived.** A class within a day and a plan renewing within three are
computed at read time from the rows that already say so. Storing them would mean writing tomorrow's
message today, then a scheduler to keep it true, then a way to un-write it when the class moves.
Deriving it means it cannot be stale, duplicated or orphaned, and a cancellation needs no cleanup.
Derived reminders have **no read state**: they are current, not waiting to be dismissed.

Both halves are gated on the feature they describe. A reminder about a live class cannot appear
while `delivery.live_classes` is off, because the thing being reminded of is not reachable — the
same rule as the Plus shelf that a not-entitled learner must not be pointed at.

`notify_user()` is not granted to anybody: it takes a user id, and a caller with it could reach
anybody. Writers are the definer functions that already decided who is affected.

## What is owed to teachers is a balance, and it is shown apart from the flows — **DECIDED 2026-10-22**

Three surfaces now describe teacher money and none of them may be mistaken for another. The
earnings statement is what one teacher has earned. The money report is a window of movement —
captures, refunds, fees. Neither is the number the owner needs before spending anything: *how much
of what is in the bank is not mine?*

`platform_teacher_liability()` is that number, per currency, and it is a **balance**: owed, of
which inside the refund hold, of which an open request has claimed, and paid to date. The open
request is shown beside the balance and **not added to it** — a request is the same money seen from
the other side, and adding it would double-count the platform's own promise.

A converted total is offered only when **every** currency has a recorded rate. If one does not, the
function returns no total and names the currency; converting the rest and leaving one out is how a
number with a currency it does not have gets into a decision.

## A payout request moves no money, and only finance can mark an earning paid — **DECIDED 2026-10-22**

The earnings statement answered "what have I earned" and left "when do I get it" unanswered. The
tables for a payout existed from the first money migration and nothing drove them.

Three rules now do, and the first is the one that shapes the other two.

**A request is not a payment.** `request_instructor_payout()` writes a request and nothing else:
no earning changes status, no item is created, no money is claimed. Only
`complete_instructor_payout()`, by a finance admin, with a provider and a provider reference in
hand, inserts the items — and the item trigger is what marks an earning `paid`. If a request had
marked anything paid, the earnings screen would start counting money as sent that never left.

**An earning waits out its refund window.** `teaching.payout_hold_days` (default 14) keeps a sale
from being paid out before it can be reversed; without it the platform pays a teacher, refunds the
buyer, and chases the teacher. It is a setting, changed from `/admin/payouts` with a written
reason, because it is a business decision and should not need a deploy. Setting it to 0 is
allowed and is a decision somebody can defend; the audit event records who made it.

**One open request per currency, enforced by a unique index** rather than a check the code
remembers to make. Two requests over the same shillings would pay them twice.

Two smaller ones. The amount on a request is an **estimate**: entries reverse and new ones accrue
while it waits, so completion recomputes the total from the ledger, pays that, and the queue shows
"asked for" beside "owes today" so a stale request is visible before it is paid. And the teacher
must **acknowledge that declaring the income is their own responsibility** — the platform has no
tax treatment per country, and a checkbox is the honest way to say so rather than a footnote.

`teaching.payouts` remains CODE-gated: a trigger refuses to enable it from the application at any
privilege level. A provider, per-teacher destinations and tax treatment still do not exist.

## A teacher can see what they have earned, and cannot mistake it for a balance — **DECIDED 2026-10-22**

The revenue split has been recorded per sale since 2026-11-02: one row, the split snapshotted,
reversed on refund, corrected by clawback. **Nothing in the web layer ever read that table.** A
teacher's earnings existed only inside the database.

`my_earnings()` and `/teach/earnings` are the statement, and the design constraint is what they
refuse to say. **`teaching.payouts` is CODE-gated and off, there is no provider, no destination
and no tax treatment — no money has ever left this platform.** So the function returns
`payoutsEnabled` and the page says it above the numbers, in a warning that names what is missing
rather than a footnote. The figure is called *earned and not reversed*, never "balance": a
balance is a number somebody can withdraw, and there is nothing to withdraw.

**Currencies are never summed.** One teacher can be owed shillings from one market and dollars
from another, and adding them would be inventing an exchange rate. Converting is the money
report's job, at a rate the owner enters and the schema records. The page says that too.

Two smaller rules, both tested: an entry keeps the share it was accrued at — a later rate change
cannot re-price history — and a reversed entry stays visible as reversed rather than disappearing,
because "why is this less than I expected" deserves an answer.

## A Plus benefit nobody can see is a Plus benefit nobody buys — **DECIDED 2026-10-22**

Two silences followed from the offline decision, and both cost money in different ways.

**The button.** `may_download_lesson()` answers yes or no, and the lesson page hid the Save
button when the answer was no. A learner on Basic therefore saw a page with no way to save and
no explanation — so the one thing Plus sells was invisible to exactly the person it is sold to.
`lesson_download_standing()` now decomposes the same predicate into a reason: `signed_out`,
`feature_off`, `not_entitled`, `needs_plus`, `no_media` or `allowed`, each with a sentence.
**Only `needs_plus` is turned into a link**, because telling somebody who has not bought the
course to buy a plan would sell them something that is still useless to them.

That is an explanation, not a second rule, and the test holds it to that: for every case, the
standing's `allowed` must equal `may_download_lesson()` and the feature flag combined. Two
predicates that drift is how a screen promises something the writer then refuses.

**The page.** `/subscriptions` listed periods and learner slots and never said what the plan
*includes*. It now shows the shelf (Basic or Plus), the paid period, and the contents in words —
"Watch lessons inside the app with no connection" — from `my_plan_summary()`, with one line
naming what Plus adds for anyone on Basic.

**A first draft of that function leaked every subscription on the platform.** It is `security
definer`, so the RLS policy on `subscriptions` does not apply to the query inside it; the draft
relied on the policy and returned the whole table. The test that reads one stranger's summary is
what caught it, and the fix is written in the function as a comment: *a definer function has to
state the rule itself.* That lesson applies to every `security definer` function here that reads
a table with a per-person policy, and worth checking the next time one is written.

## A saved lesson is kept by the app, not handed to the phone — **DECIDED 2026-10-22**

Two sentences from the owner, and both change the design:

> "offline downloads work like youtube downloads, they only exist in the app locally but
> not in their file manager"

> "for a user to be able to download they would require to be subscribed to a plus plan, a
> plan on top of the basic plan with more features, more like the vip package."

**The plan.** Downloads need a **Plus** plan. Basic buys the course; Plus keeps it. That was
already the rule in `may_download_lesson()`; what was missing is `plans.tier`, so "the VIP
package" was a sentence in a comment rather than a column a screen could read. A plan is Plus
only if its tier says so **and** its live version carries `offline_downloads` — two
independent signals, so neither a mislabelled plan nor a stray grant hands out the feature.

**The storage.** The old button signed a URL with `Content-Disposition: attachment`, which
is a file in the Downloads folder. That is now retired: the save becomes a **record**
(lesson + device + expiry), the bytes are fetched once and kept in the app's own IndexedDB,
and the lesson is played from a blob URL this origin creates. Nothing is written to the file
manager, and no page navigates to the file.

**What this can and cannot promise.** It cannot stop a determined person copying a stream,
and it does not pretend to. It makes the app the only *supported* place a saved lesson
exists, and it makes a save revocable, countable and expirable in a way a loose file is not.

**Expiry and devices, both settled here.** A saved lesson is a subscription artefact, so it
lapses with the plan: 30 days by default, then it asks to be refreshed. Three devices by
default, counted only while they hold a live save. Both are settings, so both are the
owner's to move without a deploy.

**Settled the next day (2026-10-22): the shelf is now settable.** The "editing screen for
`plans.tier`" that was open below is built: `create_plan()` takes a tier (defaulting to
**basic**), `set_plan_tier()` moves a plan between shelves and audits it, `add_plan_entitlement()`
refuses a Plus-only feature on a Basic plan, and `remove_plan_entitlement()` exists so a
refused downgrade has a way out. `/admin/plans` carries the selector and the badge; `/plans`
separates the shelves. **The tier is a gate, not a label**: before this, the tier and the
feature grant were two independent ways to hand out downloads and a mismatch was silent.

**Open:** protected media. Nothing encrypts the stored bytes; a rooted device can read the
app's database. That is the residual risk of any offline feature and it is named rather than
implied.
## Analytics is kept forever, and that has consequences — **DECIDED 2026-10-22**

The owner: **"everything is kept and is stored forever because you never know what might
happen."** That settles the retention question `delivery.analytics` had been held on, and it
is the opposite of the default most platforms choose. It is a legitimate choice — a platform
that teaches children and adults wants to be able to answer a question two years later — but
it is not free, and the costs are written here rather than discovered later.

**What it decides.** Behavioural data about learners, teachers and courses is retained
indefinitely. Nothing expires, nothing is sampled away, and no scheduled job prunes it. The
policy itself is the decision; the instrumentation is still to be built.

**Consequence one: erasure no longer means deletion for these rows.** `erase_my_account()`
deletes what a person wrote and de-identifies what the platform recorded. Analytics joins the
second list by necessity: a row saying "learner X finished lesson 3" is not something a
person wrote, and deleting it would break every figure that counts completions. So it is
kept and **de-identified** — the actor reference becomes null, the row stays. That is already
how orders and certificates are handled, and it is the only way "kept forever" and "closed
account" can both be true.

**Consequence two: the store is append-only and cannot be rewritten.** A table that is only
ever inserted into can be partitioned by month and dropped as a partition if law ever
requires it, which a table everyone updates cannot. It also means a schema mistake is
permanent: an event captured wrongly is wrong forever, so the event vocabulary is closed and
versioned before the first row is written.

**Consequence three: volume is unbounded.** This is the one place where "keep everything"
meets a bill. The mitigation is not sampling — that would be keeping less than promised —
but writing fewer, better events and storing them cheaply.

**Settled 2026-10-22: the vocabulary and the store.** Seven events, closed in
`analytics_event_codes` and refused at write time if a call site misspells one: a lesson opened,
a course page viewed, a catalogue search, a plan viewed, checkout started, a lesson saved inside
the app, a live class entered. `analytics_events` is partitioned by month and append-only — a
trigger refuses every delete and every update except the de-identification that account erasure
performs — and `record_analytics_event()` is the only writer. Nothing is recorded for a
signed-out visitor: there is no anonymous tracking, no cookie, and no identifier, which also
means "how many strangers visited" becomes a question this platform deliberately cannot answer.
Staff read aggregates through `analytics_event_totals()` and `analytics_daily()`; the one report
that reads a payload is `analytics_search_terms()`, because knowing what was searched for is the
whole reason a search is recorded. The flag moves from CODE to ADMIN: the pipeline is built, so
switching capture on is the owner's decision rather than a deploy.

**Settled the same day: what an author may read.** `teacher_course_analytics()` returns
aggregates for one course to the teacher who wrote it (or to staff): total events, distinct
learners, distinct signed-in people, counts per event, the ten most-opened lessons, and lesson
opens by day. It returns **no learner reference at all**, because the number of people who opened
lesson three is a fact about the course while a list of who opened it is a fact about children.
A per-learner view already exists where it belongs — the cohort progress screen, behind its own
flag and its own opt-in. With capture off the teacher is told analytics is not enabled rather
than shown zeros, since an empty report and a switched-off report are different facts.

**Extended the same day: the stocks as well as the flows.** Enrolment totals (active,
completed, joined in the window) and certificate totals (issued, revoked) are now part of the
same report, because those are the first questions a course owner asks — "how many are in it,
how many finished" — and they are counts of the course rather than of the window. **Money stays
out:** earnings have their own screen and their own currency question, and a figure in shillings
beside a page of counts would invite exactly the mixing this schema avoids everywhere else.

## Revenue is reported on the day it was paid, in the currency it was paid in, with refunds beside it — **DECIDED 2026-10-26**

Three questions were open the moment the revenue screen existed, and each has an
answer that is worse to leave to whoever writes the next query.

**Which date puts a sale in a window.** `orders.paid_at` — the day the money
arrived — not when the row was created, not when the report runs. A June sale
recorded late belongs in June. For the same reason a teacher's earning is placed
by the sale's date, falling back to `accrued_at` only for an entry with no order
behind it (a correction, a clawback), which is then the only date it has. A refund
is placed by `refunded_at`. A sale and its reversal are therefore allowed to fall
in different months, and that is the point: the report is a record of what
happened in each period, not a running balance that quietly rewrites the past.

**Which figure to show.** Gross, refunded and net, as three columns, always. Never
one net figure. A refund is a thing that happened to a customer's money and the
platform should be able to read it afterwards; collapsing the two is how a business
discovers, a year late, that it refunds more than it sells. A `cancelled` order is
not in the report at all — it never took anything — while a `refunded` one stays
in, because it did, and gave it back.

**Whether to add currencies.** No. There is a figure per currency and no total.
The platform charges whatever currency a family buys in, and a single total across
them would be an exchange rate nobody recorded. Converting is
`/admin/money-report`'s job, at a rate a person entered on
`/admin/exchange-rates`, with the rate printed beside the figure. Two screens with
different jobs, rather than one screen that does both in whichever order it happens
to run.

Two smaller decisions follow from them. **Plans are reported apart from courses** —
a month of a subscription is not a course sale that recurred, and the two answer
different questions. **A course is named only when the product behind a sale maps
to exactly one course**; a two-course bundle is listed under the product rather
than split by guesswork. The by-course refund attribution is proportional to line
value, and by design it can drift by a minor unit on an order with three or more
lines; the per-currency figure is the one that ties out exactly, which is why the
page checks that one against itself before printing.

**What the report will not do: recompute what a teacher earned.** That number comes
from `instructor_earnings_entries`, where the revenue share was snapshotted on the
day of the sale. Recomputing at today's rate would give a second answer to a
question that already has one, and it would be the wrong answer the moment the
share changes. A reversed entry is shown as reversed rather than subtracted, so the
reversal stays visible.

The flag question was misattributed for months: screen 40 was blocked on
`delivery.analytics`, which governs **learner behaviour events** (a page viewed, a
lesson opened) and has nothing to do with a sale. Revenue is recorded by the
purchase path. Reading it is gated on `finance_admin` or `platform_admin` in the
database, the same pair every money screen uses — a teacher's view of their own
work is `/teach/earnings`, and no teacher may read the platform's whole book.

## A phone number is stored as one string, and formatting is a display concern — **DECIDED 2026-10-26**

The platform had no phone number of its own. `auth.users.phone` holds whatever
the sign-in provider took, in whatever notation was typed, and nothing else knew
about it. That is fine while nothing calls anybody and fatal the moment anything
does: an SMS provider routes E.164 or nothing, and two spellings of one number are
two people.

So there is now **one stored form**: `+256772123456`, in
`user_contact_details.phone_e164`, with the country it was entered under beside
it. `normalise_phone_number()` is the only way in: it accepts a national number
with or without the trunk prefix, `+` or `00`, spaces, dashes, dots and brackets,
and a number pasted without its `+` when reading it that way gives a length the
country actually has. It refuses everything else with a sentence — a number one
digit short says so, and a number that says `+44` under a chosen Uganda is refused
with **both** codes named rather than filed under Uganda and displayed wrongly
later. A BEFORE trigger re-normalises every row, so a writer that forgets the
function cannot store a number the rest of the platform cannot dial.

The country table is **generated, not typed**: 245 countries from libphonenumber's
metadata, each with its dial code, its national digit range and the trunk prefix
it writes but never dials. The generator is `scripts/generate-phone-data.mjs` and
the output is checked in, so the build has no new dependency and the data has a
provenance. Italy is the reason the trunk prefix is per country rather than "strip
a leading 0": there the zero is part of the number, its row carries no prefix, and
a test says so.

Formatting lives in `web/src/lib/phone.ts` and never touches what is stored. The
grouping comes from the metadata where it is unambiguous and falls back to even
groups of three where it is not; the account screen shows the E.164 value beside
the friendly one so nobody has to trust the spacing.

**What this does not do.** Nothing sends an SMS. The provider is still the first
external blocker, so the card on `/account` says the number is how staff reach you
and the address the platform will message when it can. A number stored before the
switch is turned off is still returned to its owner — hiding it would not remove
it — and the flag gates writing, not reading.

## A merge moves assets and obligations, never history — **DECIDED 2026-10-26**

Two accounts for one person is the predictable consequence of email-and-Google
sign-up, and the worst outcome is not the duplication: it is that somebody's
course, certificate or money ends up on the account they no longer open.

**A merge is started by the account being absorbed and completed only by the
account that survives.** Each side had to sign in, which is the smallest proof
that one person controls both. There is no email to click because there is no
email provider; the request waits on the other account's own settings screen and
expires after fourteen days.

**Assets and obligations move:** the learning record with its enrolments,
progress and certificates, roles, messages, the phone number, guardianship,
billing memberships, and everything the account authored. **Actions do not:**
`orders.placed_by`, `refund_requests.decided_by` and every audit event keep
naming the account that did the thing. Rewriting them so the survivor appears to
have done everything destroys the only record of what actually happened, and the
closed profile is still there to be named.

**It refuses in four cases, by name:** a payout in flight (money already moving
between two parties); a billing account shared with somebody else (their money
needs their agreement, not one person's); two learner records in different
households; and two learner records that have both started the same course. The
last is the one that matters — the platform cannot choose which of two progress
records is real, so it says the course's name and stops. Every refusal is shown
before the button, not after it.

**It is irreversible, so it takes the same proof as closing an account:** typing
your own name. The absorbed account is then closed and anonymised the way closing
it by hand would be, and **its learner record is archived rather than deleted**.
Where the survivor already holds the same fact — a review of the same course, an
attempt at the same assessment — the survivor's row is kept and the other stays
with the archived record, and the number left behind is reported rather than
dropped silently.

Two smaller consequences. The learner and enrolment guards deliberately refuse to
change who a record belongs to; the merge is the one path allowed through them,
and it does it the way migrations do — by acting with no user attached for the
duration of the move, then restoring the actor before it closes the account. And
a merge does not delete the absorbed account's sign-in: that lives at the auth
provider and has to be deleted there, which the screen says plainly.

## An invitation is a discount with a name on it, not a payment — **DECIDED 2026-10-26**

`commerce.referrals` sat in the register for weeks with three preconditions in
front of it: fraud rules, reward accounting, and the payout of rewards. The
third is what kept it shut. Paying a referrer means paying somebody, and there
is no payout provider — so a "referral reward" screen would have been a promise
of money that no code in this repository could keep. That is the one thing this
project does not do.

**So the reward is not money. It is a discount, on both sides.** A friend who is
new gets a percentage off their first course; the person who invited them gets a
percentage off their own next course. Discounts already exist, already have a
limit, an expiry, a market rule and an append-only redemption trail, and already
reach checkout through the one writer that can take money off an order. Nothing
had to be invented to pay them, because nothing is paid.

**Every referral code is an ordinary promotion campaign with a referrer attached.**
`my_referral_code()` mints one per account — `AYA-XXXXXX` — and creates the
campaign behind it in the same transaction, priced at the friend's percentage
and limited to one use by an account that has not bought before. The consequence
that matters: the friend's code goes through `apply_promotion_to_order()`, so
"one code per order", the market rule and the three limits are exactly as
enforced as they are for a campaign the owner wrote by hand. There is no second
path that discounts an order.

**An introduction is recorded once, for good.** `track_referral_redemption()`
writes `referral_conversions` when a referral code is redeemed, refuses a person
redeeming their own code, and refuses a second conversion for somebody already
referred. A second inviter's code still discounts the purchase — it is a
promotion like any other — but the first introduction keeps the credit. The
unique index on the referee is the rule, not the trigger logic.

**The reward waits for the money to stay.** A code minted at payment would be a
reward for a purchase that can still be refunded, so the reward campaign's window
opens only after `commerce.refund_window_hours` has passed. A refund inside the
window cancels the reward before it exists; a staff-approved refund afterwards
archives the campaign and marks the conversion `reversed`. A code already spent
is not clawed back — that is a limit of discount codes rather than of this build,
and it is written down instead of being discovered.

**Changing a percentage never re-prices a code already shared.** The campaign
carries the percentage it was minted with, and the friend was told what it was
worth. The four numbers — friend's percentage, inviter's percentage, rewards a
year, reward lifetime — are **controls**, not a page of their own: they live on
`/admin/settings` beside every other policy value, bounded, with a written reason
and an audit row. A yearly cap is the anti-farming rule that exists, and reaching
it marks the conversion `capped` rather than hiding that somebody was invited.

**What is deliberately absent:** no fraud score, no device fingerprint, no
"one household may not invite itself" rule. Those are the owner's to write, and
inventing a threshold would be inventing a policy. What exists is the mechanism
and its seams: a self-referral refused in the database, one referral per person
ever, a yearly cap, and every attempt recorded where staff can read it.

**The friend's name is not the reward.** `/account/referrals` shows the inviter
the first names of people who joined and nothing else — no email, no surname, no
purchases, no progress. Being invited by somebody is not permission for them to
watch what you learn. The invitation landing page shows the inviter's first name
and the discount, and is readable without an account.

## A sponsored seat is a decision and a receipt, not a product — **DECIDED 2026-10-26**

`commerce.sponsorship` carried three preconditions for weeks: eligibility rules,
donor receipts, and a scholar's ruling on whether a sponsored seat counts as
zakat. Only the first is a coding question, and the owner answered it: **a learner
asks, the owner or finance decides, and a donor covers a seat they never see the
name of.** This entry is that answer turned into rules.

**The request is written, and it is private.** `apply_for_sponsorship()` takes a
learner the caller may buy for — their own, or a child in a family they belong to,
the same check checkout makes — a course that is on sale, and a sentence about
the situation. That sentence is read by whoever decides and by nobody else; it is
in its own column precisely so a pool query cannot pick it up by accident.

**Approval is a role, not a favour.** `can_decide_sponsorship()` is the platform
admin or a finance admin, and every decision needs a written reason — approving
mints a seat code (`SPN-XXXXXX`) that carries no identity, declining keeps the
reason where the applicant reads it. A support agent reading the desk is being
informed; a support agent deciding who receives a free course is a different act
and not one their job contains.

**What a donor sees is what the platform can defend.** A seat code, the course,
who the course is for, and the price *in the donor's own market* — the same rule
every other price follows. Not a name, an age, a household, or a word of the
reason. `sponsorship_pool()` returns exactly those fields, so there is no field a
future redesign could start rendering.

**A pledge is not a payment.** There is no provider that can take a sponsorship,
so taking a seat records a pledge and says plainly how the money is handled;
`record_sponsorship_payment()` is staff recording a reference, and *that* is what
grants the seat — an `entitlement_grants` row with source `scholarship`, then an
enrolment, in that order because enrolment demands an existing entitlement.
Recording the same payment twice changes nothing.

**A sponsored seat is not a sale.** No order is created, no tax line applies, and
no teacher earning accrues — an earning is a share of a sale, and nobody sold
anything. The grant's source says `scholarship` so a revenue report cannot
mistake one for the other.

**Neither side learns who the other is.** The applicant's board has no donor
field; the donor's board has no learner field. That is enforced by two separate
functions rather than by hiding a column, because a column that exists is a column
somebody eventually renders.

**The zakat question stays the owner's.** Whether a gift counts as zakat, sadaqah
or neither is a scholar's ruling, and the platform says so on every screen rather
than offering an opinion. The mechanism works the same either way, which is why
it can ship while that question is still open.

## Applying is not appointing: the teaching role is created by a decision — **DECIDED 2026-10-26**

`teaching.applications` was the oldest "build the queue, keep it closed" note in
`FLAGS.md`. The note gave three reasons it stayed shut: there was no vetting
process, no rejection handling, and no place for a person to say what they know.
A flag cannot answer any of those. A queue and a written decision can, so the
answer here is the process rather than the door.

**What the owner decided (2026-10-26):** people may apply, with their
qualifications and a sample lesson, and the owner reviews them. Nothing is
automatic. That sentence is the whole unit, and the two halves of it are held
apart on purpose.

**Submitting creates an application and nothing else.** One row in
`teaching_applications`. No role, no course, no profile, no page — and the
database suite asserts each of those three separately rather than asserting the
absence of a role and trusting the rest. `submit_teaching_application()` is open
to any signed-in person while the owner's switch is on, and it is the only write
in this feature that a non-staff actor can make.

**Approving is what appoints.** `decide_teaching_application()` is the only
place in the codebase where `instructor` is created automatically, and it is
narrower than the platform's other staff checks: `can_appoint_teacher()` names
the **owner and governance**, the same pair the teacher roster already gated on.
That is deliberately less than `is_privileged()`, because a support agent handles
tickets and appointing a teacher is not a ticket — the reviewer register made the
same distinction, and this follows it. The decision needs a written reason,
because the applicant reads it; there is no silent decline.

**One transaction, two records.** The role row and the decision row are written by
one function, and the audit carries both a `teaching.application_approved` event
and a `role.assigned` event against the applicant, marked `via:
teaching_application`. A two-step screen would create a state where an
application is approved and the appointment never happened, which is exactly the
kind of half-done power that a written register is supposed to make impossible.
Approval is also idempotent against the existing partial unique index: somebody
who already holds the role is not granted it twice.

**Appointment is not publication.** Approving a teacher changes what they *may*
do, not what learners see. Every course they write still goes through review,
scholarly approval and the version workflow — the same gate every existing
teacher passes. Saying so on the admin screen is not decoration: an owner who
believes approving publishes something would be surprised by the next screen.

**The application is a person's own words, not a form's categories.** The
qualifications are free text, because a dropdown of credentials would be the
platform inventing a schema for somebody else's ijazah, and an invented schema is
a claim about what counts. The sample lesson is a **link**, not an upload: there
is no media path for applicants, and a link is something an owner can watch
before deciding rather than something to take on trust.

**Rejection handling is the reason, and a second look is cheap.** A declined
applicant reads the note on `/teach/apply` and may apply again; people improve,
and a queue that never lets anybody return is a queue that loses teachers. One
open application at a time, so one person is not two rows in a queue somebody has
to read. Withdrawing needs no reason and no confirmation: changing your mind is
not something to justify.

**What this does not settle.** Whether a teacher must hold a verified
qualification *before* their first course publishes is the publication gate's
question and is already answered there (`teaching.applications` only governs who
may be appointed). Teacher payouts, revenue-share fine print and screening policy
remain the owner's, and the queue makes no promise about any of them.

## An institution is a name and a count, not a way to buy seats — **DECIDED 2026-10-26**

`institutions` was the tenancy root from the first migration and had never had a
member, a colour, a report or a screen. Four flags sat beside it — branding,
reporting, api, sso — each one waiting for something the platform did not have.
This unit builds what can exist and says, on the screen, what cannot.

**An institution administrator is not staff.** The appointment is a membership
row, not a platform role: `can_appoint_teacher()` still refuses them, they cannot
publish a course, they cannot see a learner's name, and they cannot move money.
The one thing they can do is the thing the institution actually owns — its name,
its domain and its own counts.

**Branding is a tone, not a colour picker.** The platform is white and green
because this is a Muslim site, and a partner typing `#ff00ff` would be undoing
that on a page the platform still serves. Five named tones are what a stylesheet
can honour. The logo is a **link** to a file the institution already hosts,
because there is no upload path for institutions and inventing one would mean a
media pipeline per tenant. A custom domain and true white-labeling need DNS and
trademark permission, and neither is claimed here.

**Domain identity is built; single sign-on is not.** An administrator claims a
domain and publishes the token as a DNS TXT record; a staff member records that
they looked; then an account whose address is at that domain may **ask to join**.
Nothing is automatic and no account is created. SAML and OIDC are a provider
nobody has connected, so there is no "sign in with your school account" button
anywhere, and both the page and the flag's preconditions say why. This is the
reason `institution.sso` moved to ADMIN while remaining half a feature: the half
that exists is switchable, and a flag nobody may turn on while its feature works
is the worse lie.

**A report is counts, not records.** Members, the learner profiles linked to
them and the other children in their families, those profiles' live enrolments in
the window, completions and certificates — per course, per month. The payload
carries **no name, no learner id and no email**, and the database test asserts
that over the whole JSON rather than on one field, because a field that survives
a refactor is the one that leaks. A count of one can still point at somebody, so
the screen says that instead of inventing a suppression threshold; a threshold is
a policy, and the owner has not set one.

**An API key is a hash before it is a row.** The secret is generated in the web
app, shown once, and only its SHA-256 is stored — so a database dump cannot be
replayed as a key and the console cannot show it again. One endpoint exists, the
same report the screen prints, with a ceiling of 240 calls an hour per key
counted in SQL, and a refusal that does not charge itself for the call it did not
serve. **No webhooks**: nothing here can call out, because there is no queue or
scheduler, and the page says so rather than promising an integration.

**What is still missing, and stays missing.** `commerce.institutions` — invoicing,
bulk seats, purchase orders — needs B2B terms and a payment provider, and no
screen offers them. Being able to say that is the point of building the rest.

## Reading is a setting, and the defaults have to be good enough without it — **DECIDED 2026-10-26**

The platform teaches five-year-olds and adults, worldwide. "Readable" is not one
size, so three settings now belong to the person: text size in three steps,
contrast, and motion. They are in a cookie rather than a database row, because
they describe a **screen**, not a person — a laptop and a phone want different
sizes, and a shared machine should not inherit somebody else's choice. The page
says that, so nobody expects it to follow them.

**Applied before the first paint.** A person who needs larger text must not see a
flash of the small text on every page load, so a small inline script in the root
layout reads the cookie and sets three attributes on `<html>` before anything
renders. It checks each value against its own list rather than trusting the
cookie, and the same list drives the page's control, so the two cannot drift.

**The settings do not hide anything.** Every rule is on the document element and
inherits: nothing is removed, reordered or conditioned. At the largest size the
two-column rows become one column, because the alternative is a column narrow
enough to break a word mid-syllable — the honest admission that some layouts need
more room than a phone has.

**The defaults are the product, not the fallback.** Focus outlines, the skip
link, the device's own reduced-motion request and measured colour pairs are all
in place with nothing set. A preference is an addition for a particular person,
never a repair of a page that was unusable.

**What is refused, and said out loud.** No language switch (that is the next
unit, and it needs translators rather than code), no text-to-speech (a provider
nobody has connected), and no dyslexia-friendly font (licensing, and a free
substitute would be a claim without the property that makes the claim true). The
page lists all three under "What is not here yet" rather than leaving them to be
discovered.

## A course says which language it is taught in; the interface does not claim to be translated — **DECIDED 2026-10-26**

`learning.multi_language` was registered with four preconditions: a translation
workflow, per-locale content, RTL support, and a decision about who translates.
Three of the four need **a person who speaks the language**. So this unit builds
the fact a learner needs before they open anything — *what language is this
course in?* — and states plainly that the screens are still English.

**One language per course, on the course.** Not per version and not per lesson: a
course is taught in one language, and a version is a revision of the same
teaching. It sits on `courses`, so correcting the label of a live course is a
label change rather than an edit blocked by the published-version guard.

**Direction is the browser's job, not ours.** Every title, description and lesson
name is rendered with `dir="auto"` rather than `dir="rtl"` for an Arabic course,
because a title may be transliterated or mixed ("Tajweed — التجويد") and the
Unicode first-strong-character rule handles that better than a column can. `lang`
is set only when the code parses as a BCP-47 tag, so a bad row cannot put an
attribute on the page that a screen reader mispronounces.

**A filter may only offer something that returns courses.** The chip row comes
from `course_languages()`, which lists languages with at least one live course
(plus English, so the row is never empty on a new deployment). A row of fourteen
chips where eleven empty the shelf is worse than four that work.

**Filtering is in SQL, beside the other filters.** The language predicate lives
inside `catalogue_page()`, so the count and the list cannot disagree — the exact
defect the subject filter had before it moved. The parameter is **appended**, not
inserted, because `search_catalogue()` and the sitemap call the function
positionally and moving an argument would silently change what they ask for.

**What this does not claim.** No interface translation, no per-locale content, no
Arabic typography or licensed fonts — `platform.accessibility` still holds those
and stays CODE-gated. `/account/accessibility` lists them under "What is not here
yet". A learner reading the site in English who wants an Arabic course can now
find it, which is the part that needed no translator.

## A policy is published only when it is finished, and the database decides what "finished" means — **DECIDED 2026-10-27**

Seven areas were parked on *a decision or a document*: terms, privacy, the child
policy, refunds and withdrawal, safeguarding, takedown and the terms for teachers.
The instruction was to build them without inventing what they say. So the unit
builds the **structure a decision is recorded in**, and refuses to let any of it
pass for a decision that has not been made.

**A draft carries its own unanswered questions.** Each document ships as a draft
that describes what the platform actually does — the 72-hour refund window, the
child profile with no login, the 50% share, analytics kept forever, the counts an
institution sees — and marks every place that needs the owner with
`[OWNER DECISION: …]`. Those are not placeholders to tidy: they are the list of
what is left.

**The refusal is enforced, not advisory.** `approve_policy_version()` raises
`policy:decisions_open` while any marker remains, and the editor counts them as
somebody types so the refusal is seen before the click. Approval is
platform-admin only, and needs a written reason, which is kept with the version.
A policy can therefore be unfinished and legible, or finished and binding — never
unfinished and binding.

**A version in force is immutable.** It cannot be edited (the text somebody agreed
to *is* the record of their consent) and cannot be deleted, only retired when a
new version takes over. One live version per document is a partial unique index,
so "the terms" can never mean two texts at once. A change is a new version with
its own number and effective date.

**Acceptance names a document, never a version id.** `accept_policy(slug)`
resolves the version that is live *at the moment of the click*, so a page left
open across a publication cannot collect agreement to a text nobody is reading.
Accepting twice is not an error and not a second row; a new version makes the old
acceptance history and asks the account again.

**The public page is honest about the gap.** `/policies` lists every document and
says which are not in force. The text of an unapproved draft is not shown —
not because it is secret, but because an agreement read out of a text that then
changes is not an agreement. With nothing approved, the page says so in one
sentence instead of looking empty.

**What this does not claim.** Nothing here is legal advice and no document is
asserted to satisfy GDPR, COPPA, the Uganda DPA or anything else. The drafts name
the questions a lawyer or the owner must answer — governing law, limitation of
liability, the named controller, the supervisory authority, retention for support
and safeguarding records, the copyright agent, the screening standard — and
`platform.legal` stays ADMIN + SETUP until those are answered. `platform.incident`
still says **nothing exists**, because nothing does.
