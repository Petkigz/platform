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

**95 tests** across three suites:

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

30 tables migrated, RLS on every one, 95 tests passing.

Group 1 (identity, family, guardians, privacy) and Group 2 (courses, content,
enrolments, progress, assessments, completion, certificates) are complete.
Group 3 (governance) is next and has one open decision — see `NEXT.md`.
Groups 4–5 are designed but not built.

See `NEXT.md`.
