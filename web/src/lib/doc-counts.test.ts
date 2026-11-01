import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

/**
 * The maintained documents are how a session with no memory of the last one
 * starts its next unit. That makes a stale number expensive rather than untidy:
 * `NEXT.md` said "211 migrations" for five units after the tree had 216, and its
 * half-built ledger carried two `Assignments` rows that disagreed about whether
 * a learner could hand in a file — which the next session read as a gap and
 * began rebuilding a shipped feature.
 *
 * `scripts/repo-check.mjs` fails the build on both now (checks 13 and 14). This
 * suite is the second opinion: it recomputes the numbers from the tree itself,
 * rather than trusting the script to have counted them the same way, and it
 * fails if the checks are ever removed from the script.
 *
 * What is *not* checked is any count that cannot be counted here — the test
 * totals, the route count, "20 database tests" in a ledger cell. Those are
 * claims a unit has to keep true by hand. The two this file and the script both
 * own are the ones a file can be added to without anyone noticing.
 */

const root = (path: string) => new URL(`../../../${path}`, import.meta.url);

const read = (path: string) => readFileSync(root(path), 'utf8');

const countIn = (dir: string, suffix: string) =>
  readdirSync(root(dir)).filter((name) => name.endsWith(suffix)).length;

const migrationCount = countIn('supabase/migrations', '.sql');
const suiteCount = countIn('supabase/tests', '.test.mjs');

/** `NEXT.md` before its implementation history, whose counts are snapshots. */
const livingNext = () => {
  const whole = read('NEXT.md');
  const heading = whole.indexOf('## Implementation history');
  assert.notEqual(heading, -1, 'NEXT.md no longer marks where the historical counts start');
  return whole.slice(0, heading);
};

test('every migration count a maintained document states is the real one', () => {
  assert.ok(migrationCount > 200, `only ${migrationCount} migrations found — the path is wrong`);

  for (const name of ['NEXT.md', 'ROADMAP.md', 'SCREENS.md', 'FLAGS.md', 'docs/deploy/README.md']) {
    const text = name === 'NEXT.md' ? livingNext() : read(name);

    text.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(/(\d{2,4}) migrations\b|(\d{2,4}) files in `supabase\/migrations\/`/g)) {
        const quoted = Number.parseInt(match[1] ?? match[2] ?? '', 10);
        assert.equal(
          quoted,
          migrationCount,
          `${name}:${index + 1} says ${quoted} migrations; there are ${migrationCount}`,
        );
      }
    });
  }
});

test('the verification paragraph names the migration and suite counts that exist', () => {
  const living = livingNext();
  // The paragraph that *starts* with the word, not the first mention of it: the
  // section talks about this paragraph in prose before it reaches it.
  const stated = living.search(/^Verification:/m);
  assert.notEqual(stated, -1, 'NEXT.md has no current Verification paragraph');

  const rest = living.slice(stated);
  const paragraph = rest.slice(0, rest.search(/\n\s*\n/));

  // Read as numbers rather than as strings: "2 409" and "2409" are the same
  // count written two ways, and the paragraph uses thin spaces.
  const numbers = (paragraph.match(/\d[\d\u2009 ]*\d/g) ?? []).map((n) => Number(n.replace(/\D/g, '')));

  assert.ok(
    paragraph.includes(`${migrationCount} migrations`),
    `the paragraph must say "${migrationCount} migrations": ${paragraph.replace(/\n/g, ' ')}`,
  );
  assert.ok(
    numbers.includes(suiteCount),
    `the paragraph must state ${suiteCount} suites somewhere: ${paragraph.replace(/\n/g, ' ')}`,
  );
});

test('the half-built ledger names each piece exactly once', () => {
  const lines = read('NEXT.md').split('\n');
  const header = lines.findIndex((line) => line.startsWith('| Piece | Built and tested |'));
  assert.notEqual(header, -1, 'NEXT.md no longer has the half-built table');

  const pieces: string[] = [];
  for (let index = header + 2; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (!line.startsWith('|')) break;
    // `**Assignments**` and `**Assignments** (` + '`learning.assignments`' + `)`
    // are one piece written twice, so the flag is stripped before comparing.
    pieces.push(line.split('|')[1]!.replace(/\*\*/g, '').split('(')[0]!.trim());
  }

  assert.ok(pieces.length >= 10, `only ${pieces.length} pieces found — the table has moved`);
  const duplicates = pieces.filter((piece, index) => pieces.indexOf(piece) !== index);
  assert.deepEqual(duplicates, [], 'one piece, one row — a second row is a second answer');
});

test('the script checks both, and exempts the implementation history', () => {
  const script = read('scripts/repo-check.mjs');

  assert.ok(script.includes("fail('dates'"), 'repo-check no longer fails a stale count');
  assert.ok(script.includes("fail('ledger'"), 'repo-check no longer fails a duplicated ledger row');

  // The history is exempt because a snapshot that is rewritten is no longer a
  // snapshot. That exemption exists only if the script slices at the heading.
  assert.ok(
    script.includes("'## Implementation history'"),
    'the history exemption has gone; historical counts will now fail the build',
  );

  // And the two things it counts are the two this file counts.
  assert.ok(script.includes("'supabase', 'migrations'"), 'repo-check no longer counts migrations from the tree');
  assert.ok(script.includes("f.endsWith('.test.mjs')"), 'repo-check no longer counts suites from the tree');
});
