# Deploying AyahSpring

Zero to a running site: the database, the first owner, the web app, media, the
encoder, email and Google sign-in — in the order that works, with the commands
written out.

**Read this as two things at once.** It is the thing you follow at the keyboard,
and it is the record of what a deployment *is*, so that in six months — or in a
new session with no memory of this one — the state of the running system can be
reconstructed rather than guessed at. Where a step has an output you can look at,
the output is printed below the command.

**Nothing here costs money.** Every service named is on a free tier that does not
ask for a card. Where a limit will eventually bite, it says so, and says what it
costs to lift.

---

## The shape of it

```
browser ──▶ Vercel            the Next.js app: screens, server actions, route handlers
              │
              ├──▶ Supabase    Postgres (140+ tables, 280+ policies) + sign-in
              ├──▶ Cloudflare R2   the bytes: masters and encoded copies
              └──▶ Resend      email, when the outbox is switched on

your machine ──▶ ffmpeg worker    encodes uploads into copies a browser can play
a scheduler  ──▶ /api/cron        claims and sends queued email
```

Two of those are *your machine*, not a service: the encoder and the scheduler. The
encoder cannot live on Vercel — it downloads a multi-gigabyte master, runs ffmpeg
against it and uploads the result, which is not what a serverless function is for.

---

## 0. Before you start

Accounts to create (all free, none needs a card):

| # | Service | What for |
|---|---|---|
| 1 | [supabase.com](https://supabase.com) | Postgres, sign-in, the whole schema |
| 2 | [vercel.com](https://vercel.com) | hosting the app |
| 3 | [cloudflare.com](https://cloudflare.com) | R2 buckets for media |
| 4 | [resend.com](https://resend.com) | email (3 000 a month, 100 a day) |
| 5 | [console.cloud.google.com](https://console.cloud.google.com) | Google sign-in |

Plus, on the machine that will run the encoder: **Node 20 or newer**, `git`, and
`ffmpeg` (step 6).

You do **not** need: a card, a domain (a `*.vercel.app` address works while you
build), a payment provider, or a Twilio account.

---

## 1. The database

### 1.1 Create the project

Supabase dashboard → **New project**.

- **Region:** `eu-central-1` (Frankfurt) is the closest to Uganda of the free
  regions. Region cannot be changed later without a new project.
- **Password:** generate one and keep it. It is the database password, not a login.
- **Plan:** free.

Free tier, in the terms that matter here: 2 projects, 500 MB database, **no
backups**, and the project **pauses after 7 days with no activity**. A paused
project is a site that returns errors until somebody opens the dashboard and
restores it. Step 8's scheduler, running hourly, is what keeps it awake.

### 1.2 Collect four values

Project Settings → **API**: the **Project URL**, the **anon** key, the
**service_role** key (reveal it; never put it in a browser bundle).

Project Settings → **Database** → *Connection string*: the **Session pooler**
URI, which looks like

```
postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

Take the **pooler**, not the direct connection. The direct hostname is IPv6-only,
and a machine without IPv6 (most home connections) will time out with no useful
error.

### 1.3 Apply the migrations

203 files in `supabase/migrations/`, applied in filename order — the 14-digit
prefix is a timestamp, and the order is not cosmetic: a table cannot be referenced
before it exists.

**Path A — no extra tooling, and the path the test suite uses.** From the
repository root:

```bash
export DATABASE_URL='postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'

for f in supabase/migrations/*.sql; do
  printf '%s\n' "$f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -q -f "$f" || break
done
```

- `--single-transaction` makes each file all-or-nothing, which is how the suite
  applies them: a file that fails halfway leaves nothing behind instead of half a
  table.
- `-q` hides the hundreds of `NOTICE` lines that `drop … if exists` produces on a
  first run. What you are watching for is the loop *stopping*, and the file name
  above the error.
- Takes a few minutes. The last file printed should be
  `20261281004100_media_encode_notifications.sql`.

**Path B — the Supabase CLI**, if you would rather have migration history tracked:

```bash
npx supabase@latest link --project-ref <ref>
npx supabase@latest db push
```

**Do not mix the two paths.** The CLI records what it applied in
`supabase_migrations.schema_migrations`; a database filled by psql looks empty to
it, and `db push` would then re-apply all 203 files from the top and fail on the
first `create table`. Pick one on day one and stay with it.

**The one known snag.** Two migrations attach a trigger to `auth.users`
(`20261105000100_profile_on_signup.sql`, `20261263000100_google_sign_in.sql`),
which is a table Supabase owns. If either is refused with
`must be owner of relation users` or `permission denied for relation users`, open
**SQL editor** in the dashboard, paste that file's contents, and run it there —
the SQL editor connects with privileges the migration path does not always have.
Then carry on with the loop from the next file.

---

## 2. Check that it landed

Paste [`docs/deploy/verify.sql`](./verify.sql) into the **SQL editor** and run it.
One statement, twelve rows, nothing written.

On a brand-new project it reads:

| fact | value | what it means |
|---|---|---|
| `tables` | ~153 | the schema is here at all |
| `policies` | ~280 | row level security rules; a table without any is readable by anybody holding the anon key |
| `signup trigger` | `present` | creates a profile when somebody signs up; without it a new account cannot be given a role |
| `roles` | 10 | the role vocabulary the writers will accept |
| `people` | 0 | accounts that have a profile |
| `staff` | **0** | nobody can administer this deployment yet — **this is the number to watch** |
| `settings` | 109 | every flag and threshold, whether or not anybody changed one |
| `features on` | **0** | features this deployment runs; everything ships off on purpose |
| `subject areas` | 11 | the top-level shelves a course can be filed under |
| `courses` | 0 | a course is written by a teacher, not by the platform |
| `published versions` | 0 | nothing a visitor can study yet |
| `audit events` | ~10 | the governance record; only what the seed itself wrote |

The exact table and policy counts move as migrations land; `staff = 0`,
`features on = 0` and `published versions = 0` are the three that describe a
deployment nobody can run yet. If `signup trigger` says `MISSING`, go back to
1.3's snag — a signed-up account would have no profile.

`supabase/tests/deploy_runbook.test.mjs` executes this file, so it cannot quietly
stop matching the schema it describes.

---

## 3. The first owner

There is deliberately no "first user becomes admin" rule — that is how a stranger
ends up owning a platform. So the first privileged role is granted by hand, once,
in the SQL editor, and every role after it is granted from `/admin/roles` by
somebody who already has one.

**3.1 Sign up in the app.** Once the web app is running (step 4) — or immediately,
in the dashboard under **Authentication → Users → Add user** — create your own
account with the address you will actually use. Confirm it if the email
confirmation is on.

**3.2 Grant yourself the owner role.** SQL editor, one block:

```sql
-- Applies only to the statement below: a session setting, not a stored value.
set app.bootstrap_privileged_roles = 'on';

insert into public.user_role_assignments (user_id, role_id)
select u.id, r.id
  from auth.users u
  join public.roles r on r.code = 'platform_admin'
 where u.email = 'you@example.com'
   and not exists (
     select 1 from public.user_role_assignments a
      where a.user_id = u.id and a.role_id = r.id and a.revoked_at is null
   );
```

Replace `you@example.com`. Read the result: `INSERT 0 1` means it worked.
`INSERT 0 0` means the address matched no user, or you already did this.

Run `verify.sql` again: `staff` should now be 1.

Why the `set` line exists: the trigger behind that table refuses to grant a
powerful role with no assigner, because a role that can appoint itself is not a
role. The setting is the one door that is open exactly once, is never written to
the database, and has to be typed on purpose — the check is in
`supabase/tests/deploy_runbook.test.mjs`, including the refusal when the line is
missing.

From here, everything is a screen: `/admin/roles` grants the next person a role,
with a written reason, out of an audit trail.

---

## 4. The web app

### 4.1 The environment

Copy `web/.env.example` to the deployment's environment variables. Set these four
first; the app will not start without them.

| Variable | What breaks without it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | nothing loads: no catalogue, no sign-in |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the browser cannot reach the database; every screen is empty or refuses |
| `SUPABASE_SERVICE_ROLE_KEY` | the payment webhook only — it bypasses every policy in the schema, so it is server-only and never prefixed `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | certificates print a path instead of a full verification address |

Then, in the order you get to them:

| Variable | What it turns on | Step |
|---|---|---|
| `OFFLINE_VAULT_SECRET` | saving a lesson to a device, encrypted; unset means the save refuses rather than storing a lesson in the clear | 5 |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | uploads and playback; `/api/media` otherwise says storage is not configured | 5 |
| `R2_MASTERS_BUCKET`, `R2_RENDITIONS_BUCKET` | optional; the defaults must match what the database derives | 5 |
| `MEDIA_WORKER_EMAIL`, `MEDIA_WORKER_PASSWORD` | the encoder's own sign-in | 6 |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | anything sends at all | 7 |
| `CRON_SECRET`, `EMAIL_WORKER_EMAIL`, `EMAIL_WORKER_PASSWORD` | the unattended mail run | 7 |
| `PAYMENT_PROVIDER` | how a provider is named; unset means checkout says payments are not configured rather than pretending | — |
| `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, `MTN_MOMO_API_KEY`, `MTN_MOMO_BASE_URL`, `MTN_MOMO_TARGET_ENVIRONMENT`, `MTN_MOMO_CALLBACK_URL` | MTN collections | — |
| `MTN_MOMO_DISBURSEMENT_SUBSCRIPTION_KEY`, `MTN_MOMO_DISBURSEMENT_API_USER`, `MTN_MOMO_DISBURSEMENT_API_KEY` | refunds going back out through MTN | — |
| `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET`, `AIRTEL_BASE_URL`, `AIRTEL_COUNTRY`, `AIRTEL_CURRENCY`, `AIRTEL_REFUND_PATH` | Airtel Money | — |

**`NEXT_PUBLIC_ALLOW_MISSING_SUPABASE` must not be set in production.** It exists
so `next build` can run in CI without a live project; it makes the app pretend a
database is not required.

Generating the offline secret:

```bash
openssl rand -base64 32
```

Rotating it makes every saved lesson unreadable and every learner save once more,
which is why it goes in before anybody saves anything.

### 4.2 Deploy

The repository is an npm workspace: the lockfile and the build both live at the
root, and the app itself is in `web/`.

On Vercel → **New Project** → import the repository → set:

- **Root Directory:** `web`
- **Install Command:** `cd .. && npm ci`
- **Build Command:** `cd .. && npm run build`
- **Output Directory:** leave default

The two `cd ..`s are the workspace. If the build fails with "no such file:
package-lock.json", the install command is the one that is wrong.

Leave **Framework Preset** on Next.js, and do not override the output directory:
`next build` writes `.next` inside `web/`, and the preset expects exactly that.

Build locally first if you want to find a problem before Vercel does:

```bash
npm ci && npm run build
```

### 4.3 Supabase side of sign-in

Authentication → **URL Configuration**:

- **Site URL:** your address, e.g. `https://ayahspring.vercel.app`
- **Redirect URLs:** add `https://ayahspring.vercel.app/auth/callback` and, for
  local work, `http://localhost:3000/auth/callback`

Authentication → **Providers** → **Email**: on. Confirm-email is your choice;
with no email provider configured yet (step 7) a confirmation mail cannot be
delivered, so while you are setting up, either turn confirmation off or confirm
accounts from the Users table.

**Leave phone sign-in off** until an SMS provider exists. The code path is built
and tested; Supabase's phone provider needs Twilio or similar, which is the first
thing in this document that costs money. A phone field with no deliverer behind it
is worse than no phone field.

### 4.4 The smoke test

| Address | Expect |
|---|---|
| `/` | the marketing page renders, in your device's language |
| `/catalogue` | loads and says there is nothing to study yet (it is true; `courses = 0`) |
| `/signin` | the form; a wrong password is refused in words, not an error page |
| `/dashboard` | after signing in, you are somewhere sensible rather than bounced |
| `/admin` | if step 3 worked, the admin home with the "before anyone can study here" panel |

---

## 5. Media storage

Cloudflare dashboard → **R2**. The free allowance is 10 GB of storage and a
million operations a month, and R2 does not charge for egress — which is the
whole reason it was chosen over a video platform.

**5.1** Create two buckets, named exactly as the schema derives them:

- `ayahspring-masters` — the file as uploaded, never served to a learner directly
- `ayahspring-renditions` — the copies a browser plays

If you would rather name them something else, set `R2_MASTERS_BUCKET` and
`R2_RENDITIONS_BUCKET`, and know that `/api/media` refuses to sign when the
browser and the database disagree about the name.

**5.2** R2 → **Manage API tokens** → *Create API token*, permission **Object Read
& Write**, scoped to those two buckets. Note the Account ID, the Access Key ID
and the Secret Access Key.

**5.3** Bucket → **Settings** → **CORS policy**. This is the step that is easiest
to get wrong and most expensive to debug: the browser uploads parts directly to
storage, and it must be allowed to read each part's `ETag` back.

```json
[
  {
    "AllowedOrigins": ["https://ayahspring.vercel.app"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Without `ExposeHeaders: ["ETag"]` every part uploads successfully and the last
step has nothing to say about them — an upload that fails after 100 % of the
bytes have moved.

**5.4** Set the three R2 variables in the app's environment and redeploy.

**5.5** Test: `/teach/media` → upload a 10 MB video. It becomes a row marked
*pending*; `/admin/media` verifies it against storage and confirms it. What you
should see after confirmation is the file listed as available and **no** playable
copy yet — that is step 6.

---

## 6. The encoder

The one part of the platform that runs on a machine you control, because ffmpeg
needs a disk, minutes of CPU and the whole file.

**6.1** Install ffmpeg on that machine:

```bash
# Debian / Ubuntu
sudo apt install -y ffmpeg
# macOS
brew install ffmpeg
```

Check both binaries are on the PATH — the worker uses `ffprobe` to learn what the
file actually is before it plans anything:

```bash
ffmpeg -version && ffprobe -version
```

**6.2** Make a staff account for the worker. It signs in like a person, because
every writer in this schema checks that a *privileged human* called it — there is
no service key, on purpose, so that the worker's work is attributable and can be
switched off by revoking a role. Create an account (any address you control), then
as the owner: `/admin/roles` → grant **platform_admin**, with a written reason.

**6.3** Run it once, in the foreground, against the file from step 5.5:

```bash
export MEDIA_WORKER_EMAIL='worker@ayahspring.com'
export MEDIA_WORKER_PASSWORD='…'
export NEXT_PUBLIC_SUPABASE_URL='https://<ref>.supabase.co'
export R2_ACCOUNT_ID='…'
export R2_ACCESS_KEY_ID='…'
export R2_SECRET_ACCESS_KEY='…'

npm run worker:transcode -- --asset <media asset id> --limit 1
```

Then check `/teach/media`: the file should now show a playable copy, and the
lesson that uses it should play in a browser.

**6.4** Leave it running. It reads the `delivery.transcode` flag and exits if the
flag is off, so turning the feature off is a switch, not a `kill`:

```bash
# /etc/systemd/system/ayahspring-transcode.service
[Unit]
Description=AyahSpring transcode worker
After=network-online.target

[Service]
WorkingDirectory=/srv/platform
EnvironmentFile=/srv/platform/.env.worker
ExecStart=/usr/bin/npm run worker:transcode -- --limit 2
Restart=on-failure
RestartSec=60

[Install]
WantedBy=multi-user.target
```

`--limit 2` keeps a pass to two masters so a large queue does not hold the
machine for hours; the loop comes back. On a machine that is not always on, a
`cron` entry every ten minutes is the same thing.

**6.5** Switch the feature on: `/admin/settings` → `delivery.transcode` → on.

**What a failure looks like now.** If an encode fails and leaves the file with no
playable copy, the uploader and the course's author are told inside the app, with
the encoder's own reason and a link to the screen that retries it. `failure_reason`
is on `/admin/media` for staff as well.

---

## 7. Email

Nothing sends until this step, and everything degrades honestly without it: a
message is queued, and the dispatcher claims **nothing** while no key is set —
deliberately, because claiming is what starts a message's five attempts and a run
without credentials would dead-letter the whole outbox in one pass.

**7.1** Resend → **Domains** → add `ayahspring.com`. It gives you three DNS
records: a **DKIM** `TXT`, an **SPF** `TXT` (`v=spf1 include:…`) and a **DMARC**
`TXT` starting at `p=none`. Add all three at your DNS host. They are free and they
are the difference between a receipt arriving and a receipt in a spam folder.

**7.2** Create an API key, then set in the app's environment:

```
RESEND_API_KEY=re_…
EMAIL_FROM=no-reply@ayahspring.com
EMAIL_REPLY_TO=privacy@ayahspring.com
```

`EMAIL_FROM` must be on the domain you just verified.

**7.3** Switch delivery on: `/admin/settings` → `platform.email_auth` → on. That
flag's precondition is the three DNS records and one sent message whose
authentication result you have read in Resend's log.

**7.4** Send one by hand: `/admin/messages` → **Send what is due now**. It runs the
same pass a scheduled run would, with your session, and reports what the database
said: claimed, sent, put back on the queue, suppressed. A message that cannot be
settled is listed by address and reason rather than swallowed.

**7.5** The unattended run. The route is `POST /api/cron/dispatch-messages` and it
wants a bearer token:

```bash
curl -sS -X POST https://ayahspring.vercel.app/api/cron/dispatch-messages \
  -H "Authorization: Bearer $CRON_SECRET"
```

- `CRON_SECRET` — 32 random bytes, `openssl rand -base64 32`. Compared in constant
  time, so a wrong token cannot be guessed by timing.
- `EMAIL_WORKER_EMAIL`, `EMAIL_WORKER_PASSWORD` — a staff account that claims and
  settles the messages. Same reasoning as the encoder: a machine writer is subject
  to the same refusals as a person.

Schedule it hourly with [cron-job.org](https://cron-job.org) (free, no card): URL
as above, method POST, header `Authorization: Bearer <secret>`. Hourly rather than
every five minutes because on a free Supabase project the job is doing double duty
— it is also what stops the project pausing after seven idle days.

---

## 8. Google sign-in

Five steps, all in dashboards, in [`docs/google-sign-in.md`](../google-sign-in.md):
a Google OAuth client, the client id and secret pasted into Supabase, the redirect
URI, and then `auth.google_sign_in` on at `/admin/settings`.

The code is finished: `/auth/callback` exchanges the code for a session, refuses
to forward to an address that is not a relative path, and `handle_new_user()`
prefers the name Google supplies. **No email is needed** for Google sign-in, which
is one more reason it is worth doing before step 7 is finished.

---

## 9. What is left, and is not a deployment task

Once you can sign in as the owner, `/admin` tells you the rest itself — a panel
titled **"Before anyone can study here"**, one row per missing thing, each linking
to the screen that fixes it: a subject to file courses under, a reviewer who is
verified, a course, something published.

Then the feature switches. `/admin/settings` lists all 109 with what each one
gates and what has to be true first. The register with the reasoning is
[`FLAGS.md`](../../FLAGS.md); the short version:

- **43** are a runtime toggle. Flip them when you want them.
- **15** need something outside the code first — an email provider, a guardian
  review capacity, a moderation policy.
- **33** cannot be switched on at all yet. They are blocked on a fact or a
  decision, not on a deploy, and the database refuses them.

Payments are last on purpose. Checkout is built to the provider boundary, and
MTN's sandbox is self-serve and free; a merchant account is a business step, not a
deployment one.

---

## 10. The six ways this bites

1. **The project pauses** after seven idle days and the site is down until you
   restore it. The hourly cron in 7.5 is the fix.
2. **The IPv6 connection string** times out with no useful error. Use the session
   pooler.
3. **R2 without `ExposeHeaders: ["ETag"]`** uploads every byte and then cannot
   finish. It looks like a network problem and is a CORS header.
4. **The encoder without a staff account** exits immediately — by design. A worker
   that cannot prove a person authorised it is a worker that can do nothing.
5. **`NEXT_PUBLIC_ALLOW_MISSING_SUPABASE=1`** left in production: the app builds,
   runs, and pretends the database is optional.
6. **Email before DNS**: messages send, land in spam, and the failure looks like
   silence.

---

## 11. Done

A deployment is finished when all of these are true, in this order:

- [ ] `verify.sql` reports `signup trigger = present` and **`staff` ≥ 1**
- [ ] `/admin` shows the setup panel rather than an error
- [ ] you can sign up, sign out and sign back in
- [ ] `/teach/media` accepts an upload and `/admin/media` confirms it
- [ ] the encoder turns that upload into a copy a browser plays
- [ ] one email sent by hand appears in an inbox, not a spam folder
- [ ] the hourly cron run returns a count rather than a 401
- [ ] the setup panel empties: a subject, a verified reviewer, a course, a
      published version

---

## 12. Backups, and what free does not include

The free tier has **no backups**. That is the one real risk of starting free, and
it is handled by a habit rather than a service:

```bash
pg_dump "$DATABASE_URL" --no-owner --no-privileges -f "ayahspring-$(date +%F).sql"
```

Weekly, onto a disk that is not the machine you deploy from. The database is 140
tables of text; it compresses to a few megabytes. The masters in R2 are the
expensive part and are not covered by this dump — they are the files a teacher
already has, which is the honest answer until the platform is bigger than a free
tier.
