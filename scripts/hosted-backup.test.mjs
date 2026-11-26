// The parts of the backup job that can be tried without the project: the
// measure of a database, the comparison, what is read out of a dump file and
// what is allowed into a public log. The dump and the restore themselves need
// pg_dump and a second database, and are tried only by the job.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { BEFORE_RESTORE, describeDump, differences, measure, safeErrors } from './hosted-backup.mjs';

const SCHEMA = `
  create table public.courses (id int primary key, title text not null, made timestamptz not null);
  create table public.notes (id serial primary key, body text);
  create table public."Odd ""name" (id int);
  create view public.course_titles as select title from public.courses;
  create function public.one() returns int language sql as 'select 1';
  alter table public.courses enable row level security;
  create policy read_all on public.courses for select using (true);
`;
const ROWS = [
  `insert into public.courses values (1, 'Synthetic one', '2026-11-26T10:00:00Z')`,
  `insert into public.courses values (2, 'Synthetic two', '2026-11-26T11:00:00+03')`,
  `insert into public.notes (body) values ('synthetic note')`,
];

async function database(rows = ROWS) {
  const db = new PGlite();
  await db.exec(SCHEMA);
  for (const row of rows) await db.exec(row);
  return db;
}

test('the same rows give the same measure, whatever order they went in', async () => {
  const a = await measure(await database());
  const b = await measure(await database([ROWS[1], ROWS[2], ROWS[0]]));
  assert.deepEqual(differences(a, b), []);
  assert.equal(a.tables['public.courses'].rows, 2);
  assert.equal(a.tables['public.Odd "name'].rows, 0);
  assert.equal(a.shape.tables, 3);
  assert.equal(a.shape.views, 1);
  assert.equal(a.shape.policies, 1);
  assert.equal(a.shape.tables_with_row_security, 1);
  assert.equal(a.history, null, 'no history table in this engine, and that is said rather than raised');
  assert.match(a.tables['public.courses'].print, /^[0-9a-f]{32}$/);
});

test('the measure writes nothing and leaves no transaction open', async () => {
  const db = await database();
  await measure(db);
  await db.exec(`insert into public.courses values (3, 'Synthetic three', now())`);
  assert.equal((await measure(db)).tables['public.courses'].rows, 3);
});

test('a missing row, a changed row, a missing table and a sequence that fell behind are each named', async () => {
  const source = await measure(await database());

  const fewer = await measure(await database(ROWS.slice(0, 2)));
  assert.deepEqual(differences(source, fewer), [
    'table public.notes: 1 rows in the project, 0 after the restore',
    'sequence notes_id_seq: stands at 1 in the project and nothing after the restore',
  ]);

  const changed = await database();
  await changed.exec(`update public.courses set title = 'Synthetic TWO' where id = 2`);
  assert.deepEqual(differences(source, await measure(changed)), ['table public.courses: 2 rows on both sides, and they are not the same rows']);

  const dropped = await database();
  await dropped.exec('drop view public.course_titles; drop table public.courses');
  const lines = differences(source, await measure(dropped));
  assert.ok(lines.includes('table public.courses: not there after the restore'), lines.join('\n'));
  assert.ok(lines.includes('tables: 3 in the project, 2 after the restore'), lines.join('\n'));
  assert.ok(lines.includes('policies: 1 in the project, 0 after the restore'), lines.join('\n'));

  const extra = await database();
  await extra.exec('create table public.stray (id int)');
  assert.ok(differences(source, await measure(extra)).includes('table public.stray: there after the restore and not in the project'));
});

test('a difference never quotes a row', async () => {
  const source = await measure(await database());
  const changed = await database();
  await changed.exec(`update public.courses set title = 'SECRET-TITLE' where id = 2`);
  const text = differences(source, await measure(changed)).join('\n') + JSON.stringify(await measure(changed));
  assert.ok(!text.includes('SECRET-TITLE') && !text.includes('Synthetic'), text);
});

test('a dump file is described by counting, not by reading it out', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'backup-'));
  const path = join(dir, 'sample.sql');
  writeFileSync(path, [
    'CREATE TABLE IF NOT EXISTS "public"."courses" (', '    "id" integer', ');',
    'CREATE TABLE IF NOT EXISTS "public"."notes" (', ');',
    'CREATE OR REPLACE FUNCTION "public"."one"() RETURNS integer', 'CREATE POLICY "read_all" ON "public"."courses" FOR SELECT USING (true);',
    'CREATE ROLE "reporting";',
    'COPY "public"."courses" ("id", "title") FROM stdin;', '1\tSECRET-TITLE', '\\.',
    'COPY "auth"."users" ("id") FROM stdin;', '\\.',
    'COPY "public"."notes" ("id") FROM stdin;', '\\.', '',
  ].join('\n'));
  const seen = await describeDump(path);
  assert.deepEqual({ ...seen, bytes: 0 }, { tables: 2, functions: 1, policies: 1, roles: 1, copies: { public: 2, auth: 1 }, bytes: 0 });
  assert.ok(seen.bytes > 100);
  assert.ok(!JSON.stringify(seen).includes('SECRET'));
});

test('only the database\'s one-line complaint reaches the log, without the values', () => {
  const output = [
    'psql:<stdin>:412: ERROR:  duplicate key value violates unique constraint "courses_pkey"',
    'DETAIL:  Key (email)=(somebody@example.org) already exists.',
    'CONTEXT:  COPY courses, line 3: "3\tSECRET-TITLE"',
    'psql:<stdin>:900: ERROR:  Key (id)=(41) is not present in table "learners".',
    'psql:<stdin>:412: ERROR:  duplicate key value violates unique constraint "courses_pkey"',
  ].join('\n');
  assert.deepEqual(safeErrors(output), [
    'duplicate key value violates unique constraint "courses_pkey"',
    'Key (…)=(…) is not present in table "learners".',
  ]);
  assert.deepEqual(safeErrors('nothing went wrong'), []);
});

test('the defaults are taken away before the schema goes back', () => {
  const statements = BEFORE_RESTORE.trim().split('\n');
  assert.equal(statements.length, 3);
  for (const kind of ['TABLES', 'FUNCTIONS', 'SEQUENCES']) {
    assert.ok(statements.includes(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ${kind} FROM anon, authenticated;`), kind);
  }
});
