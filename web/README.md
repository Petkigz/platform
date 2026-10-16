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
| `/learn/[enrolmentId]` | dynamic | Course view: outline and mark-complete |
| `/api/progress` | dynamic | POST. Record lesson progress |
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

## Not built yet

Admin dashboard · checkout · mobile · logo and type (colour is settled).
