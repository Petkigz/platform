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

**Neither limit is fixed end to end yet.** The old unconditional API and RPC
can still overwrite a newer position. Existing RLS-authorized progress updates
can also write positions unconditionally. The new player requires migration
1360 and must not be deployed without it; neither should be deployed alone as a
fix. Remove or protect all legacy write paths in a coordinated rollout, and test the
actual PostgreSQL interleavings, authorized roles and hosted Auth/RLS before
claiming cross-device safety. PGlite tests are sequential, not a concurrency or
hosted PostgREST test. Review concurrent enrolment re-pinning and authorization
changes too.

Even opt-in recovery cannot guarantee a position after storage is disabled,
cleared or fails, before any recovery record can be written, or if the learner
never returns to that browser profile. Do not promise lossless page-exit saves.
