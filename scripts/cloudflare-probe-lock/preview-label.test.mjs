import assert from 'node:assert/strict';
import test from 'node:test';
import { labelPreview, PREVIEW_NOTICE } from './preview-label.mjs';

test('labels exactly one body in the disposable copy', () => {
  const labelled = labelPreview('before\n      <body>\nchildren');
  assert.equal(labelled.split(PREVIEW_NOTICE).length, 2);
  assert.ok(labelled.indexOf(PREVIEW_NOTICE) < labelled.indexOf('children'));
  assert.throws(() => labelPreview(labelled));
  assert.throws(() => labelPreview('no body'));
  assert.throws(() => labelPreview('      <body>\n      <body>'));
});
