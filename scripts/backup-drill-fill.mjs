// Fills the drill's scratch database with what this repository would put in a
// new project: every migration in order, then two invented accounts so that
// the copy has rows in `auth` as well as `public`. Local only: it refuses any
// address that is not the runner's own scratch database.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const url = process.env.AYAHSPRING_SCRATCH_URL || '';
if (!/^postgresql:\/\/postgres:postgres@127\.0\.0\.1:\d+\/postgres$/.test(url)) {
  console.error('Not started: the drill database is not a local one on this runner.');
  process.exit(1);
}
const dir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));
const files = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort();
const { Client } = await import('pg');
const client = new Client({ connectionString: url, connectionTimeoutMillis: 10000 });
const annotate = (text) => console.log(`::error title=Backup drill::${text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')}`);
await client.connect();
try {
  for (const name of files) {
    try { await client.query(readFileSync(`${dir}/${name}`, 'utf8')); }
    catch (error) {
      // The migrations are public and the database is empty: the message can be shown.
      annotate(`The drill database could not take ${name}: ${String(error?.message ?? error).split('\n')[0].slice(0, 300)}`);
      process.exit(1);
    }
  }
  for (const [email, name] of [['synthetic-one@example.invalid', 'Synthetic One'], ['synthetic-two@example.invalid', 'Synthetic Two']]) {
    try {
      await client.query(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, '', now(), '{"provider":"email","providers":["email"]}', $2, now(), now())`,
      [email, JSON.stringify({ full_name: name })]);
    } catch (error) {
      annotate(`The drill database could not take an invented account: ${String(error?.message ?? error).split('\n')[0].slice(0, 300)}`);
      process.exit(1);
    }
  }
  const { rows: [row] } = await client.query(`select (select count(*) from auth.users)::int as users, (select count(*) from public.user_profiles)::int as profiles,
    (select count(*) from pg_tables where schemaname = 'public')::int as tables`);
  console.log(`The drill database holds ${files.length} migrations: ${row.tables} tables, ${row.users} invented accounts, ${row.profiles} profiles.`);
  if (row.users !== 2 || row.profiles < 2) { annotate('The two invented accounts did not each get a profile.'); process.exit(1); }
} finally { await client.end().catch(() => {}); }
