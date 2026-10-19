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
| `learning.offline` | Download lessons for offline use | CODE | Download entitlement rules; protected media decision; device storage limits; expiry |
| `learning.paths` | Structured multi-course learning paths | ADMIN | Path content authored |
| `learning.audience_sections` | Separate Young Learners and Adult Learner entry experiences | ADMIN | Learner switcher designed — a parent who also studies must move between their own learning and a child's |
| `learning.age_bands` | Age-band navigation inside Young Learners | ADMIN | Bands chosen. Use `age_band`, **not** dates of birth |
| `learning.subject_nav` | Hierarchical subject browsing in the catalogue | ADMIN | `subject_areas` taxonomy populated — this is catalogue infrastructure, not governance |
| `learning.reviews` | Learner ratings and reviews on courses | ADMIN | Someone available to read review text before it appears. Satisfaction signal only — **never a substitute for scholarly review**, and never read by the publication workflow. Catalogue badges stay behind `learning.badges` |
| `learning.previews` | Free preview lessons before enrolment | ADMIN | Select the free lesson and public-sample resources per course version; verify sample content before enabling. The flag gates both anonymous resource reads and the free-entitlement bypass; it never unlocks enrolled-only materials. |
| `learning.badges` | Bestseller and rating badges in the catalogue | ADMIN | Threshold rules; must not imply scholarly endorsement |
| `learning.notes_bookmarks` | Private lesson notes and bookmarks | ADMIN | Retention and family-sharing policy decided before enabling; transcripts are not included |
| `learning.assignments` | Marked homework with deadlines, written/file submissions and teacher feedback — separate from quizzes | ADMIN | Self-paced deadlines use days after enrolment; cohort deadlines are absolute. The author (plus privileged staff) marks; late work is rejected by default and each task can explicitly accept it. Text hand-in and private feedback are built. One submission per learner/task; no revision loop yet. The DB accepts verified PDF/JPEG/PNG/WebP and AAC/MPEG/MP4/OGG/Opus/WAV references, up to 25 MiB each and 10 files, but upload bytes, scanning, secure delivery and retention are not wired. Build/review that path and review the cohort late-join rule before enabling; assignments stay off |
| `learning.wishlist` | Saved courses, with an optional private note | ADMIN | Retention and account-deletion policy decided. Saving works without checkout — a course can be free or unpublished — but taking payment for a saved one still needs `commerce.checkout` |
| `learning.cohorts` | Dated groups taking a published course version together | ADMIN | Data rules and teacher/course plus learner join/leave screens are built. Current join window remains open after the start until the cohort ends; review that late-join rule before enabling. Roster is private: course author/staff can read membership rows but the UI shows counts only; learners see only themselves and family. A learner/guardian opts in; the author cannot silently add a learner |
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
| `platform.cost_controls` | Storage quotas per teacher and spend alerts | ADMIN | **Nothing exists.** Unlimited teacher uploads is how $250/month becomes $3,000 |
| `platform.moderation` | Moderation of per-lesson discussion | ADMIN + SETUP | **Policy before feature.** Sectarian/contentious threads on fiqh topics; who reviews; escalation |
| `platform.accessibility` | RTL, Arabic typography, screen readers, dyslexia-friendly fonts | CODE | `rtl: 0` today; font licensing (Uthmani/naskh) |

## Children and families

| Flag | Gates | Type | Preconditions before it can be ON |
|---|---|---|---|
| `family.profiles` | Parent creates child profiles | ADMIN | — |
| `family.guardian_verification` | Manual review of guardians | ADMIN + SETUP | Evidence handling defined; retention policy; **your own review capacity** — this is a human queue |
| `family.child_login` | Child has their own login | CODE | Trusted linking workflow; safeguarding; age assurance; retention for child data |
| `family.plans` | Family plan with included child slots | ADMIN + SETUP | Slot pricing; reduction rules; payments on |
| `family.adult_shares` | Adult learner shares progress with someone | ADMIN | Scope model; revocation UI; privacy disclosure text |
| `family.engagement` | Badges, streaks, visible progress for children | ADMIN | Mechanics actually designed — currently `gamif: 0`, `badge: 0`, `streak: 0` |

## Teaching

| Flag | Gates | Type | Preconditions before it can be ON |
|---|---|---|---|
| `teaching.invites` | You invite a teacher | ADMIN | — |
| `teaching.authoring` | Teacher builds and publishes a course | ADMIN | Authoring flow tested by a real teacher; media upload limits |
| `teaching.dashboard` | Teacher sees their courses and learners | ADMIN | — |
| `teaching.qa_capacity` | Limits or queueing on per-lesson questions | ADMIN | A teacher with an audience behind them will be overwhelmed without it |
| `teaching.public_profile` | Public teacher page with bio, social links and published courses | ADMIN | Review the teacher-authored copy and outbound links first; do not imply unverified qualifications. Public RLS also hides profiles if this flag is off or the instructor role is revoked |
| `teaching.set_pricing` | Instructor sets price within a platform floor and ceiling | ADMIN + SETUP | Floor/ceiling per market; interacts with `prices`; blocked on the same facts as checkout |
| `teaching.invite_links` | Shareable link with attribution to the teacher | ADMIN | Attribution model; UTM handling; abuse limits. **The growth engine — teachers already have audiences** |
| `teaching.content_licence` | Who owns uploaded content and what licence the platform holds | CODE | **Nothing exists.** Written agreement needed before the first teacher uploads |
| `teaching.screening` | Teacher screening and conduct acknowledgement | CODE | Screening policy; record retention; who verifies |
| `teaching.peer_review` | One other teacher reviews before publish | ADMIN | Who reviews; what happens on disagreement |
| `teaching.panel` | Scholarly panel with quorum and voting | CODE | Quorum policy; voting rules; conflict declarations; appeals. **Currently open — do not build until decided** |
| `teaching.applications` | Open applications to teach — unknown teachers apply | CODE | Currently a curated cohort by decision. **Build the queue, keep it closed** — cheapest way to preserve the option. Needs a vetting process, terms for teachers, and rejection handling |
| `teaching.payouts` | Teachers earn and get paid | CODE | Revenue share decided; payout provider; tax treatment; minimum thresholds; dispute process |

## Money

| Flag | Gates | Type | Preconditions before it can be ON |
|---|---|---|---|
| `commerce.free` | Free courses, no payment | ADMIN | — |
| `commerce.checkout` | Paid enrolment | ADMIN + SETUP | **Provider chosen and account approved**; sandbox passing; jurisdiction decided; tax/invoicing decided; refund policy written |
| `commerce.mobile_money` | MTN MoMo / Airtel Money | ADMIN + SETUP | **Adapters built.** Remaining: merchant agreement; sandbox pass with real credentials; settlement terms. Note both providers' callbacks are unsigned — confirmation is by authenticated re-query, which is implemented. |
| `commerce.subscriptions` | Monthly and annual plans | ADMIN + SETUP | Plan terms; grace period by market; renewal and proration policy; dunning |
| `commerce.promotions` | Discount campaigns | ADMIN | Eligibility rules; stacking rules; abuse limits |
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
| `delivery.live_classes` | Live teaching sessions | CODE | RTC provider; scheduling and timezones; recording policy; moderation |
| `delivery.analytics` | Reporting beyond basics | CODE | Event instrumentation; storage and retention; privacy review |
| `delivery.notifications` | Email / push / SMS | ADMIN + SETUP | Sender domains verified; provider chosen; consent and frequency rules |

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

`platform_settings` holds three rows that are not in the tables above. They are
not features to switch on — they are dials that decide how the publication and
money rules behave, and they shipped with values rather than being absent.

| Key | Type | Gate | Current value | What it decides |
|---|---|---|---|---|
| `governance.panel_required` | boolean | none | `false` | Whether a scholarly panel must decide before publication. Off means peer review by an authorised reviewer is enough (P6). Flipping it is a settings change, not a migration |
| `governance.min_approvals` | integer | none | `1` | How many independent approvals a version needs before it may be published |
| `teaching.revenue_share_percent` | integer | ADMIN | `0` | The teacher's share of a paid order, in whole percent. **Deliberately 0: the number has not been chosen.** Earnings accrue at whatever this says, so setting it is a business decision, not a configuration one. Changing it never rewrites earnings already booked |

Measured, the table holds **90 rows: the 87 flags above plus these three.**
Eighty-eight are boolean switches and two are integers. Gate types: **43 ADMIN,
14 ADMIN + SETUP, 31 CODE**, and the two governance controls, which have no gate
because they are not features.

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
