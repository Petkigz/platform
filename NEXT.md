# NEXT

One milestone. One page. When it's done, rewrite this file.

**Test:** can I answer "what am I doing today?" in one sentence?

---

## Done: the entire database

**All five logical schema groups are migrated, tested and committed.**

| | Tables | What it covers |
|---|---|---|
| Group 1 | 10 | identity, roles, family, guardians, privacy |
| Group 2 | 20 | courses, versions, structure, enrolments, progress, assessments, completion, certificates |
| Group 3 | 20 | reviewers, review workflow, provenance, appeals, panels, audit |
| Group 4 | 18 | products, pricing, subscriptions, promotions, entitlements |
| Group 5 | 20 | orders, payments, refunds, reconciliation, payouts |
| **Total** | **88** | RLS on every table · 202 policies · 105 triggers · 82 functions |

**170 tests pass** against a real PostgreSQL engine: `npm run test:db`.

The record specified 85 tables. There are 88 because three were missing from
it and had to be added to make the recorded decisions implementable:
`institutions` (D1 multi-tenancy), `media_assets` (D8 media masters) and
`platform_settings` (without which "enable it later" had nowhere to live).

Every frozen decision is enforced in SQL rather than in application code:
**D1** · **D2** · **D4** · **D5** · **D6** · **D7** · **D8** · **D9**.

## Current milestone: the application layer — mostly done

`web/` is a Next.js 16 + TypeScript app with Supabase Auth wired, and one
authenticated screen reading through RLS.

### Also done since: the authorization matrix

`authorization_matrix: incomplete` was the last open Phase 1 item. It is now
derived from the migrations and written up in
`docs/decisions/authorization-matrix.md`, with
`supabase/tests/authorization.test.mjs` enforcing all ten of the record's
required access tests — two of which had no coverage anywhere.

Writing it down found three real defects, all fixed in
`20261021000100_authz_fixes.sql`:

1. a family `billing_manager` could read the children's profiles
2. an assigned reviewer could not read the content they were asked to review
3. **a verified guardian could not see the child they were verified for** —
   `guardian_relationships` was consulted by no policy at all, so the whole
   verification workflow gated nothing. That workflow is the machinery behind
   verifiable parental consent, which COPPA requires for US under-13s.

**190 tests pass.**

### Done

- [x] Next.js + TypeScript app, `npm run build` clean, 7 routes
- [x] Email+password **and** phone OTP (D3)
- [x] E.164 normalisation at the boundary, 7 unit tests
- [x] Sign-in, sign-up, confirmation and sign-out
- [x] `/learn` reads enrolments with **no client-side filter** — RLS decides
- [x] `supabase/tests/app.test.mjs` pins that data contract (177 tests total)
- [x] `.env.example`, no secrets committed

### Still open — needs a live Supabase project

This sandbox has no Supabase instance, so the app builds and renders but the
authentication round trip is unverified. Pointing `web/.env.local` at a real
project and confirming in a browser is the remaining step.

- [ ] Sign up with email, confirm, sign in
- [ ] Sign in with phone OTP; confirm the number arrives as E.164
- [ ] `/learn` shows only your own enrolments **in the browser**
- [ ] Apply the migrations to the real project with `supabase db push`

### Today's sentence

> Create the Supabase project, push the migrations, and confirm the auth round
> trip in a browser.

### Also done since: the catalogue and the visual identity

**White and green**, per the decision recorded in `DECISIONS.md`. The tokens
live in `web/src/app/globals.css` and nowhere else — changing the brand means
changing that one block.

`/catalogue` (search, subject filter, audience filter) and `/courses/[slug]`
(outline, sections, lessons, preview flags). `web/src/lib/catalogue.ts` holds
the query so the landing page and the catalogue cannot drift into two ideas of
what "on the shelf" means. `subject_areas` is seeded: 9 disciplines, 26
subdivisions, two levels — a deeper tree makes the filter unusable on a phone.

`supabase/tests/catalogue.test.mjs` pins the public contract, and found a
fourth defect: `courses_read` admitted any active course whether or not a
version had ever been published, so an author who set the wrapper to `active`
during drafting put the title and description of unpublished work on the
public internet. The app filtered it out, but a presentation filter is not an
access control. Fixed in `20261022000200_catalogue_visibility.sql`.

**198 tests pass.**

### Also done since: enrolment, and the payment boundary

Both at once, deliberately, because doing the first without the second would
have hidden the thing that mattered.

**Free enrolment works.** The course page resolves the offering from products
and prices rather than from a flag on the course, and `/api/enrol` takes a
course id and nothing else — no learner id, no price, no source. Every one of
those would have been a way to lie.

**The `PaymentProvider` boundary is real code**, not a comment.
`web/src/lib/payments/provider.ts` is the interface an adapter must satisfy;
`UnconfiguredPaymentProvider` is the provider that says no, and it stays in
the tree — an unconfigured deployment must keep behaving that way.
`web/src/lib/money.ts` is D4 in TypeScript: `bigint` minor units, and a float
is a type error rather than a silent truncation. 19 unit tests.

**A serious hole, found by wiring the button.** `course_enrolments_insert`
checked only `can_access_learner(learner_profile_id)` — that you may act for
the learner. It never asked whether the course was for sale. Any signed-in
user could POST an enrolment against a paid course with `source = 'free'` and
walk past the entire payment stack: no product, no price, no order, no
callback. The entitlement model was correct and simply never consulted at the
one moment it mattered. Fixed in `20261023000100_enrolment_gate.sql`;
`supabase/tests/enrolment.test.mjs` holds the negative cases.

**208 tests pass.**

### Also done since: progress and completion

`/learn` now shows a real progress bar per course, and `/learn/[enrolmentId]`
is the course view: sections, lessons, mark complete, undo. `POST
/api/progress` records it. Mark-complete is optimistic — a tick that waits on
a round trip feels broken on a slow connection, and ease of use is the first
design constraint.

Two things worth knowing about the model:

**Progress is pinned to the version the learner enrolled into.** Recording
progress against a lesson from a different version is refused by
`enforce_progress_version_match`. Publishing v2 leaves v1 progress untouched
and does not move anyone's enrolment. Both are pinned by tests.

**Completion is derived, not stored.** There is no `course_completions` table.
`evaluate_completion()` recomputes from recorded facts and returns what is
still blocking, so a completion report cannot drift out of sync with a
progress bar. `progress.test.mjs` asserts the table does not exist, so nobody
adds one by accident.

**219 tests pass.**

### Also done since: assessments

`/learn/[enrolmentId]/assessment/[assessmentId]` is the quiz. Answers save as
they are chosen rather than on submit, so a dropped connection mid-quiz does
not cost the learner their work. `POST /api/assessment` takes three verbs —
start, answer, submit — and the learner and enrolment are always resolved from
the session, never from the body.

The attempt is started server-side when the page loads, not on a button press,
so a learner who opens the page and closes the tab has still used an attempt.
That is what `attempt_limit` is meant to mean.

**The answer key has no read path in the application, and that is tested.**
`SELECT *` on `assessment_questions` is refused outright rather than returning
the granted columns, because the protection is column privileges and a
table-level grant would silently undo it. The suite asserts the star form
fails, that `answer_key` cannot be selected directly, and that **even a
platform admin cannot read it through SQL** — grading happens inside
`grade_response()`, which is the only reader.

**231 tests pass.**

### Also done since: the admin flag dashboard

`/admin` is the page the standing architecture decision points at — build
everything, ship it off, turn it on from here. All 86 flags from `FLAGS.md`
are seeded into `platform_settings`, each with its gate type and its written
precondition, so the dashboard shows *why* a flag is off and not only that it
is.

**A `code`-gated flag cannot be enabled at runtime, and that is a trigger.**
31 of the 86 need a deploy, a provider, or a policy document first. Enforcing
that in the UI by hiding the switch would not be a control — the API is
reachable and so is psql. `reject_code_flag_enablement()` refuses it; a
migration can still do it by setting `app.bypassing_code_flag`, the same
pattern the version lock and enrolment pin use.

Two things had to change to make this possible. `platform_settings` had no
SELECT policy at all, so nothing could render the list; it now has one,
privileged-only, and an ordinary signed-in user still reads zero rows. And
`FLAGS.md` held two duplicate keys — `learning.wishlist` and
`teaching.applications`, each listed twice with different preconditions. Both
were merged with their preconditions preserved; a register with duplicate keys
cannot be a primary key.

**243 tests pass.**

### Also done since: the family dashboard, and a real defect

`/family` is the other half of the product. A child here is a
`learner_profile` under a `family`, never a `user` (D2) — no email, no
password, no date of birth. The page shows each family's children with their
age band and per-course progress, plus who the adults are. Nothing filters by
the signed-in user; RLS decides what comes back, including the case that used
to be a defect: a billing-only member sees the family and none of its
children.

Adding a child asks for a name and an age band and nothing else. That is the
whole COPPA-adjacent surface, and the constraints doing the work are in the
database: `lp_children_need_age_band`, `lp_no_child_login_yet`, and
`lp_insert` requiring active family membership.

**The defect.** A parent could insert a child profile but could not read back
its id:

```sql
insert into learner_profiles (...) values (...)              -- allowed
insert into learner_profiles (...) values (...) returning id -- refused
```

`lp_read` was written as `is_learner_family_member(id)`, which joins
`family_memberships` back through `learner_profiles`. The SELECT policy is
applied to an `INSERT ... RETURNING` result too, and at that instant the new
tuple is not visible to the separate SECURITY DEFINER query inside the helper
— the command counter has not advanced. `is_family_member_of()` decides from
the row's own `family_id` instead, with no join back, and excludes
`billing_manager` so widening it does not quietly undo that fix.

This would have failed at the first child anyone added, because
`.insert().select('id')` is what every client library compiles to. It is
pinned by a regression test that was verified to fail without the fix: 2
failures with the predicate removed, 0 with it restored.

**256 tests pass.**

### Also done since: the teacher's side

`/teach` is the course creation and curriculum tools. Without it, nobody but
someone with database access could put content on the platform — which for a
multi-instructor product is the whole point.

A teacher creates a course (one field; the slug is derived, the first version
is created with it because a course with no version has nowhere to hold
content), then adds sections and lessons, then submits for review. The
curriculum editor renders a published version read-only with an explanation
rather than disabled controls: a greyed-out button invites you to find the
thing that un-greys it, and here there is nothing. Changes go into a new
version.

Only "submit" and "withdraw" are offered to an author. Approving belongs to a
reviewer and publishing to a platform admin, and the transition table refuses
the author regardless of what the client sends. The actor passed to
`set_course_version_status()` comes from the session, never the request body —
letting a caller name the actor would make the transition table decorative.

**A subtlety worth recording.** The write policies on `course_sections` and
`lessons` are phrased as `can_read_version()`, which is true for *any* signed-in
user on a published version. So the thing that actually stops a learner from
injecting content into a course they are enrolled in is the D5 lock trigger,
not the policy. `authoring.test.mjs` asserts the behaviour rather than the
policy shape, so a future tightening of the policy cannot quietly become the
only thing holding.

Two of my own assertions were wrong before this passed, both from the same
recorded trap: writes inside `asUser()` roll back, and the first error inside
it aborts the transaction. A third read was wrong for a different reason — an
active course with no published version is not readable by a non-author at
all, so the teacher under test could not see the title they were trying to
change. The row is now compared as superuser.

**268 tests pass.**

### Also done since: certificates and public verification

`/certificates` lists what you have been awarded, and `/verify/<number>` is a
public page anyone can load without an account. Certificates were fully built
in SQL — `issue_certificate()`, `verify_certificate()`, `revoke_certificate()`,
`protect_certificate_snapshot()` — with no way to reach any of it.

The privacy design is worth stating because the two halves only make sense
together. `certificates_read` is authenticated-only, so **nobody can enumerate
certificates** — not anonymously, and not as a signed-in stranger. But
`verify_certificate()` is granted to `anon`. The number is the capability: you
can be told about a certificate you already hold, and that is all. If the read
policy were ever opened up, the verification page would become a directory of
every learner on the platform, so both halves are asserted in
`certificates.test.mjs`.

Everything on a certificate is a snapshot — course title, version, holder name,
and the criteria that applied — and `protect_certificate_snapshot()` keeps it
that way. The test renames the course and the learner after issue and asserts
the certificate did not move. A certificate has to say what was true when it
was awarded, or it says nothing.

Issuing is staff-only (`is_privileged` or `support_agent`), requires the
version's completion policy to have certificates enabled, requires the
enrolment to actually be complete, and is idempotent — a second call returns
the existing certificate rather than minting another.

Two of my own assertions were wrong before this passed. I linked three learner
profiles to one auth user, which `learner_profiles_linked_user_key` forbids —
a user gets one profile. And I counted certificates globally to prove none had
been issued, when other suites in the same run legitimately issue some; the
count is now scoped to the enrolment.

**281 tests pass.**

### Also done since: the reviewer's side

`/review` is the queue and `/review/<assignmentId>` shows the outline under
review next to the controls. This closes the loop the authoring work opened: a
teacher could submit for review, and until now nobody could act on it.

A reviewer accepts or declines an offer, then records a decision —
`approved`, `revision_requested`, or `rejected` — with a mandatory reason. The
reason is required for approvals too, because this row is what a teacher
appeals against and "looks fine" is not an appeal answer.

Assignments are created by platform staff and cannot be self-claimed
(`cra_write` is privileged only). A decision's version and scope are read back
from the assignment rather than accepted from the client, so a caller cannot
attach a decision to a version they were not asked about even by trying. The
actor comes from the session.

Recording a decision and moving the version are separate acts on purpose: a
decision is a statement about the content, and the version's status is what
happens next. If the transition fails, the decision stays recorded and the API
says so rather than pretending nothing happened.

One of my own assertions was wrong before this passed, from the same recorded
trap: I read an assignment's status back *after* `asUser()`, which always rolls
back, so it could only ever read `offered`. Both halves of the test are now
asserted inside the block using `RETURNING`, which also makes the
"matched zero rows" case observable — an RLS-blocked UPDATE raises nothing.

**296 tests pass.**

### What comes after that

The paid path. It needs a provider, and a provider needs merchant
registration and signed API terms (P12). Until then `payment_required` is the
honest answer and the UI says so.

The dashboard also made a gap visible, and the first two are now closed:
`learning.progress` gates the progress bar and mark-complete, and
`learning.assessments` gates the quiz, its route, and its API. The remaining
84 flags are recorded and toggleable but nothing reads them yet, because the
features they gate are not built. Each one needs its `isFlagEnabled()` call
added where the feature lives.

The gate is checked in the API as well as the UI, because a UI hiding a button
is not a control. One deliberate exception: an attempt already in progress may
still be submitted, so turning assessments off mid-quiz does not strand a
learner who was already answering. And **certificates** are staff-issued only
(`issue_certificate` requires a privileged actor or a support agent), so a
learner completing a course does not get one automatically — that is a
deliberate gate, and it will need a review step in the admin dashboard.

### Not now

Admin dashboard · payments UI · mobile · the investor proposal.

### Decisions still open that this milestone will surface

- **P11 — interfaces, not guesses.** The first screen needs the AyahSpring
  visual identity, which does not exist yet. Either design it now or build
  unstyled and accept rework.
- **P12 — the seven external facts.** Payment providers, jurisdiction,
  trademark clearance. Group 5 has the schema; the providers are still
  unchosen.
- **P6 consequence.** The scholarly panel is dormant. Before switching it on,
  decide whether anything published under peer review gets retroactive panel
  review or is grandfathered.
