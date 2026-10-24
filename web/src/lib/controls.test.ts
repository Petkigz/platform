import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ControlError,
  describeBounds,
  parseControls,
  validateControlValue,
  type Control,
} from './controls.ts';

const integerControl: Control = {
  key: 'learning.offline_max_devices',
  label: 'Devices per learner',
  value: '3',
  valueType: 'integer',
  unit: 'devices',
  minValue: 1,
  maxValue: 10,
  allowedPrefix: null,
  note: 'How many devices one learner may keep saved lessons on at once.',
  updatedAt: null,
  updatedBy: null,
};

const textControl: Control = {
  key: 'delivery.live_room_base',
  label: 'Live room host',
  value: '',
  valueType: 'text',
  unit: 'URL',
  minValue: null,
  maxValue: null,
  allowedPrefix: 'https://',
  note: 'Base URL of the live-room host.',
  updatedAt: null,
  updatedBy: null,
};

const currencyControl: Control = {
  ...textControl,
  key: 'finance.reporting_currency',
  label: 'Reporting currency',
  value: 'USD',
  unit: 'ISO 4217',
  allowedPrefix: null,
  note: 'The one currency money is reported in.',
};

const booleanControl: Control = {
  ...integerControl,
  key: 'governance.panel_required',
  label: 'Scholarly panel required',
  value: 'false',
  valueType: 'boolean',
  unit: null,
  minValue: null,
  maxValue: null,
  note: 'Whether a scholarly panel must decide before publication.',
};

const payload = {
  generatedAt: '2026-10-23T10:00:00Z',
  totalControls: 10,
  mineCount: 2,
  controls: [integerControl, textControl],
};

test('a control set is read as the database shaped it', () => {
  const set = parseControls(payload);
  assert.equal(set.controls.length, 2);
  assert.equal(set.mineCount, 2);
  assert.equal(set.totalControls, 10);
});

test('a payload with no list is refused rather than shown as an empty page', () => {
  // "None of these are yours" and "this did not load" must not look the same.
  assert.throws(() => parseControls({}), ControlError);
  assert.throws(() => parseControls(null), ControlError);
});

test('a control with no key or no value refuses the whole payload', () => {
  assert.throws(() => parseControls({ controls: [{ value: '1' }] }), /no key/);
  assert.throws(() => parseControls({ controls: [{ key: 'x', value: null }] }), /no value/);
});

test('an unknown value type degrades to text rather than breaking the page', () => {
  const set = parseControls({ controls: [{ key: 'x', value: '1', valueType: 'money' }] });
  assert.equal(set.controls[0]!.valueType, 'unknown');
  // And validation lets it through: the writer is the thing that refuses.
  assert.equal(validateControlValue(set.controls[0]!, 'anything'), null);
});

test('bounds are said the way a person reads them', () => {
  assert.equal(describeBounds(integerControl), '1 to 10 devices');
  assert.equal(describeBounds(booleanControl), 'On or off');
  assert.equal(describeBounds(textControl), 'Empty, or a value starting https://');
  assert.equal(describeBounds(currencyControl), 'Text');
});

test('an integer is refused when it is not whole', () => {
  assert.match(validateControlValue(integerControl, '3.5') ?? '', /whole number/);
  assert.match(validateControlValue(integerControl, 'three') ?? '', /whole number/);
});

test('the bounds come from the control, not from a shared guess', () => {
  assert.match(validateControlValue(integerControl, '0') ?? '', /1 is the lowest/);
  assert.match(validateControlValue(integerControl, '11') ?? '', /10 is the highest/);
  assert.equal(validateControlValue(integerControl, '1'), null);
  assert.equal(validateControlValue(integerControl, '10'), null);
});

test('a boolean is on or off', () => {
  assert.equal(validateControlValue(booleanControl, 'true'), null);
  assert.equal(validateControlValue(booleanControl, 'false'), null);
  assert.match(validateControlValue(booleanControl, 'yes') ?? '', /on or off/);
});

test('a currency must look like one, in either case', () => {
  assert.equal(validateControlValue(currencyControl, 'GBP'), null);
  assert.equal(validateControlValue(currencyControl, 'gbp'), null);
  assert.match(validateControlValue(currencyControl, 'dollars') ?? '', /three-letter/);
});

test('the live-room host may be emptied but not left as plain http', () => {
  // Empty is the honest shipped state: live rooms are not connected.
  assert.equal(validateControlValue(textControl, ''), null);
  assert.equal(validateControlValue(textControl, 'https://meet.example.org'), null);
  assert.match(
    validateControlValue(textControl, 'http://meet.example.org') ?? '',
    /https:\/\//,
  );
  assert.match(
    validateControlValue(textControl, 'meet.example.org') ?? '',
    /https:\/\//,
  );
});
