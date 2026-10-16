# Authorization matrix

Closes the roadmap item *"List all user roles and permissions — the permission
matrix is still incomplete"* (`authorization_matrix: incomplete`).

Every line below was read out of the migrations, not written from intent. The
suite that enforces it is `supabase/tests/authorization.test.mjs`, which is the
machine-readable form of the ten required access tests named in the project
record at `security_privacy_authorization.required_access_tests`.

```
npm run test:db     # 190 tests, suite `authorization`
```

---

## The model is capability-based, not role-based

This is the thing that made the matrix hard to write down, and it is the reason
a grep for role names finds almost nothing.

**Only two of the ten roles appear in any RLS policy by name** —
`platform_admin` (3 tables) and `governance_admin` (1 table). The other eight
never appear. They are enforced through **capability functions** that ask a
question about a specific row: *are you this learner's guardian? are you a
member of this billing account? were you assigned to review this version?*

That is deliberate and it is the better design. A role check answers "what kind
of person are you"; a capability check answers "what may you do to **this
row**". The second one cannot be satisfied by accumulating titles.

The consequence is that the matrix cannot be read off the policies. This
document is the translation layer.

---

## Roles

Seeded in `20261015000800_seed.sql`. Four are privileged.

| Role | Privileged | Grant |
|---|---|---|
| `learner` | no | Adult learner with their own account |
| `guardian` | no | Manages child profiles they are verified for |
| `billing_manager` | no | Handles payment for a family. **No automatic access to learning data** |
| `instructor` | no | Authors and publishes courses |
| `reviewer` | no | Reviews submitted content within authorised subjects |
| `scholarly_panel_member` | no | Dormant — see DECISIONS P6 |
| `support_agent` | **yes** | Support cases. Least privilege |
| `governance_admin` | **yes** | Content governance, suspension, guardian decisions |
| `finance_admin` | **yes** | Refunds, reconciliation, payment administration |
| `platform_admin` | **yes** | Full administrative access |

`is_privileged` is what `staff_only()` returns, and it is the gate on the
financial tables that belong to nobody in particular.

---

## Capability functions

These are the actual units of authorization. All are `SECURITY DEFINER`,
`STABLE`, pinned to `search_path = public`, and read-only — they can be used to
ask a question but never to escalate.

| Function | Question it answers |
|---|---|
| `has_role(user, code)` | Holds an unrevoked assignment of that role code |
| `is_privileged(user)` | Holds any unrevoked privileged role |
| `staff_only()` | `is_privileged(current_user)` |
| `is_own_learner_profile(learner)` | This learner profile is linked to my account |
| `is_learner_family_member(learner)` | Active family member, **excluding billing-only** |
| `is_verified_guardian_of(learner)` | Active verified guardian relationship |
| `is_active_family_member(family, user)` | Any active membership, regardless of type |
| `is_family_owner(family, user)` | Active membership of type `owner` |
| `is_enrolled_in_version(version)` | Live enrolment pinned to this exact version |
| `can_author_version(version)` | Version author or privileged |
| `can_review_version(version)` | Assigned to review this version — **read only** |
| `can_read_version(version)` | Published/retired to all; drafts to author and privileged |
| `can_write_course(course)` | Course author or privileged |
| `can_see_review_of(version)` | Author, enrolled learner, assigned reviewer |
| `can_access_learner(learner)` | Self, family member, verified guardian with progress permission, or privileged |
| `is_billing_member(account)` | Member of the billing account, or staff |

---

## Who can do what

### Learning data

| Actor | Own profile | Child in family | Enrolments / progress / results / certificates |
|---|---|---|---|
| Adult learner | yes | — | own only |
| Family `owner` | yes | yes | yes |
| Family `guardian` member | yes | yes | yes |
| **Family `billing_manager`** | yes | **no** | **no** |
| Verified guardian (not a family member) | no | yes | **only with `can_view_progress`** |
| Unverified guardian | no | no | no |
| Revoked guardian | no | no | no |
| Unrelated adult | no | no | no |
| Anonymous | no | no | no |
| Any privileged role | yes | yes | yes |

Paying for a family is not parenting it. A `billing_manager` family member sees
invoices and nothing about the children. A verified guardian sees the child's
identity, and their grades only where the relationship carries
`can_view_progress`.

### Content

| Actor | Published version | Draft version |
|---|---|---|
| Anonymous | yes (preview lessons only) | no |
| Any signed-in user | yes | no |
| Enrolled learner | yes, that pinned version | no |
| Author | yes | yes, and writes |
| **Assigned reviewer** | yes | **yes, read only** |
| Unassigned reviewer | yes | no |
| Privileged | yes | yes |

An assigned reviewer can read the content under review but cannot edit it.
`can_review_version()` is wired into the four SELECT policies only; the write
and update policies still use `can_read_version()`.

### Money

| Actor | Billing account | Orders | Ledger / refunds / payouts |
|---|---|---|---|
| Billing account member | yes | yes | no |
| Family `billing_manager` (no billing membership) | no | no | no |
| Instructor | no | no | own earnings only |
| `finance_admin` | yes | yes | yes |
| Other privileged | yes | yes | yes |

---

## The three defects this suite found

All three are fixed in `20261021000100_authz_fixes.sql`, deliberately as a new
migration rather than edits to Groups 1 and 2, so the history of how the schema
got here stays readable.

**1. A family `billing_manager` could read the children's profiles.**
`is_learner_family_member()` delegated to `is_active_family_member()`, which
ignores `membership_type` by design. So paying for the family granted sight of
the children — contradicting the seeded role description and required access
test 5. Fixed by excluding billing-only memberships from the learner path.

**2. An assigned reviewer could not read the content they were asked to
review.** `can_see_review_of()` covers the review tables; `can_read_version()`
covers the content and admitted only published versions, the author and
privileged roles. A reviewer opened the assignment and saw an empty page. The
review workflow was structurally unusable. Fixed by adding
`can_review_version()` to the four SELECT policies.

**3. A verified guardian could not see the child they were verified for.**
Neither `lp_read` nor `can_access_learner()` consulted
`guardian_relationships` at all. The verification workflow moved a relationship
to `active` and set `can_view_progress`, and then nothing read those columns.
Since `can_access_learner()` is the single gate behind 13 policies covering
enrolments, progress, attempts, responses, certificates, allocations and
entitlements, a verified guardian saw an empty dashboard everywhere.

This third one matters beyond the bug. That workflow is the machinery behind
verifiable parental consent, which COPPA makes mandatory for US under-13s. A
consent workflow that gates nothing is not a control.

---

## What the suite asserts

One test per line of the record's `required_access_tests`, named after it:

| # | Record requirement | Test |
|---|---|---|
| 1 | Cross-family access denied | `[record 1]` |
| 2 | Guardian access denied before verification | `[record 2]` |
| 3 | Revoked guardian blocked | `[record 3]` |
| 4 | Adult learning private without explicit share | `[record 4]`, `[record 4b]` |
| 5 | Billing manager cannot automatically view learning data | `[record 5]`, `[record 5b]` |
| 6 | Client role tampering ineffective | `[record 6]` |
| 7 | Reviewer cannot access unrelated unpublished content | `[record 7]` |
| 8 | Unqualified/conflicted reviewer cannot approve | `[record 8]` |
| 9 | Unauthorized publish/suspend/restore/refund/role assignment blocked | `[record 9]` |
| 10 | Audit records cannot be edited through ordinary app paths | `[record 10]` |

Plus an anonymous baseline across all five of the most sensitive tables.

Requirements 4 and 5 had no coverage in any suite before this one.

---

## Reading the failures correctly

Two traps, both of which produced false confidence during development:

**An RLS-blocked UPDATE or DELETE matches zero rows and raises nothing.**
Test 10 originally expected an exception. It got silence, and reported a pass
in the wrong direction. `governance_audit_events` is immutable through two
independent layers — the `gae_append_only` trigger, which stops a superuser or
a stray SQL console, and the absence of any UPDATE or DELETE policy, which
makes the statement match nothing through the application. The test now asserts
that the surviving row still reads `authz.probe`, which checks both layers.

**A `BEFORE UPDATE` trigger never fires on a statement that matches no rows.**
So an append-only trigger is not by itself proof that an application user
cannot edit a table. Absence of a policy is what does that, and only a
row-count assertion will tell you which one held.
