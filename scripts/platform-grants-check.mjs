#!/usr/bin/env node
// Do the migrations leave `anon` and `authenticated` with the same privileges
// whether or not the database started with a hosted Supabase project's default
// privileges?
//
// Why this exists: until migration 20261281144000 they did not. The hosted
// platform grants every new function, table and sequence in `public` to the
// API roles by name, and `revoke … from public` does not take a named grant
// back. The suites ran on a database without those defaults and saw a closed
// door that was open on the hosted one.
//
// What it does: builds the schema twice in PGlite, once with the
// `platform-defaults` block of supabase/tests/harness.sql and once without,
// applies every migration to both, and compares
//
//   * every function, table, column and sequence privilege the two roles hold
//     (through a grant to the role or to PUBLIC);
//   * what a table, a sequence and a function created afterwards receive, which
//     is what the next migration will get.
//
// It also asserts three things about the result that hold on either database:
// neither role holds a privilege on a sequence; neither holds TRUNCATE,
// REFERENCES or TRIGGER on a table; `anon` cannot UPDATE or DELETE anything.
//
// What it does not prove: that the hosted project's defaults are still the
// ones copied into the harness (they were read on 2026-11-17), or anything
// about schemas other than `public`.
//
// Run from the repository root: node scripts/platform-grants-check.mjs

import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'supabase', 'migrations');
const harness = readFileSync(join(root, 'supabase', 'tests', 'harness.sql'), 'utf8');

const BLOCK = /-- platform-defaults:begin[\s\S]*?-- platform-defaults:end\n?/;
if (!BLOCK.test(harness)) {
  console.error('supabase/tests/harness.sql has no platform-defaults block; this check has nothing to compare.');
  process.exit(1);
}
const block = harness.match(BLOCK)[0];
for (const kind of ['tables', 'sequences', 'functions']) {
  if (!new RegExp(`grant all on ${kind} to anon, authenticated, service_role`).test(block)) {
    console.error(`The platform-defaults block no longer grants ${kind} to the API roles; the comparison would prove nothing.`);
    process.exit(1);
  }
}

const PRIVILEGES = `
select 'function|' || r.rolname || '|' || p.oid::regprocedure::text as line
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
       (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r
 where n.nspname = 'public' and has_function_privilege(r.rolname, p.oid, 'execute')
union all
select 'table|' || r.rolname || '|' || c.relname || '|' || priv
  from pg_class c join pg_namespace n on n.oid = c.relnamespace,
       (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r,
       unnest(array['select','insert','update','delete','truncate','references','trigger']) priv
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

// What the next migration's objects would receive.
const PROBE = `
create table public.platform_grants_probe_table (id bigint generated always as identity primary key);
create sequence public.platform_grants_probe_sequence;
create function public.platform_grants_probe_function() returns integer language sql as 'select 1';`;

async function build(label, sql) {
  const started = Date.now();
  const db = new PGlite();
  await db.exec(sql);
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    try {
      await db.exec(readFileSync(join(migrationsDir, f), 'utf8'));
    } catch (e) {
      console.error(`${label}: migration ${f} failed: ${String(e?.message ?? e).split('\n')[0]}`);
      process.exit(1);
    }
  }
  const before = (await db.query(PRIVILEGES)).rows.map((r) => r.line);
  await db.exec(PROBE);
  const after = (await db.query(PRIVILEGES)).rows.map((r) => r.line);
  const existing = new Set(before);
  const probe = after.filter((l) => !existing.has(l));
  await db.close();
  console.log(`${label}: ${files.length} migrations, ${before.length} privileges, ${Math.round((Date.now() - started) / 1000)} s`);
  return { privileges: before, probe };
}

const without = await build('without the platform defaults', harness.replace(BLOCK, ''));
const withDefaults = await build('with the platform defaults', harness);

const problems = [];
function compare(title, a, b) {
  const inA = new Set(a); const inB = new Set(b);
  const onlyPlatform = b.filter((l) => !inA.has(l));
  const onlyBare = a.filter((l) => !inB.has(l));
  if (onlyPlatform.length) {
    problems.push(`${title}: ${onlyPlatform.length} held only where the platform defaults exist (so on the hosted database, and unseen by a database without them):\n    ` + onlyPlatform.slice(0, 40).join('\n    ') + (onlyPlatform.length > 40 ? `\n    … and ${onlyPlatform.length - 40} more` : ''));
  }
  if (onlyBare.length) {
    problems.push(`${title}: ${onlyBare.length} held only where the platform defaults do not exist:\n    ` + onlyBare.slice(0, 40).join('\n    ') + (onlyBare.length > 40 ? `\n    … and ${onlyBare.length - 40} more` : ''));
  }
}
compare('Existing objects', without.privileges, withDefaults.privileges);
compare('A table, sequence and function created next', without.probe, withDefaults.probe);

// A new function is executable by everyone until its migration revokes that;
// PostgreSQL's own default, the same on both. Anything else on the probe
// objects must be the project's rule: the four ordinary operations on a new
// table for somebody signed in.
const expectedProbe = [
  'function|anon|platform_grants_probe_function()',
  'function|authenticated|platform_grants_probe_function()',
  ...['delete', 'insert', 'select', 'update'].map((p) => `table|authenticated|platform_grants_probe_table|${p}`),
].sort();
for (const [label, got] of [['without the platform defaults', without.probe], ['with the platform defaults', withDefaults.probe]]) {
  if (JSON.stringify([...got].sort()) !== JSON.stringify(expectedProbe)) {
    problems.push(`New objects, ${label}, received something other than the project's rule:\n    ` + ([...got].sort().join('\n    ') || '(nothing)'));
  }
}

for (const [label, lines] of [['without the platform defaults', without.privileges], ['with the platform defaults', withDefaults.privileges]]) {
  const sequences = lines.filter((l) => l.startsWith('sequence|'));
  if (sequences.length) problems.push(`${label}: an API role holds a sequence privilege:\n    ` + sequences.slice(0, 20).join('\n    '));
  const structural = lines.filter((l) => /^table\|[^|]+\|[^|]+\|(truncate|references|trigger)$/.test(l));
  if (structural.length) problems.push(`${label}: an API role may TRUNCATE, REFERENCE or put a TRIGGER on a table:\n    ` + structural.slice(0, 20).join('\n    '));
  const anonWrites = lines.filter((l) => /^(table|column)\|anon\|[^|]+\|(update|delete)$/.test(l));
  if (anonWrites.length) problems.push(`${label}: somebody not signed in may UPDATE or DELETE:\n    ` + anonWrites.slice(0, 20).join('\n    '));
}

if (problems.length) {
  console.error('\nPLATFORM GRANTS CHECK FAILED\n');
  for (const p of problems) console.error(`  ${p}\n`);
  console.error('A migration must leave the API roles with the same privileges on both databases.');
  console.error('Grant by name what is meant; revoke from anon and authenticated by name what is not.');
  process.exit(1);
}
const count = (prefix) => without.privileges.filter((l) => l.startsWith(prefix)).length;
console.log(`\nSame on both: anon may call ${count('function|anon|')} functions and read or insert into ${new Set(without.privileges.filter((l) => /^(table|column)\|anon\|/.test(l)).map((l) => l.split('|')[2].split('.')[0])).size} tables; authenticated may call ${count('function|authenticated|')} functions.`);
console.log('New tables, sequences and functions receive the same on both.');
