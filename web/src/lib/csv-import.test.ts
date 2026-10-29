import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IMPORT_LIMITS,
  IMPORT_TEMPLATE,
  importErrorMessage,
  importSentence,
  outlineCounts,
  outlinePayload,
  parseCsv,
  parseOutline,
  summariseOutline,
} from './csv-import.ts';

// A teacher's outline arrives as a file from Excel or Sheets, on a phone, in a
// language that may not be English. These tests are about the four ways that
// file is not the tidy CSV a parser hopes for — quotes, commas, newlines and a
// byte-order mark — and about the rule that decides whether anything is written:
// problems are collected for the whole file and an unclean file adds nothing.

test('the template is a file the import can read', () => {
  const result = parseOutline(IMPORT_TEMPLATE);
  assert.equal(result.problems.length, 0, JSON.stringify(result.problems));

  const counts = outlineCounts(result);
  assert.deepEqual(counts, { sections: 2, lessons: 3, previews: 1 });
  assert.deepEqual(result.sections[0]!.lessons.map((l) => l.title), [
    'What tajweed means',
    'The three lengths',
  ]);
  assert.equal(result.sections[0]!.lessons[1]!.preview, true);
  assert.equal(result.sections[0]!.lessons[0]!.description, 'An introduction to the word and its scope');
});

test('a comma inside a quoted description does not split the row', () => {
  const result = parseOutline(
    'section,lesson,description\r\nRules,Madd,"Long, short and joined — one column"\r\n',
  );
  assert.equal(result.problems.length, 0, JSON.stringify(result.problems));
  assert.equal(result.sections[0]!.lessons[0]!.description, 'Long, short and joined — one column');
});

test('a doubled quote inside a quoted cell is one quote', () => {
  const { rows } = parseCsv('a,"he said ""bismillah"" twice"\n');
  assert.deepEqual(rows[0]!.cells, ['a', 'he said "bismillah" twice']);
});

test('a newline inside a quoted description does not become a new lesson', () => {
  const result = parseOutline(
    'section,lesson,description\n' +
      'Rules,Madd,"First line\nsecond line"\n' +
      'Rules,Idgham,Short\n',
  );
  assert.equal(result.problems.length, 0, JSON.stringify(result.problems));
  assert.equal(result.sections[0]!.lessons.length, 2);
  assert.equal(result.sections[0]!.lessons[0]!.description, 'First line\nsecond line');
  // The line number of the row after a two-line cell is still the line it is on.
  assert.equal(result.sections[0]!.line, 2);
});

test('a byte-order mark and CRLF are read as a normal file', () => {
  const text = '\uFEFFsection,lesson\r\nA,One\r\nA,Two\r\n';
  const result = parseOutline(text);
  assert.equal(result.problems.length, 0, JSON.stringify(result.problems));
  assert.equal(result.sections[0]!.title, 'A');
  assert.deepEqual(result.sections[0]!.lessons.map((l) => l.title), ['One', 'Two']);
});

test('Arabic survives the round trip unchanged', () => {
  const result = parseOutline('section,lesson\nمقدمة,بِسْمِ اللَّهِ\n');
  assert.equal(result.problems.length, 0, JSON.stringify(result.problems));
  assert.equal(result.sections[0]!.title, 'مقدمة');
  assert.equal(result.sections[0]!.lessons[0]!.title, 'بِسْمِ اللَّهِ');
  assert.equal(outlinePayload(result)[0]!.lessons[0]!.title, 'بِسْمِ اللَّهِ');
});

test('an unknown column is refused, not silently dropped', () => {
  const result = parseOutline('section,lesson,duration\nA,One,12\n');
  assert.equal(result.sections.length, 0);
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0]!.message, /duration/);
  assert.equal(result.problems[0]!.line, 1);
});

test('a file without a section column says which column is missing', () => {
  const result = parseOutline('lesson,description\nOne,Two\n');
  assert.equal(result.sections.length, 0);
  assert.match(result.problems[0]!.message, /section is missing/);
});

test('a lesson above any section is an error with its line number', () => {
  const result = parseOutline('section,lesson\n,Orphan\n');
  assert.equal(result.problems.length, 1);
  assert.equal(result.problems[0]!.line, 2);
  assert.match(result.problems[0]!.message, /no section above it/);
});

test('a section with no lessons is named rather than created empty', () => {
  const result = parseOutline('section,lesson\nEmpty,\nFull,One\n');
  assert.equal(result.problems.length, 1);
  assert.equal(result.problems[0]!.line, 2);
  assert.match(result.problems[0]!.message, /"Empty" has no lessons/);
  // The rest of the file is still read, so the preview can show what would be
  // created once the error is fixed.
  assert.equal(result.sections.length, 2);
});

test('a preview value that is not yes or no is an error, not a guess', () => {
  const result = parseOutline('section,lesson,preview\nA,One,maybe\n');
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0]!.message, /"maybe" is not a yes or a no/);
});

test('a description with no lesson has nothing to attach to', () => {
  const result = parseOutline('section,lesson,description\nA,One,ok\n,,orphan text\n');
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0]!.message, /no lesson title/);
});

test('an empty file and a header-only file both say so', () => {
  assert.match(parseOutline('').problems[0]!.message, /empty/i);
  assert.match(parseOutline('section,lesson\n').problems[0]!.message, /No sections were found/);
});

test('an unclosed quote is reported on the line it opened', () => {
  const result = parseOutline('section,lesson,description\nA,One,"never closed\n');
  assert.equal(result.sections.length, 0);
  assert.equal(result.problems[0]!.line, 2);
  assert.match(result.problems[0]!.message, /never closed/);
});

test('the limits refuse one enormous file and name the second attempt', () => {
  const rows: string[] = ['section,lesson'];
  for (let i = 0; i < IMPORT_LIMITS.lessons + 1; i += 1) rows.push(`Section ${Math.floor(i / 10)},Lesson ${i}`);
  const result = parseOutline(`${rows.join('\n')}\n`);

  assert.equal(result.problems.some((p) => /limit is 300/.test(p.message)), true,
    JSON.stringify(result.problems.slice(0, 2)));
});

test('fifty-one sections is one file too many', () => {
  const rows: string[] = ['section,lesson'];
  for (let i = 0; i < IMPORT_LIMITS.sections + 1; i += 1) rows.push(`S${i},L${i}`);
  const result = parseOutline(`${rows.join('\n')}\n`);
  assert.equal(result.problems.some((p) => /limit is 50/.test(p.message)), true);
});

test('a lesson title over the limit names the length', () => {
  const result = parseOutline(`section,lesson\nA,${'x'.repeat(IMPORT_LIMITS.title + 1)}\n`);
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0]!.message, /201 characters; the limit is 200/);
});

test('the sentence says the outline is appended, and counts previews', () => {
  const clean = parseOutline(IMPORT_TEMPLATE);
  assert.equal(
    importSentence(clean),
    'This will add 2 sections and 3 lessons — one of them a free preview — to the end of this draft.',
  );
  assert.equal(importSentence({ sections: [], problems: [] }), 'There is nothing to add yet.');
});

test('the payload is the shape the database function reads', () => {
  const payload = outlinePayload(parseOutline(IMPORT_TEMPLATE));
  assert.deepEqual(Object.keys(payload[0]!), ['title', 'lessons']);
  assert.deepEqual(Object.keys(payload[0]!.lessons[0]!).sort(), ['description', 'preview', 'title']);
  assert.equal(payload[1]!.lessons[0]!.description, 'Applying the rules to the opening surah');
});

test('the summary is truncated and says how many were left out', () => {
  const rows = ['section,lesson'];
  for (let i = 0; i < 7; i += 1) rows.push(`A,Lesson ${i}`);
  const summary = summariseOutline(parseOutline(`${rows.join('\n')}\n`), { lessons: 4 });
  assert.equal(summary.length, 1);
  assert.equal(summary[0]!.lessons.length, 4);
  assert.equal(summary[0]!.more, 3);
});

test('a database refusal is translated into something a teacher can act on', () => {
  assert.match(
    importErrorMessage('teaching:version_frozen'),
    /Start a new version and import into that/,
  );
  assert.match(importErrorMessage('teaching:not_allowed'), /author of/);
  assert.match(importErrorMessage('teaching:import_too_large'), /Split it in two/);
  // An unknown refusal keeps its own words rather than being dressed up.
  assert.equal(importErrorMessage('some unexpected failure'), 'some unexpected failure');
  assert.equal(importErrorMessage(''), 'The import did not reach the database.');
});
