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
| **Visitor** | `/` | Browse the catalogue, course pages, teacher pages, plans, sign up | Anything that writes, or read anybody's data | `anon` role: no table grants, public policies only |
| **Learner** | `/learn` | Enrol (free), buy (checkout), learn, take assessments, keep notes, save courses, open support cases, write reviews, apply to be a reviewer | Open a course of their own, see another family's progress, see prices they are not offered | `courses_insert` (instructor only), `entitlement` and `enrolment` policies, `can_read_*` predicates |
| **Guardian** (a learner with a family) | `/family` | Add child profiles, enrol them, see their progress, grant and revoke adult sharing | Act as the child (child login is a separate, flagged capability), read another family's children | `is_learner_family_member()`, `family_memberships` policies |
| **Teacher** | `/teach` | Open courses, author versions, upload media, publish through review, see cohort analytics, run their own promotions, read what they earn, ask to be paid | Create a course without the role; discount somebody else's course; publish without review; read a learner's data outside an opted-in cohort | `courses_insert`, `create_promotion_campaign()`, `can_write_course()`, `is_cohort_teacher()` |
| **Scholar** (reviewer) | `/review` | Apply to review, record qualifications, review what they are assigned, declare conflicts | Review without a verified qualification in the subject; assign themselves work; check somebody else's credential | `is_authorised_reviewer()`, `verify_reviewer_qualification()`, `cra_write` (staff only) |
| **Governance staff** | `/admin` | Check a reviewer's person, grant and withdraw review scopes, hear conflicts, run the reviewer register | Decide a credential (the owner, or a convened board), publish content themselves, change money | `record_reviewer_qualification()`, `set_reviewer_authorization()`, RLS on the register |
| **Support agent** | `/admin/support` | Read and answer support cases, triage reports and appeals | See passwords, change a payment, manage plans or promotions | `is_privileged()` plus the money-family policies that exclude support |
| **Finance staff** | `/admin/orders` | Adjust orders, reconcile payments, see the money report, manage refunds, work the payout queue, set the refund hold | Publish courses, decide credentials, create promotions | `add_order_adjustment()`, `is_finance()` predicates |
| **Platform owner** | `/admin` | Everything: flags, roles, plans and prices, promotions, credentials, merchants and keys in the deployment's environment (never in a screen) | Nothing is above them; the record in `DECISIONS.md` is what constrains the use of that power | `platform_admin` in `has_role()`, owner-only triggers |

## The three boundaries that were leaks

1. **A learner could open a course.** `courses_insert` allowed any signed-in
   person to insert a course attributed to themselves, and `/teach` did not ask
   for a role. Teaching is an appointment (`teaching.applications` ships off and
   the cohort is curated), so the policy now requires `instructor` or
   `platform_admin`, and the teaching page says what the area is for instead of
   showing a form that cannot work. `20261237000100_role_boundaries.sql`.

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
