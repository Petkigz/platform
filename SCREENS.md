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
| 31a | **Cohort manager and roster** *(added — missing from the inventory)* | **BUILT** — `/teach/[courseId]/cohorts`, course-page join for a learner or guardian, and leave controls on the enrolment page. The manager page shows counts only; names and progress are on the class page (#32), for the teacher who opened the class. Learners see themselves/family, never other members. The teacher sets when registration closes per class (`join_closes_at`), defaulting to the start date, and can move it while the class runs. `learning.cohorts` stays off pending the safeguarding review of files children send |
| 31b | **Assignment authoring and marking** *(added — missing from the inventory)* | **BUILT** — `/teach/[courseId]/assignments`; author creates/opens/closes tasks, marks private submissions, sets the revision policy per task, and marks a revision against what they asked for last time. Behind `learning.assignments`; secure file delivery and late-join policy are separate preconditions |
| 31c | **Media library and upload** *(added — missing from the inventory)* | **BUILT** — `/teach/media`: upload a lesson recording straight to Cloudflare R2 on a presigned PUT, with the SHA-256 checksum computed in the browser before it goes, a progress bar, a name the teacher chooses, and a list of every file they own with its state. Uploading does not publish: the row is `pending` until a staff member verifies it at `/admin/media`, and only an `available` file can be attached to a lesson. The browser ceiling is 5 GiB less 5 MiB rather than the database's 8 GiB: the checksum is now hashed a slice at a time in the browser, so what binds is the largest single request storage accepts, and the remaining gap needs a multipart uploader — written down, not hidden. Watching what you uploaded is on the same page: `/api/media/master` signs the master for fifteen minutes for the person who uploaded it, so waiting for verification is not waiting in the dark. What a teacher still cannot do is promote their own file |
| 32 | Learner analytics | **BUILT** — `/teach/[courseId]/cohorts/[cohortId]`: the roster of a class the teacher opened, with each member's name, their lesson counts against the version the class pins, a percentage and when they were last seen, ordered by who needs a nudge first. Read-only, and the whole boundary is in SQL: `can_read_learner_course_progress()` requires an active membership of a cohort pinning that version, so a self-paced learner stays invisible and so does somebody who left. Names come from `cohort_learner_progress()`, which returns four columns of `learner_profiles` and cannot return a family or an account link. `delivery.analytics` and `learning.cohorts` both ship off |
| 33 | Course submission and review | **BUILT** — submit from `/teach/[courseId]`; `/review` and `/admin/reviews` handle the assignment |
| 34 | Earnings | BLOCKED — `teaching.payouts` is CODE and refused by trigger. The *data* exists: `instructor_earnings` accrues on a paid order and reverses on refund. No teacher-facing screen |

## 7. Administration — 10

| # | Screen | Status |
|---|---|---|
| 35 | Admin home | **BUILT** — `/admin`: flags, queues, and the links to every moderation screen |
| 36 | Users | READY |
| 37 | Teachers | READY |
| 38 | Course approval | **BUILT** — `/review/[assignmentId]`: accept or decline with a mandatory rationale, and while the assignment is accepted or in progress, watch the delivery copies of every lesson in the version. A reviewer gets the rendition and not the archive, and cannot save either: an offline copy is a learner's entitlement, and a reviewer holds none |
| 39 | Payments | **BUILT** — `/orders` shows status from the database, not from a redirect |
| 40 | Revenue analytics | BLOCKED — `delivery.analytics` is CODE |
| 41 | Certificates | **BUILT** — `/admin/certificates` |
| 42 | **Settings and feature flags** | **BUILT** — *critical path, and it was missing from the source list.* `platform_settings` holds all 87 flags plus 3 governance and money controls; `/admin` reads and toggles them, with `code`-gated flags refused by trigger |
| 44 | **Uploaded media moderation** *(added by audit, 2026-10-20)* | **BUILT** — `/admin/media`: every master anybody has uploaded, with its uploader, size, duration and the renditions derived from it. Verifying one asks storage whether the object arrived and whether it is the size the teacher declared, and only then makes it available. Quarantine holds one for review and withdraws every copy derived from it; withdraw is a soft delete per D7. The last two need a written reason, which the database now refuses to do without. Staff can also watch the file itself, because verification compares a byte count with storage and that is not the same as looking: a file of exactly the declared size can still be the wrong footage. A copy that failed to encode is listed with the reason the worker wrote and can be retried on a written reason of its own, which puts it back in the queue rather than encoding it: the next worker run does that, and overwrites the file that was never confirmed. Only staff can retry, and only for a master that is still available. *Found by the audit: `quarantine_media_upload()` and `delete_media_asset()` existed and were tested, and no screen reached them, so a rights complaint about an uploaded file had no path at all* |
| 43 | Support cases | **BUILT** — `/support` (open and list), `/support/<caseNumber>` (thread, reply, withdraw), `/admin/support` (queue and triage). Behind `platform.support` |

## 8. Payments — 4

| # | Screen | Status |
|---|---|---|
| 44 | Checkout | **BUILT** — `/courses/[slug]/buy`. Price selection and order creation work end to end; the provider hand-off needs P12 |
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

Nine of the seventeen are administration screens. Section 7 has since gained row
44, so the app now has sixteen admin routes.

## Counts

| | |
|---|---|
| Numbered screen IDs | **50**, plus 19a, 19b, 20a, 20b, 20c, 31a, 31b and 31c — **58 rows** |
| Built | **43 inventoried**, plus **17 built but never inventoried** above — **60 in the app** |
| Ready to design now | **11** |
| Blocked | **5** |

The "40 built" figure counted inventoried rows only. It was not wrong about what
it counted, but it understated what exists, and a reader would have taken it for
the whole picture. Both numbers are given so neither misleads.

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
