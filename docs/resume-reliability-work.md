# Resume reliability: work in progress

The intended behavior is to ask the learner when two players have conflicting
positions, including deliberate rewinds. Temporary on-device recovery requires
an explicit opt-in on each device and a clear shared-device privacy warning.

Migration 20261281136000 is an additive database foundation only. Its opaque
revisions rotate on every progress-row write, including legacy writes. The new
compare-and-write RPC checks the observed revision while locking an existing
row; an advisory transaction lock serializes competing initial inserts using
that RPC. A legacy concurrent initial insert can instead cause a unique
violation, which must be treated as an unconfirmed failure. A stale revision is
returned as a conflict rather than overwriting the saved position.

The resource-scoped `/api/learn/position-v3` route exposes the snapshot and
compare-and-write RPCs with authenticated actor scope, validation, conflict
responses and private no-store headers. Lesson players use it and show both
positions on conflict, including deliberate rewinds. A repeated conflict needs
another choice; a lost reply stops writes and requires reload. The previous
v2 endpoint now returns 410 and asks stale pages to reload. Route and React
component tests use synthetic dependencies, not hosted Auth/RLS or real media.

The player offers optional recovery storage, off by default for each browser
profile. It warns about shared-profile visibility and that opting out removes
recovery records for all accounts on that browser. Records are scoped to the
verified actor, enrolment, lesson, recording and player session. An existing record is
presented for review or discard before automatic saves resume; using it still
requires an explicit comparison against the account's saved place. Confirmed
writes remove the corresponding recovery record. Opt-out remains available
when the snapshot request fails. POST checks that the authenticated account has
not changed since the snapshot. The DOM simulation covers an interrupted save,
actor isolation, review, successful confirmation and offline opt-out. It also
checks that changing player props cannot flush a write past an unresolved
recovery choice; the tentative local place remains available for review.

**Multiple recordings:** lesson pages pass each recording identity to both
native and rendition players. The old lesson-wide place and old device records
are offered for explicit review rather than automatically attributed to a
recording. This is implemented locally; the pending database and app changes
must be rolled out together only after further verification.

Migration 1380 adds a private resource-position table tied to the existing
progress row (and cascaded with it on deletion), plus resource-checked snapshot
and compare-and-write functions. It does not infer or copy legacy positions.
PGlite tests cover resource isolation, access checks, stale saves, completion
and parent-deletion cascade. Disposable PostgreSQL run `43748596832` also passed
selected simultaneous same-resource, independent-resource and synthetic pin
change races. These do not prove all interleavings. Migration 1400 revokes the
lesson-wide compare-and-write RPC from ordinary roles, while retaining read
access for explicit review. It cannot cancel a statement already in flight;
rollout must drain old workers and wait for old database transactions before
enabling new writes. Do not deploy the foundation or app alone. Migration 1390 adds authorized recording positions to JSON,
CSV and print exports, with a 1,000-row cap and explicit count/truncation; the
resume, export and support PGlite suites passed together (48 assertions),
including a guardian-permission and cap check. The existing export audit event
covers its original sections; a separate audit event records the count and
truncation of recording positions, without recording their values.

The resume, account-closure and child-record PGlite suites passed together
(50 assertions), with their usual test-only guardian-verification setting.
They exercise actual closure and retention-job paths: recording positions
follow the retained adult study record after account closure, and eligible child
positions survive closure but cascade away with progress at the 30-day purge.
A separate child login or held coursework may block closure; held support links
follow their own rules. This is the existing retention policy, not proof that
archived records are fully anonymous or that external copies and browser storage
are erased. Open devices retain recovery records until cleared, expired on a
later visit, or deleted manually. Closure does not itself reach localStorage.
Concurrent closure/save races, hosted privileges, real browser lifecycle and
all other erasure paths remain unverified.

Resource-aware native and rendition players use the v3 route. A learner can
review an older lesson-wide server place only if the freshly authenticated actor
matches the actor used to render the page. The conflict gate is installed before
seeking, and a newer resource revision still conflicts. Lesson-only device
records can likewise be reviewed or discarded, and stay until confirmed save or
explicit discard. Synthetic React checks cover these flows, not real browser
lifecycle or hosted end-to-end behavior.

A separate resource recovery helper namespaces records by actor,
enrolment, lesson, resource and session. It shares the existing device opt-in;
lesson-only pending records remain separate and are never silently assigned to a
recording. Either updated helper clears both formats when consent is withdrawn.
A cached old client cannot clear the new namespace, however; coordinated rollout
and stale-client handling remain necessary. Unit tests cover isolation, expiry,
withdrawal and legacy separation, not browser lifecycle or cross-tab atomicity.

Recovery is best effort: the account must first be confirmed online, storage can
be unavailable or cleared, and positions may be lost before the first local
write or if the learner never returns to that browser. Records expire after
seven days but cleanup occurs only on later storage access; it cannot run while
the browser is closed. localStorage cannot atomically compare and delete across
tabs, so another tab can race record removal. Do not describe it as a durable or
cross-device outbox.

Migration 1370 revokes authenticated access to the unconditional legacy RPC
and removes ordinary direct permission to insert or update position and revision
columns, move progress identity keys, or delete progress rows. Status-only
progress insert/update remains permitted subject to RLS. The old position HTTP
endpoint responds 410, and the progress endpoint refuses a legacy position
payload rather than silently discarding it. Stale pages must reload. The new
compare-and-write function also locks the enrolment and rechecks the version
before writing, so a concurrent pin change cannot silently cross that check.
PGlite tested these privileges, the versioned writer and ordinary completion;
the route checks use simulated dependencies.

**Not yet verified end to end:** migrations 1360–1400 and the updated app
are local only and need a reviewed, coordinated rollout. Old deployed apps
fail to save after the relevant write revocations; the new app requires the
resource foundation. Privileged
service/owner writes can bypass the ordinary-role boundary. The selected real
PostgreSQL race tests in `supabase/tests/resume_position_lock_protocol.postgres.mjs`
passed on a disposable GitHub runner in run `43745135170`: competing first
writes, a stale rewind, a concurrent completion insert and a synthetic pin
change. Fixture setup bypassed triggers; the tested writes did not. These are
not proof of every interleaving or of the audited re-pin RPC. In particular,
concurrent authorization revocation, hosted
PostgREST/Auth/RLS, migration ownership/default grants and real browser lifecycle
remain to be verified before claiming cross-device safety.

Even opt-in recovery cannot guarantee a position after storage is disabled,
cleared or fails, before any recovery record can be written, or if the learner
never returns to that browser profile. Do not promise lossless page-exit saves.

The PGlite resume, progress, closure and child-retention suites passed together
with 63 assertions after integration. Historical lesson-writer behavior in the
resume suite uses a temporary **test-only** grant; separate checks confirm the
shipped function is unavailable before and after that fixture grant. Real
PostgreSQL tests for this revision are pending, including the new privilege
boundary; historical real-PostgreSQL results predate migration 1400.
