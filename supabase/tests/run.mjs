// Applies the migrations once, then runs every suite against the same engine.
// summary() is cumulative, so per-suite numbers are taken as deltas.
import { createHarness, report } from './lib.mjs';
import { run as group1 } from './group1.test.mjs';
import { run as group2 } from './group2.test.mjs';
import { run as group2b } from './group2b.test.mjs';
import { run as group3 } from './group3.test.mjs';
import { run as group4 } from './group4.test.mjs';
import { run as group5 } from './group5.test.mjs';
import { run as appContract } from './app.test.mjs';
import { run as authorization } from './authorization.test.mjs';
import { run as catalogue } from './catalogue.test.mjs';
import { run as enrolment } from './enrolment.test.mjs';

const ctx = await createHarness();
const suites = [];
let prev = { passed: 0, failures: 0 };

for (const [name, fn] of [
  ['group1', group1],
  ['group2', group2],
  ['group2b', group2b],
  ['group3', group3],
  ['group4', group4],
  ['group5', group5],
  ['app', appContract],
  ['authorization', authorization],
  ['catalogue', catalogue],
  ['enrolment', enrolment],
]) {
  console.log(`\n--- ${name} ---\n`);
  await fn(ctx);
  const s = ctx.summary();
  suites.push([name, {
    passed: s.passed - prev.passed,
    failures: s.failures.slice(prev.failures),
  }]);
  prev = { passed: s.passed, failures: s.failures.length };
}

const code = report(suites);
await ctx.close();
process.exit(code);
