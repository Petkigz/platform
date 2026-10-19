# AyahSpring

Global Islamic e-learning platform for children and adults.

## Planning documents

| File | Purpose |
|---|---|
| `NEXT.md` | The one current milestone. Read this first. |
| `DECISIONS.md` | What is settled, and the nine irreversible decisions |
| `ROADMAP.md` | All 53 tasks with completion gates |
| `IRREVERSIBLE.md` | The nine decisions that are expensive to reverse |
| `FLAGS.md` | Every feature, behind a flag, with its precondition |
| `SCREENS.md` | 53 distinct screens; 12 ready to design |
| `IDEAS.md` | Parking lot. Nothing here is scheduled. |

## Database

PostgreSQL on Supabase. Migrations live in `supabase/migrations` and are
applied in filename order.

`supabase/tests/harness.sql` stubs the parts Supabase provides (`auth.users`,
the `anon` and `authenticated` roles) so the migrations can run against a bare
PostgreSQL instance in CI. It is never applied to a real database. That CI is
`.github/workflows/ci.yml`, and it needs no Supabase project and no secrets.

### Running the tests

```bash
npm install
npm run test:db
```

This runs the real migration files against a real PostgreSQL engine
([PGlite](https://pglite.dev) — Postgres compiled to WASM), so constraints,
triggers and row level security are actually executed rather than merely parsed.

The suite is split by group and run by `supabase/tests/run.mjs`, which applies
the migrations once and runs every suite against the same engine. Because the
runner lists its suites by hand, a new `*.test.mjs` that nobody registered would
not fail — it would simply never run. `npm run check:repo` catches that, along
with two migrations sharing a filename prefix and conflict markers left in a
file; `npm test` runs it first, and CI runs it as its own job.

**170 tests** across the five original groups (six files, since group 2 is split
in two):

*Group 1 — identity, family, guardians, privacy.* Schema presence, RLS on
every public table, seed data, `updated_at` triggers, duplicate and
self-escalating role grants, the child login prohibition (D2), the guardian
verification workflow, adult sharing rules, soft-delete code reuse, and four
RLS isolation cases.

*Group 2 — courses, versions, structure, media.* Slug reuse under soft delete
(D7), recursive subject-taxonomy cycle rejection, media master uniqueness and
checksum format (D8), single-source lesson resources, D5 immutability of a
published version **and of its entire subtree**, the review lifecycle
including "an author may not approve their own course", one published version
per course per language (D9), and seven RLS visibility cases.

*Group 2 part 2 — enrolments, progress, assessments, certificates.* The
version pin cannot be forged or moved without an audited reason, and a re-pin
leaves existing progress intact. Progress must be recorded against the pinned
version. Attempt limits, submitted-attempt immutability, automatic and manual
grading, and mixed grading that waits. Answer keys are unreadable by clients —
including via `SELECT *`. Certificate issuance is idempotent, snapshots the
course as it was, refuses incomplete work, and revokes rather than deletes.

## Status

The database stands at **102 tables, RLS on every one, 230 policies, 133
user-defined triggers, 214 functions and 88 migrations.** The database suite
passes **814 tests**; the web suite passes **363 tests**. TypeScript typecheck
and the production build pass; Next.js emits **97 app route entries**.

Signing up produces a usable account: a trigger on `auth.users` creates the
`user_profiles` row that every foreign key in the schema depends on. `/account`
lets a signed-in learner update their display name, preferred language and IANA
time zone; email/phone and account status are not editable there. Email users
can request a password reset from sign-in and set the new password through the
verified recovery callback. The signup trigger prevents an authenticated account
from being created without its application profile.

A lesson can contain something: `add_lesson_resource()` attaches a video,
reading or worksheet. Before it, every lesson published on the platform was an
empty page, because nothing could write to the table the lesson page reads.

Free previews now have one consistent gate from the catalogue to content
access. Teachers can mark draft lessons and individual public-sample resources;
those settings are audited and freeze with the published version. The
`learning.previews` admin flag is off by default: while off, anonymous reads and
the free-entitlement bypass are both denied. When on, only preview lessons and
resources explicitly classified as public samples are exposed; the preview
bypass cannot unlock enrolled-only materials. A public sample page is linked
from the course outline, and the teacher editor explains when previews are
prepared but globally disabled.

A learner can keep private study data on the lesson page: one note and one
bookmark per lesson per enrolment. Both tables are new, and both are gated by
`learning.notes_bookmarks` in the database rather than only in the UI, so a
direct PostgREST call is refused while the flag is off. Ownership is taken from
the session, not the request body, and the row must point at an enrolment the
caller may act for whose pinned version actually contains that lesson — a note
cannot be attached to a version the learner never accessed. Transcripts, which
the old flag description bundled in, are not built and are no longer claimed.

A teacher marking a written answer can say something as well as award a number.
Feedback is written in the same statement as the mark, inside the window the
immutability trigger opens, so a comment cannot be quietly rewritten after the
fact; the learner reads it under "Your marked attempts". The audit log records
that a comment was given and not what it says. The results screen deliberately
does not list which automatic questions were right — that information is already
readable by the learner through RLS, but a results page that reports every wrong
answer becomes an answer key for the next attempt, and these assessments are
reusable by design.

A learner can save a course from its page and keep a private note against it, and
`/saved` lists what they kept with whether each course is available, not
published yet, or no longer offered, and whether someone in the family is already
enrolled. The list belongs to an account rather than to a learner profile: every
other learner-scoped thing on the platform asks "who is learning?" at enrolment,
where it matters, and asking it again on a bookmark would turn the one effortless
action into a form. The note carries that intent instead. Owner ids are taken
from the session and never accepted from a caller, removal is not flag-gated so
switching the feature off cannot trap a list, and a hundred saved courses is the
ceiling. `learning.wishlist` ships off.

Marked homework now has its own tables and workflow, separate from quiz
questions: `/teach/[courseId]/assignments` creates work beside a published,
frozen version; `/learn/[enrolmentId]/assignment/[assignmentId]` saves and
submits a private written response. Self-paced deadlines are measured from each
learner's enrolment; a cohort assignment has one absolute date. The course
author and privileged staff can mark; score and feedback are visible only to
that learner/their family and the marker. Cohort data is version-pinned, and a
learner or guardian opts in; learners cannot browse other families' roster
rows. `learning.cohorts` and `learning.assignments` both ship off while cohort
screens and secure file handling are incomplete. The database accepts only
verified PDF/image/audio asset references (25 MiB each, at most 10), but no
bytes are transferred, scanned or securely delivered yet; the UI is text-only.
A learner gets one submission per task; revision/resubmission is not built.

Learners can rate and review a course they are enrolled in, from the course
page, and staff read anything they wrote at `/admin/course-reviews`. The rules
that make the number mean something are in the database: enrolled learners only,
one review per learner per course, an account reviews as itself rather than as a
child in its family, and the course author cannot review their own course. A
rating with no words is counted immediately — there is nothing to moderate — and
words are held until a person publishes them, so leaving a review stays a
two-tap action. Editing text sends it back through moderation, otherwise
updating is a way to publish an unreviewed sentence. A review is a satisfaction
signal and never reaches the publication workflow, which the tests assert
directly rather than by convention. `learning.reviews` ships off; the catalogue
badges that would advertise a score stay behind their own flag.

There is a help desk. `/support` opens a case and lists the ones already open,
`/support/<caseNumber>` holds the thread, and `/admin/support` is the staff
queue. Case numbers are human (`SC-000123`) because a support conversation
happens partly outside the product and a uuid cannot be read aloud. Internal
notes are staff-only in the read policy, not filtered in the application, so a
requester is never one query away from seeing them. A requester who replies to
a resolved case reopens it, which is what stops the queue reporting a
resolution rate it has not earned. `platform.support` ships off, and turning it
off stops new cases while leaving the ones in flight answerable — a kill switch
that strands live conversations is worse than none.

Subscription plans are now configurable in `/admin/plans`: staff create a
plan, versioned learner allowances, subject/feature entitlements and recurring
prices. Activation refuses a plan version with no entitlement or no live price.
The customer path is now wired too: `/plans` starts a pending order from the
server-resolved price and selected learner; only payment confirmation activates
the subscription and grants time-bounded access. `/subscriptions` allocates
additional household learners and cancels with a reason; cancellation keeps
already-paid access through the period end. Live provider credentials and
renewal processing remain separate preconditions (P12).

The teacher revenue share is configurable from the admin dashboard by a
finance or platform admin, with a required written reason and audit entry. It
was seeded at 0% because no percentage had been chosen and a migration is not
entitled to invent one; on 2026-10-19 the owner chose **50%**, so that is what
the register ships. Each earnings entry snapshots the share it accrued under, so
changing the setting never rewrites money already booked. Settling the
percentage does not open payouts: the workflow stays closed until the four
payout preconditions are settled, and tax treatment, processing fees and
uniform-or-per-teacher terms are still open.

Finance can record and review dispute cases from `/admin/disputes`. Amounts
must match the internal transaction's currency and not exceed its value; status
changes require notes and follow a fixed review path. This is an internal case
log, not a provider evidence submission.

Teachers can curate ordered learning paths in `/teach/paths`. Publishing
requires at least one active course with a published version; changes to
published paths require a draft, and retirement is reasoned and audited. The
learner page at `/paths` and its home-page link are gated by `learning.paths`,
which stays off until path content has been authored. Paths organize courses;
they do not grant or bundle access, so the existing enrolment and payment rules
remain authoritative.

Teachers can add lesson-level source citations from the draft curriculum editor.
An atomic RPC creates the source and link, records the actor, and enforces D5:
source citations are part of the version subtree and lock when published.
`learning.provenance` gates learner display; when on, citations show the source,
edition, locator, usage anchor and optional HTTPS link. Existing source tables
are now guarded against post-publication edits as well as writes through the UI.

When a published course needs revision, its author can create a draft from the
course editor. The audited copy includes the curriculum, assessments, completion
requirements, citations and existing product/price links. The new draft has new
content IDs; learners already enrolled remain pinned to their original version.
A course with an existing draft or review in progress cannot be copied again.

The draft curriculum editor now has up/down controls for sections, lessons and
lesson resources. Each move swaps with the nearest item in that list in one
audited database transaction; the controls stop at the ends of each list, and
non-draft versions remain locked.

Instructors can prepare a public profile at `/teach/profile` and share it at
`/teachers/<slug>`. It contains only teacher-authored biography, HTTPS social
links and published courses; reviewer qualifications remain confidential and
are not implied by the profile. Public RLS requires both the `teaching.public_profile`
flag and an active instructor role, so turning the flag off or revoking the role
hides the profile at the database boundary as well as at the page.

Finance can reconcile a provider statement from `/admin/reconciliation`.
Signed minor-unit rows are matched to ledger transactions by provider reference,
currency, amount and settlement period. Missing, ambiguous and discrepant lines
stay visible; close requires a finalised run and a written reason. No provider-
specific import format is assumed while P12 credentials and statement formats
remain undecided.

Finance can record a correction from `/admin/financial-adjustments`. Signed,
append-only amounts link to an order or transaction and require finance/platform
admin plus a reason. A full-refund earnings clawback is computed from already
paid instructor entries and recorded as one negative adjustment; paid earnings
are not rewritten and the adjustment itself does not transfer funds.

A course can be assessed: `create_assessment()`, `add_assessment_question()` and
`activate_assessment()`. The database writer existed, but no teacher tools
exposed it; course quizzes and assessment-based completion rules were therefore
unusable from the product. Course authors can now create assessments, add
automatically graded single/multiple-choice or true/false questions, then
activate them from `/teach/<courseId>`. The editor never reads answer keys back.
Learner submission auto-grades objective questions inside the database; written
answers appear in the course-author/staff marking queue, and the final attempt
score is recorded after the last manual response is graded. Marks are audited,
and clients cannot call the lower-level grading RPCs directly. Publishing now
**refuses a version with a draft assessment left behind** — D5 would freeze it
invisible to learners.

Certificate workflows are now reachable end to end: `/admin/certificates` lists
completed eligible enrolments, issues certificates, and permanently revokes them
with a reason. The client-facing issuance/revocation calls are bound to the
session (no caller-supplied actor id); the admin RPC returns only the certificate
number rather than learner-linked records. Holders can view and print/save their
snapshot as a PDF from `/certificates/<number>`, with public verification at
`/verify/<number>`.

Families are set up from `/family`: an adult can now create a family space,
add children with age bands (no birth date or child login), and see each child’s
course progress. `create_family()` writes the family and its owner membership
in one transaction, so there is no ownerless family state. Guardian verification
remains a separate, explicit flow and is not bypassed by adding a child to a
family. When `family.guardian_verification` is enabled, the database also blocks
new child enrolments until the enrolling account has an active, reviewed
relationship with learning permission; the default-off flag must be enabled
before any US child enrols.

A course can be sold: `create_product()`, `link_product_course_version()`,
`set_product_price()` and `activate_product()`. Until then every table on the
revenue path had zero rows and no writer, so nothing could be bought and no
teacher could earn. A teacher owns the product and attaches their own published
course; **only staff can set a price or put it on sale** — that split was
already in the row-level policies and is not reversed here.

Uploads belong to us, not to whoever linked them: `register_media_upload()`
creates the `media_assets` row and derives the storage key, and an upload
becomes available only when staff confirm it. An uploader cannot promote their
own file — that hole was found by running the sequence, not by reading the
policy.

(The trigger count is user-defined triggers. `pg_trigger` also holds 1007
internal constraint triggers; counting them gives 1140, which is the number
that produced an earlier, inflated figure in this file.)

All five original logical groups are complete. `discussion_posts` was the
89th table, added for per-lesson discussion after those groups closed. The
teacher profile feature adds the 90th table. Private lesson notes and
bookmarks add the 91st and 92nd, the help desk adds the 93rd and 94th,
learner reviews the 95th and saved courses the 96th. Dated cohorts add the 97th
and 98th, marked assignments add the 99th, 100th and 101st, and the record of a
marked version a learner revises is the 102nd.
Governance channels (content reports and review appeals) use the existing
`content_reports` and `governance_appeals` tables rather than adding new ones.

All five logical schema groups are built. Every frozen decision — D1
multi-tenancy, D2 child identity, D4 money, D5 version pinning, D6 content
licence, D7 deletion, D8 media masters, D9 translations — is enforced in SQL
rather than in application code, which is the only place it survives a second
developer or a second AI-generated query.

## Web app

`web/` is a Next.js 16 + TypeScript app with Supabase Auth wired: email and
password, phone OTP with E.164 normalisation, and a `/learn` screen that reads
enrolments with no client-side filter — row level security decides what comes
back. `supabase/tests/app.test.mjs` pins that contract.

```bash
npm install
cp web/.env.example web/.env.local   # then set your project URL and anon key
npm run dev
```

See `web/README.md`.

### Why 102 tables when the design specified 85

Seventeen tables beyond the original 85 were needed for recorded decisions, the
chosen discussion experience, teacher-authored public profiles, private study
data, the help desk, learner reviews, saved courses, dated cohorts, marked
assignments and the revision loop that makes feedback actionable:

- `institutions` — D1 multi-tenancy had no table to hang `institution_id` on
- `media_assets` — D8 requires originals in storage we control, with a checksum; the provider is costed at `docs/decisions/media-storage-costing.md`
- `platform_settings` — without it, "build it all, enable it later" had
  nowhere to live; `governance.panel_required` is a row, not a constant
- `discussion_posts` — per-lesson discussion, explicitly wanted for the product
- `instructor_public_profiles` — public teacher biographies and owned social links, separate from internal reviewer qualifications
- `lesson_notes`, `lesson_bookmarks` — the notes/bookmarks flag existed in the
  register with no tables behind it; a note and a bookmark have different
  lifecycles (one is edited, one is toggled), so they are separate tables
- `support_cases`, `support_case_messages` — a case and its thread have
  different readers: staff see internal notes on a message that the person who
  opened the case must never see, which is a row-level distinction rather than
  a column on the case
- `course_reviews` — the register had the flag and no table; a review is not a
  `content_report` (it is an opinion about a course, not a defect in a lesson)
  and not a review decision (which is scholarly and gates publication)
- `course_wishlist` — the register had the flag and no table, and its
  precondition ("only meaningful once checkout is on") was true of paying and
  false of saving: a course can be free, unpublished, or under discussion in a
  family about which child it is for
- `cohorts`, `cohort_members` — a published course version freezes its lessons and quizzes, so dated group work needs a class alongside the immutable version. Membership writes are session-bound; learners see only themselves and their family, not the roster; joining requires an exact-version enrolment. Registration closes at a teacher-set `join_closes_at`, defaulting to the start date and movable while the class runs; shutting the window governs arriving, not staying. `learning.cohorts` ships off pending the safeguarding review of files children send.
- `course_assignments`, `assignment_submissions`, `assignment_submission_assets` — a separate task can be created after publication, carry an enrolment-relative or cohort-absolute deadline, and receive one private learner hand-in with text and verified file references. Marks/feedback are private and audited; no bytes or public object keys are stored. `learning.assignments` ships off until safe upload, scanning, delivery/retention and late-join policy are reviewed.
- `assignment_submission_revisions` — feedback a learner cannot answer is decoration, so marked work can be reopened as a draft and handed in again. The version that was marked is snapshotted here before the live row is cleared: append-only by trigger, readable exactly where its submission is readable, and it holds file *ids* rather than bytes. Reopening past a deadline is refused on a task that does not accept late work, because the alternative is a learner trading a grade for a draft they can never submit.

Learning paths reuse the existing `learning_paths` and `learning_path_items`
tables; this work adds their audited writers and the teacher/learner screens,
not another table.
