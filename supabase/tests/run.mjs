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
import { run as catalogueSearch } from './catalogue_search.test.mjs';
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
import { run as subjectVocabulary } from './subject_vocabulary.test.mjs';
import { run as lessonSearch } from './lesson_search.test.mjs';
import { run as signup } from './signup.test.mjs';
import { run as resources } from './resources.test.mjs';
import { run as media } from './media.test.mjs';
import { run as products } from './products.test.mjs';
import { run as families } from './families.test.mjs';
import { run as familyAdultLearner } from './family_adult_learner.test.mjs';
import { run as featureTiers } from './feature_tiers.test.mjs';
import { run as learnerProgressRecord } from './learner_progress_record.test.mjs';
import { run as phoneNumbers } from './phone_numbers.test.mjs';
import { run as accountMerge } from './account_merge.test.mjs';
import { run as referrals } from './referrals.test.mjs';
import { run as sponsorship } from './sponsorship.test.mjs';
import { run as teachingApplications } from './teaching_applications.test.mjs';
import { run as institutions } from './institutions.test.mjs';
import { run as courseLanguage } from './course_language.test.mjs';
import { run as revenueBreakdown } from './revenue_breakdown.test.mjs';
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
import { run as offlineDownload } from './offline_download.test.mjs';
import { run as mediaRenditions } from './media_renditions.test.mjs';
import { run as learnerAnalytics } from './learner_analytics.test.mjs';
import { run as masterAccess } from './master_access.test.mjs';
import { run as mediaUploadAbandonment } from './media_upload_abandonment.test.mjs';
import { run as supportCaseHistory } from './support_case_history.test.mjs';
import { run as reviewerRegister } from './reviewer_register.test.mjs';
import { run as reviewRequirements } from './review_requirements.test.mjs';
import { run as adultLearningShares } from './adult_learning_shares.test.mjs';
import { run as currencyReporting } from './currency_reporting.test.mjs';
import { run as courseOrder } from './course_order.test.mjs';
import { run as orderAdjustments } from './order_adjustments.test.mjs';
import { run as adminOrderQueue } from './admin_order_queue.test.mjs';
import { run as discountSharing } from './discount_sharing.test.mjs';
import { run as mediaUploadQuota } from './media_upload_quota.test.mjs';
import { run as marketPricing } from './market_pricing.test.mjs';
import { run as messages } from './messages.test.mjs';
import { run as promotions } from './promotions.test.mjs';
import { run as promotionRedemption } from './promotion_redemption.test.mjs';
import { run as shareInvitations } from './share_invitations.test.mjs';
import { run as orderQuote } from './order_quote.test.mjs';
import { run as orderReceipt } from './order_receipt.test.mjs';
import { run as exportMyData } from './export_my_data.test.mjs';
import { run as eraseMyAccount } from './erase_my_account.test.mjs';
import { run as marketCharges } from './market_charges.test.mjs';
import { run as liveClasses } from './live_classes.test.mjs';
import { run as offlineSaves } from './offline_saves.test.mjs';
import { run as learnerStreaks } from './learner_streaks.test.mjs';
import { run as promotionRemoval } from './promotion_removal.test.mjs';
import { run as ownLearnerProfile } from './own_learner_profile.test.mjs';
import { run as analyticsEvents } from './analytics_events.test.mjs';
import { run as courseReports } from './course_reports.test.mjs';
import { run as mediaStorageMeter } from './media_storage_meter.test.mjs';
import { run as planStanding } from './plan_standing.test.mjs';
import { run as earningsStatement } from './earnings_statement.test.mjs';
import { run as instructorPayouts } from './instructor_payouts.test.mjs';
import { run as teacherLiability } from './teacher_liability.test.mjs';
import { run as notifications } from './notifications.test.mjs';
import { run as policies } from './policies.test.mjs';
import { run as panels } from './panels.test.mjs';
import { run as screening } from './screening.test.mjs';
import { run as incidents } from './incidents.test.mjs';
import { run as takedowns } from './takedowns.test.mjs';
import { run as policyDecisions } from './policy_decisions.test.mjs';
import { run as renewalProjection } from './renewal_projection.test.mjs';
import { run as googleSignIn } from './google_sign_in.test.mjs';
import { run as dataExport } from './data_export.test.mjs';
import { run as staffAttention } from './staff_attention.test.mjs';
import { run as payerStatement } from './payer_statement.test.mjs';
import { run as refundWindow } from './refund_window.test.mjs';
import { run as refundWindowControl } from './refund_window_control.test.mjs';
import { run as platformControls } from './platform_controls.test.mjs';
import { run as deliveryContract } from './delivery_contract.test.mjs';
import { run as settingAuthority } from './setting_authority.test.mjs';
import { run as staffDirectory } from './staff_directory.test.mjs';
import { run as resumePosition } from './resume_position.test.mjs';
import { run as notificationPrefs } from './notification_preferences.test.mjs';
import { run as courseAudience } from './course_audience.test.mjs';
import { run as courseShelf } from './course_shelf.test.mjs';
import { run as practiceCheck } from './practice_check.test.mjs';
import { run as catalogueCards } from './catalogue_cards.test.mjs';
import { run as cataloguePage } from './catalogue_page.test.mjs';

// Settings that are global by design: one row, read by code far from the suite
// that changes it. The revenue share decides what every accrual computes; the
// checkout flag decides whether an order can be placed at all. A suite that
// changes one and does not put it back breaks a suite that runs later, and the
// failure names a file that never touched the setting — which is exactly how a
// leaked 0% share cost four suites a full run on 2026-10-22. Detected here, not
// silently repaired, so the suite that leaked is the one reported.
const GLOBAL_SETTINGS = [
  ['teaching.revenue_share_percent', '50'],
  ['commerce.checkout', 'false'],
];

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
  ['catalogue search', catalogueSearch],
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
  ['offline download', offlineDownload],
  ['media renditions', mediaRenditions],
  ['learner analytics', learnerAnalytics],
  ['master access', masterAccess],
  ['media upload abandonment', mediaUploadAbandonment],
  ['support case history', supportCaseHistory],
  ['reviewer register', reviewerRegister],
  ['review requirements', reviewRequirements],
  ['adult learning shares', adultLearningShares],
  ['currency reporting', currencyReporting],
  ['course order writer', courseOrder],
  ['order adjustments', orderAdjustments],
  ['admin order queue', adminOrderQueue],
  ['discount sharing', discountSharing],
  ['media upload quota', mediaUploadQuota],
  ['market pricing', marketPricing],
  ['messages', messages],
  ['promotions', promotions],
  ['promotion redemption', promotionRedemption],
  ['share invitations', shareInvitations],
  ['order quote', orderQuote],
  ['order receipt', orderReceipt],
  ['export my data', exportMyData],
  ['account erasure', eraseMyAccount],
  ['market charges', marketCharges],
  ['live classes', liveClasses],
  ['offline saves', offlineSaves],
  ['learner streaks', learnerStreaks],
  ['promotion removal', promotionRemoval],
  ['own learner profile', ownLearnerProfile],
  ['analytics events', analyticsEvents],
  ['course reports', courseReports],
  ['media storage meter', mediaStorageMeter],
  ['plan standing', planStanding],
  ['earnings statement', earningsStatement],
  ['instructor payouts', instructorPayouts],
  ['teacher liability', teacherLiability],
  ['notifications', notifications],
  ['policies', policies],
  ['panels', panels],
  ['screening', screening],
  ['incidents', incidents],
  ['takedowns', takedowns],
  ['policy_decisions', policyDecisions],
  ['renewal projection', renewalProjection],
  ['google sign in', googleSignIn],
  ['data export', dataExport],
  ['staff attention', staffAttention],
  ['payer statement', payerStatement],
  ['refund window', refundWindow],
  ['refund window control', refundWindowControl],
  ['platform controls', platformControls],
  ['delivery contract', deliveryContract],
  ['setting authority', settingAuthority],
  ['staff directory', staffDirectory],
  ['resume position', resumePosition],
  ['notification preferences', notificationPrefs],
  ['course audience', courseAudience],
  ['course shelf', courseShelf],
  ['practice check', practiceCheck],
  ['catalogue cards', catalogueCards],
  ['catalogue page', cataloguePage],
  ['earnings', earnings],
  ['roles', roles],
  ['subjects', subjects],
  ['subject_vocabulary', subjectVocabulary],
  ['lesson_search', lessonSearch],
  ['signup', signup],
  ['resources', resources],
  ['media', media],
  ['products', products],
  ['families', families],
  ['family_adult_learner', familyAdultLearner],
  ['feature_tiers', featureTiers],
  ['learner_progress_record', learnerProgressRecord],
  ['revenue_breakdown', revenueBreakdown],
  ['phone_numbers', phoneNumbers],
  ['account_merge', accountMerge],
  ['referrals', referrals],
  ['sponsorship', sponsorship],
  ['teaching_applications', teachingApplications],
  ['institutions', institutions],
  ['course_language', courseLanguage],
  ['assessments', assessments],
]) {
  console.log(`\n--- ${name} ---\n`);
  await fn(ctx);

  for (const [key, seed] of GLOBAL_SETTINGS) {
    const row = (await ctx.q(
      `select value_text from public.platform_settings where key = $1`, [key])).rows[0];
    const value = row ? row.value_text : 'MISSING';
    if (value !== seed) {
      ctx.summary().failures.push({
        name: `${name} left ${key} at ${JSON.stringify(value)}, expected ${JSON.stringify(seed)}`,
        err: 'a suite changed a global setting without restoring it; the next suite to read it fails instead of this one',
      });
    }
  }

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
