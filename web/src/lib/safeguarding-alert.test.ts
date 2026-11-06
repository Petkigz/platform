import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatchSafeguardingAlert, runSafeguardingAlert, type AlertPorts } from './safeguarding-alert.ts';
import { describeSafeguardingAlert, parseSafeguardingAlertStatus, parseSafeguardingAlertFullHistory, isAlertHistoryCursor } from './safeguarding-alert-status.ts';
const reviewId='11111111-1111-4111-8111-111111111111';
const token='22222222-2222-4222-8222-222222222222';
const ownerId='33333333-3333-4333-8333-333333333333';
function fixture() {
  const calls: string[] = [];
  const ports: AlertPorts = {
    async claim() { calls.push('claim'); return { state:'leased', reviewId, token, ownerId }; },
    async owner(id) { calls.push('owner'); return { id, email:'owner@example.com', verified:true }; },
    async allowed() { calls.push('allowed'); return true; },
    async send() { calls.push('send'); return { outcome:'sent',provider:'resend',reference:'provider-id' }; },
    async settle(_lease,outcome) { calls.push(`settle:${outcome}`); return true; },
  };
  return { calls, ports };
}
test('provider setup is checked before any private alert is claimed', async () => {
  const { ports,calls } = fixture();
  assert.equal(await runSafeguardingAlert({ env:{},ports }), 'provider_unavailable');
  assert.deepEqual(calls, []);
});
test('a verified exact owner and current authorization are checked before sending', async () => {
  const { ports,calls } = fixture();
  assert.equal(await dispatchSafeguardingAlert(ports), 'sent');
  assert.deepEqual(calls, ['claim','owner','allowed','send','settle:sent']);
  const second=fixture(); second.ports.owner=async () => ({ id:reviewId,email:'x@example.com',verified:true });
  assert.equal(await dispatchSafeguardingAlert(second.ports), 'recorded');
  assert.equal(second.calls.includes('send'), false);
  const third=fixture(); third.ports.allowed=async () => false;
  assert.equal(await dispatchSafeguardingAlert(third.ports), 'recorded');
  assert.equal(third.calls.includes('send'), false);
  assert.ok(third.calls.includes('settle:not_sent'));
});
test('uncertain provider results and failed settlement never say sent', async () => {
  const one=fixture(); one.ports.send=async () => ({ outcome:'sent',provider:'resend',reference:'' });
  assert.equal(await dispatchSafeguardingAlert(one.ports), 'recorded');
  assert.ok(one.calls.includes('settle:provider_uncertain'));
  const two=fixture(); two.ports.settle=async () => false;
  assert.equal(await dispatchSafeguardingAlert(two.ports), 'uncertain');
});
test('provider request does not expose the concern, child, or record IDs', async () => {
  const { ports } = fixture(); let payload='';
  const result=await runSafeguardingAlert({ env:{ RESEND_API_KEY:'test',EMAIL_FROM:'no-reply@ayahspring.com' },ports,
    fetchImpl: async (_url, init) => { payload=String(init?.body); return new Response('{"id":"ref"}',{ status:200 }); } });
  assert.equal(result,'sent');
  assert.ok(!payload.includes(reviewId) && !payload.includes(ownerId) && !payload.includes(token));
  assert.doesNotMatch(payload,/concern|child|safeguarding/i);
});
test('alert status keeps a provider reference distinct from delivery', () => {
  assert.equal(parseSafeguardingAlertStatus(null),null);
  const rows=parseSafeguardingAlertStatus([{ review_id:reviewId,status:'sent',attempts:1,last_problem:null }]);
  assert.match(describeSafeguardingAlert(rows?.[0]),/receipt are not confirmed/);
  assert.match(describeSafeguardingAlert(undefined),/unavailable/);
});


test('history cursors preserve bigint precision and malformed history is not empty', () => {
  assert.equal(isAlertHistoryCursor('9223372036854775807'), true);
  assert.equal(isAlertHistoryCursor('9223372036854775808'), false);
  assert.equal(isAlertHistoryCursor('0'), false);
  assert.equal(parseSafeguardingAlertFullHistory(null), null);
  const event={ event_id:'9007199254740993',status:'sent',attempts:1,provider:'resend',provider_reference:'ref',problem:null,recorded_at:'2026-11-06' };
  assert.deepEqual(parseSafeguardingAlertFullHistory([event]), [event]);
  assert.equal(parseSafeguardingAlertFullHistory([{ ...event,event_id:'0' }]),null);
});
