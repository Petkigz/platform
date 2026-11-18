import assert from 'node:assert/strict';
import test from 'node:test';

import { ageBandLabel } from './age-band.ts';
import { AGE_BANDS, AGE_BAND_LABEL } from './family.ts';
import { en } from './i18n/messages/en.ts';
import { fill } from './i18n/format.ts';

const english = {
  ages: (from: number, to: number) => fill(en['family.ages'], { from, to }),
  adult: en['family.bandAdult'],
};

test('every band a child can have reads as it did in the English table', () => {
  for (const band of [...AGE_BANDS, '18+']) {
    assert.equal(ageBandLabel(band, english), AGE_BAND_LABEL[band], band);
  }
});

test('the ages are handed over as numbers, so the page can write them in its own digits', () => {
  const seen: number[] = [];
  const label = ageBandLabel('11-13', {
    ages: (from, to) => { seen.push(from, to); return `${from}/${to}`; },
    adult: 'x',
  });
  assert.deepEqual(seen, [11, 13]);
  assert.equal(label, '11/13');
});

test('a band nobody has heard of is shown as it is stored, not as a blank', () => {
  assert.equal(ageBandLabel('21-30-40', english), '21-30-40');
  assert.equal(ageBandLabel('teen', english), 'teen');
});
