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
  // Exercise the actual creation RPC while revocation holds the relationship
  // lock. The precheck sees the old committed relationship; the recheck must
  // see the revocation committed while it waited.
  const guardian = randomUUID();
  await a.query('insert into auth.users(id,email) values($1,$2)', [guardian,`${guardian}@example.test`]);
  await a.query("select set_config('app.bypassing_code_flag','on',false)");
  await a.query("update public.platform_settings set value_text='true' where key='family.child_login'");
  await a.query('begin');
  await a.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:guardian,role:'authenticated'})]);
  const family=(await a.query("select public.create_family('Lock test') id")).rows[0].id;
  await a.query('commit');
  const learner=(await a.query("insert into public.learner_profiles(display_name,learner_type,age_band,family_id) values('Test child','child','8-10',$1) returning id",[family])).rows[0].id;
  await a.query("insert into public.guardian_relationships(guardian_user_id,learner_profile_id,relationship_type,status,can_manage_profile,verified_at,consent_expires_at) values($1,$2,'parent','active',true,now()-interval '1 day',now()+interval '1 year')",[guardian,learner]);
  await b.query('begin');
  await b.query("update public.guardian_relationships set status='revoked',can_manage_profile=false,can_manage_learning=false,can_view_progress=false where guardian_user_id=$1 and learner_profile_id=$2",[guardian,learner]);
  await a.query('begin');
  await a.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:guardian,role:'authenticated'})]);
  const creation=a.query("select public.prepare_child_login($1,'lock.test')",[learner]);
  await b.query('select pg_sleep(0.1)');
  assert.ok((await b.query('select pg_blocking_pids($1) ids',[a.processID])).rows[0].ids.includes(b.processID), 'creation did not wait for revocation');
  // Attach the rejection handler before releasing the blocker to avoid an
  // unhandled rejection while the query is in flight.
  const rejected=assert.rejects(creation, /verified_guardian_required/);
  await b.query('commit'); await rejected; await a.query('rollback');
  assert.equal((await a.query('select count(*)::int n from public.child_login_attempts where learner_profile_id=$1',[learner])).rows[0].n,0);
  // Consent may expire while the request is waiting, even though now() stays
  // fixed at its transaction start time.
  await a.query("update public.guardian_relationships set status='active',can_manage_profile=true,consent_expires_at=clock_timestamp()+interval '2 seconds' where guardian_user_id=$1 and learner_profile_id=$2",[guardian,learner]);
  await b.query('begin'); await b.query('select 1 from public.guardian_relationships where guardian_user_id=$1 and learner_profile_id=$2 for update',[guardian,learner]);
  await a.query('begin'); await a.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:guardian,role:'authenticated'})]);
  const expiring=a.query("select public.prepare_child_login($1,'lock.expire')",[learner]);
  await b.query('select pg_sleep(0.1)');
  assert.ok((await b.query('select pg_blocking_pids($1) ids',[a.processID])).rows[0].ids.includes(b.processID), 'creation did not wait for consent expiry');
  const expiryRejected=assert.rejects(expiring,/verified_guardian_required/);
  await b.query('select pg_sleep(2.1)'); await b.query('commit'); await expiryRejected; await a.query('rollback');

  // Create a real trusted login, then race the actual detachment RPC against
  // revocation. A committed revocation must prevent the detachment.
  await a.query("update public.guardian_relationships set consent_expires_at=clock_timestamp()+interval '1 year' where guardian_user_id=$1 and learner_profile_id=$2",[guardian,learner]);
  await a.query('begin'); await a.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:guardian,role:'authenticated'})]);
  const attempt=(await a.query("select public.prepare_child_login($1,'lock.child') id",[learner])).rows[0].id;
  await a.query('commit');
  const child=randomUUID();
  await a.query("insert into auth.users(id,email,raw_app_meta_data) values($1,'lock.child@learners.ayahspring.com',jsonb_build_object('ayahspring_child_attempt',$2::text))",[child,attempt]);
  await a.query('select public.complete_child_login_attempt($1,$2,$3)',[attempt,guardian,child]);
  await b.query('begin'); await b.query("update public.guardian_relationships set status='revoked',can_manage_profile=false,can_manage_learning=false,can_view_progress=false where guardian_user_id=$1 and learner_profile_id=$2",[guardian,learner]);
  await a.query('begin'); await a.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:guardian,role:'authenticated'})]);
  const removal=a.query("select public.remove_child_login($1,'test race')",[learner]);
  await b.query('select pg_sleep(0.1)');
  assert.ok((await b.query('select pg_blocking_pids($1) ids',[a.processID])).rows[0].ids.includes(b.processID), 'detachment did not wait for revocation');
  const removalRejected=assert.rejects(removal,/verified_guardian_required/);
  await b.query('commit'); await removalRejected; await a.query('rollback');
  assert.equal((await a.query('select linked_user_id from public.learner_profiles where id=$1',[learner])).rows[0].linked_user_id,child);
  console.log('PostgreSQL lock experiment passed: role locks, creation/revocation, expiry and detachment/revocation');
} finally {
  await a.end().catch(()=>{}); await b.end().catch(()=>{});
}
