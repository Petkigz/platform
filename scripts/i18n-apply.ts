#!/usr/bin/env node
// Apply accepted translation corrections to the catalogue files.
//
//   npm run i18n:apply -- corrections.json            # show the diff
//   npm run i18n:apply -- corrections.json --write    # write it
//   npm run i18n:apply -- corrections.json --check    # exit 1 if anything is pending
//
// The payload comes from `/admin/translations`: accept the corrections there,
// copy the JSON, save it anywhere, run this. Everything is checked before
// anything is written — placeholders, stale lines, unknown keys — and if one
// correction is wrong, nothing lands. The diff is printed either way, so the
// owner reads what they are about to commit instead of trusting a count.
//
// Why a script and not a button in the app: the translations live in the
// repository, and the last step of every correction is a commit. A serverless
// function has no filesystem to write and no git to commit with; pretending
// otherwise would mean the site said "applied" while the file said otherwise.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  apply,
  diff,
  plan,
  summary,
  type Correction,
  type PayloadReview,
  type SourceFile,
} from '../web/src/lib/i18n-apply.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const MESSAGES = join(HERE, '..', 'web', 'src', 'lib', 'i18n', 'messages');

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const positional = args.filter(
  (arg, index) => !arg.startsWith('--') && !(index > 0 && args[index - 1]?.startsWith('--')),
);
const input = positional[0] ?? value('--input');

const WRITE = flag('--write');
const CHECK = flag('--check');
const JSON_OUT = flag('--json');

if (!input) {
  console.error(
    'usage: npm run i18n:apply -- <payload.json|-> [--write] [--check] [--json]\n' +
      '       the payload is the JSON block copied from /admin/translations',
  );
  process.exit(2);
}

/** The payload, however it was written down. */
function reviews(raw: unknown): PayloadReview[] {
  const asReview = (value: unknown): PayloadReview | null => {
    const row = value as Record<string, unknown> | null;
    if (!row || typeof row !== 'object') return null;
    const locale = typeof row.locale === 'string' ? row.locale : '';
    const list = Array.isArray(row.corrections) ? row.corrections : [];
    const corrections: Correction[] = [];
    for (const entry of list) {
      const item = entry as Record<string, unknown>;
      // Two spellings: the console writes `key`/`from`/`to`, the queue's own JSON
      // uses `messageKey`/`currentText`/`proposedText`. Both are accepted so a
      // payload can be copied from either place without editing it by hand.
      const key = (item.key ?? item.messageKey) as string | undefined;
      const to = (item.to ?? item.proposedText) as string | undefined;
      const from = (item.from ?? item.currentText) as string | undefined;
      if (typeof key !== 'string' || typeof to !== 'string') continue;
      corrections.push({ key, to, ...(typeof from === 'string' ? { from } : {}) });
    }
    return { locale, corrections, ...(typeof row.reviewer === 'string' ? { reviewer: row.reviewer } : {}) };
  };

  if (Array.isArray(raw)) return raw.map(asReview).filter((r): r is PayloadReview => r !== null);
  const row = raw as Record<string, unknown> | null;
  if (row && Array.isArray(row.reviews)) {
    return row.reviews.map(asReview).filter((r): r is PayloadReview => r !== null);
  }
  const single = asReview(raw);
  return single ? [single] : [];
}

let payload: PayloadReview[];
try {
  const text = input === '-' ? readFileSync(0, 'utf8') : readFileSync(resolve(input), 'utf8');
  payload = reviews(JSON.parse(text));
} catch (error) {
  console.error(`could not read the payload: ${(error as Error).message}`);
  process.exit(2);
}

if (payload.length === 0) {
  console.error('the payload has no reviews in it — nothing to apply');
  process.exit(2);
}

const files: SourceFile[] = readdirSync(MESSAGES)
  .filter((name) => name.endsWith('.ts') && name !== 'en.ts')
  .sort()
  .map((name) => ({ path: name, text: readFileSync(join(MESSAGES, name), 'utf8') }));

const result = plan(payload, files);
const report = {
  summary: summary(result),
  applied: result.edits.map((edit) => ({
    locale: edit.locale,
    key: edit.key,
    before: edit.before,
    after: edit.after,
    file: edit.path,
    inserted: edit.inserted,
  })),
  already: result.already,
  refused: result.problems,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const edit of result.edits) {
    const mark = edit.inserted ? '+' : '~';
    console.log(`${mark} ${edit.locale} ${edit.key}  (${edit.path}${edit.inserted ? ', new line' : ''})`);
  }
  for (const correction of result.already) {
    console.log(`= ${correction.key}  the catalogue already says this`);
  }
  for (const problem of result.problems) {
    console.log(`✗ ${problem.locale} ${problem.key}  ${problem.message}`);
  }
  console.log(`\n${summary(result)}`);

  const patch = diff(files, result.edits);
  if (patch) console.log(`\n${patch}`);
}

if (result.problems.length > 0) {
  console.error(
    '\nNothing was written: a payload that is half-applied is worse than one that is refused.',
  );
  process.exit(1);
}

if (CHECK) {
  process.exit(result.edits.length === 0 ? 0 : 1);
}

if (WRITE && result.edits.length > 0) {
  const next = apply(files, result.edits);
  if (!next) {
    console.error('the rewrite failed after planning, which should be impossible — nothing written');
    process.exit(1);
  }
  for (const file of next) {
    const before = files.find((candidate) => candidate.path === file.path);
    if (!before || before.text === file.text) continue;
    writeFileSync(join(MESSAGES, file.path), file.text, 'utf8');
    console.log(`wrote ${file.path}`);
  }
  console.log(
    '\nRun `npm run check:repo && npm run test:web` before committing. A catalogue is checked by\n' +
      'tests that count placeholders per language, and a wrong paste fails those, not this script.',
  );
} else if (result.edits.length > 0) {
  console.log('\nDry run. Add --write to edit the files.');
}
