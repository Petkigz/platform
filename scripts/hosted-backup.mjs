// A copy of the AyahSpring test project's database, and a rehearsal of putting
// it back. The free tier keeps no backups, so this is the only copy there is.
//
// What one run does, in order:
//
//   1. Checks the address names the test project and the pinned certificate
//      authority is the one expected. Nothing is contacted before that.
//   2. Reads the hosted database inside a READ ONLY transaction and takes its
//      measure: how many rows each table holds and a fingerprint of them, the
//      sequences, how many functions, policies, triggers, views and types
//      there are, what `anon` and `authenticated` may do, and the migration
//      history.
//   3. Has the Supabase CLI write three files: the roles, the schema, and the
//      data. This is the method Supabase documents for a backup.
//   4. Puts the three files into an empty scratch database on the runner (a
//      local Supabase stack that has never seen this project) in one
//      transaction, as the restore instructions say to.
//   5. Takes the scratch database's measure the same way and compares. A
//      table that came back with a different number of rows, or the same
//      number and different contents, is named. So is a privilege that `anon`
//      or `authenticated` holds on one side and not the other: a restore that
//      quietly hands `anon` a table is the failure worth catching here.
//   6. If a passphrase was given, packs the three files and the measure into
//      one archive, encrypts it (AES-256, symmetric) and decrypts it again to
//      check that it opens. Only the encrypted file leaves the runner. With
//      no passphrase nothing is kept, and the run says so. A copy whose
//      rehearsal failed is kept too, named UNPROVEN, and the run is red: the
//      only copy there is must not be thrown away.
//
// It writes nothing to the hosted database: one read-only transaction, and
// `pg_dump`, which only reads.
//
// What it cannot do: copy the media files (they are in object storage, not in
// the database); copy Auth settings, API keys or secrets (they are the
// project's, not the database's); prove a restore into a NEW HOSTED project,
// because the scratch database is a local one; or keep the copy anywhere
// durable, because an artifact here expires. docs/deploy/README.md section 12
// says what to do about each.
//
// This repository is public and so are its logs. Nothing here prints a row, a
// value, the address or the raw output of a tool: only names of tables (which
// the migrations already publish), counts and fixed sentences.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, readFileSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { databaseUrlChecks, verifiedTlsUrl, trustedCaReady, failureCategories } from './hosted-migration-dry-run.mjs';
import { privilegeProblems, readPrivileges } from './hosted-migration-advance.mjs';

const caPath = fileURLToPath(new URL('../certs/supabase-prod-ca-2021.crt', import.meta.url));

// Run BEFORE the schema is put back, as the CLI's own notes say: a fresh
// Supabase database gives `anon` and `authenticated` everything on each new
// table in `public`, and the dump only states what differs from that.
export const BEFORE_RESTORE = `
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
`;

const quote = (name) => `"${String(name).replaceAll('"', '""')}"`;

// The tables whose rows are the platform's own: everything in `public`, and
// the accounts. Storage rows describe files that are not in this copy.
const TABLES = `select n.nspname as schema, c.relname as name
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p') and (n.nspname = 'public' or (n.nspname = 'auth' and c.relname <> 'schema_migrations'))
  order by 1, 2`;

// Every column of every Auth table, with its type as the database writes it.
// Supabase's Auth service owns these tables and adds columns as it is
// upgraded; the project's can be newer than a scratch database's.
const AUTH_COLUMNS = `select c.relname as name, a.attname as column, format_type(a.atttypid, a.atttypmod) as type
  from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'auth' and c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
  order by c.relname, a.attnum`;

const LEFT_OUT = `select n.nspname as schema, c.relname as name
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p') and n.nspname in ('storage', 'supabase_functions')
  order by 1, 2`;

// Rows in a table the copy leaves out, other than the two lists of Supabase's
// own migrations. Empty for this platform; if it is ever not, the copy is
// missing something and has to say so.
export function leftOutRows(measured) {
  return Object.entries(measured.leftOut ?? {}).filter(([name, rows]) => !name.endsWith('.migrations') && rows !== 0)
    .map(([name, rows]) => `${name} (${rows === null ? 'could not be counted' : `${rows} rows`})`);
}

// What the data file leaves out: Supabase's storage and webhook tables, and
// every Auth table that holds nothing. An empty table loses nothing by being
// left out, and its column list is the thing most likely not to fit another
// version of Auth. A table of Auth's that holds a row is always in the copy.
export function dataExclusions(measured) {
  const emptyAuth = Object.entries(measured.tables).filter(([name, t]) => name.startsWith('auth.') && t.rows === 0).map(([name]) => name);
  return [...Object.keys(measured.leftOut ?? {}), ...emptyAuth].sort();
}

// Auth tables that the database's owner could not read: they may hold rows
// and are not known to be in the copy.
export function unreadAuth(measured) {
  return Object.entries(measured.tables).filter(([name, t]) => name.startsWith('auth.') && t.rows === null).map(([name]) => name);
}

// Columns the project's Auth tables have and the scratch database's do not,
// for the tables that are in the copy. `missingTables` are tables the scratch
// database does not have at all: the copy cannot be rehearsed with those.
export function authGap(source, scratchColumns) {
  const columns = []; const missingTables = [];
  for (const [name, t] of Object.entries(source.tables)) {
    if (!name.startsWith('auth.') || !t.rows) continue;
    const there = scratchColumns[name];
    if (!there) { missingTables.push(name); continue; }
    const have = new Set(there.map(([column]) => column));
    for (const [column, type] of source.authColumns?.[name] ?? []) if (!have.has(column)) columns.push({ table: name, column, type });
  }
  return { columns, missingTables };
}

const SHAPE = `select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p'))::int as tables,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('v', 'm'))::int as views,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public')::int as functions,
  (select count(*) from pg_policies where schemaname = 'public')::int as policies,
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal)::int as triggers,
  (select count(*) from pg_indexes where schemaname = 'public')::int as indexes,
  (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public')::int as constraints,
  (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e')::int as enums,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity)::int as tables_with_row_security`;

// A table's rows as one number and one fingerprint that does not depend on
// the order they come back in. Two databases with the same rows give the same
// pair; the fingerprint says nothing about what the rows hold.
const rowsOf = (schema, name) => `select count(*)::text as rows,
  coalesce(md5(string_agg(h, '' order by h)), '') as print
  from (select md5(t::text) as h from ${quote(schema)}.${quote(name)} t) s`;

export async function measure(client) {
  await client.query('begin read only');
  try {
    // The same row must read the same on both sides.
    await client.query(`set local timezone = 'UTC'`);
    await client.query(`set local datestyle = 'ISO, MDY'`);
    await client.query(`set local intervalstyle = 'postgres'`);
    await client.query(`set local extra_float_digits = 1`);
    await client.query(`set local bytea_output = 'hex'`);
    const tables = {};
    for (const { schema, name } of (await client.query(TABLES)).rows) {
      try {
        await client.query('savepoint one_table');
        const { rows: [row] } = await client.query(rowsOf(schema, name));
        tables[`${schema}.${name}`] = { rows: Number(row.rows), print: row.print };
      } catch (error) {
        // A table of the platform's own that cannot be read is a failure. One
        // of Auth's that the database's owner may not read is recorded as such.
        if (schema !== 'auth') throw error;
        await client.query('rollback to savepoint one_table');
        tables[`${schema}.${name}`] = { rows: null, print: '' };
      }
    }
    const authColumns = {};
    for (const row of (await client.query(AUTH_COLUMNS)).rows) (authColumns[`auth.${row.name}`] ??= []).push([row.column, row.type]);
    const sequences = {};
    for (const row of (await client.query(`select sequencename as name, last_value::text as last from pg_sequences where schemaname = 'public' order by 1`)).rows) {
      sequences[row.name] = row.last;
    }
    const { rows: [shape] } = await client.query(SHAPE);
    const { rows: [{ version }] } = await client.query(`select current_setting('server_version') as version`);
    // Tables the copy leaves out: Supabase's own file storage and database
    // webhooks. The platform keeps its files in object storage elsewhere and
    // never writes here, and the database's owner may not write some of these
    // tables at all, so a copy that held them could not be put back.
    const leftOut = {};
    for (const { schema, name } of (await client.query(LEFT_OUT)).rows) {
      let count = null;
      try {
        await client.query('savepoint left_out');
        count = Number((await client.query(`select count(*)::text as rows from ${quote(schema)}.${quote(name)}`)).rows[0].rows);
      } catch { await client.query('rollback to savepoint left_out'); }
      leftOut[`${schema}.${name}`] = count;
    }
    let history = null;
    const { rows: [{ present }] } = await client.query(`select to_regclass('supabase_migrations.schema_migrations') is not null as present`);
    if (present) history = (await client.query('select version, name from supabase_migrations.schema_migrations order by version')).rows.map((r) => `${r.version}_${r.name}`);
    return { version, shape, tables, sequences, history, leftOut, authColumns };
  } finally { await client.query('rollback'); }
}

// What differs between the database that was copied and the one the copy was
// put back into. Empty when a restore gave back what was there.
export function differences(source, restored) {
  const out = [];
  for (const [key, value] of Object.entries(source.shape)) {
    if (restored.shape[key] !== value) out.push(`${key.replaceAll('_', ' ')}: ${value} in the project, ${restored.shape[key]} after the restore`);
  }
  const names = new Set([...Object.keys(source.tables), ...Object.keys(restored.tables)]);
  for (const name of [...names].sort()) {
    const a = source.tables[name]; const b = restored.tables[name];
    // Auth's tables are Supabase's, and which of them exist depends on the
    // version of its Auth service. One that holds nothing on either side is
    // not a difference; one that holds a row on either side is compared.
    if (name.startsWith('auth.') && !(a?.rows) && !(b?.rows) && a?.rows !== null && b?.rows !== null) continue;
    if (a?.rows === null || b?.rows === null) out.push(`table ${name}: could not be read ${a?.rows === null ? 'in the project' : 'after the restore'}`);
    else if (!b) out.push(`table ${name}: not there after the restore`);
    else if (!a) out.push(`table ${name}: there after the restore and not in the project`);
    else if (a.rows !== b.rows) out.push(`table ${name}: ${a.rows} rows in the project, ${b.rows} after the restore`);
    else if (a.print !== b.print) out.push(`table ${name}: ${a.rows} rows on both sides, and they are not the same rows`);
  }
  const sequences = new Set([...Object.keys(source.sequences), ...Object.keys(restored.sequences)]);
  for (const name of [...sequences].sort()) {
    // A sequence nobody has drawn from has no last value on either side.
    if ((source.sequences[name] ?? null) !== (restored.sequences[name] ?? null)) {
      out.push(`sequence ${name}: stands at ${source.sequences[name] ?? 'nothing'} in the project and ${restored.sequences[name] ?? 'nothing'} after the restore`);
    }
  }
  return out;
}

// What a dump file holds, by counting its statements. The file itself is never
// printed: this reads the first words of each line and nothing else.
export async function describeDump(path) {
  const seen = { tables: 0, functions: 0, policies: 0, copies: {}, roles: 0, bytes: statSync(path).size };
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.startsWith('CREATE TABLE ')) seen.tables += 1;
    else if (line.startsWith('CREATE OR REPLACE FUNCTION ') || line.startsWith('CREATE FUNCTION ')) seen.functions += 1;
    else if (line.startsWith('CREATE POLICY ')) seen.policies += 1;
    else if (line.startsWith('CREATE ROLE ')) seen.roles += 1;
    else {
      const copy = line.match(/^COPY "([^"]+)"\."[^"]+" \(/);
      if (copy) seen.copies[copy[1]] = (seen.copies[copy[1]] ?? 0) + 1;
    }
  }
  return seen;
}

// Only the database's own one-line complaints: a DETAIL or CONTEXT line can
// quote a row, and this log is public.
export function safeErrors(output) {
  return [...new Set(String(output).split(/\r?\n/).map((line) => line.match(/ERROR:\s+(.*)$/)?.[1]).filter(Boolean)
    .map((message) => message.replace(/\(([^)]*)\)=\(([^)]*)\)/g, '(…)=(…)').slice(0, 200)))].slice(0, 12);
}

function run(command, args, { input = null, env = process.env, cwd = undefined } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: [input === null ? 'ignore' : 'pipe', 'pipe', 'pipe'], env, cwd });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { if (output.length < 400000) output += chunk.toString(); });
    child.on('error', () => resolve({ code: null, output }));
    child.on('close', (code) => resolve({ code, output }));
    if (input !== null) {
      child.stdin.on('error', () => {});
      (async () => { for (const part of input) { if (typeof part === 'string') child.stdin.write(part); else await new Promise((done, fail) => { const s = createReadStream(part.file); s.on('error', fail); s.on('end', done); s.pipe(child.stdin, { end: false }); }); } child.stdin.end(); })().catch(() => child.stdin.end());
    }
  });
}

const sha256 = (path) => new Promise((resolve, reject) => {
  const hash = createHash('sha256'); const stream = createReadStream(path);
  stream.on('error', reject); stream.on('data', (chunk) => hash.update(chunk)); stream.on('end', () => resolve(hash.digest('hex')));
});

// Where the copy is taken from. `hosted` is the test project. `local` is the
// drill: the scratch database itself, filled from this repository's migrations,
// copied, emptied and filled again from the copy. The drill needs no secret and
// no approval, and tries every step of this file but the connection.
function sourceOf(env) {
  if ((env.AYAHSPRING_BACKUP_SOURCE || 'hosted') === 'local') return { kind: 'local', label: 'The drill database' };
  return { kind: 'hosted', label: 'The project' };
}

function reporter(title) {
  const lines = [];
  const say = (line) => { console.log(line); lines.push(line); };
  const finish = (ok) => {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${title}${ok ? '' : ': FAILED'}\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`);
    const text = lines.join('\n').slice(-3500).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.log(`::${ok ? 'notice' : 'error'} title=${title}::${text}`);
    if (!ok) process.exitCode = 1;
    return ok;
  };
  return { say, finish, fail: (line) => { say(line); return finish(false); } };
}

const scratchOk = (url, container) => /^postgresql:\/\/postgres:postgres@127\.0\.0\.1:\d+\/postgres$/.test(url) && /^[A-Za-z0-9_.-]+$/.test(container);

// The first half: take the source's measure and write the three files.
async function copy(env, { say, fail }) {
  const source = sourceOf(env);
  const dir = env.AYAHSPRING_BACKUP_DIR || '';
  if (!dir) return fail('Not started: no directory to write the copy into.');
  const { Client } = await import('pg');
  let client; let dumpTarget; let cwd;
  if (source.kind === 'hosted') {
    const value = env.AYAHSPRING_TEST_DATABASE_URL || ''; const password = env.AYAHSPRING_TEST_DATABASE_PASSWORD || '';
    if (!password || !Object.values(databaseUrlChecks(value)).every(Boolean)) return fail('Not started: the database URL or password secret is missing, or does not name the test project.');
    if (!trustedCaReady()) return fail('Not started: the pinned public Supabase CA is missing, changed or outside its validity period.');
    const target = verifiedTlsUrl(value, password);
    const parsed = new URL(target);
    client = new Client({ host: parsed.hostname, port: Number(parsed.port), database: 'postgres',
      user: decodeURIComponent(parsed.username), password, connectionTimeoutMillis: 10000,
      ssl: { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true, servername: parsed.hostname } });
    dumpTarget = [`--remote=${target}`];
  } else {
    if (!scratchOk(env.AYAHSPRING_SCRATCH_URL || '', env.AYAHSPRING_SCRATCH_CONTAINER || '') || !env.AYAHSPRING_SCRATCH_DIR) return fail('Not started: the drill database is not a local one on this runner.');
    client = new Client({ connectionString: env.AYAHSPRING_SCRATCH_URL, connectionTimeoutMillis: 10000 });
    dumpTarget = ['--local']; cwd = env.AYAHSPRING_SCRATCH_DIR;
  }
  mkdirSync(dir, { recursive: true });
  let measured; let privileges;
  try {
    await client.connect();
    measured = await measure(client);
    privileges = await readPrivileges(client);
  } catch { return fail(`Not copied: ${source.label.toLowerCase()} could not be reached or read.`); }
  finally { await client.end().catch(() => {}); }
  const rows = Object.values(measured.tables).reduce((sum, t) => sum + (t.rows ?? 0), 0);
  say(`${source.label}: PostgreSQL ${measured.version}; ${measured.shape.tables} tables, ${measured.shape.functions} functions, ${measured.shape.policies} policies, ${measured.shape.triggers} triggers; ${rows} rows in ${Object.keys(measured.tables).length} tables measured; ${measured.history ? measured.history.length : 'no'} migrations recorded.`);

  // The copy. The CLI's output is never shown when the source is the project: it can hold the address.
  const cli = env.SUPABASE_CLI_BIN || 'supabase';
  const files = { roles: `${dir}/roles.sql`, schema: `${dir}/schema.sql`, data: `${dir}/data.sql` };
  const excluded = dataExclusions(measured);
  const dataFlags = ['--data-only', '--use-copy', ...(excluded.length ? ['--exclude', excluded.join(',')] : [])];
  for (const [what, extra] of [['roles', ['--role-only']], ['schema', []], ['data', dataFlags]]) {
    const result = await run(cli, ['db', 'dump', ...dumpTarget, '--file', files[what], ...extra], { cwd });
    let size = 0; try { size = statSync(files[what]).size; } catch { /* reported below */ }
    if (result.code !== 0 || size === 0) {
      const categories = failureCategories(result.output);
      const shown = source.kind === 'local' ? `\n${result.output.slice(-1500)}` : ' Its output is not shown, because it can hold the address.';
      return fail(`Not copied: the CLI could not write the ${what} (${categories.length ? `possible cause: ${categories.join('; ')}` : 'unclassified failure'}).${shown}`);
    }
  }
  const held = { roles: await describeDump(files.roles), schema: await describeDump(files.schema), data: await describeDump(files.data) };
  const copied = Object.entries(held.data.copies).map(([schema, count]) => `${count} in ${schema}`).join(', ') || 'none';
  say(`The copy: schema ${held.schema.bytes} bytes (${held.schema.tables} tables, ${held.schema.functions} functions, ${held.schema.policies} policies); data ${held.data.bytes} bytes (tables copied: ${copied}); roles ${held.roles.bytes} bytes (${held.roles.roles} roles of the project's own).`);
  const stray = leftOutRows(measured);
  say(stray.length
    ? `NOT IN THE COPY, and holding rows: ${stray.join(', ')}. The copy leaves out Supabase's own file storage and webhooks; something has started using them, and this job has to be changed before the copy can be called complete.`
    : `Left out on purpose: ${Object.keys(measured.leftOut).length} tables of Supabase's own file storage and database webhooks, which hold nothing (the platform keeps its files elsewhere), and ${excluded.length - Object.keys(measured.leftOut).length} tables of its Auth service that hold nothing.`);
  const kept = Object.entries(measured.tables).filter(([name, t]) => name.startsWith('auth.') && t.rows).map(([name, t]) => `${name.slice(5)} (${t.rows})`);
  say(kept.length ? `Auth tables in the copy, with their rows: ${kept.join(', ')}.` : 'No Auth table holds a row: there are no accounts to copy yet.');
  const unread = unreadAuth(measured);
  if (unread.length) say(`COULD NOT BE READ, and so not known to be in the copy: ${unread.join(', ')}.`);
  for (const schema of Object.keys(held.data.copies)) {
    if (schema === 'auth' && !kept.length) return fail('Stopped: the data file holds Auth tables, and none was to be in it.');
    if (schema === 'storage' || schema === 'supabase_functions') return fail(`Stopped: the data file still holds tables from ${schema}, which were to be left out.`);
  }
  if (held.schema.tables < measured.shape.tables) return fail(`Stopped: the schema file creates ${held.schema.tables} tables and there are ${measured.shape.tables} in public. The copy is not complete.`);
  writeFileSync(`${dir}/measure.json`, JSON.stringify({ source: source.kind, takenAt: new Date().toISOString(), measured, privileges }));
  return true;
}

// The second half: put the three files into the empty scratch database,
// measure it, compare, and keep an encrypted archive if there is a passphrase.
async function restore(env, { say, fail, finish }, { put: putBack = true } = {}) {
  const dir = env.AYAHSPRING_BACKUP_DIR || '';
  const scratch = env.AYAHSPRING_SCRATCH_URL || ''; const container = env.AYAHSPRING_SCRATCH_CONTAINER || '';
  const passphrase = env.AYAHSPRING_BACKUP_PASSPHRASE || '';
  if (!scratchOk(scratch, container)) return fail('Not started: the scratch database is not a local one on this runner.');
  if (passphrase && passphrase.length < 20) return fail('Not started: the passphrase is shorter than 20 characters. Use a long one; it is the only thing between this copy and whoever downloads it.');
  let taken;
  try { taken = JSON.parse(readFileSync(`${dir}/measure.json`, 'utf8')); } catch { return fail('Not started: there is no copy to put back.'); }
  const { measured: source, privileges: sourcePrivileges } = taken;
  const files = { roles: `${dir}/roles.sql`, schema: `${dir}/schema.sql`, data: `${dir}/data.sql` };
  const { Client } = await import('pg');
  const read = async (reader) => {
    const client = new Client({ connectionString: scratch, connectionTimeoutMillis: 10000 });
    try { await client.connect(); return await reader(client); } finally { await client.end().catch(() => {}); }
  };
  if (putBack) try {
    const before = await read(measure);
    if (before.shape.tables !== 0) return fail(`Not started: the scratch database already holds ${before.shape.tables} tables in public. A rehearsal into a database that is not empty proves nothing.`);
  } catch { return fail('Not started: the scratch database could not be read.'); }

  let proven = true;
  const unproven = (line) => { say(line); proven = false; };
  const psql = (user, input) => run('docker', ['exec', '-i', '-e', 'PGPASSWORD=postgres', container, 'psql', '-h', '127.0.0.1', '-U', user, '-d', 'postgres',
    '--no-psqlrc', '--quiet', '--single-transaction', '--variable', 'ON_ERROR_STOP=1', '--file', '-'], { input });

  // The project's Auth service can be newer than the one a scratch database
  // starts with. Columns it has gained are added to the scratch database's
  // tables first, so that the copy fits. A real restore goes into a new
  // project, whose Auth is at least as new as the one that was copied.
  let ready = true;
  if (putBack) {
    let gap;
    try { gap = authGap(source, (await read(measure)).authColumns); } catch { return fail('Not started: the scratch database could not be read.'); }
    if (gap.missingTables.length) { ready = false; unproven(`NOT REHEARSED: the copy holds rows of ${gap.missingTables.join(', ')}, and the scratch database's Auth service has no such table. The rehearsal needs a newer scratch database (a newer CLI in the workflow).`); }
    else if (gap.columns.length) {
      const added = await psql('supabase_admin', [gap.columns.map((c) => `alter table ${quote('auth')}.${quote(c.table.slice(5))} add column if not exists ${quote(c.column)} ${c.type};\n`).join('')]);
      if (added.code !== 0) { ready = false; unproven(`NOT REHEARSED: the project's Auth service is newer than the scratch database's, and its ${gap.columns.length} newer columns could not be added there (${safeErrors(added.output).join('; ') || 'no complaint that can be shown'}).`); }
      else say(`The project's Auth service is newer than the scratch database's: ${gap.columns.length} columns were added to the scratch database first (${gap.columns.map((c) => `${c.table.slice(5)}.${c.column}`).join(', ')}).`);
    }
  }

  // All of it or none of it, and stop at the first complaint.
  const put = !putBack || !ready ? { code: 0, output: '' } : await psql('postgres',
    [BEFORE_RESTORE, { file: files.roles }, '\n', { file: files.schema }, '\nSET session_replication_role = replica;\n', { file: files.data }, '\n']);
  if (put.code !== 0) {
    const errors = safeErrors(put.output);
    unproven(`The copy was written and could NOT be put back into an empty database${errors.length ? `:\n  ${errors.join('\n  ')}` : ' (no complaint from the database could be shown safely).'}`);
  } else if (ready) {
    let restored; let restoredPrivileges;
    try {
      restored = await read(measure);
      restoredPrivileges = await read(readPrivileges);
    } catch { return fail('The copy was put back, and the scratch database could not then be read to compare.'); }
    const diff = differences(source, restored);
    const privileges = privilegeProblems(sourcePrivileges, restoredPrivileges)
      .map((line) => line.replaceAll('held on the hosted database and not on the tested one', 'held after the restore and not before')
        .replaceAll('held on the tested database and not on the hosted one', 'held before and not after the restore'));
    say(`Put back into an empty PostgreSQL ${restored.version}: ${restored.shape.tables} tables, ${restored.shape.functions} functions, ${restored.shape.policies} policies, ${restored.shape.triggers} triggers; ${Object.values(restored.tables).reduce((sum, t) => sum + (t.rows ?? 0), 0)} rows.`);
    if (source.history) {
      say(restored.history
        ? `The migration history came back with ${restored.history.length} entries.`
        : `The migration history is not in the copy (the CLI leaves that table out). After a real restore, mark the ${source.history.length} as applied with "supabase migration repair --status applied"; the list is in the archive's manifest.`);
    }
    if (diff.length) say(`Differences (${diff.length}):\n  ${diff.slice(0, 40).join('\n  ')}${diff.length > 40 ? `\n  … and ${diff.length - 40} more` : ''}`);
    if (privileges.length) say(`What anon and authenticated may do is not the same:\n  ${privileges.join('\n  ')}`);
    if (diff.length || privileges.length) unproven('The restore did not give back what was copied.');
    else say(`Same on both sides: every table's rows, every sequence, the counts of functions, policies, triggers, indexes and constraints, and the ${sourcePrivileges.privileges.length} privileges of anon and authenticated with the same ${sourcePrivileges.defaults.length} defaults.`);
  }

  const manifest = { project: taken.source === 'hosted' ? 'glhxtsgrhhvtbsnlxgxu' : 'drill', takenAt: taken.takenAt, postgres: source.version,
    rehearsal: proven ? 'put back into an empty database and found the same' : 'FAILED: this copy has not been shown to restore',
    shape: source.shape, tables: source.tables, sequences: source.sequences, migrations: source.history,
    leftOutOfTheData: dataExclusions(source), authColumns: source.authColumns, files: {} };
  for (const [what, path] of Object.entries(files)) manifest.files[`${what}.sql`] = { bytes: statSync(path).size, sha256: await sha256(path) };
  writeFileSync(`${dir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

  if (taken.source !== 'hosted') { say('A drill: the database copied was made from this repository\'s migrations on the runner. Nothing of the project was read and nothing is kept.'); return finish(proven); }
  if (!passphrase) {
    say(proven
      ? 'No passphrase is set (secret AYAHSPRING_BACKUP_PASSPHRASE), so NOTHING WAS KEPT: this run proves the copy can be taken and put back, and is not a backup.'
      : 'No passphrase is set (secret AYAHSPRING_BACKUP_PASSPHRASE), so nothing was kept.');
    return finish(proven);
  }
  // A copy that failed its rehearsal is still kept, and named for what it is:
  // the only copy there is must not be thrown away because a scratch database
  // would not take it. The run is red all the same.
  const archive = `${dir}/ayahspring-${manifest.takenAt.slice(0, 10)}${proven ? '' : '-UNPROVEN'}.tar.gz`;
  const packed = await run('tar', ['-C', dir, '-czf', archive, 'roles.sql', 'schema.sql', 'data.sql', 'manifest.json']);
  if (packed.code !== 0) return fail('The copy could not be packed into one file. Nothing was kept.');
  // The passphrase goes to gpg on its standard input, never as an argument or a file.
  const gpg = (args) => run('gpg', ['--batch', '--yes', '--quiet', '--no-tty', '--pinentry-mode', 'loopback', '--passphrase-fd', '0', ...args], { input: [`${passphrase}\n`] });
  const sealed = await gpg(['--symmetric', '--cipher-algo', 'AES256', '--s2k-digest-algo', 'SHA512', '--s2k-count', '65011712', '--output', `${archive}.gpg`, archive]);
  if (sealed.code !== 0) return fail('The copy could not be encrypted. Nothing was kept.');
  const opened = await gpg(['--decrypt', '--output', `${archive}.check`, `${archive}.gpg`]);
  if (opened.code !== 0 || await sha256(`${archive}.check`) !== await sha256(archive)) return fail('The encrypted copy did not open again to the same bytes. Nothing was kept.');
  say(`Kept: ${archive.split('/').pop()}.gpg, ${statSync(`${archive}.gpg`).size} bytes, sha256 ${await sha256(`${archive}.gpg`)}. It opened again with the passphrase to the same bytes. It is this run's artifact for 90 days; download it and keep it somewhere of your own.`);
  if (!proven) say('KEPT ALTHOUGH THE REHEARSAL FAILED. It is the data as the project held it, and nobody has seen it restore. Read the lines above before relying on it.');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `encrypted=${archive}.gpg\n`);
  return finish(proven);
}

// `copy`, `restore`, or both in one go (the default). The drill runs the two
// apart, and empties the database in between.
async function main() {
  const phase = process.argv[2] || 'both';
  const drill = sourceOf(process.env).kind === 'local';
  const report = reporter(drill ? 'Backup drill' : 'Backup and restore rehearsal');
  if (!['copy', 'restore', 'compare', 'both'].includes(phase)) return report.fail('Not started: say copy, restore, compare, or nothing for both.');
  // `compare` measures the scratch database again without putting anything
  // back. The drill uses it after spoiling the restored database on purpose,
  // to see that the comparison notices.
  if (phase === 'compare') { if (!drill) return report.fail('Not started: compare is for the drill.'); return void await restore(process.env, report, { put: false }); }
  if (phase !== 'restore') {
    if (!await copy(process.env, report)) return;
    if (phase === 'copy') return report.finish(true);
  }
  await restore(process.env, report);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
