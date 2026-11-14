import test from 'node:test';
import assert from 'node:assert/strict';
import { executePlan, historyMatches, isPristine, migrationInventory } from './hosted-migration-apply.mjs';
const names = ['20260101000000_first.sql', '20260101000001_second.sql'];
const blank = { database: 'postgres', actor: 'postgres', auth_users: 0, public_relations: 0, public_functions: 0, history_exists: false };
const history = [{ version: '20260101000000', name: 'first' }, { version: '20260101000001', name: 'second' }];
const dryOutput = names.map(x => ` • ${x}`).join('\n');
function mockClient(snapshots) {
  let index = -1;
  return { async query(q) {
    if (q === 'begin read only') { index++; return {}; }
    if (q === 'rollback') return {};
    if (q.startsWith('select version, name')) return { rows: snapshots[index].history || [] };
    return { rows: [snapshots[index].row] };
  }};
}
const clean = () => ({ row: { ...blank }, history: [] });
const final = () => ({ row: { ...blank, history_exists: true, public_relations: 2 }, history });

test('reviewed chain identity, pristine state and history matching', () => {
  const inventory = migrationInventory();
  assert.equal(inventory.names.length, 342);
  assert.equal(inventory.hash, 'ebde8bfc2ec7d2d27b5e9d6dc6969a0d076ef5cf65e8d2a9c9379babe395c2d2');
  assert.ok(isPristine(blank, 0));
  for (const field of ['auth_users', 'public_relations', 'public_functions']) assert.equal(isPristine({ ...blank, [field]: 1 }, 0), false);
  assert.equal(isPristine(blank, 1), false);
  assert.ok(historyMatches(history, names)); assert.equal(historyMatches(history.reverse(), names), false); history.reverse();
});

test('only a fresh matching preview and two clean checks can reach apply', async () => {
  const attempts = [];
  const cli = async args => { attempts.push(args); return args.includes('--dry-run') ? { code: 0, output: dryOutput } : { code: 0, output: '' }; };
  const result = await executePlan(mockClient([clean(),clean(),final()]), cli, 'not-a-real-url', names);
  assert.equal(result.ok, true); assert.equal(attempts.length, 2);
  assert.ok(attempts[0].includes('--dry-run')); assert.ok(!attempts[0].includes('--yes'));
  assert.ok(attempts[1].includes('--yes')); assert.ok(!attempts[1].includes('--dry-run'));
});

test('dirty database, differing preview, concurrent change and partial failure stop safely', async () => {
  let calls = 0;
  const dry = async () => { calls++; return { code: 0, output: dryOutput }; };
  let result = await executePlan(mockClient([{row:{...blank,auth_users:1}}]), dry, 'url', names);
  assert.equal(result.ok, false); assert.equal(calls, 0);
  result = await executePlan(mockClient([clean()]), async () => ({code:0,output:' • 20260101000000_first.sql'}), 'url', names);
  assert.equal(result.ok, false); assert.match(result.message, /fresh dry-run/);
  result = await executePlan(mockClient([clean(),{row:{...blank,public_relations:1}}]), dry, 'url', names);
  assert.equal(result.ok, false); assert.match(result.message, /changed during preflight/);
  let count = 0;
  result = await executePlan(mockClient([clean(),clean()]), async () => ++count === 1 ? {code:0,output:dryOutput} : {code:1,output:'password authentication failed secret-value'}, 'url', names);
  assert.equal(result.ok, false); assert.match(result.message, /inspect history and schema/); assert.doesNotMatch(result.message,/secret-value/);
  count = 0;
  result = await executePlan(mockClient([clean(),clean(),{row:{...blank,history_exists:true},history:history.slice(0,1)}]), async () => ++count === 1 ? {code:0,output:dryOutput} : {code:0,output:''}, 'url', names);
  assert.equal(result.ok, false); assert.match(result.message, /history does not match/);
});
