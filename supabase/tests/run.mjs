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
import { run as progress } from './progress.test.mjs';
import { run as assessment } from './assessment.test.mjs';
import { run as flags } from './flags.test.mjs';
import { run as family } from './family.test.mjs';
import { run as authoring } from './authoring.test.mjs';
import { run as certificates } from './certificates.test.mjs';
import { run as review } from './review.test.mjs';
import { run as fulfilment } from './fulfilment.test.mjs';
import { run as guardians } from './guardians.test.mjs';
import { run as learnerSwitcher } from './learner_switcher.test.mjs';
import { run as discussion } from './discussion.test.mjs';
import { run as refunds } from './refunds.test.mjs';
import { run as governance } from './governance.test.mjs';

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
  ['progress', progress],
  ['assessment', assessment],
  ['flags', flags],
  ['family', family],
  ['authoring', authoring],
  ['certificates', certificates],
  ['review', review],
  ['fulfilment', fulfilment],
  ['guardians', guardians],
  ['learner switcher', learnerSwitcher],
  ['discussion', discussion],
  ['refunds', refunds],
  ['governance', governance],
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
