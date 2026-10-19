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
import { run as courseVersionCopy } from './course_version_copy.test.mjs';
import { run as courseContentReordering } from './course_content_reordering.test.mjs';
import { run as assessmentGradingWorkflow } from './assessment_grading_workflow.test.mjs';
import { run as certificates } from './certificates.test.mjs';
import { run as review } from './review.test.mjs';
import { run as fulfilment } from './fulfilment.test.mjs';
import { run as guardians } from './guardians.test.mjs';
import { run as learnerSwitcher } from './learner_switcher.test.mjs';
import { run as discussion } from './discussion.test.mjs';
import { run as refunds } from './refunds.test.mjs';
import { run as governance } from './governance.test.mjs';
import { run as earnings } from './earnings.test.mjs';
import { run as roles } from './roles.test.mjs';
import { run as subjects } from './subjects.test.mjs';
import { run as signup } from './signup.test.mjs';
import { run as resources } from './resources.test.mjs';
import { run as media } from './media.test.mjs';
import { run as products } from './products.test.mjs';
import { run as families } from './families.test.mjs';
import { run as assessments } from './assessments.test.mjs';
import { run as revenueShare } from './revenue_share.test.mjs';
import { run as plans } from './plans.test.mjs';
import { run as subscriptions } from './subscriptions.test.mjs';
import { run as financialAdjustments } from './financial_adjustments.test.mjs';
import { run as reconciliation } from './reconciliation.test.mjs';
import { run as paymentDisputes } from './payment_disputes.test.mjs';
import { run as learningPaths } from './learning_paths.test.mjs';
import { run as contentSources } from './content_sources.test.mjs';
import { run as instructorProfiles } from './instructor_profiles.test.mjs';
import { run as lessonStudyTools } from './lesson_study_tools.test.mjs';
import { run as supportCases } from './support_cases.test.mjs';
import { run as courseReviews } from './course_reviews.test.mjs';
import { run as courseWishlist } from './course_wishlist.test.mjs';
import { run as cohorts } from './cohorts.test.mjs';
import { run as courseAssignments } from './course_assignments.test.mjs';
import { run as markingFeedback } from './marking_feedback.test.mjs';
import { run as assignmentRevisions } from './assignment_revisions.test.mjs';
import { run as cohortJoinWindow } from './cohort_join_window.test.mjs';

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
  ['course version copy', courseVersionCopy],
  ['course content reordering', courseContentReordering],
  ['assessment grading workflow', assessmentGradingWorkflow],
  ['certificates', certificates],
  ['review', review],
  ['fulfilment', fulfilment],
  ['guardians', guardians],
  ['learner switcher', learnerSwitcher],
  ['discussion', discussion],
  ['refunds', refunds],
  ['governance', governance],
  ['revenue_share', revenueShare],
  ['plans', plans],
  ['subscriptions', subscriptions],
  ['financial_adjustments', financialAdjustments],
  ['reconciliation', reconciliation],
  ['payment_disputes', paymentDisputes],
  ['learning_paths', learningPaths],
  ['content_sources', contentSources],
  ['instructor_profiles', instructorProfiles],
  ['lesson study tools', lessonStudyTools],
  ['support cases', supportCases],
  ['course reviews', courseReviews],
  ['course wishlist', courseWishlist],
  ['cohorts', cohorts],
  ['course assignments', courseAssignments],
  ['marking feedback', markingFeedback],
  ['assignment revisions', assignmentRevisions],
  ['cohort join window', cohortJoinWindow],
  ['earnings', earnings],
  ['roles', roles],
  ['subjects', subjects],
  ['signup', signup],
  ['resources', resources],
  ['media', media],
  ['products', products],
  ['families', families],
  ['assessments', assessments],
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
