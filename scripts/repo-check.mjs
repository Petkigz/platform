#!/usr/bin/env node
// Structural checks on the repository itself.
//
// These are the failures that do not show up in a test run, because they are
// about the shape of the tree rather than the behaviour of the code. Each one
// below has either happened here or would silently cost a whole feature:
//
//   1. Two migrations sharing a filename prefix. Separate work sessions pick
//      dates independently, and `20261130000100_cohorts.sql` beside
//      `20261130000100_marking_feedback.sql` applies in an order that depends
//      on the rest of the name. The database suite would still pass locally,
//      because both files exist either way.
//   2. A test file nobody registered. `supabase/tests/run.mjs` lists its suites
//      by hand, so a new `*.test.mjs` that is not imported does not fail — it
//      simply never runs, and the count goes up in a commit message anyway.
//   3. Conflict markers left in a file. A three-way apply that half-succeeded
//      produces markers that TypeScript, SQL and Markdown all tolerate in
//      different ways, and the build is the last place you want to find them.
//
// Node builtins only, so this runs before `npm ci` and costs nothing.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (check, message) => problems.push(`${check}: ${message}`);

const MIGRATION = /^(\d{14})_([a-z0-9][a-z0-9_]*)\.sql$/;

// ---------------------------------------------------------------------------
// 1. Migrations are named so their order is not ambiguous
// ---------------------------------------------------------------------------
{
  const dir = join(root, 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const byPrefix = new Map();

  for (const file of files) {
    const match = MIGRATION.exec(file);
    if (!match) {
      fail('migrations', `${file} does not match <14-digit timestamp>_<snake_case>.sql`);
      continue;
    }
    const [, prefix] = match;
    const seen = byPrefix.get(prefix);
    if (seen) {
      fail('migrations', `${prefix} is used by both ${seen} and ${file}; `
        + 'two migrations with one prefix apply in an order the filename does not decide');
    } else {
      byPrefix.set(prefix, file);
    }
  }

  const ordered = [...byPrefix.keys()].sort();
  if (ordered.some((prefix, i) => i > 0 && prefix < ordered[i - 1])) {
    fail('migrations', 'timestamps are not in ascending order once sorted');
  }
  process.stdout.write(`migrations: ${files.length} files, ${byPrefix.size} distinct prefixes\n`);
}

// ---------------------------------------------------------------------------
// 2. Every suite is registered with the runner
// ---------------------------------------------------------------------------
{
  const dir = join(root, 'supabase', 'tests');
  const runner = readFileSync(join(dir, 'run.mjs'), 'utf8');
  const suites = readdirSync(dir).filter((f) => f.endsWith('.test.mjs'));

  for (const suite of suites) {
    if (!runner.includes(`'./${suite}'`)) {
      fail('suites', `${suite} is never imported by run.mjs, so it does not run`);
    }
  }

  // The reverse direction: an import of a file that is not there fails loudly
  // anyway, but a suite imported and never called passes silently.
  const imported = [...runner.matchAll(/import \{ run as (\w+) \} from '\.\/([^']+)'/g)]
    .map((m) => ({ binding: m[1], file: m[2] }));
  for (const { binding, file } of imported) {
    if (!new RegExp(`\\[\\s*'[^']+',\\s*${binding}\\s*\\]`).test(runner)) {
      fail('suites', `${file} is imported as ${binding} but never listed in the run order`);
    }
    if (!statSync(join(dir, file)).isFile()) fail('suites', `${file} is imported but missing`);
  }
  process.stdout.write(`suites: ${suites.length} files, ${imported.length} imported, all listed\n`);
}

// ---------------------------------------------------------------------------
// 3. No conflict markers in tracked files
// ---------------------------------------------------------------------------
{
  const markers = [
    /^<{7}(\s|$)/m,
    /^={7}$/m,
    /^>{7}(\s|$)/m,
  ];
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  let scanned = 0;

  for (const file of tracked) {
    if (!/\.(sql|mjs|js|ts|tsx|json|md|css|yml|yaml)$/.test(file)) continue;
    const text = readFileSync(join(root, file), 'utf8');
    scanned += 1;
    for (const marker of markers) {
      if (marker.test(text)) {
        fail('markers', `${file} contains a conflict marker`);
        break;
      }
    }
  }
  process.stdout.write(`markers: ${scanned} text files scanned\n`);
}

// ---------------------------------------------------------------------------
if (problems.length > 0) {
  process.stderr.write(`\n${problems.length} structural problem(s):\n`);
  for (const problem of problems) process.stderr.write(`  - ${problem}\n`);
  process.exit(1);
}
process.stdout.write('\nRepository structure is sound.\n');
