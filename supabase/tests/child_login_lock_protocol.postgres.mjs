// Optional real-PostgreSQL experiment, NOT a recovery implementation.
// Requires a disposable, empty local database named ayahspring_child_lock_test.
// PGHOST must be an absolute Unix socket directory; never point this at a project.
import { Client } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

if (process.env.CHILD_LOGIN_LOCK_TEST !== '1' || !process.env.PGHOST?.startsWith('/') ||
    process.env.PGDATABASE !== 'ayahspring_child_lock_test') {
  throw new Error('Use CHILD_LOGIN_LOCK_TEST=1, a local Unix PGHOST and a disposable empty PGDATABASE=ayahspring_child_lock_test');
}
const a = new Client(); const b = new Client();
const migrations = new URL('../migrations/', import.meta.url);
try {
  await a.connect(); await b.connect();
  const existing = await a.query("select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and c.relkind in ('r','p','v','m','S') limit 1");
  if (existing.rowCount) throw new Error('Database is not empty; refusing to run');
  await a.query(await readFile(new URL('harness.sql', import.meta.url), 'utf8'));
  for (const file of (await readdir(migrations)).filter(f => f.endsWith('.sql')).sort())
    await a.query(await readFile(new URL(file, migrations), 'utf8'));
  const user = randomUUID();
  await a.query('insert into auth.users(id,email) values($1,$2)', [user,`${user}@example.test`]);
  const role = (await a.query("select id from public.roles where code='instructor'")).rows[0].id;
  await a.query("insert into public.user_role_assignments(user_id,role_id,revoked_at,revocation_reason) values($1,$2,now(),'test')", [user,role]);

  // This models the proposed identity portion of the lock protocol. The user
  // row's FOR UPDATE conflicts with FK key-share locks on new references;
  // existing assignments must also be locked to block their reactivation.
  await a.query('begin');
  await a.query('select 1 from public.user_profiles where user_id=$1 for update', [user]);
  await a.query('select id from public.user_role_assignments where user_id=$1 order by id for update', [user]);
  async function blocked(sql, params) {
    await b.query('begin'); await b.query("set local lock_timeout='300ms'");
    try { await assert.rejects(b.query(sql,params), e => e.code === '55P03'); }
    finally { await b.query('rollback'); }
  }
  await blocked('update public.user_role_assignments set revoked_at=null,revocation_reason=null where user_id=$1', [user]);
  await blocked('insert into public.user_role_assignments(user_id,role_id) values($1,$2)', [user,role]);
  await a.query('rollback');

  // A waiting locker must see a role committed while it was waiting, not an
  // earlier snapshot. This is essential before making an exclusivity decision.
  await b.query('begin');
  await b.query('update public.user_role_assignments set revoked_at=null,revocation_reason=null where user_id=$1', [user]);
  await a.query('begin');
  const waiting = a.query('select id from public.user_role_assignments where user_id=$1 order by id for update', [user]);
  const pid = a.processID;
  await b.query('select pg_sleep(0.1)');
  const blockers = (await b.query('select pg_blocking_pids($1) as ids', [pid])).rows[0].ids;
  assert.ok(blockers.includes(b.processID), 'the recheck did not actually wait for the competing transaction');
  await b.query('commit'); await waiting;
  assert.equal((await a.query('select public.child_login_identity_exclusive($1) as exclusive', [user])).rows[0].exclusive, false);
  await a.query('rollback');
  console.log('PostgreSQL lock experiment passed: insert, reactivation and post-wait recheck');
} finally {
  await a.end().catch(()=>{}); await b.end().catch(()=>{});
}
