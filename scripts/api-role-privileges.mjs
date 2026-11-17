#!/usr/bin/env node
// What `anon` and `authenticated` may do in `public`, as a list of lines that
// can be compared between two databases.
//
// Two users: scripts/platform-grants-check.mjs compares a database built with
// the hosted platform's default privileges against one built without, and
// scripts/hosted-migration-advance.mjs compares the hosted test project against
// the database the suites run on.
//
// Run directly to write the reference list for the complete local chain:
//   node scripts/api-role-privileges.mjs --write <file.json>
// It builds the schema in PGlite from supabase/tests/harness.sql and every
// migration. That is the database the tests have always used, so the list is
// "what was tested", not "what is right".

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'supabase', 'migrations');

// MAINTAIN exists from PostgreSQL 17; naming it to an older server is an error.
const TABLE_PRIVILEGES = `array['select','insert','update','delete','truncate','references','trigger']
         || case when current_setting('server_version_num')::integer >= 170000 then array['maintain'] else array[]::text[] end`;

export const PRIVILEGES = `
select 'function|' || r.rolname || '|' || p.oid::regprocedure::text as line
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
       (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r
 where n.nspname = 'public' and has_function_privilege(r.rolname, p.oid, 'execute')
union all
select 'table|' || r.rolname || '|' || c.relname || '|' || priv
  from pg_class c join pg_namespace n on n.oid = c.relnamespace,
       (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r,
       unnest(${TABLE_PRIVILEGES}) priv
 where n.nspname = 'public' and c.relkind in ('r','p','v','m')
   and has_table_privilege(r.rolname, c.oid, priv)
union all
select 'column|' || r.rolname || '|' || c.relname || '.' || a.attname || '|' || priv
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
       join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped,
       (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r,
       unnest(array['select','insert','update','references']) priv
 where n.nspname = 'public' and c.relkind in ('r','p','v','m')
   and has_column_privilege(r.rolname, c.oid, a.attnum, priv)
   and not has_table_privilege(r.rolname, c.oid, priv)
union all
select 'sequence|' || r.rolname || '|' || c.relname || '|' || priv
  from pg_class c join pg_namespace n on n.oid = c.relnamespace,
       (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r,
       unnest(array['usage','select','update']) priv
 where n.nspname = 'public' and c.relkind = 'S'
   and has_sequence_privilege(r.rolname, c.oid, priv)
order by 1`;

// What the migrating role's next table, sequence or function in `public` will
// be given. Only the role running the query: a hosted project also keeps
// defaults for `supabase_admin`, which no migration here runs as.
export const DEFAULTS = `
select 'default|' || d.defaclobjtype::text || '|' || pg_get_userbyid(a.grantee)::text || '|' || lower(a.privilege_type) as line
  from pg_default_acl d, aclexplode(d.defaclacl) a
 where d.defaclnamespace = 'public'::regnamespace
   and d.defaclrole = (select oid from pg_roles where rolname = current_user)
   and pg_get_userbyid(a.grantee)::text in ('anon', 'authenticated')
order by 1`;

// Every function, table, view, column and sequence in `public`, by name: two
// databases can only be compared privilege by privilege if they hold the same
// things, written the same way.
export const INVENTORY = `
select 'function|' || p.oid::regprocedure::text as line
  from pg_proc p where p.pronamespace = 'public'::regnamespace
union all
select 'relation|' || c.relkind::text || '|' || c.relname
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m','S')
union all
select 'column|' || c.relname || '.' || a.attname
  from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
 where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m')
order by 1`;

export function localMigrations() {
  return readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
}

// Lines held by one side and not the other. Order and duplicates do not matter.
export function difference(expected, actual) {
  const inExpected = new Set(expected); const inActual = new Set(actual);
  return {
    missing: [...inExpected].filter((l) => !inActual.has(l)).sort(),
    extra: [...inActual].filter((l) => !inExpected.has(l)).sort(),
  };
}

// The tested database, built as far as `count` migrations (all of them when
// omitted). Returns the three lists.
export async function reference(count) {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(readFileSync(join(root, 'supabase', 'tests', 'harness.sql'), 'utf8'));
  const files = localMigrations().slice(0, count ?? undefined);
  for (const f of files) await db.exec(readFileSync(join(migrationsDir, f), 'utf8'));
  const lines = async (sql) => (await db.query(sql)).rows.map((r) => r.line);
  const out = { migrations: files.length, last: files.at(-1), privileges: await lines(PRIVILEGES), defaults: await lines(DEFAULTS), inventory: await lines(INVENTORY) };
  await db.close();
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const at = process.argv.indexOf('--write');
  const file = at > 0 ? process.argv[at + 1] : null;
  if (!file) { console.error('Usage: node scripts/api-role-privileges.mjs --write <file.json>'); process.exit(1); }
  const started = Date.now();
  const built = await reference();
  writeFileSync(file, JSON.stringify(built));
  console.log(`Tested database: ${built.migrations} migrations through ${built.last}; ${built.privileges.length} privileges for anon and authenticated, ${built.defaults.length} defaults for new objects, ${built.inventory.length} named things in public. ${Math.round((Date.now() - started) / 1000)} s.`);
}
