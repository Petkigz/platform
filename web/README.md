# AyahSpring web

Next.js 16 + TypeScript + Supabase Auth. The first application layer above the
88-table database.

## Setup

```bash
npm install                 # from the repository root
cp web/.env.example web/.env.local
npm run dev                 # http://localhost:3000
```

Set both variables in `web/.env.local`:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |

The anon key is safe to ship to the browser. It is not a secret in the
meaningful sense — row level security is what protects the data, and every one
of the 88 tables has it enabled. What must never be committed is the
`service_role` key, and nothing in this app uses it.

`NEXT_PUBLIC_ALLOW_MISSING_SUPABASE=1` lets `next build` run without a live
project, so CI can verify the build. Never set it in production.

## Scripts

```bash
npm run dev         # dev server, bound to 0.0.0.0:3000
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run test:web    # unit tests (E.164 phone handling)
npm run test:db     # migration suite, from the repository root
npm run test        # both
```

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | dynamic | Landing, subject chips, plus a notice when Supabase is not configured |
| `/catalogue` | dynamic | Search, subject filter, audience filter |
| `/courses/[slug]` | dynamic | Course page with its outline |
| `/sign-in` | static | Email+password **and** phone OTP (D3) |
| `/sign-up` | static | Account creation |
| `/auth/confirm` | dynamic | Supabase email confirmation and magic links |
| `/learn` | dynamic | The authenticated screen, reading through RLS |
| `/api/enrol` | dynamic | POST. Free enrolment only |
| `/courses/[slug]/buy` | dynamic | Checkout: pick a price, pay |
| `/api/checkout` | dynamic | POST. Create a pending order, hand off to the provider |
| `/orders` | dynamic | Order history and payment status |
| `/api/payments/webhook` | dynamic | POST. Provider callback. Signature-verified |
| `/family/guardians` | dynamic | Request guardian access to a child |
| `/api/family/guardians` | dynamic | POST. File a guardian request |
| `/admin/guardians` | dynamic | Guardian verification queue. Privileged only |
| `/api/admin/guardians` | dynamic | POST. Decide a case |
| `/admin/discussion` | dynamic | Moderation queue. Privileged only |
| `/api/admin/discussion` | dynamic | POST. Approve, hide or remove |
| `/api/discussion` | dynamic | POST. Ask or reply in a lesson thread |
| `/admin/refunds` | dynamic | Refund queue. Privileged only |
| `/api/admin/refunds` | dynamic | POST. Approve or decline |
| `/api/refunds` | dynamic | POST. Request a refund on an order |
| `/learn/[enrolmentId]` | dynamic | Course view: outline and mark-complete |
| `/learn/[enrolmentId]/lesson/[lessonId]` | dynamic | One lesson and its materials, gated by entitlement |
| `/api/progress` | dynamic | POST. Record lesson progress |
| `/learn/[enrolmentId]/assessment/[assessmentId]` | dynamic | Take an assessment |
| `/api/assessment` | dynamic | POST. start / answer / submit |
| `/admin` | dynamic | Feature flags. Privileged only |
| `/api/admin/flags` | dynamic | POST. Flip a flag |
| `/family` | dynamic | Children and their progress |
| `/api/family/children` | dynamic | POST. Add a child |
| `/teach` | dynamic | My courses, create a course |
| `/teach/[courseId]` | dynamic | Curriculum editor |
| `/api/teach` | dynamic | POST. create / add section / add lesson / transition |
| `/certificates` | dynamic | Certificates I hold |
| `/verify/[number]` | dynamic | **Public.** Verify a certificate by number |
| `/review` | dynamic | Review queue |
| `/review/[assignmentId]` | dynamic | One assignment, with the outline under review |
| `/api/review` | dynamic | POST. respond / decide |
| `/admin/reviews` | dynamic | Assign reviewers. Privileged only |
| `/api/admin/reviews` | dynamic | POST. Assign a reviewer |
| `/sign-out` | dynamic | POST only |

## The theme is white and green

Recorded in `DECISIONS.md`. Every colour lives in the `:root` block of
`src/app/globals.css` — change the brand there and nowhere else. The green is
deep and desaturated (`#0b6b3a`) rather than bright: on a white field a
saturated green vibrates, and this is a product people read for long stretches.

The masthead mark is an eight-point star in `clip-path`, the simplest unit of
Islamic geometric pattern and abstract enough to carry no imagery. The hero
lattice is two rotated `repeating-linear-gradient`s behind a radial mask —
crisp at any DPI, no image request.

## Why `/learn` has no `where` clause

```ts
const { data: enrolments } = await supabase
  .from('course_enrolments')
  .select('id, status, enrolled_at, courses ( title ), course_versions ( version_number, language )')
  .order('enrolled_at', { ascending: false });
```

There is deliberately no filter naming the current learner. The request carries
the user's JWT, so PostgreSQL applies `course_enrolments_read` and returns only
the rows that policy allows. Adding a client-side filter would look safer and
actually be worse: it would hide a broken policy instead of exposing it.

`supabase/tests/app.test.mjs` pins this contract against the real engine — a
learner sees their own enrolments, a second learner sees a different set, and
an anonymous visitor sees none.

## Two things to know about the auth wiring

**The middleware must be awaited.** `updateSession()` refreshes the token on
every request. If that is skipped, a refresh token that rotated while the user
was idle leaves the next Server Component holding an expired JWT — and RLS then
returns zero rows rather than an error. That failure looks exactly like "my
courses disappeared", which is much harder to debug than a 401.

**Cookies in a Server Component are read-only.** `setAll()` swallows the
exception on purpose; the middleware owns session refresh.

## E.164

D3 stores phone numbers in E.164. `src/lib/phone.ts` normalises at the
boundary, and it refuses to guess a country code for a bare local number —
guessing is how an OTP reaches the wrong country. Seven unit tests cover it,
including that refusal.

## Money and payments

D4 forbids floating-point amounts, so `src/lib/money.ts` uses `bigint` minor
units and rejects a fractional value rather than truncating it. JSON has no
bigint, so the wire form is a string.

No payment provider has been chosen. `src/lib/payments/provider.ts` is the
interface an adapter must satisfy, and `UnconfiguredPaymentProvider` is the
implementation that says no. It is not a stub awaiting deletion — an
unconfigured deployment must keep behaving that way, so the failure is a
sentence rather than a null dereference.

`/api/enrol` therefore enrols free courses and returns `402 payment_required`
for paid ones.

## The answer key

`assessment_questions.answer_key` is protected by **column privileges**, not
RLS, because RLS cannot hide a column. There is deliberately no table-level
grant, so `SELECT *` is refused outright rather than returning the granted
columns. Never write `select('*')` against that table — name the columns.

The key has no read path in the application at all, for any role including
`platform_admin`. `grade_response()` is its only reader.
`supabase/tests/assessment.test.mjs` asserts all three of those.

## Reviewing

Assignments are created by platform staff and cannot be self-claimed
(`cra_write` is privileged only). A reviewer accepts or declines, then records
`approved`, `revision_requested`, or `rejected` with a mandatory rationale —
required for approvals too, because that row is what a teacher appeals
against.

`validate_review_decision()` requires a decision's version and scope to match
its assignment, and that `decided_by` is the reviewer the assignment names. It
is a trigger rather than a policy because a SECURITY DEFINER function bypasses
RLS but not triggers.

A reviewer cannot verify themselves. `protect_reviewer_verification()` refuses
a self-service write that would set `reviewer_status` to `active` or
`suspended`, or record `verified_at` / `verified_by`. Applying as an
`applicant` still works; only staff can move a profile past that.

Assignments are created only from `/admin/reviews`. A reviewer has to create
their own profile before they can be assigned one —
`reviewer_profiles_insert` admits only `user_id = current_user_id()`, so staff
cannot make one for them.

A decision's version and scope are read back from the assignment, never taken
from the request body. Recording a decision and moving the version are separate
acts: if the transition fails the decision stays recorded and the API says so.

An assigned reviewer can read what they were asked to review — that was a real
defect before `20261021000100_authz_fixes.sql` — and never write to it.

## Certificates

`/certificates` lists what a learner holds; `/verify/<number>` is public and
needs no account.

The privacy design is two halves that only work together. `certificates_read`
is authenticated-only, so nobody can enumerate certificates. But
`verify_certificate()` is granted to `anon`, so anyone holding a number can
check it. **The number is the capability.** If the read policy is ever opened
up, the public verification page becomes a directory of every learner on the
platform.

Every field on a certificate is a snapshot taken at issue time — course title,
version, holder name, and the criteria that applied — and
`protect_certificate_snapshot()` keeps it that way. Renaming a course
afterwards cannot rewrite what someone was awarded.

Issuing is staff-only, requires the completion policy to enable certificates,
requires the enrolment to be complete, and is idempotent.

## Teaching

A teacher creates a course, builds its outline, and submits it for review.
Approving belongs to a reviewer and publishing to a platform admin; the
transition table refuses the author regardless of what the client sends, and
the actor passed to `set_course_version_status()` comes from the session rather
than the request body.

A published version renders read-only. D5 freezes the whole version subtree on
publication, so changes go into a new version rather than into what people
already paid for.

Worth knowing: the write policies on `course_sections` and `lessons` are
phrased as `can_read_version()`, which is true for any signed-in user on a
published version. What actually stops a learner from injecting content is the
D5 lock trigger, not the policy. The tests assert the behaviour, not the policy
shape.

## Entitlement

`entitlement_grants` is the only thing consulted at access time. Two writers
create rows:

- a **free enrolment** on an unsold version grants access to it (trigger on
  `course_enrolments`)
- a **confirmed payment** grants what was bought, then enrols the buyer
  (inside `record_payment_success()`)

Grant first, enrolment second: `can_enrol_in_version()` requires an existing
entitlement before a sold version may be enrolled in.

Being signed in is not access. `lesson_resources_read` requires entitlement, so
a signed-in stranger sees only resources classified `public_preview`.

## Opening a lesson

`/learn/[enrolmentId]/lesson/[lessonId]` is the first place the entitlement work
is visible to a learner. Two things are decided independently there, and the
difference is deliberate:

- the **lesson row** is readable by anyone who can read the version, so the
  title and description appear before purchase — that is how a catalogue
  preview works
- the **resources** are gated on entitlement, so a signed-in visitor who has not
  bought the course gets only those classified `public_preview`

An empty resource list therefore has two meanings that look identical in the
data and mean opposite things: no materials attached, or no entitlement. The
page asks `can_access_lesson` explicitly so it can say which one it is, rather
than showing "no materials" to someone who simply has not paid.

`media_asset_id` is deliberately not resolved to a playable URL. D8 keeps
masters in our own storage with Stream for delivery only, and signing a delivery
URL is a server-side act with its own credentials. The page says playback is not
wired up rather than rendering a link that goes nowhere.

## Checkout and the payment webhook

`/courses/[slug]/buy` → `POST /api/checkout` → provider → `POST /api/payments/webhook`.

**The client never supplies an amount.** The form posts a price id; the amount is
resolved server-side from the `prices` row. `createOrder` then checks that the
product behind that price actually sells the version being bought, so a valid
price id for one course cannot be posted while buying another. A checkout that
accepts a posted total is a checkout where the total is whatever the caller typed.

A subscription price is refused here rather than sold as a purchase. Fulfilment
reads `order_items` and grants a course version; a subscription has its own
lifecycle and expiry, and `record_payment_success()` does not create one. Taking
the money would grant nothing, or worse, grant forever.

**Returning from a payment screen is not confirmation.** `/orders` is the return
URL, and it shows the database's status rather than inferring success from having
been redirected. Access opens when the webhook lands. The page says so, because
the alternative is a green tick that turns out to be wrong.

**The webhook is the only place that bypasses row level security.** It uses
`createAdminClient()` (service role) because a provider callback has no user
session, and both `record_payment_success()` — revoked from `anon` — and
`payment_provider_events` — `staff_only()` on read and write — would refuse it.
The provider's signature is the authorisation instead, and it is checked against
the raw request bytes before anything is parsed or written. An unconfigured
provider verifies nothing, so an unconfigured deployment refuses every callback.

The event is persisted **before** the payment is applied. Reversing that would
allow a crash in between to confirm a payment with no record of what confirmed
it, which is exactly what `payment_evidence` exists to prevent. Duplicate
deliveries are acknowledged rather than re-applied: `payment_provider_events` is
unique on `(provider, provider_event_id)`.

An unknown event type returns 200, not 500. Providers add event types; a 500
makes them retry forever and every retry is a failed request in the logs.

**A webhook payment has no human confirmer.** `orders.payment_confirmed_by` is a
foreign key into `auth.users`, so there is no system actor to name — and naming
the payer would be the self-approval this schema forbids elsewhere (a refund
requester cannot approve their own refund). `governance_audit_events.actor` has
always been nullable for exactly this case, so
`20261029000200_system_payment_confirmer.sql` refines `orders_paid_has_evidence`
to match: **every paid order must have evidence**, and the privileged-actor
requirement for a manual confirmation stays where it is actually enforced, in
`record_payment_success()`. That function still refuses an anonymous manual
confirmation, because `is_privileged(null)` is false.

## Payment attempts

Every hand-off to a provider writes a `payment_attempts` row **before** the call,
not after — writing it afterwards would lose exactly the attempts that matter,
the ones where the call threw. Nothing wrote to this table before, so a payer who
hit checkout and went nowhere left no trace: the order sat at `pending_payment`
and support could not tell "never tried" from "tried three times and the provider
kept failing". Both look identical in `orders`.

The `idempotency_key` is why this is not just a log line. It is what a provider
deduplicates on, so a payer who presses the button twice sends the same key
rather than minting a second charge. It is `<orderId>:<sequence>`, and the unique
index on `(order_id, idempotency_key)` enforces that it is not reused by
accident.

The method is recorded honestly: `mobile_money` only when a handset number was
supplied, otherwise null. Until a provider is chosen there is no way to know what
the payer will end up using, and guessing `card` would put a falsehood in a
support-facing record.

The webhook closes the attempt. `resolved_at IS NULL` is enforced by a CHECK to
hold exactly when the status is still open, so both move together or the row is
refused, and only open attempts are matched, so a replay cannot rewrite a settled
one.

## Guardian verification

Verifiable parental consent — what COPPA requires before a US under-13 enrolls,
which is what this machinery was built for. Kept complete and behind
`family.guardian_verification`, off by default, to be enabled before any US child
enrolls.

`/family/guardians` lets an adult ask; `/admin/guardians` is the queue a person
works. The split is deliberate: `gvc_admin` keeps `guardian_verification_cases`
to governance and platform admins, because "who may decide that this adult is
this child's parent" is a governance question, not a self-service one. What was
missing was the two UIs, not a looser policy.

A request always lands at `pending_verification`. The table refuses an `active`
relationship without `verified_at`, and only a reviewer's decision sets it, so
there is no path from a request to access. Approving stamps it; rejecting or
revoking strips every requested capability, so a rejected adult does not keep the
access they were refused.

The reviewer is taken from the session, never the body — a consent record that
lets the caller name the decider is not a consent record. And `reviewed_at` is
set server-side, because the table requires it not to precede `submitted_at` and
a skewed browser clock would fail that in a way nobody could diagnose.

`gr_insert` no longer allows self-nomination by an unrelated user. Before
20261029000300, any signed-in account could file a claim against any child; it
granted nothing, but it filled the consent queue — which has a retention
obligation attached — with junk. A family member may still nominate themselves or
another adult, which is how a parent adds a grandparent.

## Who is learning

A child is a `learner_profile` under a `family`, never a `user` (D2). So a child
cannot sign in and cannot enrol themselves — which means the parent has to be
able to, and for most of this project the application never asked.
`enrolInFreeCourse()` always used the caller's own profile, so no child could
ever be enrolled through the product, despite the family dashboard and guardian
verification both existing.

The database already permitted it: `course_enrolments_insert` is gated on
`can_access_learner(learner_profile_id)`, which covers family members. Verified
end to end before building anything — a parent enrolling a child grants the child
an entitlement and the child can access the course.

So `/api/enrol` now accepts a `learnerProfileId`, and the enrol button asks *who
is learning?* when the account has children. The id comes from the client, and
that is safe only because the decision stays where it already lives: the policy
refuses an id the caller may not act for. This route does not re-implement
`can_access_learner` — a second, weaker copy of an authorisation rule is how the
two drift apart.

`/learn` labels each course with whose it is. That is not decoration: once a
parent can enrol a child, their dashboard legitimately holds both, and showing
them undifferentiated would let a parent open a child's course believing it was
their own progress.

`enrollableLearners()` returns the caller's own profile plus the *child* profiles
in their families. Adult profiles are excluded on purpose — enrolling for another
adult would put one person's decisions on someone else's record. Billing-only
family members are excluded too, by `is_learner_family_member()`: paying is not
parenting.

## Refunds

A customer asks, a person decides, the provider settles. Those are three
separate steps and the schema keeps them apart, because D4 (frozen) is explicit
that **a refund request is not a completed refund**.

`request_refund()` creates a request and moves no money. `decide_refund_request()`
approves or declines; approving creates a refund transaction in `pending`, which
is still not a payment. `complete_refund()` settles it against a verified
provider event or by a privileged actor, and only then does
`record_refund_in_ledger()` write the debit, link it back to the request, and
move the order to `partially_refunded` or `refunded`.

Collapsing any two of those would mean money moving on a decision rather than on
a confirmation — and the ledger is append-only, so there is no undo.

Two things worth stating because they are easy to lose:

* **Nobody can approve a refund they requested.** `rr_not_self_approved` forbids
  it and the function says so in words, so the customer-facing and staff-facing
  message is the reason, not a raw constraint name.
* **`complete_refund()` takes the actor as a parameter**, as
  `record_payment_success()` does. A webhook arrives on the service role where
  there are no JWT claims, so reading the session would either reject every
  provider confirmation or need an exemption for "no JWT subject" — the shape of
  trigger that has already caused two incidents here.

## Discussion

Per-lesson questions and answers, behind `learning.discussion` (off by default).

The moderation rule was settled before the tables were written, because
pre-moderation and post-moderation need different schemas: **a post by the course
author or by staff is visible immediately; anything a learner writes — a question
or a peer's answer — is held until a person approves it.** Peers may answer each
other, but a peer answer is a learner post, so it is held too. That is what makes
"peers may answer" safe on a platform teaching faith to children.

**The rule is enforced by a trigger, not by the application.** `apply_discussion_moderation()`
computes who the author is from the course version and *overwrites* whatever
`visibility_state` the request supplied. A moderation model that trusts the client
is not a moderation model — and a second copy of the rule in TypeScript would be
the weaker one, which is how the two drift apart.

Three constraints back it up, so the rule survives a future edit:

- `dp_learner_needs_moderator` — a learner's post cannot reach any state other
  than `pending` without a named moderator. This is the load-bearing one;
  without it, "held until approved" is a convention rather than a rule.
- `dp_teacher_never_pending` — an authority post is never held.
- `dp_hidden_needs_reason` — withdrawing something needs a written reason.

The flag is checked in the trigger as well as in the UI, so the feature is
genuinely off until it is enabled rather than off only in the interface.

A learner sees their own held post and nobody else's, so "where did my post go?"
has an answer without turning the queue into a public list. Editing is allowed
only while a post is still held — otherwise "reviewed before publishing" is
defeated by editing afterwards.

The author is always the session. The trigger overwrites `author_user_id`
whenever there is a JWT subject; it does not do so unconditionally, because
`current_user_id()` is null for a superuser fixture and blanking the author there
would be wrong. There is no request path where an anonymous caller reaches the
trigger: the insert policy is restricted to `authenticated`.

Moderation goes through `moderate_discussion_post()`, not a bare UPDATE, so every
decision lands in the governance audit trail with who made it and when.

## Families and children

A child is a `learner_profile` under a `family`, never a `user` (D2). No
email, no password, no date of birth — an age band instead. Adding a child
asks for a name and an age band, and the database does the enforcing:
`lp_children_need_age_band`, `lp_no_child_login_yet`, and `lp_insert`
requiring active family membership.

`/family` filters nothing by user. RLS decides, so a family member whose
membership is billing-only sees the family and none of its children.

One trap worth knowing: a SELECT policy is applied to an `INSERT ... RETURNING`
result, so a policy that resolves the row by joining back through the same
table will refuse the read-back of a row that was just inserted. Prefer a
predicate that reads the new row's own columns.

## Feature flags

Every feature is built and shipped off. `/admin` is where they get turned on.

Flags come in three gates, recorded in `platform_settings.gate_type`:

| Gate | Meaning |
|---|---|
| `admin` | Pure runtime toggle. Flip it. |
| `admin_setup` | Toggle exists, but external setup must finish first. |
| `code` | Needs a deploy. **Cannot be enabled at runtime.** |

A `code` flag being unflippable is enforced by `reject_code_flag_enablement()`
in the database, not by the UI hiding the switch. A UI that hides something is
not a control. A migration can still enable one by setting
`app.bypassing_code_flag = 'on'`.

Gate a feature with `isFlagEnabled(supabase, 'learning.discussion')`, which
calls `setting_bool()` — readable by any role, unlike the table itself.

## Not built yet

Admin dashboard · checkout · mobile · logo and type (colour is settled).
