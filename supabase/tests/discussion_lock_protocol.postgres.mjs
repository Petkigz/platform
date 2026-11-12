// Optional local PostgreSQL lock test. It applies every migration and creates
// synthetic rows in an explicitly named empty database. Never use a project DB.
import { Client } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
if (process.env.DISCUSSION_LOCK_TEST !== '1' || !process.env.PGHOST?.startsWith('/') ||
    process.env.PGDATABASE !== 'ayahspring_discussion_lock_test') {
  throw new Error('Use DISCUSSION_LOCK_TEST=1, a local Unix PGHOST and empty PGDATABASE=ayahspring_discussion_lock_test');
}
const a=new Client(),b=new Client(),observer=new Client();
try {
  await Promise.all([a.connect(),b.connect(),observer.connect()]);
  const existing=await a.query("select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and c.relkind in ('r','p','v','m','S') limit 1");
  if(existing.rowCount)throw new Error('Database is not empty; refusing to run');
  await a.query(await readFile(new URL('harness.sql',import.meta.url),'utf8'));
  const dir=new URL('../migrations/',import.meta.url);
  for(const f of (await readdir(dir)).filter(x=>x.endsWith('.sql')).sort()) await a.query(await readFile(new URL(f,dir),'utf8'));
  const admin=randomUUID(),lesson=randomUUID(),root=randomUUID(),reply=randomUUID();
  await a.query("insert into auth.users(id,email) values($1,'discussion-lock@example.test')",[admin]);
  await a.query('begin');await a.query("set local app.bootstrap_privileged_roles='on'");
  await a.query("insert into public.user_role_assignments(user_id,role_id,assigned_by) select $1,id,$1 from public.roles where code='platform_admin'",[admin]);await a.query('commit');
  // Synthetic lesson coordinates: only fixture setup bypasses FK and triggers.
  // The tested moderation function and row updates run normally afterwards.
  await a.query("set session_replication_role='replica'");
  await a.query("insert into public.discussion_posts(id,lesson_id,author_user_id,body,author_kind,visibility_state) values($1,$2,$3,'Question','teacher','visible')",[root,lesson,admin]);
  await a.query("insert into public.discussion_posts(id,lesson_id,parent_id,author_user_id,body,author_kind,visibility_state) values($1,$2,$3,$4,'Original','learner','pending')",[reply,lesson,root,admin]);
  await a.query("set session_replication_role='origin'");
  async function moderator() {await b.query('begin');await b.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:admin,role:'authenticated'})]);await b.query('set local role authenticated');}
  async function blocked(waiter,blocker) {
    await observer.query('select pg_sleep(0.1)');
    assert.ok((await observer.query('select pg_blocking_pids($1) ids',[waiter.processID])).rows[0].ids.includes(blocker.processID),'expected query to wait for the other transaction');
  }
  const decide=(body,parentState='visible')=>b.query("select id from public.moderate_discussion_post($1,'visible','review',$2,'pending',$3,'Question',$4)",[reply,body,root,parentState]);
  // A body edit that commits while approval waits must cause approval to fail.
  await a.query('begin');await a.query("update public.discussion_posts set body='Changed' where id=$1",[reply]);await moderator();
  const approval=decide('Original');const rejected=assert.rejects(approval,/post changed or is unavailable/);
  await blocked(b,a);await a.query('commit');await rejected;await b.query('rollback');
  assert.equal((await a.query('select visibility_state from public.discussion_posts where id=$1',[reply])).rows[0].visibility_state,'pending');
  // A parent hidden while approval waits must also invalidate that decision.
  await a.query('begin');await a.query("update public.discussion_posts set visibility_state='hidden',moderated_by=$2,moderated_at=now(),hidden_reason='withdrawn' where id=$1",[root,admin]);await moderator();
  const waiting=decide('Changed');const hiddenRejected=assert.rejects(waiting,/question changed or is unavailable/);
  await blocked(b,a);await a.query('commit');await hiddenRejected;await b.query('rollback');
  // If approval takes the parent lock first, hiding waits and proceeds afterwards.
  await a.query("update public.discussion_posts set visibility_state='visible',hidden_reason=null where id=$1",[root]);
  await moderator();await decide('Changed');
  await a.query('begin');const hide=a.query("update public.discussion_posts set visibility_state='hidden',hidden_reason='withdrawn' where id=$1",[root]);
  await blocked(a,b);await b.query('commit');await hide;await a.query('commit');
  assert.equal((await a.query('select visibility_state from public.discussion_posts where id=$1',[root])).rows[0].visibility_state,'hidden');
  console.log('PostgreSQL passed three selected discussion moderation lock races.');
} finally {await Promise.all([a.end().catch(()=>{}),b.end().catch(()=>{}),observer.end().catch(()=>{})]);}
