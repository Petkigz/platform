-- What the platform grants on its own, taken back.
--
-- A hosted Supabase project is created with default privileges that give the
-- two roles a browser can act as, `anon` (nobody signed in) and
-- `authenticated`, EXECUTE on every function and every privilege on every
-- table and sequence that the migrating role creates in `public`. The
-- migrations before this one were written, and tested, on a database without
-- those defaults. They close a function with
--
--   revoke all on function f from public;
--   grant execute on function f to authenticated;
--
-- which closes it there and leaves it open on the hosted database: revoking
-- from PUBLIC does not remove a grant made to `anon` by name.
--
-- Measured on 2026-11-17, on the hosted test project (no users, no orders, no
-- rows) and on a local PostgreSQL given the same defaults:
--
--   * `anon` could execute 143 functions it cannot execute in the tested
--     database, 131 of them SECURITY DEFINER and callable through the API.
--     115 of the 131 mention the caller's identity somewhere in their body (a
--     text search, not a reading of each). 16 do not, because they were only
--     ever meant to be called by other functions or by the server:
--     notify_user() would have put any text and link in front of any user;
--     reverse_earnings_for_refund() and accrue_instructor_earnings() write
--     the teacher ledger; recompute_order_totals() rewrites an order's totals;
--     instructor_payout_totals() reads a teacher's money.
--     grant_subscription_plan_entitlements() names the caller only to record
--     them in the audit trail.
--   * `authenticated` could execute 16 functions meant for the server only,
--     those among them.
--   * `anon` held SELECT on 93 more tables and INSERT, UPDATE and DELETE on
--     about 113 more. Row-level security is on for every table and the
--     policies name their roles, so no row was readable or writable that way;
--     the grants were simply not meant to exist. Both roles also held
--     TRUNCATE, which row-level security does not cover (the API has no way
--     to ask for it).
--
-- This migration makes what those two roles may do the same on both kinds of
-- database, and equal to what the tests have always assumed:
--
--   1. new objects stop receiving the platform's grants;
--   2. every function grant to the two roles is removed and the ones the
--      migrations made on purpose are made again, by name;
--   3. `anon` keeps only the tables it was given on purpose, plus six tables
--      whose read policy names `anon` and which had been readable on the
--      hosted database only by the platform's default;
--   4. `authenticated` keeps SELECT, INSERT, UPDATE and DELETE as before and
--      loses TRUNCATE, REFERENCES, TRIGGER and MAINTAIN;
--   5. neither role keeps anything on a sequence.
--
-- `service_role` is not touched: it is the server's key, never sent to a
-- browser, and is trusted with more than this already.
--
-- On a database without the platform's defaults this changes nothing except
-- the six read grants in step 3. `supabase/tests/harness.sql` now sets the
-- same defaults the platform does, so the suites run as the hosted database
-- would, and `scripts/platform-grants-check.mjs` fails if a later migration
-- makes the two kinds of database differ again.
--
-- The lists below were read from a database built from migrations up to
-- 20261281143000 without the platform's defaults: they are the grants those
-- migrations made by name.

-- ---------------------------------------------------------------------------
-- 1. New objects
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
-- The project's own rule, from 20261015000700: a signed-in person may attempt
-- the four ordinary operations on a new table, and row-level security decides.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Functions
-- ---------------------------------------------------------------------------
revoke execute on all routines in schema public from anon, authenticated;

-- 26 functions somebody who is not signed in may call.
grant execute on function
  public.can_access_lesson_entitlement_now(uuid), public.can_read_discussion(uuid),
  public.can_read_version(uuid), public.catalogue_cards(uuid[],text),
  public.catalogue_page(text,text,text,text,integer,integer,text),
  public.course_languages(), public.course_price_for_me(uuid,text),
  public.course_review_summary(uuid), public.currency_minor_divisor(character),
  public.discussion_parent_is_public(uuid,uuid), public.has_declared_adult(uuid),
  public.institution_api_report(text,text,date,date), public.learner_badge_catalogue(),
  public.may_read_media_rendition(uuid), public.policies_in_force(),
  public.policy_page(text), public.published_locale_reviews(),
  public.report_content(uuid,text,text,uuid), public.resolve_referral_code(text),
  public.safeguarding_lead(), public.search_catalogue(text,text,text,integer),
  public.search_lessons(text,integer), public.search_lessons_base(text,integer),
  public.translation_review_is_open(uuid), public.verify_certificate(text),
  public.withdrawal_offer(text)
  to anon;

-- 503 functions a signed-in person may call. Each decides for itself who
-- the caller is and what they may do.
grant execute on function
  public.abandon_child_login(uuid), public.abandon_media_upload(uuid,text,text),
  public.accept_family_membership(uuid), public.accept_learning_share(text),
  public.accept_policy(text), public.acknowledge_conduct(),
  public.acknowledge_coursework_offline_evidence(uuid,uuid,text,text),
  public.acknowledge_safeguarding_concern(uuid), public.activate_assessment(uuid),
  public.activate_learning_path(uuid), public.activate_plan_version(uuid),
  public.activate_product(uuid),
  public.add_assessment_question(uuid,text,jsonb,numeric,text,jsonb,text),
  public.add_child_to_family(uuid,text,text),
  public.add_content_source_for_lesson(uuid,uuid,text,text,text,text,text,text,text,text),
  public.add_hifz_passage(uuid,text,text),
  public.add_incident_notification(uuid,text,text,timestamp with time zone),
  public.add_learning_path_item(uuid,uuid,boolean),
  public.add_lesson_resource(uuid,text,text,text,text),
  public.add_order_adjustment(uuid,text,bigint,text,text,uuid),
  public.add_panel_member(uuid,uuid,text),
  public.add_plan_entitlement(uuid,text,uuid,uuid,text),
  public.add_reconciliation_statement_line(uuid,text,bigint,text),
  public.admin_orders_overview(integer), public.ai_support_ask(text,uuid),
  public.ai_support_summary(integer), public.allocate_subscription_learner(uuid,uuid),
  public.analytics_daily(text,integer), public.analytics_event_totals(integer),
  public.analytics_refusal_reasons(text,integer,integer),
  public.analytics_search_terms(integer,integer), public.appeal_review_decision(uuid,text),
  public.apply_for_sponsorship(uuid,uuid,text), public.apply_promotion_to_order(uuid,text),
  public.approve_policy_version(uuid,date,text), public.archive_hifz_passage(uuid),
  public.assert_media_upload_allowed(bigint),
  public.assess_content_change(uuid,text,text,boolean,text,uuid),
  public.assess_reviewer_conflict(uuid,text,text), public.assign_role(uuid,text,text),
  public.assign_support_case(uuid,uuid), public.assignment_submission_files(uuid),
  public.assignment_submission_files_page(uuid,text,integer),
  public.attach_assignment_asset(uuid,uuid),
  public.attach_live_recording(uuid,text,boolean),
  public.attest_closed_cohort_end(uuid,timestamp with time zone,text,text),
  public.authorize_child_login_auth_deletion(uuid),
  public.block_child_login_task_database_access(uuid), public.can_access_learner(uuid),
  public.can_access_lesson_entitlement_now(uuid), public.can_appoint_teacher(uuid),
  public.can_decide_guardian_consent(uuid), public.can_decide_sponsorship(uuid),
  public.can_manage_cohort(uuid), public.can_manage_subjects(),
  public.can_read_assignment_submission(uuid), public.can_read_cohort(uuid),
  public.can_read_cohort_member(uuid), public.can_read_course_assignment(uuid),
  public.can_read_discussion(uuid), public.can_read_learner_course_progress(uuid,uuid),
  public.can_read_support_case(uuid), public.can_read_version(uuid),
  public.can_use_lesson_study_data(uuid,uuid,uuid), public.can_watch_live_recording(uuid),
  public.can_work_incidents(uuid), public.cancel_account_merge(uuid),
  public.cancel_instructor_payout(uuid), public.cancel_live_session(uuid,text),
  public.cancel_subscription(uuid,text), public.cast_panel_vote(uuid,text,text),
  public.catalogue_cards(uuid[],text),
  public.catalogue_page(text,text,text,text,integer,integer,text),
  public.certificate_shelf_standing(),
  public.change_support_case_cleanup_hold(uuid,text,text),
  public.check_lesson_answer(uuid,jsonb), public.child_login_database_block_status(uuid[]),
  public.child_login_erasure_recovery_queue(integer),
  public.child_login_erasure_recovery_queue_page(integer,integer),
  public.child_login_legacy_erasure_queue(integer),
  public.child_login_legacy_erasure_queue_page(integer,integer),
  public.child_login_pending_attempts(integer),
  public.child_login_pending_attempts_page(integer,integer),
  public.child_login_removal_queue(integer),
  public.child_login_removal_queue_page(integer,integer), public.child_login_state(uuid),
  public.child_password_recovery_status(uuid), public.claim_family_adult_learner(uuid),
  public.claim_institution_domain(text), public.claim_institution_seat(text,uuid),
  public.claim_outbound_messages(integer), public.claim_own_learner_profile(),
  public.clear_coursework_erasure_review(uuid,uuid,text), public.clear_my_phone(),
  public.close_payment_reconciliation(uuid,text), public.close_support_case(uuid,text),
  public.cohort_learner_progress(uuid), public.cohort_member_count(uuid),
  public.cohort_places(uuid[]),
  public.compare_record_resource_position(uuid,uuid,uuid,integer,uuid),
  public.complete_instructor_payout(uuid,text,text),
  public.complete_refund(uuid,text,uuid,uuid), public.confirm_media_rendition(uuid),
  public.confirm_media_upload(uuid), public.course_languages(),
  public.course_price_for_me(uuid,text), public.course_review_summary(uuid),
  public.course_shelf(text,text,integer), public.coursework_bytes_awaiting(integer),
  public.coursework_bytes_awaiting_checked_page(timestamp with time zone,uuid,integer),
  public.coursework_bytes_awaiting_page(timestamp with time zone,uuid,integer),
  public.coursework_bytes_awaiting_page_with_holds(timestamp with time zone,uuid,integer),
  public.coursework_detach_review_page(uuid,integer),
  public.coursework_erasure_review_page(uuid,uuid,integer),
  public.coursework_erasure_review_with_offline_page(uuid,uuid,integer),
  public.coursework_hold_count(), public.coursework_holds(integer),
  public.coursework_holds_page(timestamp with time zone,uuid,integer),
  public.coursework_max_bytes(), public.coursework_max_files(),
  public.coursework_mime_allowed(text), public.coursework_missing_class_ends(integer,uuid),
  public.coursework_offline_evidence_page(uuid,integer),
  public.coursework_quarantine_inspection_target(uuid),
  public.coursework_quarantine_queue(integer,uuid),
  public.coursework_quarantine_review_page(integer,uuid),
  public.coursework_retention_plan(timestamp with time zone),
  public.coursework_review_queue(integer),
  public.coursework_review_queue_page(boolean,timestamp with time zone,uuid,integer),
  public.coursework_review_summary(),
  public.coursework_shared_retention_review_page(uuid,integer),
  public.coursework_storage_presence_target(uuid),
  public.create_assessment(uuid,text,text,uuid,numeric,integer,text),
  public.create_cohort(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,integer,timestamp with time zone),
  public.create_course_assignment(uuid,uuid,text,text,integer,timestamp with time zone,boolean,numeric),
  public.create_course_order(uuid,uuid,text,text), public.create_course_version_from(uuid),
  public.create_family(text), public.create_institution(text,text,text,uuid,text),
  public.create_institution_api_key(text,text,text),
  public.create_learning_path(text,text,text,text), public.create_plan(text,text,text,text),
  public.create_plan_order(uuid,uuid,uuid,uuid),
  public.create_plan_version(uuid,integer,integer,text,text),
  public.create_policy_document(text,text,text,text,boolean),
  public.create_product(text,text,text),
  public.create_promotion_campaign(text,text,text,numeric,bigint,text,text[],uuid[],timestamp with time zone,timestamp with time zone,integer,integer,boolean,integer),
  public.currency_minor_divisor(character), public.decide_account_merge(uuid,boolean,text),
  public.decide_appeal(uuid,text,text),
  public.decide_guardian_consent(uuid,text,text,integer,boolean,boolean,boolean),
  public.decide_panel_case(uuid,text,text), public.decide_refund_request(uuid,boolean,text),
  public.decide_sponsorship_application(uuid,boolean,text),
  public.decide_takedown_notice(uuid,text,text),
  public.decide_teaching_application(uuid,boolean,text),
  public.decide_translation_proposal(uuid,boolean), public.declare_adult(integer),
  public.declare_reviewer_conflict(text,text,uuid),
  public.decline_translation_review(uuid,text), public.delete_media_asset(uuid,text),
  public.delivery_max_attempts(), public.discussion_parent_is_public(uuid,uuid),
  public.erase_my_account(text), public.export_course_report(uuid,integer),
  public.export_my_data(), public.fail_instructor_payout(uuid,text),
  public.fail_media_rendition(uuid,text), public.family_adult_learners(uuid),
  public.finalize_payment_reconciliation(uuid), public.forget_offline_lesson(uuid),
  public.guard_learner_profile_identity(), public.guardian_consent_enforced(),
  public.guardian_consent_is_current(uuid), public.guardian_consent_register(),
  public.has_declared_adult(uuid), public.hold_coursework_file(uuid,text),
  public.identity_lookup(text), public.identity_removal_queue(), public.ijazah_register(),
  public.import_course_outline(uuid,jsonb), public.incident_detail(uuid),
  public.incident_register(), public.institution_admin_candidate(text),
  public.institution_api_report(text,text,date,date), public.institution_directory(),
  public.institution_joinable_domain(), public.institution_report(date,date),
  public.institution_seat_directory(), public.instructor_payout_queue(integer),
  public.invite_family_member(uuid,uuid,text),
  public.invite_learning_share(text,text,integer), public.is_institution_admin(uuid,uuid),
  public.is_verified_guardian_of(uuid), public.issue_certificate_for_session(uuid,text),
  public.issue_institution_seat_codes(uuid,jsonb), public.join_cohort(uuid,uuid),
  public.join_institution(), public.join_live_session(uuid,uuid),
  public.learner_across_courses(uuid), public.learner_badge_catalogue(),
  public.learner_engagement(uuid), public.learner_progress_record(uuid),
  public.leave_cohort(uuid,uuid), public.leave_institution(),
  public.legacy_coursework_review_page(uuid,integer), public.lesson_download_standing(uuid),
  public.lesson_playback_standing(uuid), public.lesson_positions(uuid),
  public.link_product_course_version(uuid,uuid,uuid),
  public.list_certificate_admin_records(), public.list_certificate_issuance_candidates(),
  public.list_pending_manual_assessment_responses(uuid), public.live_course_prices(uuid),
  public.live_recording_link(uuid), public.live_session_audience(uuid),
  public.live_session_roster(uuid), public.log_cohort_roster_export(uuid),
  public.log_incident_entry(uuid,text,text),
  public.mark_assignment_submission(uuid,numeric,text),
  public.mark_incident_notified(uuid,text,text),
  public.mark_manual_assessment_response(uuid,numeric,boolean,text),
  public.mark_notifications_read(uuid[]), public.master_preview_target(uuid),
  public.may_change_control(uuid,text), public.may_download_lesson(uuid),
  public.may_manage_child_login(uuid), public.may_manage_child_profile(uuid),
  public.may_play_rendition(uuid), public.may_read_media_asset_row(uuid),
  public.may_read_media_rendition(uuid), public.may_read_shared_learning(uuid,text,uuid),
  public.may_review_version_media(uuid), public.may_teach_children(uuid),
  public.may_transcode_library_asset(uuid), public.may_watch_master(uuid),
  public.may_write_setting(uuid,text,text), public.media_storage_overview(integer),
  public.media_storage_used(), public.media_upload_allowance(bigint),
  public.merge_blocks(uuid,uuid), public.moderate_course_review(uuid,text,text),
  public.moderate_discussion_post(uuid,text,text,text,text,uuid,text,text),
  public.move_course_content(text,uuid,text), public.my_adult_declaration(),
  public.my_earnings(integer), public.my_guardian_consents(), public.my_hifz(uuid),
  public.my_ijazah_authorisations(), public.my_institution(), public.my_institution_seats(),
  public.my_learning_shares(uuid), public.my_live_sessions(uuid),
  public.my_media_delivery(), public.my_media_storage(), public.my_merge_requests(),
  public.my_notification_preferences(), public.my_notifications(integer),
  public.my_offline_devices(), public.my_offline_lessons(text), public.my_panel_work(),
  public.my_payout_options(), public.my_payouts(integer), public.my_phone(),
  public.my_plan_summary(), public.my_policy_standing(), public.my_referral_code(),
  public.my_referrals(), public.my_screening_status(), public.my_sign_in_methods(),
  public.my_sponsorship_applications(), public.my_sponsorships(), public.my_statement(uuid),
  public.my_takedown_notices(), public.my_teacher_terms(), public.my_teaching_application(),
  public.normalise_phone_number(text,text), public.notification_badge(),
  public.offline_booking_matches_resource(uuid,uuid,uuid),
  public.offline_save_key_allowed(uuid),
  public.open_incident(text,text,text,timestamp with time zone,timestamp with time zone,text[]),
  public.open_panel(text,text,uuid,integer), public.open_panel_case(uuid,uuid),
  public.open_payment_dispute(uuid,uuid,text,bigint,text,text),
  public.open_support_case(text,text,text,uuid,uuid),
  public.open_takedown_notice(uuid,text,text,text,text,text,text,date),
  public.order_withdrawal_window(uuid), public.outbox_standing(), public.panel_register(),
  public.panel_tally(uuid), public.plan_feature_codes(), public.plan_feature_label(text),
  public.plan_feature_requires_tier(text), public.plan_feature_tier_rules(),
  public.platform_control_rules(), public.platform_controls(),
  public.platform_renewal_projection(integer), public.platform_teacher_liability(),
  public.pledge_sponsorship(text,text,text), public.policies_in_force(),
  public.policy_draft(uuid), public.policy_page(text), public.policy_register(),
  public.prepare_child_login(uuid,text), public.prepare_child_password_recovery(uuid),
  public.promotion_market_options(), public.publish_translation_review(uuid),
  public.published_locale_reviews(),
  public.purge_coursework_files(timestamp with time zone,integer),
  public.quarantine_media_upload(uuid,text),
  public.queue_message(text,text,text,text,jsonb),
  public.queue_reviewed_coursework_erasure(uuid,text,text),
  public.queue_reviewed_detached_coursework(uuid,text,text),
  public.queue_reviewed_shared_coursework(uuid,text,text),
  public.quote_course_order(uuid,uuid,text,text),
  public.quote_market_charges(text,text,bigint),
  public.re_pin_enrolment(uuid,uuid,uuid,text,text),
  public.reconcile_child_login_attempt(uuid),
  public.reconcile_legacy_child_login_erasure(uuid),
  public.record_analytics_event(text,uuid,uuid,jsonb),
  public.record_child_login_identity_removed(uuid), public.record_coursework_purge(uuid),
  public.record_coursework_review(uuid,text,text),
  public.record_delivery_outcome(uuid,text,text,text,text),
  public.record_earnings_clawback(uuid,text),
  public.record_exchange_rate(character,character,numeric,text,timestamp with time zone,text),
  public.record_financial_adjustment(uuid,uuid,text,bigint,text,text),
  public.record_identity_removal(uuid,text),
  public.record_ijazah(uuid,text,text,text,date,text),
  public.record_incident_impact(uuid,integer,integer,integer,text),
  public.record_incident_lesson(uuid,text),
  public.record_institution_seat_order(uuid,uuid,integer,text,text,bigint,text,uuid,text),
  public.record_live_attendance(uuid,uuid,boolean),
  public.record_media_rendition_encode(uuid,text,bigint,integer,integer,integer,integer,text),
  public.record_payment_success(uuid,uuid,text,text,uuid,text),
  public.record_reviewer_qualification(uuid,text,text,text,uuid,text),
  public.record_sponsorship_payment(uuid,text,text),
  public.record_takedown_response(uuid,text),
  public.record_teacher_screening(uuid,text,text,text,date,text,date),
  public.record_technical_check(uuid,text,boolean,text),
  public.record_transaction_settlement(uuid,bigint,character,uuid),
  public.record_withdrawal_choice(uuid,boolean,text), public.referral_overview(),
  public.refresh_review_requirements(uuid), public.refund_approval_status(),
  public.refund_standing(uuid), public.refund_window_hours(),
  public.register_as_reviewer(text),
  public.register_coursework_upload(uuid,text,text,bigint,text),
  public.register_media_rendition(uuid,text,text,bigint,integer,integer,integer,integer,text),
  public.register_media_upload(text,bigint,text,text,integer,text),
  public.release_coursework_hold(uuid,text),
  public.release_coursework_quarantine(uuid,text),
  public.release_family_adult_learner(uuid), public.remove_assignment_asset(uuid,uuid),
  public.remove_child_login(uuid,text), public.remove_content_source(uuid),
  public.remove_course_review(uuid), public.remove_learning_path_item(uuid),
  public.remove_live_recording(uuid,text), public.remove_offline_device(uuid),
  public.remove_panel_member(uuid,text,text), public.remove_plan_entitlement(uuid),
  public.remove_promotion_from_order(uuid), public.reopen_assignment_submission(uuid),
  public.reopen_safeguarding_concern(uuid), public.reply_to_support_case(uuid,text,boolean),
  public.report_content(uuid,text,text,uuid),
  public.report_money_in_reporting_currency(timestamp with time zone,timestamp with time zone),
  public.request_account_merge(text), public.request_instructor_payout(text,text,boolean),
  public.request_learner_handover(uuid,text,boolean),
  public.request_refund(uuid,bigint,text), public.require_incident_role(),
  public.require_review(uuid,uuid,text,integer),
  public.resolve_content_report(uuid,text,text),
  public.resolve_course_price(uuid,text,text),
  public.resolve_exchange_rate(character,character,timestamp with time zone),
  public.resolve_reconciliation_item(uuid,uuid,text), public.resolve_referral_code(text),
  public.resolve_support_case(uuid,text), public.restore_my_data(jsonb,boolean),
  public.resume_position_snapshot(uuid,uuid),
  public.resume_resource_snapshot(uuid,uuid,uuid),
  public.retention_plan(timestamp with time zone), public.retire_learning_path(uuid,text),
  public.retire_market_charge(uuid,text), public.retire_product(uuid),
  public.retry_coursework_upload_target(uuid,uuid,text,bigint,text),
  public.retry_media_rendition(uuid,text), public.retry_outbound_message(uuid,text),
  public.retry_safeguarding_alert(uuid),
  public.revenue_breakdown(timestamp with time zone,timestamp with time zone),
  public.review_hifz_passage(uuid,text),
  public.review_unknown_coursework_quarantine(uuid,text,text,text),
  public.revoke_adult_learning_share(uuid),
  public.revoke_certificate_for_session(uuid,text),
  public.revoke_family_membership(uuid,text), public.revoke_guardian_consent(uuid,text),
  public.revoke_institution_api_key(uuid,text), public.revoke_role(uuid,text,text),
  public.run_retention_jobs(timestamp with time zone,integer),
  public.safeguarding_alert_history(uuid,bigint,integer),
  public.safeguarding_alert_recent_history(uuid[],integer),
  public.safeguarding_alert_status(uuid[]),
  public.safeguarding_concern_history(timestamp with time zone,uuid,integer),
  public.safeguarding_concern_queue(integer),
  public.safeguarding_concern_queue_page(timestamp with time zone,uuid,integer),
  public.safeguarding_lead(), public.safeguarding_owner_status(),
  public.save_assignment_draft(uuid,uuid,text), public.save_incident_notice(uuid,text),
  public.save_instructor_public_profile(text,text,text,text,text,text,text,text,text,boolean),
  public.save_lesson_transcript(uuid,text), public.save_offline_lesson(uuid,text,text),
  public.save_offline_lesson_for_resource(uuid,uuid,text,text),
  public.save_platform_help_article(uuid,text,text,text,text),
  public.save_policy_draft(text,text,text),
  public.schedule_live_session(uuid,text,timestamp with time zone,timestamp with time zone,text,text,uuid),
  public.screening_register(), public.search_catalogue(text,text,text,integer),
  public.search_lessons(text,integer), public.search_lessons_base(text,integer),
  public.security_signals(integer),
  public.set_assignment_revision_policy(uuid,boolean,integer),
  public.set_billing_country(uuid,text,text), public.set_cohort_capacity(uuid,integer),
  public.set_cohort_join_window(uuid,timestamp with time zone),
  public.set_cohort_status(uuid,text), public.set_course_assignment_status(uuid,text),
  public.set_course_audience(uuid,text,text[]),
  public.set_course_certificate_policy(uuid,boolean,text),
  public.set_course_language(uuid,text),
  public.set_course_version_status(uuid,text,uuid,text),
  public.set_feature_tier_requirement(text,text), public.set_hifz_passage_status(uuid,text),
  public.set_incident_status(uuid,text,text),
  public.set_institution_admin(uuid,uuid,boolean,text),
  public.set_lesson_preview(uuid,boolean),
  public.set_market_charge(text,text,text,text,integer,bigint,bigint,bigint,timestamp with time zone,text,uuid),
  public.set_my_phone(text,text), public.set_notification_preference(text,boolean),
  public.set_panel_status(uuid,text,text), public.set_payout_policy(integer,text),
  public.set_plan_price(uuid,bigint,text,text), public.set_plan_tier(uuid,text),
  public.set_platform_control(text,text,text),
  public.set_product_price(uuid,bigint,text,text,text),
  public.set_promotion_campaign_status(uuid,text),
  public.set_promotion_limits(uuid,integer,integer,integer),
  public.set_refund_window(integer,text), public.set_revenue_share_percent(integer,text),
  public.set_reviewer_authorization(uuid,uuid,text,text,timestamp with time zone),
  public.set_reviewer_status(uuid,text,text), public.set_support_case_priority(uuid,text),
  public.set_version_subjects(uuid,text[]), public.setting_int(text,integer),
  public.setting_text(text,text),
  public.share_adult_learning(uuid,uuid,text,timestamp with time zone),
  public.shared_learning_overview(uuid), public.sponsorship_overview(),
  public.sponsorship_pool(text), public.staff_attention(),
  public.staff_directory(text,text,integer),
  public.staff_may_read_governance_event(text,text,uuid),
  public.staff_unfinished_upload_access(text,text[]),
  public.start_payment_reconciliation(text,date,date),
  public.submit_assessment_attempt(uuid), public.submit_assignment(uuid),
  public.submit_guardian_consent(uuid,text,text,text,text),
  public.submit_teaching_application(text,text,text,text),
  public.support_case_cleanup_hold_history(uuid,uuid,integer),
  public.support_case_cleanup_hold_page(uuid,integer),
  public.support_case_cleanup_hold_status(uuid),
  public.support_case_held_version_page(uuid,uuid,integer),
  public.support_case_history(uuid), public.suppress_address(text,text,text,text),
  public.takedown_register(), public.teacher_course_analytics(uuid,integer),
  public.teacher_licence_coverage(), public.teacher_live_recordings(uuid),
  public.teaching_application_queue(),
  public.to_reporting_currency(bigint,character,timestamp with time zone),
  public.transcode_library_candidates(uuid,integer),
  public.translation_review_is_open(uuid), public.translation_review_queue(),
  public.update_course_assignment_draft(uuid,text,text,integer,timestamp with time zone,boolean,numeric),
  public.update_institution_branding(text,text,text,text),
  public.update_payment_dispute(uuid,text,text), public.verify_certificate(text),
  public.verify_institution_domain(uuid,boolean,text),
  public.verify_reviewer_qualification(uuid,text,timestamp with time zone),
  public.version_delivery_state(uuid), public.void_institution_seat_code(uuid,text),
  public.void_order_adjustment(uuid,text), public.waive_incident_notification(uuid,text),
  public.waive_review_requirement(uuid,text), public.withdraw_adult_declaration(),
  public.withdraw_ijazah(uuid,text), public.withdraw_sponsorship(uuid,text),
  public.withdraw_teaching_application(), public.withdrawal_offer(text),
  public.write_course_review(uuid,integer,text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Tables, for somebody who is not signed in
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;

grant select on
  public.content_source_links, public.content_sources, public.course_reviews,
  public.course_sections, public.course_version_subjects, public.course_versions,
  public.courses, public.currency_exchange_rates, public.institutions,
  public.instructor_public_profiles, public.learning_path_items, public.learning_paths,
  public.lesson_resources, public.lesson_transcripts, public.lessons,
  public.plan_entitlements, public.plan_versions, public.plans, public.prices,
  public.product_course_versions, public.products, public.promotion_benefits,
  public.promotion_campaigns, public.publication_events, public.reviewer_profiles,
  public.reviewer_subject_authorizations, public.roles, public.subject_areas
  to anon;

-- Never the answer key.
grant select (assessment_id, content, grading_method, id, points, position, type)
  on public.assessment_questions to anon;

grant insert on public.translation_proposals, public.translation_reviews to anon;

-- Six tables whose read policy names `anon`, and which only the platform's
-- default had made readable: the list of languages, the policy documents and
-- their versions in force, renditions of a preview lesson, the discussion
-- under a lesson anybody may read, and what review a published course had.
-- The policy on each decides the rows.
grant select on
  public.content_review_requirements, public.discussion_posts, public.languages,
  public.media_renditions, public.policy_documents, public.policy_versions
  to anon;
-- Not granted: INSERT on content_reports, though its policy names `anon`. A
-- report from somebody not signed in goes through report_content(), which
-- chooses the columns.

-- ---------------------------------------------------------------------------
-- 4. Tables, for a signed-in person
-- ---------------------------------------------------------------------------
revoke truncate, references, trigger on all tables in schema public from authenticated;
do $$
begin
  -- MAINTAIN exists from PostgreSQL 17, which is what the hosted project runs.
  if current_setting('server_version_num')::integer >= 170000 then
    execute 'revoke maintain on all tables in schema public from authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Sequences
-- ---------------------------------------------------------------------------
revoke all on all sequences in schema public from anon, authenticated;
