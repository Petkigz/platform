import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { en } from './i18n/messages/en.ts';
import {
  apply,
  blocksIn,
  diff,
  literalAt,
  placeholderSet,
  plan,
  rewrite,
  summary,
  tsLiteral,
  type SourceFile,
} from './i18n-apply.ts';
import { acceptedPayload, type Review } from './translations.ts';

// The last step of the correction flow used to be a person pasting TypeScript
// into a file of a hundred and ninety-two lines in a language they do not read.
// These tests are about the script that replaced it — and, mostly, about the
// things it refuses to do, because a wrong write here is somebody's sentence.

const here = dirname(fileURLToPath(import.meta.url));
const MESSAGES = join(here, 'i18n', 'messages');

/** The real catalogue files, read once. */
function catalogueFiles(): SourceFile[] {
  return readdirSync(MESSAGES)
    .filter((name) => name.endsWith('.ts') && name !== 'en.ts')
    .sort()
    .map((name) => ({ path: name, text: readFileSync(join(MESSAGES, name), 'utf8') }));
}

const TA = () => readFileSync(join(MESSAGES, 'asia-ta.ts'), 'utf8');

test('every locale block in every file is found', () => {
  const files = catalogueFiles();
  const codes = new Set<string>();
  for (const file of files) {
    for (const block of blocksIn(file.text)) codes.add(block.code);
  }
  // Fifty languages, each with at least one block somewhere. A parser that
  // silently stops recognising a block would let a correction fall through to
  // "insert a duplicate" on the next run.
  assert.equal(codes.size, 50, `found blocks for ${codes.size} languages`);
  assert.ok(codes.has('ta') && codes.has('zh-hant') && codes.has('fa-af'));

  // And every key line in every block is readable: a file whose keys this parser
  // cannot see is a file a correction would be inserted into a second time.
  for (const file of files) {
    for (const block of blocksIn(file.text)) {
      assert.ok(block.close > block.header, `${file.path} has an empty block`);
    }
  }
});

test('a literal is found through escapes, and refused when it is unterminated', () => {
  const text = "  'a.b': 'L\\'école {count} leçon',\n";
  const found = literalAt(text, text.indexOf(':') + 1);
  assert.ok(found);
  assert.equal(found.value, "L'école {count} leçon");

  // A wrapped value: the quote is on the next line, and whitespace is skipped.
  const wrapped = "  'a.b':\n    'two lines of it',\n";
  assert.equal(literalAt(wrapped, wrapped.indexOf(':') + 1)?.value, 'two lines of it');

  // A literal that never closes is not guessed at.
  assert.equal(literalAt("  'a.b': 'no end", 9), null);
});

test('a string is quoted so that TypeScript reads back what was written', () => {
  for (const value of [
    "L'école",
    'back\\slash',
    'line one\nline two',
    'a\ttab',
    'a\u2028line separator',
    '{count} lessons',
    '日本語',
  ]) {
    const literal = tsLiteral(value);
    // The one property that matters: the literal parses back to the same string.
    const parsed = new Function(`return ${literal};`)() as string;
    assert.equal(parsed, value, `round trip failed for ${JSON.stringify(value)}`);
  }
});

test('placeholders are compared as a set, not as a string', () => {
  assert.equal(placeholderSet('{count} lessons in {hours} hours'), placeholderSet('{hours} h, {count} l'));
  assert.notEqual(placeholderSet('{count} lessons'), placeholderSet('lessons'));
});

test('a correction replaces the line it belongs to, and nothing else', () => {
  const before = TA();
  const after = rewrite(before, 'ta', 'nav.main', 'பிரதான பட்டியல்');
  assert.ok(after);
  assert.ok(after.includes("    'nav.main': 'பிரதான பட்டியல்',"));
  // Exactly one line changed.
  const beforeLines = before.split('\n');
  const afterLines = (after ?? '').split('\n');
  assert.equal(beforeLines.length, afterLines.length);
  const changed = beforeLines.filter((line, index) => line !== afterLines[index]);
  assert.equal(changed.length, 1, `${changed.length} lines changed`);
});

test('a wrapped value keeps its shape, and a long one is wrapped', () => {
  const wrapped = "  ta: {\n    'a.b':\n      'old',\n  },\n";
  const kept = rewrite(wrapped, 'ta', 'a.b', 'new');
  assert.equal(kept, "  ta: {\n    'a.b':\n      'new',\n  },\n");

  const inline = "  ta: {\n    'a.b': 'old',\n  },\n";
  const long = 'x'.repeat(120);
  const grown = rewrite(inline, 'ta', 'a.b', long);
  assert.equal(grown, `  ta: {\n    'a.b':\n      '${long}',\n  },\n`);
});

test('a key that is not in the file is inserted in the catalogue’s own order', () => {
  const text = "  ta: {\n    'nav.main': 'x',\n    'nav.learn': 'z',\n  },\n";
  const next = rewrite(text, 'ta', 'nav.family', 'y');
  assert.equal(next, "  ta: {\n    'nav.main': 'x',\n    'nav.learn': 'z',\n    'nav.family': 'y',\n  },\n");
});

test('a clean line in a dirty payload is proposed and then not permitted', () => {
  // The gate lives in `plan` and not only in the script, because a caller that
  // reached for `edits` and ignored `problems` would write half a payload.
  const files = catalogueFiles();
  const result = plan(
    [
      {
        locale: 'ta',
        corrections: [
          { key: 'nav.main', from: 'முதன்மை', to: 'பிரதான' },
          { key: 'nav.learn', from: 'not what the file says', to: 'x' },
        ],
      },
    ],
    files,
  );
  assert.equal(result.proposed.length, 1, 'the valid line was not shown in the report');
  assert.equal(result.edits.length, 0, 'a plan with problems permits a write');
  assert.match(summary(result), /1 would apply/);
  assert.equal(apply(files, result.edits)?.length, files.length);
});

test('a correction is refused when the catalogue has moved past it', () => {
  const files = catalogueFiles();
  const result = plan(
    [{ locale: 'ta', corrections: [{ key: 'nav.main', from: 'not the current line', to: 'x' }] }],
    files,
  );
  assert.equal(result.edits.length, 0);
  assert.equal(result.problems[0]?.code, 'stale');
  // And nothing is written when anything is refused — half a payload is worse
  // than none.
  assert.equal(apply(files, result.edits)?.length, files.length);
});

test('a dropped placeholder is refused before it reaches the file', () => {
  const files = catalogueFiles();
  const result = plan(
    [{ locale: 'ta', corrections: [{ key: 'card.lessonsOne', to: 'பாடம்' }] }],
    files,
  );
  assert.equal(result.problems[0]?.code, 'placeholder');
  assert.match(result.problems[0]?.message ?? '', /expected \{count\}/);
});

test('a payload cannot invent a language, a key, or a second English', () => {
  const files = catalogueFiles();
  const result = plan(
    [
      { locale: 'xx', corrections: [{ key: 'nav.main', to: 'x' }] },
      { locale: 'en', corrections: [{ key: 'nav.main', to: 'x' }] },
      { locale: 'ta', corrections: [{ key: 'nav.nevver', to: 'x' }] },
      { locale: 'ta', corrections: [{ key: 'nav.main', to: 'x' }, { key: 'nav.main', to: 'y' }] },
    ],
    files,
  );
  const codes = result.problems.map((problem) => problem.code);
  assert.ok(codes.includes('unknown-locale'));
  assert.ok(codes.includes('english'));
  assert.ok(codes.includes('unknown-key'));
  assert.ok(codes.includes('bad-payload'), 'the duplicate key was accepted');
  assert.equal(result.edits.length, 0);
});

test('applying two corrections writes both files, and the result still parses', () => {
  const files = catalogueFiles();
  const result = plan(
    [
      { locale: 'ta', corrections: [{ key: 'nav.main', from: 'முதன்மை', to: 'பிரதான' }] },
      { locale: 'fr', corrections: [{ key: 'card.lessonsOne', from: '{count} leçon', to: "L'école {count}" }] },
    ],
    files,
  );
  assert.equal(result.problems.length, 0, JSON.stringify(result.problems));
  assert.equal(result.edits.length, 2);

  const next = apply(files, result.edits);
  assert.ok(next);
  const written = next.find((file) => file.path === result.edits[0]?.path);
  assert.ok(written?.text.includes("'nav.main': 'பிரதான',"));

  // Every file that changed is still one line per key where it was, so the
  // catalogue's own parser (and the diff) still work.
  for (const file of next) {
    const before = files.find((candidate) => candidate.path === file.path);
    if (!before || before.text === file.text) continue;
    const beforeLines = before.text.split('\n').length;
    const afterLines = file.text.split('\n').length;
    assert.equal(beforeLines, afterLines, `${file.path} changed length`);
  }
});

test('the diff shows the changed line and its neighbours', () => {
  const files = catalogueFiles();
  const result = plan(
    [{ locale: 'ta', corrections: [{ key: 'nav.main', from: 'முதன்மை', to: 'பிரதான' }] }],
    files,
  );
  const patch = diff(files, result.edits);
  assert.match(patch, /^--- asia-ta\.ts$/m);
  assert.match(patch, /^\+\+\+ asia-ta\.ts$/m);
  assert.match(patch, /^- {4}'nav\.main': 'முதன்மை',$/m);
  assert.match(patch, /^\+ {4}'nav\.main': 'பிரதான',$/m);
  // A hunk header whose counts do not match its body is a diff that will not
  // apply, and this one is hand-written, so it is counted.
  const header = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$/m.exec(patch);
  assert.ok(header, 'no hunk header');
  const [oldStart, oldCount, , newCount] = header.slice(1).map(Number);
  assert.ok((oldStart ?? 0) > 0);
  const body = patch
    .split('\n')
    .filter((line) => /^[ +-]/.test(line) && !line.startsWith('---') && !line.startsWith('+++'));
  // Both sides of the hunk have to be the size the header claims, or `patch`
  // refuses to apply a diff that looks perfectly reasonable to a person.
  assert.equal(
    body.filter((line) => line.startsWith(' ') || line.startsWith('-')).length,
    oldCount,
    'the old side of the hunk is not the size it claims',
  );
  assert.equal(
    body.filter((line) => line.startsWith('+') || line.startsWith(' ')).length,
    newCount,
    'the new side of the hunk is not the size it claims',
  );
});

test('a payload that changes nothing says so instead of writing', () => {
  const files = catalogueFiles();
  const result = plan(
    [{ locale: 'ta', corrections: [{ key: 'nav.main', from: 'முதன்மை', to: 'முதன்மை' }] }],
    files,
  );
  assert.equal(result.edits.length, 0);
  assert.equal(result.problems.length, 0);
  assert.equal(result.already.length, 1);
  assert.equal(summary(result), '1 already correct');
  assert.equal(diff(files, result.edits), '');
});

test('the console hands over exactly what the script takes', () => {
  const review: Review = {
    id: 'r1',
    locale: 'ta',
    reviewerName: '  Karthik  ',
    reviewerEmail: null,
    scope: 'section',
    section: 'nav',
    note: null,
    status: 'submitted',
    createdAt: '2026-11-01T00:00:00Z',
    decidedAt: null,
    declineReason: null,
    proposals: [
      {
        id: 'p2',
        messageKey: 'nav.learn',
        currentText: 'என் கற்றல்',
        proposedText: '  என் படிப்பு  ',
        reason: null,
        status: 'accepted',
        decidedAt: '2026-11-02T00:00:00Z',
      },
      {
        id: 'p1',
        messageKey: 'nav.main',
        currentText: 'முதன்மை',
        proposedText: 'பிரதான',
        reason: null,
        status: 'rejected',
        decidedAt: '2026-11-02T00:00:00Z',
      },
    ],
  };

  const payload = JSON.parse(acceptedPayload(review)) as {
    locale: string;
    reviewer: string;
    corrections: { key: string; from: string; to: string }[];
  };
  assert.equal(payload.locale, 'ta');
  assert.equal(payload.reviewer, 'Karthik', 'the name was not trimmed for the record');
  // Rejected corrections are not in it, and the accepted one is trimmed.
  assert.deepEqual(payload.corrections, [
    { key: 'nav.learn', from: 'என் கற்றல்', to: 'என் படிப்பு' },
  ]);

  // And what the console prints, the script accepts: the payload goes through
  // `plan` unchanged, against the real files, and the correction is found.
  const files = catalogueFiles();
  const result = plan([payload], files);
  assert.equal(result.problems.length, 0, JSON.stringify(result.problems));
  assert.equal(result.edits[0]?.key, 'nav.learn');
});

test('every key in the English catalogue is one the files can hold', () => {
  // A key whose name the file parser cannot see is a key no correction can ever
  // reach, and the audit would report it as missing forever.
  const files = catalogueFiles();
  const readable = new Set<string>();
  for (const file of files) {
    for (const block of blocksIn(file.text)) {
      const lines = file.text.split('\n').slice(block.header, block.close);
      for (const line of lines) {
        const match = /^\s+'([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+)'\s*:/.exec(line);
        if (match) readable.add(match[1] ?? '');
      }
    }
  }
  const unreadable = Object.keys(en).filter((key) => !readable.has(key));
  assert.deepEqual(unreadable, [], 'these keys appear in no catalogue file');
});
