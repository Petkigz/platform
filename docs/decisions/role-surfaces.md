# Who sees what, and where each power stops

The owner's rule (2026-10-22): **a teacher signs in as a teacher, a scholar as a
scholar, the platform owner as the admin with every control, and a learner as a
learner — and each one's power ends exactly where their work does.** The second
half of the rule is that nothing routine may require SQL: every control a person
needs is a field or a button on their own screen.

This document is the map. It is not the enforcement — the enforcement is the
policy or function named in the last column, and that is what a bug report should
be checked against. A screen that hides a button is a convenience, never a
control.

| Person | Lands on | May do | May not do | Enforced by |
|---|---|---|---|---|
| **Visitor** | `/` | Browse the catalogue, course pages, teacher pages, plans, the policies that are in force, sign up | Anything that writes, or read anybody's data | `anon` role: no table grants, public policies only |
| **Learner** | `/learn` | Enrol (free), buy (checkout), learn, take assessments, keep notes, save courses, open support cases, write reviews, apply to be a reviewer, apply to teach, agree to a policy that asks for agreement | Open a course of their own, see another family's progress, see prices they are not offered, become a teacher by applying | `courses_insert` (instructor only), `entitlement` and `enrolment` policies, `can_read_*` predicates |
| **Guardian** (a learner with a family) | `/family` | Add child profiles, enrol them, see their progress, grant and revoke adult sharing | Act as the child (child login is a separate, flagged capability), read another family's children | `is_learner_family_member()`, `family_memberships` policies |
| **Teacher** | `/teach` | Open courses, author versions, upload media, publish through review, see cohort analytics, run their own promotions, read what they earn, ask to be paid | Create a course without the role; discount somebody else's course; publish without review; read a learner's data outside an opted-in cohort | `courses_insert`, `create_promotion_campaign()`, `can_write_course()`, `is_cohort_teacher()` |
| **Panel member** *(2026-10-27)* | `/panel` | Read the cases of panels they sit on, cast one vote per case, read the tally after voting | See another panel's cases, see how others voted before voting, vote twice, record the decision, seat anybody | `my_panel_work()` (own reviewer profile only), `cast_panel_vote()` (session-resolved reviewer, active seat, convened panel), no member read policy on `scholarly_panel_cases` |
| **Panel chair** *(2026-10-27)* | `/panel` | Everything a member may do, and record the panel's decision on a case they sit on | Decide without quorum, decide against the votes, decide a case of a panel they are not chair of | `decide_panel_case()` (chair of that panel, governance or owner; quorum and tally checked) |
| **Scholar** (reviewer) | `/review` | Apply to review, record qualifications, review what they are assigned, declare conflicts | Review without a verified qualification in the subject; assign themselves work; check somebody else's credential | `is_authorised_reviewer()`, `verify_reviewer_qualification()`, `cra_write` (staff only) |
| **Institution administrator** *(2026-10-26)* | `/institution` | Brand their institution, claim its domain, create and revoke its API keys, read a report of its own counts, appoint another administrator inside it | Appoint a teacher, publish a course, see a learner's name or a row per person, buy seats, move money, hold any platform staff power | `is_institution_admin()`, `institution_report_data()` (counts only), `can_appoint_teacher()` (does not consult this at all) |
| **Institution member** *(2026-10-26)* | `/institution` | Read the institution's name and its report, leave it | See the domain tokens, the key list or the branding fields | `my_institution()` returns domains and keys only to an administrator |
| **Governance staff** | `/admin` |  Check a reviewer's person, grant and withdraw review scopes, hear conflicts, run the reviewer register, read the policy register | Decide a credential (the owner, or a convened board), publish content themselves, publish a policy, change money | `record_reviewer_qualification()`, `set_reviewer_authorization()`, RLS on the register |
| **Support agent** | `/admin/support` | Read and answer support cases, triage reports and appeals | See passwords, change a payment, manage plans or promotions, appoint a teacher | `is_privileged()` plus the money-family policies that exclude support |
| **Finance staff** | `/admin/orders` | Adjust orders, reconcile payments, see the money report, manage refunds, work the payout queue, set the refund hold | Publish courses, decide credentials, create promotions | `add_order_adjustment()`, `is_finance()` predicates |
| **Platform owner** | `/admin` | Everything: flags, roles, plans and prices, promotions, credentials, publish a policy version with its date and a written reason, merchants and keys in the deployment's environment (never in a screen), open an institution and name its first administrator | Nothing is above them; the record in `DECISIONS.md` is what constrains the use of that power | `platform_admin` in `has_role()`, owner-only triggers |

## The three boundaries that were leaks

1. **A learner could open a course.** `courses_insert` allowed any signed-in
   person to insert a course attributed to themselves, and `/teach` did not ask
   for a role. Teaching is an appointment, so the policy now requires
   `instructor` or `platform_admin`, and the teaching page says what the area is
   for instead of showing a form that cannot work.
   `20261237000100_role_boundaries.sql`. *(2026-10-26)* **Asking is now possible,
   and the boundary is unchanged.** `/teach` says how to apply and links to
   `/teach/apply`; `submit_teaching_application()` writes one row and grants
   nothing, and the appointment itself is `decide_teaching_application()`, which
   is `can_appoint_teacher()` — the owner or governance. A support agent can no
   more appoint a teacher than they could before, and a learner who submits an
   application still cannot insert a course.

2. **A teacher could not see their own campaign's usage**, which made the
   `per-family` limit unobservable. Campaign owners can now read the redemptions
   of their own campaigns — and no others. Same migration.

3. **Promotions had writers and no screens**, so the only way to run an offer was
   SQL. `/admin/promotions` and `/teach/promotions` now create, switch on, pause,
   archive and re-limit a campaign with form fields. `web/src/lib/promotions.ts`
   holds the validation and the sentences; the database still decides who may do
   what.

4. **The staff console offered work to people who would be refused for it.** A
   support agent saw a revenue-share field, ninety feature switches and a wall of
   money links; the queues above them were already filtered in the database, so
   the page was honest about the counts and careless about the doors. `/admin`
   now groups its links by whose work they are, using the three booleans
   `staff_attention()` already returned, and the switchboard — the flag register
   and the revenue share — is rendered only for the platform admin. Behind the
   screen, `platform_settings_authority_guard` refuses any other account writing
   a switch, so the page and the table now say the same thing.

5. **A finance-only or support-only login landed on `/learn`.** `homeFor()` asked
   about the owner, the board, the teacher and the reviewer, and fell through to
   the learner page for everybody else — so the one staff member who most needs a
   "what is waiting" list was shown a catalogue. Both are staff, and both now
   land in the console, filtered to their own queues and their own links.

## What is deliberately not done yet

**The masthead is the same for everybody.** It lists Catalogue, My learning, My
family, Plans, Subscriptions, Teach, Review and Certificates whether you are a
visitor or the owner. Making it change per role means reading the session in the
layout, which makes every page dynamic — a real cost paid on every request to
hide links that already lead to a page which explains itself. The better version
of this is a **role landing page after sign-in** (`/learn` for a learner,
`/teach` for a teacher, `/admin` for the owner, `/review` for a scholar), which
is the next piece of UI work rather than a change to the header.

**A scholar has no home of their own yet.** `/review` is a working queue and
register, but a scholar is not told "you have three reviews waiting" on the way
in. That belongs with the landing page above.

**Nothing here is a substitute for the policies.** If a screen and a policy
disagree, the policy is right and the screen is a bug — `authorization.test.mjs`
and the suite per feature are where that is caught.

## Where an institution's power stops — **2026-10-26**

An institution administrator is the first role on this map that is **not staff**.
They hold a membership row, not a platform role, and the difference is the whole
point: a madrasah's head teacher may brand their institution and read a count of
its people, and may not do one thing more.

**What they may do:** set a display name, a tagline, one of five tones and an
https logo link; claim a domain and publish the TXT record; create and revoke API
keys; read a report of counts; appoint another administrator inside their own
institution; leave.

**What they may not do, and what refuses it:**

| Attempt | Refused by |
|---|---|
| Appoint a teacher | `can_appoint_teacher()` names the owner and governance — an institution administrator is never consulted |
| Publish a course | `courses_insert` requires `instructor` or `platform_admin`; authorship is a teaching appointment |
| See a learner's name | `institution_report_data()` counts profiles and returns no id, name or email; the test asserts it over the whole JSON |
| Read a member's email | `my_institution()` returns a membership list to nobody — only aggregates |
| Buy seats | `commerce.institutions` is off; there is no invoicing, no purchase order and no bulk enrolment |
| Move money | Every money writer is gated on `finance_admin` or `platform_admin` |
| Verify their own domain | `verify_institution_domain()` requires `platform_admin` or `governance_admin` — claiming and checking are deliberately different people |

**Claiming and checking are two people.** The administrator proves control of the
domain by publishing a token; a staff member records that they looked. One person
holding both halves would make "verified" mean "typed their own domain", which is
precisely the badge that is supposed to mean something.

**A key is a credential, not a role.** It reads one payload — the same counts the
screen prints — with a per-key hourly ceiling, and it can do nothing else. There
are no webhooks: nothing on this platform calls out to an institution, and the
page says so rather than implying an integration exists.

---

## Publishing a policy is one person's act; reading it is everybody's

The register is a screen like any other, and the powers are split the way the work
is: an account reads the documents and agrees to the ones that ask for it, staff
can see where every document stands, and only the owner can make one binding.

| Attempt | Refused by |
|---|---|
| Publish a version that still marks an owner decision | `approve_policy_version()` raises `policy:decisions_open`, and the refusal names how many remain |
| Publish without saying why | The same function: the reason is part of the version, not a note beside it |
| Publish as governance staff | The same function checks `platform_admin`; the screen hides the controls rather than showing a button that always fails |
| Edit the text of a version in force | `freeze_policy_version()`, a trigger — the acceptance rows point at that exact text |
| Delete a version that was ever in force | `keep_policy_history()`; retiring is how it leaves the front page |
| Have two versions of one document in force | `policy_versions_one_live`, a partial unique index |
| Accept on somebody else's behalf | There is no insert policy on `policy_acceptances`; only `accept_policy()` writes, and it reads the session rather than the request |
| Accept a version the reader is not looking at | `accept_policy()` takes a **slug** and resolves the live version itself; a version id never crosses the wire |
| Show a draft as though it were a term | `policy_page()` returns null unless something is in force; the page says "not in force yet" instead |

**The one thing no screen can do is answer for the owner.** The markers in the text
are not a to-do list the platform can tick: governing law, the named controller,
the supervisory authority, the screening standard and the copyright agent are
decisions about a real organisation. Until they are written in, the documents are
readable, versioned and honest, and they bind nobody.
