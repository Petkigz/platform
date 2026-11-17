import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * `.eq('deleted_at', null)` does not ask for rows where the column is empty.
 *
 * The client turns it into `deleted_at=eq.null`, and the database server
 * compares the column with the *word* "null". On a date column that is not
 * "no rows", it is an error (`22007 invalid input syntax for type timestamp
 * with time zone: "null"`): the request fails, and a page that reads
 * `data ?? null` shows "not found" to the person the row belongs to.
 *
 * Eight reads were written this way, among them the learner's dashboard, the
 * course page, the lesson page and the quiz. Every test passed, because no
 * test here talks to the real server: the stand-ins used by the browser checks
 * answer whatever they are asked. It was found by reading, on 2026-11-17, and
 * the comparison was reproduced on the hosted test database.
 *
 * This is the cheap half of the repair: a comparison with nothing must be
 * written `.is(column, null)`, and this fails on any other spelling.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

// A comparison operator handed a literal `null` or `undefined` as its value,
// on one line or broken over several.
const COMPARED_WITH_NOTHING =
  /\.(eq|neq|gt|gte|lt|lte|like|ilike)\(\s*(['"`])[^'"`]+\2\s*,\s*(null|undefined)\s*,?\s*\)/g;

test('no read compares a column with the word "null"', () => {
  const found: string[] = [];
  const files = sources(root);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(COMPARED_WITH_NOTHING)) {
      const line = text.slice(0, match.index).split('\n').length;
      found.push(`${relative(root, file)}:${line} ${match[0].replace(/\s+/g, ' ')}`);
    }
  }
  assert.ok(files.length > 500, 'the walk did not find the application');
  assert.deepEqual(found, [], 'write .is(column, null): .eq(column, null) asks the server for the word "null"');
});

test('the check sees the spellings it is there for', () => {
  const bad = [
    ".eq('deleted_at', null)",
    '.eq("deleted_at", null)',
    ".eq(\n      'deleted_at',\n      null,\n    )",
    ".neq('closed_at', undefined)",
  ];
  for (const text of bad) assert.equal([...text.matchAll(COMPARED_WITH_NOTHING)].length, 1, text);
  const fine = [".is('deleted_at', null)", ".eq('status', 'active')", ".eq('id', id ?? '')", ".not('closed_at', 'is', null)"];
  for (const text of fine) assert.equal([...text.matchAll(COMPARED_WITH_NOTHING)].length, 0, text);
});

test('the eight reads that were wrong now ask for an empty column', () => {
  const expected: Array<[string, number]> = [
    ['app/learn/page.tsx', 2],
    ['app/learn/[enrolmentId]/page.tsx', 1],
    ['app/learn/[enrolmentId]/lesson/[lessonId]/page.tsx', 1],
    // The assessment page's read moved, with the rest of what it asks for,
    // into `fetchAssessmentContext`.
    ['lib/assessment.ts', 1],
    ['app/api/assessment/route.ts', 1],
    ['lib/enrolment.ts', 2],
    ['lib/family.ts', 1],
  ];
  for (const [path, atLeast] of expected) {
    const count = readFileSync(join(root, path), 'utf8').split(".is('deleted_at', null)").length - 1;
    assert.ok(count >= atLeast, `${path} has ${count} reads of live rows, expected at least ${atLeast}`);
  }
});
