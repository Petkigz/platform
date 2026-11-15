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

A separate `/api/learn/position-v2` route now exposes the snapshot and
compare-and-write RPCs with authenticated actor scope, strict input and response
validation, conflict responses and private no-store headers. Its route test uses
synthetic Auth/RPC dependencies. The lesson players now use that API and show
both positions when a version conflict occurs, letting the learner use the saved
place or explicitly attempt to keep the current player’s place. A repeated
conflict requires another choice. A lost reply stops writes and requires reload.
A synthetic DOM test covers the player and both conflict choices. The media
controls are made available if the initial snapshot fails or times out, with a
warning that saving is unavailable.

The player offers optional recovery storage, off by default for each browser
profile. It warns about shared-profile visibility and that opting out removes
recovery records for all accounts on that browser. Records are scoped to the
verified actor, enrolment, lesson and player session. An existing record is
presented for review or discard before automatic saves resume; using it still
requires an explicit comparison against the account's saved place. Confirmed
writes remove the corresponding recovery record. Opt-out remains available
when the snapshot request fails. POST checks that the authenticated account has
not changed since the snapshot. The DOM simulation covers an interrupted save,
actor isolation, review, successful confirmation and offline opt-out.

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

**Not yet verified end to end:** migrations 1360 and 1370 and the updated app
are local only and need a reviewed, coordinated rollout. An old deployed app
would fail to save after 1370; the new app cannot save before 1360. Privileged
service/owner writes can bypass the ordinary-role boundary. Selected PostgreSQL
race tests are in `supabase/tests/resume_position_lock_protocol.postgres.mjs`;
check their actual run result, and do not equate them with proof of every
interleaving. In particular, concurrent authorization revocation, hosted
PostgREST/Auth/RLS, migration ownership/default grants and real browser lifecycle
remain to be verified before claiming cross-device safety.

Even opt-in recovery cannot guarantee a position after storage is disabled,
cleared or fails, before any recovery record can be written, or if the learner
never returns to that browser profile. Do not promise lossless page-exit saves.
