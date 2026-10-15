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

## Current milestone: the application layer

The database is finished. Nothing above it exists yet — no API, no screens,
no authentication wiring.

### Today's sentence

> Stand up the Next.js app with Supabase Auth and one real screen end to end.

### Why this before anything else

`ROADMAP.md` orders it: first release scope → visual identity → backend →
auth → catalogue. The backend is done. Auth is the next dependency for
literally every screen, and the Supabase client + RLS combination is what all
the policies just written are designed for. Building one screen end to end
proves the policies work from a browser, which the migration tests cannot.

### Definition of done

- [ ] Next.js + TypeScript app running against the Supabase project
- [ ] Email+password **and** phone OTP both working (D3)
- [ ] E.164 phone validation at the boundary
- [ ] Sign-in, sign-up, and one authenticated screen that reads through RLS
- [ ] Confirm from the browser that a learner sees their own enrolments and
      nobody else's — the RLS tests prove it in-database, not over the wire
- [ ] Environment variables documented; no secrets committed

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
