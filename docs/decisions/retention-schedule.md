# Retention and Deletion Schedule

**Status:** adopted 2026-10-15 as decision D7. Two periods were settled by the
owner on 2026-10-22 and are executed by code as of 2026-11-01; the rest of this
table is still a design. Read *what is enforced today* at the end before quoting
any row of it as a promise.

Periods marked **(confirm)** depend on the operating jurisdiction and must be
verified before launch. This is the single fact in D7 that cannot be decided
from the design.

**Rule:** soft delete by default. Hard delete only where law requires it.
Financial, governance, grading, publication and certificate history is **never
deleted** — the personal fields are anonymised instead.

---

## Categories, shortest first

| Data | Retention | Deletion behaviour |
|---|---|---|
| Guardian verification evidence | Delete on decision | Hard delete once verified or rejected, unless disputed. Never keep "just in case". |
| Failed sign-in and OTP logs | 30 days | Hard delete |
| Session and refresh tokens | On revocation or expiry | Hard delete |
| Child learner data | Settled 2026-10-22: **30 days after the guardian's account closes** | Deleted, except a certificate number that has to keep verifying. **Not enforced** — see the end of this document. Never sold or shared. |
| Discussion and Q&A posts | Life of the lesson | Soft delete; author may delete their own |
| Learner profiles and progress | Until deletion request | Anonymise on request; retain aggregate, non-identifying statistics |
| Course content and versions | Indefinite while published | Unpublishing is soft delete; masters retained per D8 |
| Governance and review decisions | Indefinite | Never deleted. Anonymise reviewer identity only where legally required |
| Certificates | Indefinite | Never deleted. A certificate must remain verifiable forever |
| Financial transactions | Statutory minimum **(confirm)** | Never deleted before the statutory period ends |
| Refunds and disputes | Statutory minimum + dispute window **(confirm)** | Never deleted |
| Audit log | Long, immutable **(confirm)** | Never user-editable through application paths |
| Backups | Rolling window **(confirm)** | Must respect deletion requests — a deletion is incomplete if it lives on in backups indefinitely |
| Support cases | **Three years after the case closes** | Deleted with their messages. Enforced. |
| Safeguarding and screening records | **Seven years** after the later of the check and the subject's eighteenth birthday | Deleted. Enforced — and never earlier, by anybody. |

## Mechanism

- `deleted_at` on user-facing tables; queries exclude soft-deleted rows by default
- Anonymisation replaces personal fields with non-reversible placeholders while
  preserving the record's referential integrity
- Deletion requests are logged with actor, timestamp and scope
- Backup retention must be short enough that a deletion request becomes fully
  effective within a documented window

## Open, and blocking nothing yet

- Statutory financial retention period — depends on jurisdiction
- Child data retention period — depends on jurisdiction and on whether COPPA applies
- Audit log retention — depends on jurisdiction
- Backup rotation window

These are facts to obtain, not choices to make. None of them blocks Group 1.

---

## What is enforced today (2026-11-01)

A retention period that exists only in prose is a promise with no clock, and this
document was the prose. Two rows of the table above are now executed by
`public.run_retention_jobs()` (`20261281004700_retention_clock.sql`):

| Clock | Starts | Goes | Where it is decided |
|---|---|---|---|
| A support case | the moment it is closed | three years later, with its messages | `retention_due_records`, computed from `closed_at` |
| A screening record | the later of the check and the subject's eighteenth birthday | seven years later | `teacher_screenings.retention_until`, set by the writer |

`retention_plan()` answers *what is due, what is next, and what has no clock*;
`/admin/retention` shows it and presses it; `POST /api/cron/retention` runs it
unattended. Every run is audited with counts and no names, and writes nothing
when it deleted nothing.

**Three things this does not cover, stated here so no row above is read as
enforced when it is not:**

1. **A child's learning record, thirty days after the guardian's account
   closes.** Promised in the children's policy, not wound. It is a delete across
   enrolments, progress, submissions, attempts and attendance, with a certificate
   number that must survive it, and it needs its own unit and its own suite.
2. **A support case nobody closes.** The clock starts at closure, so an open case
   is kept forever by default. `/admin/retention` reports the count and the age
   of the oldest rather than pretending they are covered. Closing a case is a
   human act and nothing closes one automatically.
3. **Anything held outside this database** — the sign-in address at the
   authentication provider, backups, and provider-side OTP and session logs. The
   database cannot delete what it does not hold.

Soft delete remains the default for everything else, and the ledger categories
(financial, governance, grading, publication, certificate history) are never
deleted at all: the personal fields are anonymised instead.
