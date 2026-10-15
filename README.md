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

23 tests cover: schema presence, RLS enabled on every table, seed data,
`updated_at` triggers, duplicate and self-escalating role grants, the child
login prohibition (D2), the guardian verification workflow, adult sharing
rules, soft-delete code reuse, and four RLS isolation cases.

## Status

Group 1 (identity, family, guardians, privacy) is migrated and tested.
Groups 2–5 are designed but not built. See `NEXT.md`.
