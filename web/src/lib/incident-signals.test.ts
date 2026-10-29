import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  SIGNALS_NOTICE,
  incidentGapSentence,
  parseSecuritySignals,
  signalDay,
  signalLabel,
  signalsSentence,
  type SecuritySignals,
} from './incidents.ts';

function signals(over: Partial<SecuritySignals> = {}): SecuritySignals {
  return {
    window: { days: 30, from: '2026-09-29', to: '2026-10-29' },
    actions: [{ action: 'data.exported', events: 2, lastAt: '2026-10-27' }],
    days: [{ day: '2026-10-27', events: 2 }],
    events: 2,
    incidents: { recordedInWindow: 0, open: 0, lastRecordedAt: null, signalsSinceLast: 2 },
    ...over,
  };
}

test('a payload that did not arrive is null, not an empty screen pretending to be calm', () => {
  assert.equal(parseSecuritySignals(null), null);
  assert.equal(parseSecuritySignals('nope'), null);
});

test('counts and days survive the parse, and anything unknown is dropped', () => {
  const parsed = parseSecuritySignals({
    window: { days: 30, from: '2026-09-29', to: '2026-10-29' },
    actions: [{ action: 'role.assigned', events: 3, lastAt: '2026-10-28', suspicious: true }],
    days: [{ day: '2026-10-28', events: 3 }],
    events: 3,
    incidents: { recordedInWindow: 1, open: 1, lastRecordedAt: '2026-10-20', signalsSinceLast: 3 },
  })!;
  assert.equal(parsed.events, 3);
  assert.equal(parsed.actions[0]!.action, 'role.assigned');
  assert.equal(parsed.incidents.signalsSinceLast, 3);
  const text = JSON.stringify(parsed);
  assert(!text.includes('suspicious'), 'a judgement in the payload reached the screen');
});

test('an empty payload claims nothing about how calm things are', () => {
  const parsed = parseSecuritySignals({ window: {}, actions: [], days: [], events: 0, incidents: {} })!;
  assert.equal(parsed.events, 0);
  assert.equal(parsed.incidents.lastRecordedAt, null);
  assert.deepEqual(parsed.actions, []);
});

test('actions are named for a person, and an unknown one is not hidden', () => {
  assert.equal(signalLabel('data.exported'), 'Data exports');
  assert.equal(signalLabel('guardian.consent_revoked'), 'Guardian consent withdrawn');
  // Something a later migration adds must still be readable rather than dropped.
  assert.equal(signalLabel('media.thing_happened'), 'Media thing happened');
});

test('a day is written as a day', () => {
  assert.equal(signalDay('2026-10-29'), '29 October');
  assert.equal(signalDay(null), '');
  assert.equal(signalDay('not a date'), 'not a date');
});

test('the summary is a fact, not a verdict', () => {
  assert.match(signalsSentence(signals()), /2 of the watched actions happened in the last 30 days/i);
  assert.match(signalsSentence(signals()), /across 1 kind/i);
  assert.match(
    signalsSentence(signals({ events: 0, actions: [], incidents: { recordedInWindow: 0, open: 0, lastRecordedAt: null, signalsSinceLast: 0 } })),
    /no incident has ever been recorded/i,
  );
  const text = signalsSentence(signals()).toLowerCase();
  for (const word of ['suspicious', 'anomaly', 'risk', 'alert']) {
    assert(!text.includes(word), `the summary passes judgement: ${word}`);
  }
});

test('the gap sentence names the number and the date, and never demands an incident', () => {
  assert.match(incidentGapSentence(signals()), /2 watched actions have happened since/i);
  assert.match(incidentGapSentence(signals()), /none has ever been written down/i);
  assert.match(
    incidentGapSentence(signals({
      incidents: { recordedInWindow: 1, open: 1, lastRecordedAt: '2026-10-20', signalsSinceLast: 1 },
    })),
    /1 watched action has happened since — the last one was written down on 20 October/i,
  );
  assert.match(
    incidentGapSentence(signals({
      incidents: { recordedInWindow: 1, open: 0, lastRecordedAt: '2026-10-20', signalsSinceLast: 0 },
    })),
    /Nothing watched has happened since/i,
  );
});

test('the notice says what the screen refuses to do before it shows anything', () => {
  assert.match(SIGNALS_NOTICE, /does not judge/i);
  assert.match(SIGNALS_NOTICE, /no score, no threshold and no automatic incident/i);
  assert.match(SIGNALS_NOTICE, /notifies nobody/i);
});
