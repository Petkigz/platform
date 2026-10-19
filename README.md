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
| `SCREENS.md` | 50 screens; 38 ready to design |
| `IDEAS.md` | Parking lot. Nothing here is scheduled. |

## Database

PostgreSQL on Supabase. Migrations live in `supabase/migrations` and are
applied in filename order.

`supabase/tests/harness.sql` stubs the parts Supabase provides (`auth.users`,
the `anon` and `authenticated` roles) so the migrations can run against a bare
PostgreSQL instance in CI. It is never applied to a real database.

### Running the tests

```bash
npm install
npm run test:db
```

This runs the real migration files against a real PostgreSQL engine
([PGlite](https://pglite.dev) — Postgres compiled to WASM), so constraints,
triggers and row level security are actually executed rather than merely parsed.

The suite is split by group and run by `supabase/tests/run.mjs`, which applies
the migrations once and runs every suite against the same engine.

**256 tests** across five suites:

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

The database stands at **90 tables, RLS on every one, 210 policies, 121
user-defined triggers, 167 functions and 72 migrations.** The database suite
passes **664 tests**; the web suite passes **252 tests**. TypeScript typecheck
and the production build pass; Next.js emits **73 app route entries**.

Signing up produces a usable account: a trigger on `auth.users` creates the
`user_profiles` row that every foreign key in the schema depends on. Without it
a new user could sign in and then do nothing at all.

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
remains at **0%** until the business decision is made; no percentage was chosen
on the owner's behalf. The payout workflow stays closed until the four payout
preconditions are settled.

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
`activate_assessment()`. Until then no teacher could create a quiz, so
`submit_attempt()` was unreachable and any completion rule that needed an
assessment could never be satisfied. Publishing now **refuses a version with a
draft assessment left behind** — D5 would freeze it invisible to learners.

A family can be created: `create_family()` writes the family **and** its owner
membership in one transaction. Until then no family could exist at all — the
policy that lets you add an owner requires already being one — and since D2 says
a child is a learner profile under a family and never a user, **no child could
exist and none could be enrolled.**

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

(The trigger count is user-defined triggers. `pg_trigger` also holds 803
internal constraint triggers; counting them gives 914, which is the number
that produced an earlier, inflated figure in this file.)

All five original logical groups are complete. `discussion_posts` was the
89th table, added for per-lesson discussion after those groups closed. The
teacher profile feature adds the 90th table. Governance channels (content
reports and review appeals) use the existing `content_reports` and
`governance_appeals` tables rather than adding new ones.

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

### Why 90 tables when the design specified 85

Five tables beyond the original 85 were needed for recorded decisions, the
chosen discussion experience and teacher-authored public profiles:

- `institutions` — D1 multi-tenancy had no table to hang `institution_id` on
- `media_assets` — D8 requires originals in storage we control, with a checksum
- `platform_settings` — without it, "build it all, enable it later" had
  nowhere to live; `governance.panel_required` is a row, not a constant
- `discussion_posts` — per-lesson discussion, explicitly wanted for the product
- `instructor_public_profiles` — public teacher biographies and owned social links, separate from internal reviewer qualifications

Learning paths reuse the existing `learning_paths` and `learning_path_items`
tables; this work adds their audited writers and the teacher/learner screens,
not another table.
