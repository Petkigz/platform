# Retention and Deletion Schedule

**Status:** draft, adopted 2026-10-15 as decision D7.
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
| Child learner data | Shortest period **(confirm)** | Anonymise on guardian request or account closure. Never sold or shared. |
| Discussion and Q&A posts | Life of the lesson | Soft delete; author may delete their own |
| Learner profiles and progress | Until deletion request | Anonymise on request; retain aggregate, non-identifying statistics |
| Course content and versions | Indefinite while published | Unpublishing is soft delete; masters retained per D8 |
| Governance and review decisions | Indefinite | Never deleted. Anonymise reviewer identity only where legally required |
| Certificates | Indefinite | Never deleted. A certificate must remain verifiable forever |
| Financial transactions | Statutory minimum **(confirm)** | Never deleted before the statutory period ends |
| Refunds and disputes | Statutory minimum + dispute window **(confirm)** | Never deleted |
| Audit log | Long, immutable **(confirm)** | Never user-editable through application paths |
| Backups | Rolling window **(confirm)** | Must respect deletion requests — a deletion is incomplete if it lives on in backups indefinitely |

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
