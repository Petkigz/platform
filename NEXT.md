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
