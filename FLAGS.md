# FLAGS

Every feature is built to completion and shipped **off**. This file is the
register: what each flag gates, and what must be true before it can be turned on.

The rule that keeps this safe: **a flag with no written precondition is a
bug waiting to be enabled.** Unreleased code rots — dependencies move, schema
changes, the framework upgrades. If a feature sits off for a year and someone
flips it, it will be broken unless the preconditions were written down and
re-checked.

Three kinds of gate:
- **ADMIN** — a pure runtime toggle. Admin dashboard can flip it, no deploy.
- **ADMIN + SETUP** — toggle exists, but external setup must be finished first.
- **CODE** — cannot be a runtime toggle. Needs a deploy, a build, or a policy
  that doesn't exist yet. Do not promise these to the admin dashboard.

---

## Learner features

| Flag | Gates | Type | Preconditions before it can be ON |
|---|---|---|---|
| `learning.progress` | Progress tracking and resume | ADMIN | — |
| `learning.assessments` | Quizzes, attempts, grading | ADMIN | Question bank seeded. Four question types, automatic and manual marking, and teacher feedback on a marked answer all exist |
| `learning.certificates.simple` | Completion certificate for a learner | ADMIN | Template chosen; certificate numbering scheme |
| `learning.certificates.verification` | Public verify-a-certificate page | ADMIN + SETUP | Verification page deployed; revocation policy written; token format fixed |
| `learning.discussion` | Per-lesson questions and replies | ADMIN | Moderation policy; who answers (teacher vs. peers); abuse handling |
| `learning.offline` | Download lessons for offline use | CODE | The entitlement rule is decided and enforced: `may_download_lesson()` requires entitlement to the version, an active `offline_downloads` feature grant on the plan being paid for, and verified first-party media — so a Plus plan carries it and a Basic plan does not (2026-10-20). **The byte path now exists:** `/api/media/download` checks this flag and then `may_download_lesson()`, and signs a short-lived URL with `response-content-disposition: attachment`, so the button saves a file rather than opening a tab. Still open: the protected-media decision — **the saved file is an ordinary MP4 with no DRM, so this buys convenience on a metered connection and not protection** — plus device limits and download expiry |
| `learning.paths` | Structured multi-course learning paths | ADMIN | Path content authored |
| `learning.audience_sections` | Separate Young Learners and Adult Learner entry experiences | ADMIN | Learner switcher designed — a parent who also studies must move between their own learning and a child's |
| `learning.age_bands` | Age-band navigation inside Young Learners | ADMIN | Bands chosen. Use `age_band`, **not** dates of birth |
| `learning.subject_nav` | Hierarchical subject browsing in the catalogue | ADMIN | `subject_areas` taxonomy populated — this is catalogue infrastructure, not governance |
| `learning.reviews` | Learner ratings and reviews on courses | ADMIN | Someone available to read review text before it appears. Satisfaction signal only — **never a substitute for scholarly review**, and never read by the publication workflow. Catalogue badges stay behind `learning.badges` |
| `learning.previews` | Free preview lessons before enrolment | ADMIN | Select the free lesson and public-sample resources per course version; verify sample content before enabling. The flag gates both anonymous resource reads and the free-entitlement bypass; it never unlocks enrolled-only materials. |
| `learning.badges` | Bestseller and rating badges in the catalogue | ADMIN | Threshold rules; must not imply scholarly endorsement |
| `learning.notes_bookmarks` | Private lesson notes and bookmarks | ADMIN | Retention and family-sharing policy decided before enabling; transcripts are not included |
| `learning.assignments` | Marked homework with deadlines, written/file submissions and teacher feedback — separate from quizzes | ADMIN | Self-paced deadlines use days after enrolment; cohort deadlines are absolute. The author (plus privileged staff) marks; late work is rejected by default and each task can explicitly accept it. Text hand-in, private feedback and a per-task revision loop are built: marked work can be reopened as a draft, the version that was marked is snapshotted, and reopening is refused once a deadline has passed on a task that does not accept late work. One submission per learner/task. The DB accepts verified PDF/JPEG/PNG/WebP and AAC/MPEG/MP4/OGG/Opus/WAV references, up to 25 MiB each and 10 files, but upload bytes, scanning, secure delivery and retention are not wired. Build/review that path before enabling; assignments stay off |
| `learning.wishlist` | Saved courses, with an optional private note | ADMIN | Retention and account-deletion policy decided. Saving works without checkout — a course can be free or unpublished — but taking payment for a saved one still needs `commerce.checkout` |
| `learning.cohorts` | Dated groups taking a published course version together | ADMIN | Data rules and teacher/course plus learner join/leave screens are built. Each cohort carries `join_closes_at`, set by the teacher and defaulting to the start date; the teacher can move it while the class is a draft or open, and closing it governs arriving rather than staying. The late-join rule is settled (2026-10-19). Remaining before enabling: the safeguarding review of files children send, which arrives with the assignment media path. Roster is private: course author/staff can read membership rows but the UI shows counts only; learners see only themselves and family. A learner/guardian opts in; the author cannot silently add a learner |
| `learning.multi_language` | Interface and content in more languages | CODE | Translation workflow; per-locale content; RTL support; who translates |
| `learning.ai_support` | Safeguarded AI study help | CODE | Safeguarding policy; provider chosen; cost ceiling; **must refuse to issue rulings and refer to a teacher** |
| `learning.ai_quiz_gen` | Generate quiz questions from lesson transcripts | ADMIN + SETUP | Provider and cost ceiling; teacher reviews every generated question before use |
| `learning.recitation` | Qur'an recitation feedback | CODE | Quranic ASR accuracy validated; **start with letter-level makharij on short surahs only** — a wrong correction on religious content is worse than none |
| `learning.hifz` | Memorisation tracker with spaced repetition | ADMIN | Revision schedule and decay model designed. Best value on the premium list |
| `learning.ijazah` | Verified chain of transmission | CODE | Extends `certificates`; needs teacher authorisation rules and a public chain view |
| `learning.provenance` | Source citations shown on every lesson | ADMIN | Draft curriculum citation UI is deployed; seed and review citations on published lessons before enabling |
| `learning.quran_sync` | Ayah-synchronised audio and text | ADMIN | Timing dataset licensed or generated |
| `companion.prayer_tools` | Prayer times, qibla, dhikr counter, adhkar | ADMIN | Location handling and privacy; calculation method choice |
| `companion.ayah_daily` | Ayah of the day with audio and tafsir | ADMIN | Content sourcing and translation licensing |
| `companion.parent_report` | Weekly parent progress report | ADMIN + SETUP | Channel chosen — **WhatsApp, not email, for East Africa**; consent and frequency rules |
| `companion.tracing` | Arabic letter tracing for young learners | ADMIN | Interaction design for the 5–8 bracket |
| `platform.calendar` | Hijri dates, Ramadan mode, regional prayer calculation | ADMIN | Calculation method per region; Hijri date source; Ramadan content collections |
| `platform.safeguarding` | Child protection: conduct policy, screening, reporting route | CODE | **Nothing exists.** Named responsible person; screening policy; reporting workflow; teacher-learner contact rules |
| `platform.legal` | Terms, privacy, child policy, refund policy, content licence | CODE | **Nothing exists.** GDPR/UK GDPR, COPPA, Uganda DPA 2019, Kenya DPA, Nigeria NDPR |
| `platform.incident` | Breach detection, response and notification | CODE | 72-hour GDPR notification; owner; runbook; templates |
| `platform.takedown` | Copyright and content takedown notices | CODE | Notice process; counter-notice; repeat-infringer policy |
| `platform.search` | Course and lesson search | ADMIN | **No search infrastructure designed.** Postgres FTS or a dedicated index — `LIKE` will not survive a real catalogue |
| `platform.terms_versioning` | Versioned terms with recorded acceptance | CODE | **Nothing exists.** Must store which version each user accepted, with a timestamp |
| `platform.age_assurance` | Age checks gating the child model and COPPA | CODE | **Nothing exists.** Method undecided |
| `platform.data_export` | Learner data portability / export | CODE | GDPR right; cheaper to design than retrofit across 85 tables |
| `platform.account_merge` | Merge duplicate accounts | CODE | A parent will create two accounts |
| `platform.withdrawal_right` | EU 14-day withdrawal handling at checkout | CODE | Statutory right on digital content; needs explicit waiver wording for content started immediately |
| `platform.email_auth` | SPF / DKIM / DMARC and deliverability | ADMIN + SETUP | **Nothing exists.** Resets and receipts land in spam without it |
| `platform.phone_format` | E.164 storage and per-country formatting | CODE | **Nothing exists.** International OTP breaks without normalisation |
| `platform.cost_controls` | Storage quotas per teacher and spend alerts | ADMIN | The signed upload path exists (`/api/media` → R2) and a **per-file ceiling of 8 GiB** is now enforced on it (`MAX_UPLOAD_BYTES` in `web/src/lib/media.ts`), but **nothing meters accumulation**: `register_media_upload()` checks a type, a size and a checksum but no quota, so a teacher can upload an unlimited number of 8 GiB files. Unlimited teacher uploads is how $250/month becomes $3,000, so a per-teacher byte quota and a spend alert are what this flag is for. **A per-teacher quota now exists** — `media.upload_quota_gb_per_teacher`, 50 GB of master bytes, chosen 2026-10-22 — and this flag is what turns it on: while it is off, `media_upload_allowance()` reports `enforced: false` and every upload passes, and while it is on, `/api/media` refuses a `request_upload` or `initiate_multipart` that would not fit, naming the space left. What this flag still does not do is the spend alert. The other cost control that exists is `/admin/media`'s unfinished-upload panel, which lists the parts nobody assembled and ends them on a written reason instead of waiting out storage's seven-day cleanup |
| `platform.moderation` | Moderation of per-lesson discussion | ADMIN + SETUP | **Policy before feature.** Sectarian/contentious threads on fiqh topics; who reviews; escalation |
| `platform.accessibility` | RTL, Arabic typography, screen readers, dyslexia-friendly fonts | CODE | `rtl: 0` today; font licensing (Uthmani/naskh) |

## Children and families

| Flag | Gates | Type | Preconditions before it can be ON |
|---|---|---|---|
| `family.profiles` | Parent creates child profiles | ADMIN | — |
| `family.guardian_verification` | Manual review of guardians | ADMIN + SETUP | Evidence handling defined; retention policy; **your own review capacity** — this is a human queue |
| `family.child_login` | Child has their own login | CODE | Trusted linking workflow; safeguarding; age assurance; retention for child data |
| `family.plans` | Family plan with included child slots | ADMIN + SETUP | Slot pricing; reduction rules; payments on |
| `family.adult_shares` | Adult learner shares progress with someone | ADMIN | **Built on `/account/sharing` (2026-10-21), and the three open items are settled.** Scope model: the schema's three — progress, achievements, or both — one active share per person per scope, and changing the terms means revoking first so the record is never edited. Revocation UI: an "end it" on every live share, for the person who granted it or governance staff. Privacy disclosure text: on the panel, in the grant form, and to the reader, who sees the terms they are reading under. Off gates every writer; reading and revoking stay available while it is off, because turning a feature off must not strand a privacy decision with no way to end it. **Sharing is by invitation** (2026-10-22): the form takes an address and `invite_learning_share()` records an invitation whether or not the address has an account, so the reply cannot disclose one; the message is queued through the outbox (nothing is delivered until `delivery.notifications` has a provider), the token is stored only as an md5 of 122 random bits, bound to the invited address, and usable once before it expires (1–90 days), and `/share/invite/[token]` is where it is accepted by somebody signed in as that address. `resolve_share_grantee()` — the function that answered "does this address have an account" — is revoked for every signed-in caller, not merely unused |
| `family.engagement` | Badges, streaks, visible progress for children | ADMIN | Mechanics actually designed — currently `gamif: 0`, `badge: 0`, `streak: 0` |

## Teaching

| Flag | Gates | Type | Preconditions before it can be ON |
|---|---|---|---|
| `teaching.invites` | You invite a teacher | ADMIN | — |
| `teaching.authoring` | Teacher builds and publishes a course | ADMIN | Authoring flow tested by a real teacher. Media upload limits are now partly settled: the ingest half is built (signed direct-to-R2 upload from `/teach/media`, `pending` until a privileged confirmation), a single file is capped at **8 GiB in SQL and 5 GiB less 5 MiB from a browser** — the browser ceiling used to be the required SHA-256 checksum, which WebCrypto cannot compute without holding the whole file in memory, and is now the largest single request storage accepts, because `lib/digest.ts` hashes a slice at a time — and every upload must carry a name a teacher can recognise. `/admin/media` reaches the quarantine and withdrawal powers. Staff can now finish an upload from `/admin/media`: `verify` asks storage whether the object arrived and whether it is the declared size, and only then confirms it. What is missing is a **cumulative per-teacher quota** |
| `teaching.dashboard` | Teacher sees their courses and learners | ADMIN | — |
| `teaching.qa_capacity` | Limits or queueing on per-lesson questions | ADMIN | A teacher with an audience behind them will be overwhelmed without it |
| `teaching.public_profile` | Public teacher page with bio, social links and published courses | ADMIN | Review the teacher-authored copy and outbound links first; do not imply unverified qualifications. Public RLS also hides profiles if this flag is off or the instructor role is revoked |
| `teaching.set_pricing` | Instructor sets price within a platform floor and ceiling | ADMIN + SETUP | Floor/ceiling per market; interacts with `prices`; blocked on the same facts as checkout |
| `teaching.invite_links` | Shareable link with attribution to the teacher | ADMIN | Attribution model; UTM handling; abuse limits. **The growth engine — teachers already have audiences** |
| `teaching.content_licence` | Who owns uploaded content and what licence the platform holds | CODE | **Nothing exists.** Written agreement needed before the first teacher uploads |
| `teaching.screening` | Teacher screening and conduct acknowledgement | CODE | Screening policy; record retention; who verifies |
| `teaching.peer_review` | One other teacher reviews before publish | ADMIN | Who reviews: the reviewer register on `/admin/reviewers` — a person applies on `/review`, a governance admin checks them, then grants the subjects and scopes they may judge. What has to be reviewed: `content_review_requirements`, written by the author or governance staff on `/teach/[courseId]` and `/admin/reviews`, which makes publication wait for an approval from somebody authorised for that subject and makes an unauthorised reviewer unassignable. What happens on disagreement: a `revision_requested` or `rejected` decision, or a conflict declaration, which bars that reviewer from the assignment at once and keeps barring them until staff hear it in writing. A requirement an approval cannot reach is waived by governance staff, in writing. **The flag is not what gates publication.** `enforce_publication_gate()` always needs `governance.min_approvals` scholarly approvals (default 1) and no open requirement, so the dials that actually switch peer review on and off are `governance.min_approvals` and `governance.panel_required`, both settable here |
| `teaching.panel` | Scholarly panel with quorum and voting | CODE | Quorum policy; voting rules; conflict declarations; appeals. **Currently open — do not build until decided** |
| `teaching.applications` | Open applications to teach — unknown teachers apply | CODE | Currently a curated cohort by decision. **Build the queue, keep it closed** — cheapest way to preserve the option. Needs a vetting process, terms for teachers, and rejection handling |
| `teaching.payouts` | Teachers earn and get paid | CODE | Revenue share decided; payout provider; tax treatment; minimum thresholds; dispute process |

## Money

| Flag | Gates | Type | Preconditions before it can be ON |
|---|---|---|---|
| `commerce.free` | Free courses, no payment | ADMIN | — |
| `commerce.checkout` | Paid enrolment — **enforced in `create_course_order()`**, the only writer of a course order; while off, `/courses/[slug]/buy` says so instead of offering a form that cannot work | ADMIN + SETUP | **Provider chosen and account approved**; sandbox passing; jurisdiction decided; tax/invoicing decided; refund policy written |
| `commerce.mobile_money` | MTN MoMo / Airtel Money | ADMIN + SETUP | **Adapters built.** Remaining: merchant agreement; sandbox pass with real credentials; settlement terms. Note both providers' callbacks are unsigned — confirmation is by authenticated re-query, which is implemented. |
| `commerce.subscriptions` | Monthly and annual plans | ADMIN + SETUP | Plan terms; grace period by market; renewal and proration policy; dunning. `create_plan_order()` refuses while this is off, so a plan cannot be ordered before those exist |
| `commerce.promotions` | Discount campaigns | ADMIN | Eligibility rules; stacking rules; abuse limits. **Ownership, markets and the fixed-amount rule are built** (2026-10-22): `create_promotion_campaign()` lets the platform owner run a campaign on any course and a teacher on their own, names any set of country markets, refuses a fixed amount aimed at a market priced in another currency, and records a per-family limit (two, three, none) that `set_promotion_limits()` can change later. **Redemption at checkout is built** (2026-10-22): a code typed on the buy form is applied inside `create_course_order()`, one code per order, with the window, market, course, new-customer rule and the three limits enforced. The flag still ships off — turn it on when the first real campaign is ready, since a code that reaches checkout while this is off is simply not offered **A price can be checked before paying** (2026-10-22): `quote_course_order()` answers what the course would cost after a code and **creates nothing** — no order, no account, no redemption, so previewing a limited code cannot spend it. It calls `resolve_course_checkout()` and `promotion_quote()`, the same two functions the charge uses, and the order writer was rebuilt on them so a preview cannot disagree with the bill |
| `commerce.refunds` | Refund requests and decisions | ADMIN + SETUP | Approval authority limits; escalation path; entitlement effect of a refund |
| `commerce.referrals` | Referral rewards | CODE | Fraud rules; reward accounting; payout of rewards |
| `commerce.institutions` | Madrasahs, Islamic schools and organisations buying seats | CODE | Invoicing; bulk enrolment; B2B terms; purchase orders. **Not in the project record at all** |
| `commerce.sponsorship` | Zakat / sadaqah sponsoring a learner's seat | CODE | Eligibility rules; donor receipts; whether it counts as zakat needs a scholar's ruling |
| `commerce.scholarships` | Funded and free seats | ADMIN | Allocation rules; who approves; renewal |
| `institution.branding` | Co-branded or white-label for a partner institution | CODE | Trademark permission; theming; separate domain |
| `institution.reporting` | Per-institution progress reporting | CODE | Aggregation and privacy rules for minors |
| `institution.api` | Public API and webhooks for institutional integrations | CODE | API keys, rate limits, versioning, documentation |
| `institution.sso` | SAML / OIDC for institutional staff | CODE | Identity provider support; account linking |

## Delivery

| Flag | Gates | Type | Preconditions before it can be ON |
|---|---|---|---|
| `delivery.transcode` | Encode delivery copies (renditions) of an uploaded master, and mark them servable | CODE | **Built and waiting.** `web/src/worker/transcode-worker.ts` signs in as a staff account, reads this flag, downloads a master from R2, plans a ladder from what `ffprobe` actually finds (never upscales, never trusts the declared mime), and for each profile calls `register_media_rendition()` → uploads → `confirm_media_rendition()`, or `fail_media_rendition()` with a reason. Enabling the flag is not enough: it also needs ffmpeg on the worker host, R2 credentials in its environment, an account granted staff at `/admin/roles`, and a playback route that mints rendition URLs — **none of which exist**. `manifest` is in the profile vocabulary and nothing produces one: an HLS manifest is thousands of segment objects and this register holds one row per profile |
| `delivery.live_classes` | Live teaching sessions | CODE | RTC provider; scheduling and timezones; recording policy; moderation |
| `delivery.analytics` | Teachers see per-learner progress for the cohorts they opened | CODE | **Cohort-scoped progress is built** — `can_read_learner_course_progress()` is the predicate, `cohort_learner_progress()` the roster, `/teach/[courseId]/cohorts/[cohortId]` the screen (`SCREENS.md` row 32) — and `learning.cohorts` must also be on, because the predicate checks both. Still open: retention, meaning how long progress stays readable after a class ends or a learner leaves, and event instrumentation beyond lesson progress |
| `delivery.notifications` | Email / push / SMS | ADMIN + SETUP | Sender domains verified; provider chosen; consent and frequency rules. **The outbox is built and the flag is not the switch that sends**: `queue_message()` renders a named template into `outbound_messages`, `/admin/messages` shows what would be sent, and every row stays `queued` because no provider exists. A row cannot be marked `sent` without a provider and a time — the constraint refuses the claim |

## Platform

| Flag | Gates | Type | Preconditions before it can be ON |
|---|---|---|---|
| `auth.email_password` | Email + password sign-in | ADMIN | Email sender verified; reset flow |
| `auth.phone_otp` | Phone number + OTP sign-in | ADMIN + SETUP | SMS provider chosen; **cost per message confirmed for each launch market**; OTP used at registration and recovery only, never per login |
| `platform.support` | Support cases and replies | ADMIN | Someone available to answer the queue; reply-channel and retention policy decided. No notification provider is wired — cases are read in the dashboard |
| `platform.admin_settings` | The admin dashboard itself | ADMIN | Must be built **first** — everything else depends on it |
| `platform.audit` | Audit log of privileged actions | ADMIN | — |
| `platform.maintenance_mode` | Read-only mode | ADMIN | — |

## Controls that are not flags

`platform_settings` holds six rows that are not in the tables above. They are
not features to switch on — they are dials that decide how the publication and
money rules behave, and they shipped with values rather than being absent.

| Key | Type | Gate | Current value | What it decides |
|---|---|---|---|---|
| `governance.panel_required` | boolean | none | `false` | Whether a scholarly panel must decide before publication. Off means peer review by an authorised reviewer is enough (P6). Flipping it is a settings change, not a migration |
| `governance.min_approvals` | integer | none | `1` | How many independent approvals a version needs before it may be published |
| `teaching.revenue_share_percent` | integer | ADMIN | `50` | The teacher's share of a paid order, in whole percent. **Chosen at 50% by the owner on 2026-10-19** (it was seeded 0 while the number was unchosen). Earnings accrue at whatever this says when an order is confirmed, so setting it is a business decision, not a configuration one. Changing it never rewrites earnings already booked — each entry snapshots the share it accrued under. The percentage being settled does not settle the terms around it: tax per country, who bears processing fees, and uniform-or-per-teacher are still open, and `teaching.payouts` stays CODE-gated |
| `finance.reporting_currency` | text | ADMIN | `USD` | The one currency money is reported in. **USD, per the project record, before any code existed** — the platform charges in whatever a family has and the owner reads a single figure. Original amounts stay authoritative (D4); this decides only what a total is converted into before a person reads it. Changing it re-reports the past at whatever rates are recorded, it does not restate a ledger row |
| `media.upload_quota_gb_per_teacher` | integer | ADMIN | `50` | Cumulative master bytes one uploader may store, in GiB. **Chosen at 50 GB on 2026-10-22** — about a day of 1080p video, which is invisible to almost every teacher while stopping one account consuming the storage budget. Counted on masters, not on the renditions derived from them (the ladder stores about 2.1x the master and is the platform's choice, not the teacher's); quarantined and pending masters count, withdrawn ones do not. Enforced only while `platform.cost_controls` is on, at initiate, through `media_upload_allowance()`; a value below 1 raises `media:quota_misconfigured` rather than silently blocking or allowing everything |
| `governance.scholar_board_active` | boolean | ADMIN | `false` | Whether a scholarly board is convened and may check reviewer credentials. Off means the platform owner alone decides whether a qualification passes. Turning it on grants nothing by itself: only a holder of `scholarly_panel_member` gains the power, and only the owner may appoint or remove one — enforced by a trigger on `user_role_assignments`, not by this switch |
| `finance.rate_sanity_factor` | integer | ADMIN | `10` | How many times the previous recorded rate for a pair a new rate may be before recording it needs a written reason. A slipped decimal in a rate is a 100x error in the only number the owner reads and it looks perfectly reasonable on screen, so the writer refuses one and keeps the reason in the audit trail. `0` turns the check off |

Measured, the table holds **95 rows: the 88 flags above plus these seven.**
Ninety are boolean switches, four are integers and one is text. Gate types
across the flags: **42 ADMIN, 14 ADMIN + SETUP, 32 CODE**. The two governance
policy controls have no gate because they are not features; the three money
controls are ADMIN, because a number that changes what a total says is changed
from the dashboard and not from a migration — and so are the upload quota and the
board control, for the same reason: a number that decides what a teacher may
store, or a switch that lets a board decide instead of the owner, is a decision
and not a deploy.

---

## What this register shows

**1. The admin dashboard was the critical path, and it is built.**
`platform.admin_settings` had to exist before any other flag meant anything, and
it was missing from the plan: no settings table, no endpoints. `platform_settings`
now holds the register, `/admin` reads and toggles it, and `/api/admin/flags`
writes it. A trigger refuses to enable a `code`-gated flag at runtime, so the
dashboard cannot promise what needs a deploy.

**2. Thirty-one of these cannot be runtime toggles.**
`gate_type='code'` on 31 flags — `offline`, `child_login`, `multi_language`,
`ai_support`, `panel`, `applications`, `payouts`, `referrals`, `institutions`,
`live_classes`, `analytics`, and — counted properly — 11 `platform.*` legal,
safety and data ones, 5 `teaching.*`, 5 `learning.*`, 4 `institution.*`,
3 `commerce.*`, 2 `delivery.*` and `family.child_login`. Each needs a deploy, a provider, or a
policy that does not exist. Building them "to completion" means building them
against guesses, so the tables and the flags exist and the work waits.

A further **14 are ADMIN + SETUP**: the toggle is real, but a provider, a sender
domain or a written policy has to be finished first. Those are the ones where
turning it on too early does damage.

**3. Six flags are blocked on facts you don't have, not on code.**
`commerce.checkout`, `mobile_money`, `subscriptions`, `refunds`,
`teaching.panel`, `family.guardian_verification`. No amount of building finishes
these. Four of the six now have their code: refunds are decided at
`/admin/refunds`, guardian verification runs at `/family/guardians` and
`/admin/guardians`, checkout creates orders and subscriptions allocate seats.
What is missing is a provider, a jurisdiction, or a policy decision — and
`teaching.panel` is still an open question, not a backlog item.

**4. One flag is still blocked on design that was never done.**
`family.engagement` — child engagement mechanics. It is wanted and undesigned;
badges, streaks and points for a five-year-old are a safeguarding question
before they are a feature. `learning.discussion` was in this category and is no
longer: moderation is settled (authority posts visible, learner posts held) and
built. `learning.reviews` joined it on the same terms.

---

## Suggested build order, given build-everything

Not phasing — sequencing so nothing is built on sand.

1. `platform.admin_settings` + the flag layer itself. Nothing else is
   switchable without it.
2. Identity, family, enrolment, lessons, progress, discussion.
   Everything here is unblocked and fully specified.
3. Teaching invites, authoring, dashboard, peer review.
   Unblocked, and it's what your teacher friends are waiting for.
4. Commerce interfaces with **no implementation** — a `PaymentProvider`
   boundary and empty adapters. Build the shape, not the guess.
5. Everything blocked on a fact: build the boundary, leave the adapter empty,
   and write the precondition here so future-you knows why it's empty.
