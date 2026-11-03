# Deploying AyahSpring

Zero to a running site: the database, the first owner, the web app, media, the
encoder, email and Google sign-in — in the order that works, with the commands
written out.

**Read this as two things at once.** It is the thing you follow at the keyboard,
and it is the record of what a deployment *is*, so that in six months — or in a
new session with no memory of this one — the state of the running system can be
reconstructed rather than guessed at. Where a step has an output you can look at,
the output is printed below the command.

**This is an unverified deployment plan, not a promise of free, no-card
production hosting.** Check current eligibility, signup, quotas and terms before
creating accounts. Vercel Hobby is restricted to non-commercial personal use and
is not an appropriate assumption for a paid learning business. R2 has a free
allowance, but its subscription/signup requirements must be checked; do not assume
no card is required. No alternative commercial host has been tested with this app.
The owner has not approved paid services.

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

Candidate services to evaluate (free allowances and no-card signup are not guaranteed):

| # | Service | What for |
|---|---|---|
| 1 | [supabase.com](https://supabase.com) | Postgres, sign-in, the whole schema |
| 2 | [vercel.com](https://vercel.com) | hosting the app |
| 3 | [cloudflare.com](https://cloudflare.com) | R2 buckets for media |
| 4 | [resend.com](https://resend.com) | email (3 000 a month, 100 a day) |
| 5 | [console.cloud.google.com](https://console.cloud.google.com) | Google sign-in |

Plus, on the machine that will run the encoder: **Node 20 or newer**, `git`, and
`ffmpeg` (step 6).

Do not provide a card or subscribe to a paid service without the owner's approval.
A test deployment may not need a custom domain, payment provider or SMS account;
production email, payments and phone sign-in have their own requirements.

### 0.1 The preflight, which you run again after every step

```bash
npm run preflight
```

It reads `web/.env.local`, works out which parts of the platform are dark, and
prints **the steps below that are not satisfied yet, in this document's order**. It
exits non-zero while anything is blocking, so it belongs at the top of a deploy
script as much as in a terminal.

It exists because of a real evening: an earlier version of step 6.3 exported
`NEXT_PUBLIC_SUPABASE_URL` while the encoder asked for `SUPABASE_URL`, and the
message named a variable this document never mentioned. The values were right and
the deployment was impossible, and nothing in the repository could see it — the app
builds with no environment at all, the test suites inject their own, and the
structural check compares *this document to the example file* rather than either
of them to what a process reads.

What it checks is worth knowing, because it decides how far you can trust it:

- **Is each capability configured**, not "do the variables exist": no R2
  credentials and no byte can be uploaded or played.
- **Is what is set the right shape** — a URL that is not a URL, a key that is not
  a key, a vault secret shorter than the thing it seals, a `NEXT_PUBLIC_` prefix on
  a secret that would then ship to every browser, and two different Supabase
  projects under the two names that are supposed to hold one.
- **Which step fixes it.** Every finding carries the section number below.

It never touches the network, and that is deliberate: a checker that needs
credentials to tell you about your credentials is useless in the moment it is
needed. It reads values; it cannot prove they work — **step 4.4 is the smoke test
that signs in, and step 5.5 is the one that sends a byte to storage.**

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
restores it. Do not assume an hourly scheduler prevents a free project from
being paused; the provider decides what counts as activity.

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

238 files in `supabase/migrations/`, applied in filename order — the 14-digit
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
  `20261281031000_coursework_safeguarding_gate.sql`.

**Path B — the Supabase CLI**, if you would rather have migration history tracked:

```bash
npx supabase@latest link --project-ref <ref>
npx supabase@latest db push
```

**Do not mix the two paths.** The CLI records what it applied in
`supabase_migrations.schema_migrations`; a database filled by psql looks empty to
it, and `db push` would then re-apply all 238 files from the top and fail on the
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

**3.3 Guardian verification is already on. Nothing to press.**
`family.guardian_verification` ships `true` since `20261281019000_guardian_verification_on.sql`,
because the owner decided on 2026-11-01 that every child is enrolled behind a verified
guardian, in every country, knowingly ahead of the legal review. It is the one flag
whose *on* state is the stricter one: while it is off, a child profile can be enrolled
with nothing but an adult's word; while it is on, a child enrolment requires a session
acting as a **verified** guardian with learning authority for that exact child, and a
family member reaches a child's progress, grades, enrolments and certificates only
through a current consent.

It stays `admin_setup`-gated, so if the legal review says something different it is
one press on `/admin/flags` to switch off.

Three things are true the moment it is on, and none of them is a bug:

* **Every verification approved before 2026-11-01 has lapsed**, because those were
  approved before the machinery recorded a lifetime. Any child already enrolled keeps
  their access — the gate is on *new* enrolments and on the guardian's reach into the
  record — but the guardian will be asked to re-verify.
* **A children's policy version is in force, and it is version 3.** Every consent
  records `consented_policy_version_id`, so a parent's agreement names the words they
  were shown. Version 1 (2026-10-28) said the verification switch was off; version 2
  (2026-11-02) stated the rule and stopped promising a handover nobody could perform;
  version 3, the same day, states the handover that now exists at `/handover`. Older
  consents name the version in force when they were decided, which is the truth about
  what was in force, and the console shows the difference rather than papering over it.
* **The test suite runs the gate in the configuration it ships in only in the suites
  that own it.** Most database suites predate the switch and build households with no
  verification, so they run with the gate off and the debt is written down in
  `supabase/tests/run.mjs`. The target is every fixture carrying a verification, after
  which that list disappears; `flags`, `family`, `guardians` and `learner switcher` run
  with it on today.

**The reviewer's checklist** is `docs/safeguarding/guardian-verification-checklist.md`,
and the same nine steps are rendered on `/admin/guardians` (`REVIEWER_CHECKLIST` in
`web/src/lib/guardian-consent.ts`). A test holds the two together. Read it before
the first decision, not after the first mistake.

**3.3a Live classes: the room host is the one thing not built here.**
`delivery.live_room_base` ships **empty**, and an empty value is not a bug — it is the
platform refusing rather than pretending. With it empty, `join_live_session()` checks the
entitlement and the clock, then answers
`reason: 'no_room_host'` — *"live rooms are not connected yet; the class is scheduled and
will not open a room."* Nothing records attendance, and no learner is handed a URL that
does not carry a class.

Everything around the room is built and tested: scheduling with the zone a teacher typed
beside the UTC instant, the join window, per-person entitlement, arrival and departure,
the teacher's roll, cancelling with a reason every learner is told, and attaching the
address of a recording the teacher made elsewhere. The video is the part the platform
does not own.

**What to do when a host exists.** Set the base URL on `/admin/settings` (or
`platform_settings.value_text`) to the origin the room server answers on, for example
`https://rooms.ayahspring.com`. A room is that base plus `/room/<room_slug>`, where the
slug comes from the session row, so the host must serve that path and must know the same
room names. Nothing else needs changing or redeploying.

**What has not been verified, and must not be claimed.** No room server has ever been
configured in this repository's environment, so not one minute of audio or video has been
carried by it. There is no integration with the host's own API: attendance is *arrival
through this platform*, not the host telling us who was present, so a learner who gets
the URL some other way and attends is not counted. And a room server is a server to
patch, monitor and pay for — the honest description of this feature today is "scheduled
classes with a door, and no room behind the door".

**The choice that is still open** is which host: a self-hosted Jitsi on a small VM (cost and suitability unverified,
and requiring security review), a commercial service with credentials, or the
public `meet.jit.si` (free today, and the wrong answer for a child's classroom — the
rooms are on a service the platform does not control). The owner has deliberately left
this as a documented gap rather than pinning a host.

**3.4 Check the withdrawal question, which is already on.** Nothing to press. The
migrations publish refunds policy **version 2** (the paragraph stating the 14-day
right and the waiver) and switch `platform.withdrawal_right` on in the same step,
because turning a CODE flag on is a deploy and not a click. What is worth checking
on a fresh deployment:

* `/courses/<slug>/buy` for a buyer in an EU country shows **one unticked** box
  under the withdrawal paragraph. `select public.withdrawal_offer('DE');` should
  answer `"canWaive": true` with a `policyVersionId`; the same call for `'UG'`
  should answer `"statutory": false`. If `canWaive` is false with reason
  `no_policy_in_force`, the refunds version did not publish and **everybody keeps
  the 14 days** — which is the safe failure, but it is a failure to notice.
* `select public.withdrawal_wording();` and the opening of `/policies/refunds`
  should be the same paragraph. A test holds them equal; a person should still
  read them once.
* **A lawyer still has to read that paragraph.** The published version's approval
  reason says it is unreviewed, in the record rather than in a comment. When it has
  been read, publish a corrected version from `/admin/policies` — a correction is a
  new version, never an edit to the one buyers already agreed to.
* Refunds now close at **14 days** for a buyer in a 14-day market who did not waive,
  and at 72 hours everywhere else. `/orders` prints which rule applies and the date;
  `refund_standing(<order>)` is the same answer in SQL.

**3.5 Check the study assistant, which is deployed off.** Nothing to press, and
nothing to configure: `learning.ai_support` is CODE-gated, so `/admin/flags` will
refuse to switch it on and that refusal is correct — turning it on is a deploy, one
migration that sets `value_text` to `'true'` under
`set_config('app.bypassing_code_flag', 'on', true)`, exactly as
`platform.withdrawal_right` was switched on. What exists behind it is a boundary,
not a bot: `ai_support_ask()` returns
lessons the asker may open, or nothing, or a refusal that opens a support case for a
teacher. There is no provider, no key to set, no cost ceiling to pick and no
generated text anywhere in the payload.

What is worth checking before you would enable it:

* `select public.ai_support_is_ruling('Is it haram to miss a prayer?');` → `true`;
  `select public.ai_support_is_ruling('Where is the letter ha produced?');` →
  `false`. The list is fifty lowercase phrases in a table-valued function, and
  editing it is a migration rather than a click, on purpose: a phrase list is a
  safety boundary and a boundary that can be edited in a form at 2 a.m. is not one.
* `select public.ai_support_summary(30);` → zeros, or a permission error for a
  support agent who is not privileged. `/admin/ai-support` renders the same numbers.
* `/learn/ask` says what the assistant is and is not, whether or not the flag is on,
  and `/learn` links to it either way. A learner who was told the feature exists
  should never meet a 404.
* **A refusal only reaches a case while `platform.support` is on.** With the help
  desk closed the refusal still lands and still says "ask your teacher in the
  lesson" — the boundary does not depend on the desk — but nothing is filed.
  `/admin/ai-support` counts the difference rather than hiding it.

Recitation is a different flag (`learning.recitation`, also CODE) and this unit did
not touch it: a wrong correction on religious content is worse than none, and no
ASR has been validated against makharij.

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
| `RETENTION_WORKER_EMAIL`, `RETENTION_WORKER_PASSWORD` | the unattended retention cleanup — the job that makes the privacy notice's three and seven years true. Must be an account holding `platform_admin`, because only the owner may delete a record; unset means the route refuses and `/admin/retention` still works by hand | 4 |
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
export NEXT_PUBLIC_SUPABASE_ANON_KEY='…'
export R2_ACCOUNT_ID='…'
export R2_ACCESS_KEY_ID='…'
export R2_SECRET_ACCESS_KEY='…'

npm run worker:transcode -- --asset <media asset id> --limit 1
```

The worker reads `SUPABASE_URL` and `SUPABASE_ANON_KEY`, and falls back to the
`NEXT_PUBLIC_` pair above — it is a plain Node process, so the prefix means
nothing to it. Either name works; the values are the same two from step 1.2. If it
exits naming a variable, that variable is the one missing — it never guesses a URL,
because a worker pointed at the wrong project would encode into somebody else's
bucket.

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

A scheduler such as [cron-job.org](https://cron-job.org) can call this hourly:
URL as above, method POST, header `Authorization: Bearer <secret>`. Confirm its
current terms and no-card eligibility before relying on it. This job does not
guarantee that a free Supabase project remains active.

**7.6** The retention cleanup. Two things the privacy notice promises to delete on
a date: a support case three years after it closes, and a record that a teacher
was checked seven years after the later of the check and their eighteenth
birthday. `POST /api/cron/retention` does both, in bounded batches:

```bash
curl -sS -X POST https://ayahspring.vercel.app/api/cron/retention \
  -H "Authorization: Bearer $CRON_SECRET"
```

- `RETENTION_WORKER_EMAIL`, `RETENTION_WORKER_PASSWORD` — the same staff account
  the mail run uses is fine, but it **must hold `platform_admin`**: the database
  only lets the owner delete a record, and that check is what stops a stray token
  emptying the register. Unset, the route answers 503 and deletes nothing.
- Run it daily from the same free scheduler. It is idempotent and takes at most
  500 records per clock per call; a backlog drains over consecutive runs rather
  than holding a lock behind a live support queue.
- `/admin/retention` shows what is due, what will be due next, and — the part
  worth reading — how many cases nobody has closed, because those have no clock
  at all. The owner can run the same cleanup by hand from that page, which is the
  whole job until there is a scheduler.

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

### The one deletion that is not a deployment task

`/account/delete` scrubs this database. It cannot delete the sign-in: that row is
`auth.users`, and it belongs to Supabase Auth. Closing an account therefore leaves
a live sign-in, and for three units the answer to that was a sentence in a
document — which is how a closed account went on being able to sign in.

It is a queue now, and the step is ordered, because the second half refuses to
happen before the first:

1. A person closes their account at `/account/delete`. The receipt tells them the
   sign-in is still with the authentication provider and that staff remove it.
2. Sign in as the owner and open **`/admin/retention` → Sign-ins still at the
   provider**. That number is every closed account whose sign-in still exists.
3. In the Supabase dashboard, **Authentication → Users**, find the row by the id
   printed under the entry, and delete it. The profile and everything hanging off
   it deliberately no longer cascade from that row, so the delete no longer takes
   a support case, an audit trail or a teacher's earnings with it. If it is
   refused, read the reason rather than working around it.
4. Back on `/admin/retention`, press **Record it deleted at the provider** on that
   entry. The database asks `auth.users` first: if the row is still there the press
   is refused and nothing is written. If it is gone, `erased_identities` records the
   date and who did it, and the audit log gets `identity.removed`.
5. The count falls by one. At zero, every closed account's sign-in has been
   deleted.

**Do the round trip in one sitting.** A delete done on Friday and recorded on
Monday is a weekend in which the screen says the opposite of the truth — and the
refusal at step 4 exists precisely so that cannot be recorded as if it had
happened.

`identity_lookup()` answers the follow-up — *is it gone?* — from a fingerprint of
the address, and audits every time it is asked. It never returns a name.

---

## 10. The six ways this bites

1. **The project pauses** after seven idle days and the site is down until you
   restore it. An hourly cron is not a guaranteed prevention.
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

- [ ] `npm run preflight` exits 0, with nothing dark but payments
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

### Local quiz draft model

The optional, self-hosted teacher quiz drafting setup and its limits are described
in [local-quiz.md](local-quiz.md). It is off until the owner enables it.
