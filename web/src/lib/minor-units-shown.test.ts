import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import { formatMinor } from './money.ts';

// Money is stored in minor units: 1999 is 19.99. A screen that prints the
// stored number beside a currency code is wrong by a hundred for every
// currency that has cents, and right for shillings, which have none. That is
// how seven screens did it unseen: every fixture was in shillings.
//
// Found on 2026-11-19 on the staff desk for sponsored seats, the pool of
// seats a sponsor chooses from, the sentence a sponsor is shown after
// pledging, and four staff screens (disputes, adjustments, plan prices,
// reconciliation). The sponsor's own page had been corrected earlier.

const src = new URL('../', import.meta.url);
function files(dir: string): string[] {
  return readdirSync(new URL(dir, src), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(`${dir}${entry.name}/`) : [`${dir}${entry.name}`]);
}

test('no screen prints an amount as it is stored', () => {
  const found: string[] = [];
  for (const file of [...files('app/'), ...files('components/'), ...files('lib/')]) {
    if (!/\.tsx?$/u.test(file) || /\.test\.ts$/u.test(file)) continue;
    const text = readFileSync(new URL(file, src), 'utf8');
    text.split('\n').forEach((line, index) => {
      // A stored amount as the text of an element: `· {row.amount_minor} {row.currency_code}`.
      // (Not `amountMinor={…}`, which hands it to something that formats it, and not `${…}`.)
      const asText = /(?<![=\w$])\{[a-zA-Z_.?]*(?:[aA]mount|[tT]otal)_?[mM]inor[a-zA-Z_.?]*(?: \?\? '[^']*')?\}/u.test(line);
      // Or glued to its currency in a sentence: `${currency} ${amountMinor}`.
      const asSentence = /\$\{[a-zA-Z_.?]*[cC]urrency[a-zA-Z_.?]*(?: \?\? '')?\} \$\{[a-zA-Z_.?]*[mM]inor/u.test(line);
      if (asText || asSentence) found.push(`${file}:${index + 1}: ${line.trim().slice(0, 140)}`);
    });
  }
  // The one place allowed to: the formatter's own fallback, for a figure it
  // cannot format, which is shown raw rather than dropped.
  assert.deepEqual(found.filter((line) => !line.startsWith('lib/money.ts:')), []);
  assert.equal(found.filter((line) => line.startsWith('lib/money.ts:')).length, 1);
});

test('the formatter says major units, and never drops a figure it cannot read', () => {
  assert.equal(formatMinor('1999', 'USD'), 'USD 19.99');
  assert.equal(formatMinor('50000', 'UGX'), 'UGX 50000');
  assert.equal(formatMinor('5000', 'KWD'), 'KWD 5.000');
  assert.equal(formatMinor('-1999', 'USD'), '-USD 19.99');
  assert.equal(formatMinor(null, 'USD'), '—');
  // Not an amount: shown as it came, because on a money screen it is still something.
  assert.equal(formatMinor('19.99', 'USD'), 'USD 19.99');
  assert.equal(formatMinor('lots', 'USD'), 'USD lots');
});
