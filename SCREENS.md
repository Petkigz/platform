# SCREENS

The plan has 85 tables and 121 endpoints, and **zero screens** — `screen: 1`,
`navigation: 0`, `page structure: 0` in the whole project record. This file is
the inventory that was missing.

Rule: **one design per distinct screen.** Web, Android and iOS are the same
codebase (Expo/React Native), so they are not separate screens — they are
responsive states of the same screen. Mocking them separately inflates a count
without adding design work.

Status:
- `READY`   — underlying data and API exist; can be designed now
- `BLOCKED` — the feature behind it does not exist or is blocked on a fact

---

## 1. Public / marketing — 7

| # | Screen | Status |
|---|---|---|
| 1 | Landing page | **BUILT** — `/` |
| 2 | About the platform | READY |
| 3 | Young Learners entry | READY |
| 4 | Adult Learners entry | READY |
| 5 | Course catalogue | **BUILT** — `/catalogue`. The `subject_areas` taxonomy is still empty, so subject chips show nothing yet |
| 6 | Search and filter | **BUILT** — `/catalogue?q=&subject=&audience=` |
| 7 | Pricing and subscriptions | **BUILT as a screen** — `/plans` renders configured plan versions and their prices. No price points have been *set*, so it is an empty state until someone decides what a subscription costs. Taking payment still needs P12 |

## 2. Access — 3  *(missing from the source list entirely)*

| # | Screen | Status |
|---|---|---|
| 8 | **Sign in / register** | **BUILT** — `/sign-up`, `/sign-in`, `/forgot-password`, `/auth/confirm`, password change under `/account/password`. Email + password; `auth.phone_otp` is still off and unbuilt |
| 9 | **Add a child profile** | **BUILT** — the form on `/family`. A child is a `learner_profile`, not a user (D2); no date of birth, no login |
| 10 | **Learner switcher** | **BUILT** — the enrol button asks "who is learning?", and `/learn` labels each course with whose it is |

## 3. Young learners — 9

| # | Screen | Status |
|---|---|---|
| 11 | Child home | READY — `/family` shows each child's courses and progress; the child-facing home itself is not designed |
| 12 | Age-band selection | READY |
| 13 | Course page | **BUILT** — `/courses/[slug]` |
| 14 | Video lesson | **BUILT** — `/learn/[enrolmentId]/lesson/[lessonId]` |
| 15 | Interactive lesson | READY — shares the lesson route, no interactive player yet |
| 16 | Quiz | **BUILT** — `/learn/[enrolmentId]/assessment/[assessmentId]`. Four question types (`single_choice`, `multiple_choice`, `true_false`, `short_answer`); the answer key is a protected column. No question bank, no timed sittings |
| 17 | Results | **BUILT** — same route; score, attempt count, pass state, and the teacher's comments on marked answers. Deliberately does not list which automatic questions were right, so a result cannot be read as an answer key |
| 18 | Progress and achievements | BLOCKED — engagement mechanics undesigned |
| 19 | Parent dashboard | **BUILT** — `/family`: children, per-child progress, members, guardian requests |
| 19a | **Guardian access request** *(added — was missing from the inventory)* | **BUILT** — `/family/guardians`. Behind `family.guardian_verification` |
| 19b | **Guardian verification queue** *(added — was missing from the inventory)* | **BUILT** — `/admin/guardians`. Privileged only |

## 4. Adult learners — 7 *(plus 20a, 20b and 20c added later)*

| # | Screen | Status |
|---|---|---|
| 20 | Adult home, led by "continue where you stopped" | **BUILT** — shared learner dashboard at `/learn` |
| 20a | **Learning path detail and progress** | **BUILT** — `/paths/[slug]` tracks required-course completion |
| 20b | **Saved courses** *(added — was missing from the inventory)* | **BUILT** — `/saved`, reached from `/learn` and from the save button on a course page. Behind `learning.wishlist`; the list stays reachable when the flag is off so nothing is trapped |
| 20c | **Assignment hand-in and feedback** *(added — was missing from the inventory)* | **BUILT** — `/learn/[enrolmentId]/assignment/[assignmentId]`, text draft, submit, private mark/feedback, and revise: marked work can be reopened as a draft with the marked version kept below it. Behind `learning.assignments`; secure file transfer/viewing is not connected, so the flag stays off |
| 21 | Course details | **BUILT** — `/courses/[slug]`: outline, preview lesson, enrolment, ratings and reviews behind `learning.reviews` |
| 22 | Video lesson *(adult chrome)* | **BUILT** — same route as #14, chrome not yet differentiated |
| 23 | Qur'an / audio player | READY |
| 24 | Quiz or exam | **BUILT** — same route as #16; an `exam` assessment is a `type`, not a separate screen |
| 25 | Progress | **BUILT** — `/learn` lists enrolments with lesson completion; per-path progress on `/paths/[slug]`. No certificates-of-progress or streaks |
| 26 | Certificate | **BUILT** — `/certificates` and `/certificates/[number]`. No printable PDF yet |

## 5. Learning, shared — 2  *(missing from the source list)*

| # | Screen | Status |
|---|---|---|
| 27 | **Per-lesson discussion** | **BUILT** — thread on the lesson page + `/admin/discussion` queue. Moderation settled: authority posts visible, learner posts held. Behind `learning.discussion` |
| 28 | **Notes and bookmarks** | **BUILT** — private per-account lesson notes and bookmarks; transcripts remain unbuilt |

## 6. Teaching — 6 *(plus 31a, 31b and 31c added later)*

| # | Screen | Status |
|---|---|---|
| 29 | Teacher dashboard | **BUILT** — `/teach` with four POST-only API routes behind it. Learner analytics (#32) was the missing piece and is now built beside it |
| 30 | Create course | **BUILT** — `/teach`, one field: a title. Everything else is set in the curriculum builder |
| 31 | Curriculum builder | **BUILT** — `/teach/[courseId]`: sections, lessons, content items, reordering, sources. No drag-and-drop |
| 31a | **Cohort manager and roster** *(added — missing from the inventory)* | **BUILT** — `/teach/[courseId]/cohorts`, course-page join for a learner or guardian, and leave controls on the enrolment page. The manager page shows counts only; names and progress are on the class page (#32), for the teacher who opened the class. Learners see themselves/family, never other members — but a learner choosing a class on the course page does see how full it is ("3 of 12 places taken", a Full badge, and no Join button once every place is taken), from `cohort_places()`, which returns counts and no identities. The teacher sets when registration closes per class (`join_closes_at`), defaulting to the start date, and can move it while the class runs — and sets how many places the class has, while it is a draft or open, never below the learners already in it, because that number is the one a learner is refused by on the course page. `learning.cohorts` stays off pending the safeguarding review of files children send |
| 31b | **Assignment authoring and marking** *(added — missing from the inventory)* | **BUILT** — `/teach/[courseId]/assignments`; author creates/opens/closes tasks, marks private submissions, sets the revision policy per task, and marks a revision against what they asked for last time. Behind `learning.assignments`; secure file delivery and late-join policy are separate preconditions |
| 31c | **Media library and upload** *(added — missing from the inventory)* | **BUILT** — `/teach/media`: upload a lesson recording straight to Cloudflare R2 on a presigned PUT, with the SHA-256 checksum computed in the browser before it goes, a progress bar, a name the teacher chooses, and a list of every file they own with its state. Uploading does not publish: the row is `pending` until a staff member verifies it at `/admin/media`, and only an `available` file can be attached to a lesson. The ceiling is the database's 8 GiB, and the browser can reach it: the checksum is hashed a slice at a time, and anything over 32 MiB travels in 16 MiB parts signed eight at a time, so a connection that drops costs one part rather than the whole file and the bar says which part is moving. A closed tab no longer costs the whole file either: choosing the same file again is recognised by its checksum and size, the parts already in storage are read back from the bucket, and the transfer continues from where it stopped, with the bar starting part-way and the ETags coming from storage rather than from the page's memory of what it sent. A resumed upload that does not fit the plan this deployment makes is left alone and started again, with the reason said on the screen. Watching what you uploaded is on the same page: `/api/media/master` signs the master for fifteen minutes for the person who uploaded it, so waiting for verification is not waiting in the dark. What a teacher still cannot do is promote their own file |
| 32 | Learner analytics | **BUILT** — `/teach/[courseId]/cohorts/[cohortId]`: the roster of a class the teacher opened, with each member's name, their lesson counts against the version the class pins, a percentage and when they were last seen, ordered by who needs a nudge first. Read-only, and the whole boundary is in SQL: `can_read_learner_course_progress()` requires an active membership of a cohort pinning that version, so a self-paced learner stays invisible and so does somebody who left. Names come from `cohort_learner_progress()`, which returns four columns of `learner_profiles` and cannot return a family or an account link. `delivery.analytics` and `learning.cohorts` both ship off |
| 33 | Course submission and review | **BUILT** — submit from `/teach/[courseId]`; `/review` and `/admin/reviews` handle the assignment, and `/admin/reviewers` (row 44b) decides who may be assigned at all |
| 33b | **Before this can publish** *(added, 2026-10-21)* | **BUILT** — one panel on three seats. `/teach/[courseId]`: the author sees what their version needs (each requirement with its subject, scope, how many approvals it has of how many it needs, and how many reviewers could close it), writes a requirement down, records their own technical checks, and classifies what changed since the version before. `/admin/reviews`: governance staff see the same folded under each submitted version, with a badge for how many requirements are open, and hold the one act nobody else has — waiving a requirement, which needs the reason in writing and stores their name beside it. `/review/[assignmentId]`: the reviewer reads both panels before deciding and may add a technical check of their own, but cannot change what the version requires while judging it. An approval from a reviewer authorised for that subject closes its requirement by itself, on the way in; the panel can also ask for a recount, for the other order — a requirement written after the approvals arrived, or a reviewer granted the subject afterwards. A recount never reopens one: raising the number of approvals needed does that, and it is audited as an act by a person. When no living reviewer is authorised for an open requirement the panel says so in words, because otherwise it is a door that will not open with nothing to explain why. Technical checks are append-only and never touch the gate — a failed check is what a reviewer reads, not a reason to refuse publication — and a doctrinal or source change cannot be classified as low risk or as not needing re-review, which the form does not offer rather than letting the database refuse it |
| 34 | Earnings | BLOCKED — `teaching.payouts` is CODE and refused by trigger. The *data* exists: `instructor_earnings` accrues on a paid order and reverses on refund. No teacher-facing screen |

## 7. Administration — 15

| # | Screen | Status |
|---|---|---|
| 35 | Admin home | **BUILT** — `/admin`: flags, queues, and the links to every moderation screen |
| 36 | Users | READY |
| 37 | Teachers | READY |
| 38 | Course approval | **BUILT** — `/review/[assignmentId]`: accept or decline with a mandatory rationale, and while the assignment is accepted or in progress, watch the delivery copies of every lesson in the version. A reviewer gets the rendition and not the archive, and cannot save either: an offline copy is a learner's entitlement, and a reviewer holds none |
| 39 | Payments | **BUILT** — `/orders` shows status from the database, not from a redirect, and shows what the total is made of (subtotal, discount, tax, fee) plus every adjustment on the order including withdrawn ones. Finance records those adjustments on 35e |
| 40 | Revenue analytics | BLOCKED — `delivery.analytics` is CODE |
| 41 | Certificates | **BUILT** — `/admin/certificates` |
| 42 | **Settings and feature flags** | **BUILT** — *critical path, and it was missing from the source list.* `platform_settings` holds all 87 flags plus 3 governance and money controls; `/admin` reads and toggles them, with `code`-gated flags refused by trigger |
| 35a | **Uploaded media moderation** *(added by audit, 2026-10-20; renumbered from 44 on 2026-10-21, which was already Checkout in section 8)* | **BUILT** — `/admin/media`: every master anybody has uploaded, with its uploader, size, duration and the renditions derived from it. Verifying one asks storage whether the object arrived and whether it is the size the teacher declared, and only then makes it available. Quarantine holds one for review and withdraws every copy derived from it; withdraw is a soft delete per D7. The last two need a written reason, which the database now refuses to do without. Staff can also watch the file itself, because verification compares a byte count with storage and that is not the same as looking: a file of exactly the declared size can still be the wrong footage. A copy that failed to encode is listed with the reason the worker wrote and can be retried on a written reason of its own, which puts it back in the queue rather than encoding it: the next worker run does that, and overwrites the file that was never confirmed. Only staff can retry, and only for a master that is still available. Uploads nobody finished are on the same page, behind a button rather than on load because the list is a paid request to the bucket: parts that were sent and never assembled, which no row mentions and which storage deletes on its own after seven days. Each one names the file it belongs to where its key was derived from an asset, says how long it has been sitting there, and can be ended on a written reason — recorded before storage is asked to delete anything, and leaving the asset row exactly as it was, because a stalled transfer says nothing about the file. *Found by the audit: `quarantine_media_upload()` and `delete_media_asset()` existed and were tested, and no screen reached them, so a rights complaint about an uploaded file had no path at all* | A per-teacher quota of 50 GB of masters now exists behind `platform.cost_controls` and is enforced on `/api/media`, but this screen does not yet show a teacher how much they are using
| 43 | Support cases | **BUILT** — `/support` (open and list), `/support/<caseNumber>` (thread, reply, withdraw), `/admin/support` (queue and triage). Who may read a case is one SQL function, `can_read_support_case()`, asked by both read policies; an internal note stays inside the team even from the person who opened the case, unless that person is staff. Behind `platform.support` |
| 35b | **Reviewer register** *(added, 2026-10-21; renumbered from 44b for the same collision)* | **BUILT** — `/admin/reviewers`, for `governance_admin` or `platform_admin` only: who applied, who has been checked, what each may judge, and what each has stood aside from. Per reviewer: the status decision (checking somebody is setting them active, and it records who did it once, so a later reinstatement does not overwrite it; suspending or retiring needs a written reason, and nothing can set a person back to applicant), each qualification with a check or a refusal and an optional validity window (a window that has already closed is refused either way, because `verified_at` is written on a rejection too), the subjects granted with a scope and an expiry (granting to somebody unverified is refused: check them first; revoking keeps the row so granting again is a new one beside it), and each conflict with an assessment (hearing one or barring someone needs the reason in writing, because either ends a bar that was protecting a course). The gate is narrower than `is_privileged` on purpose: a support agent can refund an order and must not be able to appoint a scholar. What the screen cannot show is the document behind a qualification — `evidence_reference` is unreadable by every client, so checking one is a judgement made from a document held outside the platform, and the card says so rather than implying it saw something. The reviewer's own end is on `/review`, above the queue: apply, record a qualification as pending, declare a standing conflict. A declaration about one course is made from that course's offer (`/review/[assignmentId]`), where the version is known. *Before this, no reviewer profile could reach `active` except by hand in SQL, so no assignment could be made, no scholarly approval recorded, and no course published through the product* |
| 35c | **Exchange rates** *(added, 2026-10-21)* | **BUILT** — `/admin/exchange-rates`, for `finance_admin` or `platform_admin` only: what one currency was worth in another, when, and who said so. A rate is recorded with a source, because a rate nobody can attribute is not auditable; a rate more than `finance.rate_sanity_factor` times the previous one for the pair needs a written reason, because a slipped decimal is a hundredfold error in the only number the owner reads and it looks reasonable on screen. Nothing is editable: a wrong rate is corrected by recording the right one. Below the form, a single amount can be checked against the rate in force, which is how a suspicious total is investigated. There is no feed behind it and no credential to call one with, so `source` is a sentence a person can be asked about later |
| 35d | **Money report** *(added, 2026-10-21)* | **BUILT** — `/admin/money-report`, same gate: what moved in a period, converted into `finance.reporting_currency`. The end date is inclusive, every converted figure names the rate that produced it, and money in a currency nobody has quoted is listed as a gap rather than guessed at — the total is visibly smaller than the truth until a rate exists. It produces **no single net figure**: credits and debits are shown separately, because whether a chargeback offsets a capture and whether a provider fee comes off here or in the payout are decisions about the business, not about arithmetic, and the note on the page says so. Teacher earnings are converted in the same view, which is what is owed and not what has been paid — `teaching.payouts` is still gated |
| 35e | **Orders awaiting payment** *(added, 2026-10-21)* | **BUILT** — `/admin/orders`, for `finance_admin` or `platform_admin` only: every order that has not been paid yet, which is the only kind whose total can still change. Each card names the account it is on, lists its lines, and breaks the total into subtotal, discount, tax and fee. A discount, tax, fee, shipping or rounding is recorded against it with a written reason; a recorded one is withdrawn with a reason rather than deleted, so the total can always be reconstructed from the rows on the screen. Direction follows from the type — a discount is a credit, a fee a debit — except rounding, which genuinely goes either way and asks. Promotions are not offered because the writer refuses them until eligibility and stacking are decided, and a dropdown that offers a button which always fails is worse than no dropdown. Paid orders are absent on purpose: their total is history (a capture and the teacher's earnings were written from it), so their instruments are `/admin/financial-adjustments` and `/admin/reconciliation`. The list comes from `admin_orders_overview()`, a definer reader, because `orders_read` is a payer's own invoice and widening it would hand every order on the platform to every privileged role including `support_agent` |
| 43b | Case history (staff) | **BUILT** — the same case screen, above the actions, in collapsed sections. `support_case_history()` returns the orders, subscriptions, access grants, enrolments, course publication events and progress shares behind the case, each with the steps that produced them and who took each step, plus who asked and which learners are in scope. Staff only, and the function refuses everybody else, so the panel is not the only gate. Scoped to the requester's learners and billing accounts, never to the reader's: inside a definer function `can_access_learner()` answers for the caller, and the caller is staff. Every section reports its total beside a capped list, so a limit is never silent. What is not here is denials — `access_checks` has no writer at all, so the panel says refusals are not recorded instead of showing an empty log. Reading a case is not gated by `platform.support`; only opening one is |

## 8. Payments — 4

| # | Screen | Status |
|---|---|---|
| 44 | Checkout | **BUILT** — `/courses/[slug]/buy`. The page renders prices and posts back a price **id**; `create_course_order()` re-derives the offer and writes the order, so nothing about the amount comes from the browser. While `commerce.checkout` is off the page says checkout is not open rather than showing a form that cannot work, and an account that already holds the course is told so rather than being sold it twice — one purchase covers every learner profile on the account, so that message is reassurance, not a rejection. The provider hand-off needs P12 |
| 45 | Mobile money confirmation *(one screen, MTN and Airtel are parameters, not two designs)* | READY — the buy form takes an E.164 number and handles the `pending` result; needs a provider to prompt |
| 46 | International card payment | BLOCKED |
| 47 | Subscription management | **BUILT** — `/subscriptions`: allocate a seat to a household learner, cancel with a reason. Renewal and failed-payment handling need a provider |

## 9. Certificate verification — 1  *(missing from the source list)*

| # | Screen | Status |
|---|---|---|
| 48 | **Public certificate verification page** | **BUILT** — `/verify/[number]`, open to anyone with the number. Implemented as a page rather than a public REST endpoint |

## 10. Mobile-specific — 2

| # | Screen | Status |
|---|---|---|
| 49 | Notifications and preferences | READY |
| 50 | Offline / downloaded lessons | BLOCKED — entitlement rules, protected media, storage limits all undecided |

---

## 11. Built but never inventoried  *(found by audit, 2026-10-20)*

The rows above were derived from a source list of 48 mockups, and the codebase
has grown past it. These screens exist, are routed, and are reachable — they were
simply never added as rows. Counted by comparing the inventory's cited paths
against the actual route list in the production build, not from memory.

| Route | What it is |
|---|---|
| `/` | Marketing home |
| `/account` | Account settings: display name, preferred language, IANA time zone |
| `/account/sharing` | Who can see my learning, and whose learning I can see *(added, 2026-10-21)*: an adult grants one account one scope — progress, certificates, or both — for a length they choose, sees every grant with who, what and until when, and ends any of them. Below it, the other seat: what has been shared with me, with the terms the reader is reading under, the enrolments and lesson counts or the certificates the scope covers, and a line saying the person who granted it can end it at any time. Gated by `family.adult_shares`, which ships off — but reading and revoking are not gated, so a share granted while it was on stays revocable after it is turned off. The grant form **invites an address** (2026-10-22) and never says whether an account exists, because the invitation is created either way; it queues a message with a one-use token bound to that address. Live grants show who, what and until when, and any of them can be ended |
| `/share/invite/[token]` | Accepting an invitation *(added, 2026-10-22)*: the landing page for the link in an invitation email. Signing in is required and the token only works for the address it was sent to, so the page shows the signed-in address and accepts what the database says when they differ. Accepting is a button, not a page load, because mail scanners open links before people do. Success lands on `/account/sharing`, where the accepted share is listed with its terms |
| `/courses/[slug]/preview/[lessonId]` | A free preview lesson, gated by `learning.previews` |
| `/learn/[enrolmentId]` | The learner dashboard for one enrolment |
| `/paths` | Guided learning-path catalogue |
| `/teach/paths` | A teacher's own learning paths |
| `/teach/profile` | Teacher profile and public biography editing |
| `/teachers/[slug]` | A teacher's public page |
| `/admin/appeals` | Appeals queue |
| `/admin/course-reviews` | Held learner review text before it is published |
| `/admin/disputes` | Payment disputes |
| `/admin/financial-adjustments` | Manual financial adjustments |
| `/admin/plans` | Subscription plans, versions, entitlements and prices |
| `/admin/reconciliation` | Payment reconciliation |
| `/admin/refunds` | Refund queue |
| `/admin/reports` | Abuse and content reports |
| `/admin/roles` | Role assignments |

Nine of these are administration screens. Section 7 has since gained four rows of
its own, so the production build now emits **twenty admin routes** — the index
at `/admin` and eighteen beneath it.

## Counts

| | |
|---|---|
| Numbered screen IDs | **50**, plus 19a, 19b, 20a, 20b, 20c, 31a, 31b, 31c, 33b, 35a, 35b, 35c, 35d, 35e and 43b — **65 rows** |
| Routed | **63 page routes** in the production build. Three are not screens anybody designs (`/_not-found`, `/sign-out`, `/auth/confirm`), so **60 screens are routed** |
| Built but never inventoried | **18**, listed in section 11 |
| Ready to design now | **11** |
| Blocked | **5** |

The 65 rows and the 60 routed screens are not the same number and should not be.
Some rows are states of one screen — the four mobile home/learning rows are
responsive states of #11 and #14 — while some screens in section 11 answer to
several rows, and three routes are not screens at all. Both numbers are given,
measured from the inventory and from the build, so neither misleads. An earlier
"40 built" figure counted inventoried rows only: not wrong about what it counted,
but a reader would have taken it for the whole picture.

The four mobile home/learning rows in the source are responsive states of
screens #11 and #14, not four separate designs. The seven additional rows are
19a, 19b, 20a, 20b, 20c, 31a and 31b; after collapsing the responsive states,
this is 53 distinct screens. Mobile adds only #49 and #50.


## Missing from the source's list of 48

1. **Sign in / register** — no auth screen in 48 mockups, on a project whose
   top priority is ease of use.
2. **Settings and feature flags** — the critical path for "enable later from
   admin."
3. **Add a child profile** — the parent's first real task.
3a. **Guardian verification** — two screens, absent from the original 50, one of
    them COPPA-mandatory. A consent process with no screen to action it is not a
    consent process. Added as 19a and 19b rather than renumbering.
4. **Learner switcher** — the hard part of the two-audience design.
5. **Per-lesson discussion** — wanted and confirmed, and now built. The moderation policy that was undecided is settled: hybrid, with peers allowed to answer.
6. **Public certificate verification page** — the endpoint already exists.
7. **Empty, error and loading states** — where "as easy as possible" is
   actually won or lost.
8. **Cohort management** — both delivery models are confirmed; the class and join/leave flow was missing from the source and is now built as 31a. The late-join rule was settled on 2026-10-19: the teacher sets it per class, defaulting to the start date.
9. **Marked assignments** — standalone deadlines, private hand-in and teacher feedback were missing from the source list. The text workflow is built as 20c/31b, including the revision loop that lets a learner answer that feedback; secure file transfer and viewing remain blocked on media setup.
