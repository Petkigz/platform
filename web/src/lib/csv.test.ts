import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  csvCell,
  csvDocument,
  csvFileName,
  exportFormatSentence,
  exportSections,
} from './csv.ts';

test('a plain cell is left alone', () => {
  assert.equal(csvCell('Amina'), 'Amina');
  assert.equal(csvCell(12), '12');
  assert.equal(csvCell(true), 'true');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
});

test('a cell with a comma, a quote or a newline is quoted, and quotes are doubled', () => {
  assert.equal(csvCell('Yusuf, junior'), '"Yusuf, junior"');
  assert.equal(csvCell('she said "hello"'), '"she said ""hello"""');
  assert.equal(csvCell('two\r\nlines'), '"two\r\nlines"');
});

test('a value that looks like a formula is neutralised', () => {
  // The whole point: a display name is data, and a spreadsheet will run it.
  assert.equal(csvCell('=HYPERLINK("http://x","y")'), `"'=HYPERLINK(""http://x"",""y"")"`);
  assert.equal(csvCell('+44 700 000'), "'+44 700 000");
  assert.equal(csvCell('-5'), "'-5");
  assert.equal(csvCell('@someone'), "'@someone");
  assert.equal(csvCell('\tindented'), '"\'\tindented"');
});

test('numbers greater than zero are not mistaken for formulas', () => {
  // No value is ever passed as a bare number through cellText, but csvCell is
  // exported and has to hold on its own.
  assert.equal(csvCell(5), '5');
  assert.equal(csvCell(-5), "'-5");
});

test('an object becomes a two-column section, keys in the order they arrived', () => {
  const sections = exportSections({
    account: { displayName: 'Amina', timezone: 'Africa/Kampala' },
  });
  assert.equal(sections.length, 1);
  assert.deepEqual(sections[0]!.columns, ['field', 'value']);
  assert.deepEqual(sections[0]!.rows, [
    ['displayName', 'Amina'],
    ['timezone', 'Africa/Kampala'],
  ]);
});

test('a list of records becomes a table with a union of columns', () => {
  const sections = exportSections({
    learners: [
      { name: 'Hafsah', ageBand: '5-7' },
      { name: 'Yusuf', ageBand: '8-10', streak: 3 },
    ],
  });
  assert.deepEqual(sections[0]!.columns, ['name', 'ageBand', 'streak']);
  assert.deepEqual(sections[0]!.rows, [
    ['Hafsah', '5-7', ''],
    ['Yusuf', '8-10', '3'],
  ]);
});

test('a nested value is exported rather than dropped', () => {
  const sections = exportSections({ orders: [{ id: 'o1', total: { amount: 12, currency: 'USD' } }] });
  assert.equal(sections[0]!.columns[1], 'total');
  assert.equal(sections[0]!.rows[0]![1], '{"amount":12,"currency":"USD"}');
});

test('an empty list is a section with a header and no rows', () => {
  const sections = exportSections({ orders: [] });
  assert.deepEqual(sections[0]!.rows, []);
  assert.deepEqual(sections[0]!.columns, ['value']);
});

test('the document keeps the order the database sent, and separates sections', () => {
  const text = csvDocument([
    { title: 'account', columns: ['field', 'value'], rows: [['displayName', 'Amina']] },
    { title: 'learners', columns: ['name'], rows: [['Hafsah'], ['Yusuf']] },
  ]);
  assert.equal(
    text,
    'account\r\nfield,value\r\ndisplayName,Amina\r\n\r\nlearners\r\nname\r\nHafsah\r\nYusuf\r\n',
  );
});

test('a section title is a cell like any other', () => {
  assert.equal(csvDocument([{ title: 'my, notes', columns: ['x'], rows: [] }]).split('\r\n')[0],
    '"my, notes"');
});

test('nothing that arrives is thrown away, including an unreadable document', () => {
  assert.deepEqual(exportSections(null), []);
  assert.deepEqual(exportSections('nonsense'), []);
  const unknown = exportSections({ somethingNew: [{ a: 1 }] });
  assert.equal(unknown.length, 1);
  assert.deepEqual(unknown[0]!.rows, [['1']]);
});

test('the filename is dated and carries the platform name', () => {
  assert.equal(csvFileName(new Date('2026-10-28T12:00:00Z')), 'ayahspring-my-data-2026-10-28.csv');
});

test('every format says what it is for, and none of them pretends to be the others', () => {
  assert.match(exportFormatSentence('csv'), /spreadsheet/i);
  assert.match(exportFormatSentence('print'), /print or save as a PDF/i);
  assert.match(exportFormatSentence('json'), /JSON/i);
});
