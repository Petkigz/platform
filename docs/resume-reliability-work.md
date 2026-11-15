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

A separately tested recovery-storage helper requires opt-in, scopes records by
authenticated actor and lesson, isolates player sessions and expires records
when the storage is next accessed. It is not connected to the player yet.
Storage cleanup cannot run while the browser is closed, and localStorage cannot
atomically compare and delete across tabs.

**Neither limit is fixed end to end yet.** The old unconditional API and RPC
can still overwrite a newer position. Existing RLS-authorized progress updates
can also write positions unconditionally. The opt-in device recovery UI does not
exist. The new player requires migration 1360 and must not be deployed without
it; neither should be deployed alone as a fix. Integrate recovery, remove or
protect all legacy write paths in a coordinated rollout, and test the
actual PostgreSQL interleavings, authorized roles and hosted Auth/RLS before
claiming cross-device safety. PGlite tests are sequential, not a concurrency or
hosted PostgREST test. Review concurrent enrolment re-pinning and authorization
changes too.

Even opt-in recovery cannot guarantee a position after storage is disabled,
cleared or fails, before any recovery record can be written, or if the learner
never returns to that browser profile. Do not promise lossless page-exit saves.
