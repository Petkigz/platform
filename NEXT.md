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

### Also done since: assigning reviews

The queue built last turn could never have had anything in it. Assignments are
created by platform staff (`cra_write` is privileged only) and there was no
staff UI to create one, so `/review` would have stayed permanently empty.
`/admin/reviews` closes that: it lists submitted versions and the active
reviewers, and assigns one to the other.

One constraint shapes the page. `reviewer_profiles_insert` only admits
`user_id = current_user_id()`, so **staff cannot create a reviewer profile for
somebody else** — a reviewer has to make their own first. The page says that
plainly when the reviewer list is empty rather than showing a dead dropdown,
and `review.test.mjs` asserts both halves: a user can create their own profile
and cannot create one for anyone else. That is asserted so the constraint is
not quietly widened later.

The queue filters on `version_status = 'submitted'`, and the test pins that a
draft version is not in it — staff being asked to review something that is not
up for review is the kind of thing that erodes trust in a review step.

**299 tests pass.**

### Also done since: a reviewer could verify themselves

While checking the reviewer onboarding loop end to end I found that a signed-in
user could make their own profile read as verified, in a single statement:

```sql
insert into reviewer_profiles (user_id, reviewer_status, verified_at, verified_by)
values (auth.uid(), 'active', now(), auth.uid());
```

`reviewer_profiles_insert` admits any row where `user_id = current_user_id()`,
and `_update` admits any update to your own row. Neither said anything about
`reviewer_status`, so the two-step version worked too: apply as an `applicant`,
then promote yourself.

It is worth being precise about what that did and did not buy. **It was not a
route to approving courses.** `is_authorised_reviewer()` additionally requires a
live `reviewer_subject_authorizations` row, and `rsa_write` is privileged only,
so `validate_review_assignment()` still refused to assign a self-verified
reviewer to any version with review requirements. I checked that rather than
assuming it, because the severity of the fix depends on it.

What it *was* is a public false credential. `reviewer_profiles_read` shows
active profiles to the anonymous role, so a self-verified profile was displayed
to the world as a verified reviewer — and it landed in the staff assignment
dropdown, which filters on `reviewer_status = 'active'`. So the defect degraded
a human judgement rather than bypassing a machine one.

`protect_reviewer_verification()` now refuses it. The scoping took a second
attempt: my first version exempted "privileged or no JWT subject", which broke
twelve tests across four suites because the fixtures run as superuser with no
claims. The narrower rule is also the more honest one — the defect is a person
verifying their *own* profile, so the trigger fires only when the row belongs
to the acting user. A rule whose exemption is "there is no authenticated user"
can be read as trusting the anonymous role; a rule whose exemption is "this row
is not yours" cannot.

The regression test was checked for teeth: with the guard neutered the suite
reports 1 failure, restored it reports 0. A separate test asserts
self-registration as an `applicant` still works, so the fix cannot quietly
become "nobody can apply to be a reviewer".

**303 tests pass.**

### Also done since: nothing ever created an entitlement grant

This is the most consequential thing found so far, and it was hidden by a
second defect.

`can_access_course_version()` consults `entitlement_grants` and nothing else.
That is the recorded design — enrolment is not entitlement is not availability —
and it was implemented correctly. What was missing is the writer:

| Check | Result |
|---|---|
| `INSERT INTO entitlement_grants` in migrations | **0 sites** |
| References in `web/src/` | **0** |
| Functions mentioning the table | **1** — the reader |
| Triggers on `course_enrolments` | `set_updated_at`, `protect_pin` |
| `record_payment_success()` writes | ledger, orders, audit — no grant |
| Rows in a fresh database | **0** |

No learner was ever entitled to anything. The platform only appeared to work
because `lesson_resources_read` was gated on `can_read_version()`, which is true
for any signed-in user on a published version. Measured:

```
enrolled learner              -> saw the resource URL
signed-in stranger, no grant  -> saw the same URL
anonymous                     -> saw nothing
can_access_lesson(stranger)   -> false
```

The entitlement function gave the right answer and the policy never asked it.
That was Groups 4 and 5 — products, pricing, subscriptions, promotions,
entitlements, orders, payments, refunds — sidestepped by creating a free
account and reading a column.

**The two defects hid each other.** Closing the leak alone would have locked
every learner out of their own courses, because nobody had a grant. Fulfilment
alone would have left paid content readable by anyone signed in. They only make
sense shipped together, which is why both are in this unit.

Two writers now exist. A free enrolment on a genuinely unsold version grants
access to it, via a trigger. A confirmed payment grants what was bought and
then enrols the buyer, inside `record_payment_success()` — grant first, then
enrolment, because `can_enrol_in_version()` requires an existing entitlement
before a sold version may be enrolled in. D4 is unchanged in that function:
order amounts stay authoritative, minor units throughout, idempotent on replay,
an unsigned or already-processed provider event refused, a redirect still not
proof. Subscription line items are deliberately not fulfilled there; they have
their own lifecycle, and inventing one inside a payment callback is how a
subscription ends up granting forever.

**Why the suite stayed green the whole time:** the tests insert grants by hand
(`enrolment.test.mjs` 5×, `group4.test.mjs` 14×). The fixtures encoded an
assumption the application never fulfilled, which is exactly the shape of gap a
passing suite cannot see. One of those tests then had to change: it enrolled a
learner free into an unsold course and asserted they had no access because a
*separate* subscription grant had expired — an assertion that only held while
enrolment conferred nothing. It now attaches a product so the expired
subscription is genuinely the only route to the content.

Both fixes were checked for teeth rather than assumed to have them. Neutering
the read policy gives 2 failures; neutering the free path gives 2; neutering the
paid path gives 3; all restored, 0. The first attempt at neutering the paid path
was ineffective — a `union all` let the original query still run — so the paid
path was verified a second time with a neuter that actually applied.

**312 tests pass.**

### Also done since: checkout, and two more dead ends behind it

Building the paid path turned up two more gaps of exactly the same shape as the
entitlement one — machinery that was correct and nothing connected to it.

**A learner could mark a lesson complete but never open it.** Grepping
`lesson_resources` across `web/src/` returned nothing. The entitlement fix had
made the column properly gated and then no page read it, so a learner saw a title
and a button that recorded completion for material they could not reach. A course
you could finish without ever watching. Now `/learn/[enrolmentId]/lesson/[lessonId]`,
linked from the outline.

The interesting part is that an empty resource list has two meanings that look
identical in the data and mean opposite things: no materials attached, or no
entitlement. Rendering the same message for both would be a lie of omission, so
the page asks `can_access_lesson` and says which it is.

**Creating a billing account made you unable to use it.** `billing_accounts_insert`
allows `created_by = current_user_id()`, but every read of the account and every
write beneath it is gated on `is_billing_member()`, which consults
`billing_account_memberships` alone. Nothing inserted that row, and the policy
that would let someone add a member was itself gated on already being one.
Measured as a real authenticated user:

```
created account: 34fe18de-...
  can the owner READ their own new account? -> NO
  can the owner ADD THEMSELVES as a member? -> NO
  can the owner CREATE AN ORDER on it?      -> NO
```

No bootstrap, and no privileged escape hatch in the UI. An ordinary payer was
permanently locked out of paying, so no order could ever exist for
`record_payment_success()` to confirm. A trigger now makes the creator a member
at creation, scoped on the relationship rather than on whether the session is
privileged — that phrasing has already broken this suite once, because a
superuser fixture has no JWT claims and `is_privileged(null)` is false.

That broke 28 tests with one error, `duplicate key value violates unique
constraint "bam_one_per_user"`: the fixtures insert the creator's membership by
hand, asserting the same wrong assumption the entitlement fixtures did. All four
sites now use `on conflict do nothing`.

**A webhook payment has no human confirmer.** `orders_paid_has_evidence` required
a named actor, and `user_profiles.user_id` is a foreign key into `auth.users`, so
there is no system actor to name. Attributing it to the payer is worse than the
hack of inventing one: "who confirmed this payment?" would answer "the person who
paid it", which is the self-approval this schema forbids elsewhere — a refund
requester cannot approve their own refund. `governance_audit_events.actor` has
always been nullable for exactly this case, so the constraint was refined to
require evidence unconditionally and leave the privileged-actor rule where it is
actually enforced, in `record_payment_success()`. Verified both directions: a
verified event with a null actor confirms; an anonymous manual confirmation is
still refused.

**Then the checkout itself.** `/courses/[slug]/buy` → `POST /api/checkout` →
provider → `POST /api/payments/webhook`, plus `/orders`.

The client posts a price id and never an amount; the amount is resolved from the
`prices` row and the product behind it is checked against the version being
bought. A subscription price is refused rather than sold as a purchase, because
fulfilment grants a course version and a subscription has its own lifecycle.

`/orders` is the provider's return URL and it shows the database's status rather
than inferring success from having been redirected. Access opens when the webhook
lands.

The webhook is the one place that bypasses RLS, via a service-role client, because
a provider callback has no session and both `record_payment_success()` and
`payment_provider_events` would refuse it. The signature is the authorisation
instead, checked against the raw bytes before anything is parsed. The event is
persisted before the payment is applied, so a crash in between cannot confirm a
payment with no record of what confirmed it. Duplicate deliveries are
acknowledged rather than re-applied. Unknown event types return 200, because a 500
makes a provider retry forever.

12 unit tests for `createOrder`, aimed at the ways the money can go wrong — a
price for the wrong course, a dead price, one outside its window, a subscription
sold as a purchase, a line item that fails. One test needed the stub fixed rather
than the code: it could not model a failing write, so the error path was never
exercised and the test passed for the wrong reason.

**320 database tests, 37 unit tests, 32 routes.** Both new migrations were checked
for teeth by neutering them and counting failures, then restoring.

Still blocked on P12: the provider hand-off. Everything up to it and everything
after it is built and tested.

### Also done since: guardian verification, and a COPPA queue nobody could work

The verifiable-parental-consent machinery was complete and correct in SQL all
along: approving a case flips the relationship to active and stamps `verified_at`,
rejecting one revokes it and strips every capability. What was missing was
anything connecting the two halves. Measured:

```
parent creates guardian_relationship  -> allowed
parent creates verification case      -> refused (gvc_admin)
staff creates case and approves       -> works
...and there was no UI for any of it
```

So a request landed at `pending_verification` and stayed there forever, with no
queue for anyone to see. That matters legally rather than cosmetically: COPPA
requires verifiable parental consent before a US under-13 enrolls, and a consent
process nobody can action is not a consent process.

Now `/family/guardians` (ask) and `/admin/guardians` (the queue a person works),
both behind `family.guardian_verification`, off by default as decided. The
staff-only split on cases is deliberate and unchanged — "who may decide that this
adult is this child's parent" is a governance question, not a self-service one.
The gap was the UIs, not a loose policy.

**And a second finding while testing it.** `gr_insert` allowed a request whenever
the caller named themselves as guardian, which any session satisfies for any
child:

```
stranger files a guardian request -> ACCEPTED
  state: {"status":"pending_verification","unverified":true}
  is_verified_guardian_of(child) -> false
```

Not an access leak — the row is unverified and grants nothing, and the helper
correctly says false, which is why it went unnoticed. But it is an abuse vector on
a legal review queue: any signed-in account could queue unlimited claims against
any child, noise at best and a way to bury a real family's request at worst, in a
queue that then has to retain the junk.

20261029000300 drops the self-nomination branch. A family member may still
nominate themselves or another adult — which is how a parent adds a grandparent —
and privileged staff may do either. `is_learner_family_member()` excludes
billing-only members, unchanged and deliberate: paying is not parenting.

Both migrations checked for teeth by neutering them and counting failures, then
restoring.

Four of my own test bugs on the way, all from traps already recorded: fixtures
created inside `asUser()` roll back, so a later `guardian_verification_cases`
insert failed on a foreign key that no longer existed; a write proven by reading
it back afterwards proves nothing inside `asUser()` because the first error
aborts the transaction, so those assertions moved inside the block and read
`RETURNING`; and I invented `families.owner_user_id` and forgot
`fm_joined_when_active` needs `joined_at`.

Also worth recording: two COPPA-relevant screens were absent from the 50-screen
inventory entirely. Added as 19a and 19b rather than renumbering.

**329 database tests, 42 unit tests, 36 routes.**

### Also done since: no child could ever be enrolled

Screen 10 in the inventory was the learner switcher, marked "READY — not designed
anywhere". Building it turned up something worse than an undesigned screen.

A child is a `learner_profile` under a `family`, never a `user` (D2). A child
cannot sign in, so a child cannot enrol themselves. And `enrolInFreeCourse()`
always used the caller's own profile — so the only person who could enrol a child
was the parent, and the application never offered it. **No child could ever be
enrolled through the product**, with the family dashboard, the child profiles and
guardian verification all built around that missing step.

The database already permitted it, and I verified that before building anything:

```
parent ENROLs their child at the DB level -> YES
  free-enrolment entitlement granted      -> 1
  child can access the course             -> true
```

`course_enrolments_insert` is gated on `can_access_learner(learner_profile_id)`,
which covers family members. Same shape as the other four: the machinery was
right and nothing connected to it.

Now `/api/enrol` takes an optional `learnerProfileId`, and the enrol button asks
*who is learning?* when the account has children.

Accepting a client-supplied learner id is the kind of thing that needs saying out
loud, so: it is safe because the decision stays where it already lives. The
policy refuses an id the caller may not act for, and the route deliberately does
not re-implement `can_access_learner`. A second, weaker copy of an authorisation
rule is how the two drift apart. Four tests pin that boundary — an unrelated user
is refused, a billing-only family member is refused, and a refused enrolment
produces no grant.

One consequence I had to fix rather than ship: `/learn` reads enrolments with no
learner filter, so once children can be enrolled a parent's dashboard silently
mixes their courses with their children's. A parent opening a child's course
believing it was their own progress is a real confusion, not a cosmetic one, so
each card is now labelled with whose it is.

`enrollableLearners()` returns the caller plus the *child* profiles in their
families. Adult profiles are excluded because enrolling for another adult would
put one person's decisions on someone else's record. Billing-only members are
excluded by `is_learner_family_member()` — paying is not parenting.

Six database tests. One typing error of my own: building a PostgREST select by
string concatenation defeats its generated types, so the cast had to go through
`unknown` as the rest of the codebase does.

**335 database tests, 42 unit tests, 36 routes.**

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
