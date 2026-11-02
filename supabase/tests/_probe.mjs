import { createHarness } from './lib.mjs';
import { run as refundWindow } from './refund_window.test.mjs';
import { run as flags } from './flags.test.mjs';
import { run as policies } from './policies.test.mjs';
import { run as decisions } from './policy_decisions.test.mjs';
const ctx = await createHarness();
const suites = [['refund window', refundWindow], ['flags', flags], ['policies', policies], ['policy_decisions', decisions]];
for (const [name, fn] of suites) {
  await fn(ctx);
}
const s = ctx.summary();
for (const f of s.failures) console.log('FAIL:', f.name, '::', f.err);
console.log(`${s.passed} passed, ${s.failures.length} failed`);
await ctx.close();
